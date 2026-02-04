'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { ShieldCheck, Maximize2, Minimize2, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Guacamole from 'guacamole-common-js';

export default function ConnectionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const guacClientRef = useRef<any>(null);
  const [connectionId, setConnectionId] = useState<string>('');

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params;
      setConnectionId(resolvedParams.id);
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated || !user) {
      router.push('/');
      return;
    }

    if (!connectionId) return;

    const token = user.authToken;
    const dataSource = user.dataSource;

    // Initialize Guacamole client
    const initGuacamole = async () => {
      try {
        // Determine protocol and host
        const guacamoleHost = process.env.NEXT_PUBLIC_GUACAMOLE_URL || '192.168.1.25';

        // Use wss:// (secure WebSocket) as the working Guacamole client does
        const wsUrl = `wss://${guacamoleHost}/websocket-tunnel`;

        console.log('Connecting to:', wsUrl);

        // Create WebSocket tunnel using the imported Guacamole library
        const tunnel = new Guacamole.WebSocketTunnel(wsUrl);

        // Create Guacamole client
        const client = new Guacamole.Client(tunnel);
        guacClientRef.current = client;

        // Get display element
        const display = client.getDisplay();

        if (displayRef.current) {
          displayRef.current.innerHTML = '';
          displayRef.current.appendChild(display.getElement());

          // Style the display
          const element = display.getElement();
          element.style.margin = 'auto';
        }

        // Mouse handling
        const mouse = new Guacamole.Mouse(display.getElement());
        mouse.onmousedown =
          mouse.onmouseup =
          mouse.onmousemove =
            (mouseState: any) => {
              client.sendMouseState(mouseState);
            };

        // Touch handling for mobile
        const touch = new Guacamole.Mouse.Touchscreen(display.getElement());
        touch.onmousedown =
          touch.onmouseup =
          touch.onmousemove =
            (mouseState: any) => {
              client.sendMouseState(mouseState);
            };

        // Keyboard handling
        const keyboard = new Guacamole.Keyboard(document);
        keyboard.onkeydown = (keysym: number) => {
          client.sendKeyEvent(1, keysym);
        };
        keyboard.onkeyup = (keysym: number) => {
          client.sendKeyEvent(0, keysym);
        };

        // Handle connection state changes
        client.onstatechange = (state: number) => {
          console.log('Guacamole Client State:', state);
          if (state === 3) {
            // CONNECTED (Guacamole.Client.CONNECTED)
            setIsConnected(true);
            setIsConnecting(false);
            setError(null);
          } else if (state === 5) {
            // DISCONNECTED
            setIsConnected(false);
            setIsConnecting(false);
            if (!error) setError('Connection closed');
          } else if (state === 1) {
            // CONNECTING
            setIsConnecting(true);
          }
        };

        // Handle errors
        client.onerror = (err: any) => {
          console.error('Guacamole client error:', err);
          setError(`Connection error: ${err.message || 'Check terminal/logs'}`);
          setIsConnected(false);
          setIsConnecting(false);
        };

        // Get timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Build connection params matching EXACTLY what the working Guacamole client sends
        // Use URLSearchParams to properly handle multiple values for GUAC_AUDIO and GUAC_IMAGE
        const params = new URLSearchParams();
        params.append('token', token);
        params.append('GUAC_DATA_SOURCE', dataSource);
        params.append('GUAC_ID', connectionId);
        params.append('GUAC_TYPE', 'c');
        params.append('GUAC_WIDTH', String(Math.floor(window.innerWidth)));
        params.append('GUAC_HEIGHT', String(Math.floor(window.innerHeight)));
        params.append('GUAC_DPI', '96');
        params.append('GUAC_TIMEZONE', timezone);
        params.append('GUAC_AUDIO', 'audio/L8');
        params.append('GUAC_AUDIO', 'audio/L16');
        params.append('GUAC_IMAGE', 'image/jpeg');
        params.append('GUAC_IMAGE', 'image/png');
        params.append('GUAC_IMAGE', 'image/webp');

        const connectionParams = params.toString();

        console.log('Connecting with params:', connectionParams);

        // Connect
        client.connect(connectionParams);

        // Handle window resize
        const handleResize = () => {
          if (client && display) {
            client.sendSize(window.innerWidth, window.innerHeight);
          }
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (err: any) {
        console.error('Guacamole initialization error:', err);
        setError(`Failed to initialize connection: ${err.message}`);
        setIsConnecting(false);
      }
    };

    // Initialize immediately since we're importing the library
    initGuacamole();

    return () => {
      // Cleanup
      if (guacClientRef.current) {
        try {
          guacClientRef.current.disconnect();
        } catch (e) {
          console.error('Error disconnecting:', e);
        }
      }
    };
  }, [isAuthenticated, user, router, connectionId]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      displayRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDisconnect = () => {
    if (guacClientRef.current) {
      guacClientRef.current.disconnect();
    }
    window.close();
  };

  if (!isHydrated || !isAuthenticated) return null;

  return (
    <div className="h-screen w-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-zinc-100">Remote Connection</p>
            <p className="text-xs text-zinc-500">
              {isConnecting ? (
                <span className="text-yellow-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Connecting...
                </span>
              ) : isConnected ? (
                <span className="text-green-500">● Connected</span>
              ) : (
                <span className="text-red-500">● Disconnected</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-zinc-400 hover:text-zinc-100"
            disabled={!isConnected}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            className="text-zinc-400 hover:text-red-400"
          >
            <LogOut className="w-4 h-4" />
            <span className="ml-2 text-xs">Disconnect</span>
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3 flex-shrink-0">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Display Container */}
      <div
        ref={displayRef}
        className="flex-1 bg-black overflow-auto"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isConnected ? 'none' : 'default',
        }}
      >
        {isConnecting && !error && (
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <p className="text-zinc-400">Establishing secure connection...</p>
          </div>
        )}
      </div>
    </div>
  );
}
