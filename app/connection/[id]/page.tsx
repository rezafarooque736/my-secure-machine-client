'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Activity,
  Settings,
  Keyboard,
  Monitor,
  X,
  RefreshCwIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Guacamole from 'guacamole-common-js';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ConnectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const wrapRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const keyboardRef = useRef<any>(null);
  const sessionStartTime = useRef<Date | null>(null);

  const [hydrated, setHydrated] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [connectionName, setConnectionName] = useState<string>('');
  const [stats, setStats] = useState({
    duration: '00:00',
    latency: 0,
  });

  const guacBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_GUACAMOLE_URL || 'localhost:8080/guacamole';
  }, []);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/');
  }, [hydrated, isAuthenticated, router]);

  useEffect(() => {
    // Force clear any cached WebSocket connections
    if (typeof window !== 'undefined') {
      // Generate unique session ID
      const sessionId = `guac-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('guac-session', sessionId);
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      try {
        clientRef.current?.disconnect();
      } catch (err) {
        console.error('Error during beforeunload cleanup:', err);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Duration counter
  useEffect(() => {
    if (!connected || !sessionStartTime.current) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - sessionStartTime.current!.getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setStats((prev) => ({
        ...prev,
        duration: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [connected]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !user?.authToken || !displayRef.current || !wrapRef.current) return;

    let ro: ResizeObserver | null = null;
    let cancelled = false;

    const getContainerSize = () => {
      const el = wrapRef.current;
      if (!el) return { w: 800, h: 600 };
      const w = Math.max(1, Math.floor(el.clientWidth));
      const h = Math.max(1, Math.floor(el.clientHeight));
      return { w, h };
    };

    const applyScaleToFit = () => {
      const client = clientRef.current;
      if (!client) return;
      const display = client.getDisplay();

      const dw = display.getWidth?.() ?? 0;
      const dh = display.getHeight?.() ?? 0;
      if (!dw || !dh) return;

      const { w, h } = getContainerSize();
      const scale = Math.min(w / dw, h / dh);
      display.scale(scale);
    };

    const sendSize = () => {
      const client = clientRef.current;
      if (!client || !wrapRef.current) return;
      const { w, h } = getContainerSize();
      client.sendSize(w, h);
    };

    const connect = () => {
      setConnecting(true);
      setConnected(false);
      setErr(null);
      sessionStartTime.current = new Date();

      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const tunnelURL = `${wsProto}//${guacBase}/websocket-tunnel`;

      // IMPORTANT: Create fresh tunnel with proper error handling
      const tunnel = new (Guacamole as any).WebSocketTunnel(tunnelURL);

      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!connected) {
          console.error('Connection timeout');
          setErr('Connection timeout - please try again');
          setConnecting(false);
          tunnel.disconnect();
        }
      }, 30000); // 30 second timeout

      tunnel.onerror = (status: any) => {
        if (cancelled) return;
        clearTimeout(connectionTimeout);
        console.error('❌ Tunnel error:', status);
        const errorMsg = `Connection error (${status?.code ?? 'unknown'})`;
        setErr(errorMsg);
        toast.error('Connection Error', { description: errorMsg });
      };

      tunnel.onstatechange = (state: number) => {
        console.log('Tunnel state changed:', state);

        if (state === 2) {
          // CLOSED
          clearTimeout(connectionTimeout);
          if (!cancelled) {
            console.warn('Tunnel closed unexpectedly');
            // Don't auto-reconnect, let user manually retry
          }
        }
      };

      const client = new (Guacamole as any).Client(tunnel);
      clientRef.current = client;

      const display = client.getDisplay();
      if (displayRef.current) {
        displayRef.current.innerHTML = '';
        displayRef.current.appendChild(display.getElement());
      }

      display.onresize = () => applyScaleToFit();

      client.onstatechange = (state: number) => {
        if (cancelled) return;
        console.log('Client state changed:', state);

        if (state === 3) {
          // Connected
          clearTimeout(connectionTimeout);
          setConnecting(false);
          setConnected(true);
          setErr(null);
          sendSize();
          requestAnimationFrame(() => applyScaleToFit());
          toast.success('Connected', { description: 'Remote desktop session established' });
        } else if (state === 5) {
          // Disconnected
          clearTimeout(connectionTimeout);
          setConnecting(false);
          setConnected(false);
          setErr((prev) => prev ?? 'Disconnected');

          if (sessionStartTime.current) {
            const duration = Math.floor(
              (new Date().getTime() - sessionStartTime.current.getTime()) / 1000 / 60,
            );
            console.log(`Session ended. Duration: ${duration} minutes`);
            toast.info('Session Ended', { description: `Duration: ${duration} minutes` });
          }
        } else {
          setConnecting(true);
        }
      };

      client.onerror = (e: any) => {
        if (cancelled) return;
        clearTimeout(connectionTimeout);
        console.error('❌ Client error:', e);
        const errorMsg = e?.message || 'Connection error';
        setErr(errorMsg);
        setConnecting(false);
        setConnected(false);
        toast.error('Client Error', { description: errorMsg });
      };

      const { w, h } = getContainerSize();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const qs = new URLSearchParams();
      qs.set('token', user.authToken);
      qs.set('GUAC_DATA_SOURCE', user.dataSource || 'mysql');
      qs.set('GUAC_ID', id);
      qs.set('GUAC_TYPE', 'c');
      qs.set('GUAC_WIDTH', String(w));
      qs.set('GUAC_HEIGHT', String(h));
      qs.set('GUAC_DPI', String(Math.round(96 * (window.devicePixelRatio || 1))));
      qs.set('GUAC_TIMEZONE', tz);

      // Add cache-busting timestamp
      qs.set('_t', Date.now().toString());

      qs.append('GUAC_AUDIO', 'audio/L8');
      qs.append('GUAC_AUDIO', 'audio/L16');
      qs.append('GUAC_IMAGE', 'image/jpeg');
      qs.append('GUAC_IMAGE', 'image/png');
      qs.append('GUAC_IMAGE', 'image/webp');

      console.log('Connecting with params:', qs.toString());
      client.connect(qs.toString());

      const mouse = new (Guacamole as any).Mouse(display.getElement());
      mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (ms: any) => client.sendMouseState(ms);

      const keyboard = new (Guacamole as any).Keyboard(document);
      keyboard.onkeydown = (keysym: number) => {
        client.sendKeyEvent(1, keysym);
        return true;
      };
      keyboard.onkeyup = (keysym: number) => client.sendKeyEvent(0, keysym);
      keyboardRef.current = keyboard;

      if (wrapRef.current) {
        ro = new ResizeObserver(() => {
          if (!clientRef.current) return;
          sendSize();
          requestAnimationFrame(() => applyScaleToFit());
        });
        ro.observe(wrapRef.current);
      }
    };

    connect();

    return () => {
      cancelled = true;
      console.log('Cleaning up connection...');

      try {
        ro?.disconnect();
      } catch (e) {
        console.error('Error disconnecting ResizeObserver:', e);
      }

      try {
        keyboardRef.current?.reset?.();
      } catch (e) {
        console.error('Error resetting keyboard:', e);
      }

      try {
        const client = clientRef.current;
        if (client) {
          // Force disconnect
          client.disconnect();
        }
      } catch (e) {
        console.error('Error disconnecting client:', e);
      }

      clientRef.current = null;
      keyboardRef.current = null;
    };
  }, [hydrated, isAuthenticated, user?.authToken, user?.dataSource, id, guacBase]);

  const toggleFullscreen = async () => {
    if (!wrapRef.current) return;

    if (!document.fullscreenElement) {
      await wrapRef.current.requestFullscreen();
      setFullscreen(true);
      toast.success('Fullscreen Mode', { description: 'Press ESC to exit' });
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const disconnect = () => {
    try {
      clientRef.current?.disconnect?.();
    } catch {}
    toast.info('Disconnected', { description: 'Returning to dashboard' });
    router.push('/dashboard');
  };

  const sendCtrlAltDel = () => {
    const client = clientRef.current;
    if (!client) return;

    // Send Ctrl+Alt+Del combination
    client.sendKeyEvent(1, 0xffe3); // Ctrl
    client.sendKeyEvent(1, 0xffe9); // Alt
    client.sendKeyEvent(1, 0xffff); // Del

    setTimeout(() => {
      client.sendKeyEvent(0, 0xffff);
      client.sendKeyEvent(0, 0xffe9);
      client.sendKeyEvent(0, 0xffe3);
    }, 100);

    toast.success('Sent Ctrl+Alt+Del');
  };

  if (!hydrated) return null;

  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      {/* Control Bar */}
      <div
        className={cn(
          'h-14 px-4 flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-950 dark:to-zinc-900 border-b border-zinc-700 dark:border-zinc-800 transition-all duration-300',
          !showControls && 'opacity-0 -translate-y-full pointer-events-none',
        )}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnect}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Disconnect
          </Button>

          <div className="h-6 w-px bg-zinc-700" />

          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-300 font-medium">{connectionName || `Connection ${id}`}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-zinc-300">
          {/* Status Indicator */}
          {connecting && !err && (
            <Badge variant="outline" className="gap-2 border-yellow-500/50 text-yellow-400">
              <Activity className="w-3 h-3 animate-pulse" />
              Connecting…
            </Badge>
          )}
          {connected && !err && (
            <Badge variant="outline" className="gap-2 border-green-500/50 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Connected • {stats.duration}
            </Badge>
          )}
          {err && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
              <Card className="max-w-md w-full mx-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <X className="h-5 w-5" />
                    Connection Failed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{err}</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setErr(null);
                        window.location.reload();
                      }}
                      className="flex-1"
                    >
                      <RefreshCwIcon className="h-4 w-4 mr-2" />
                      Retry Connection
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push('/dashboard/connections')}
                      className="flex-1"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Go Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="h-6 w-px bg-zinc-700" />

          {/* Controls Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-zinc-800">
                <Settings className="w-4 h-4 mr-2" />
                Controls
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Session Controls</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={sendCtrlAltDel}>
                <Keyboard className="mr-2 h-4 w-4" />
                Send Ctrl+Alt+Del
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleFullscreen}>
                {fullscreen ? (
                  <>
                    <Minimize2 className="mr-2 h-4 w-4" />
                    Exit Fullscreen
                  </>
                ) : (
                  <>
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Enter Fullscreen
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowControls(!showControls)}>
                Toggle Controls Bar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Remote Desktop Display */}
      <div
        ref={wrapRef}
        className="flex-1 min-h-0 overflow-hidden bg-black relative"
        onMouseEnter={() => setShowControls(true)}
      >
        <div ref={displayRef} className="w-full h-full" />

        {/* Hidden controls trigger */}
        <div className="absolute top-0 left-0 right-0 h-8 z-10" onMouseEnter={() => setShowControls(true)} />
      </div>
    </div>
  );
}
