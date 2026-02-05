'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import Guacamole from 'guacamole-common-js';

export default function ConnectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const wrapRef = useRef<HTMLDivElement>(null); // sizing container
  const displayRef = useRef<HTMLDivElement>(null); // guac display mount
  const clientRef = useRef<any>(null);
  const keyboardRef = useRef<any>(null);

  const [hydrated, setHydrated] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const guacBase = useMemo(() => {
    // must be like "localhost:8080/guacamole"
    return process.env.NEXT_PUBLIC_GUACAMOLE_URL || 'localhost:8080/guacamole';
  }, []);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/');
  }, [hydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !user?.authToken || !displayRef.current || !wrapRef.current) return;

    let ro: ResizeObserver | null = null;
    let cancelled = false;

    const getContainerSize = () => {
      const el = wrapRef.current!;
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

      // Scale is purely visual (does not change remote resolution) [web:4]
      display.scale(scale); // [web:4]
    };

    const sendSize = () => {
      const client = clientRef.current;
      if (!client) return;
      const { w, h } = getContainerSize();
      client.sendSize(w, h);
    };

    const connect = () => {
      setConnecting(true);
      setConnected(false);
      setErr(null);

      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const tunnelURL = `${wsProto}//${guacBase}/websocket-tunnel`;

      // IMPORTANT: do NOT put query params in tunnelURL.
      const tunnel = new (Guacamole as any).WebSocketTunnel(tunnelURL);

      tunnel.onerror = (status: any) => {
        if (cancelled) return;
        console.error('❌ Tunnel error:', status);
        setErr(`Tunnel error (${status?.code ?? 'unknown'})`);
      };

      const client = new (Guacamole as any).Client(tunnel);
      clientRef.current = client;

      const display = client.getDisplay();
      displayRef.current!.innerHTML = '';
      displayRef.current!.appendChild(display.getElement());

      // When display size changes, rescale to fit [web:4]
      display.onresize = () => {
        applyScaleToFit(); // [web:4]
      };

      client.onstatechange = (state: number) => {
        // 3 = CONNECTED, 5 = DISCONNECTED
        if (cancelled) return;

        if (state === 3) {
          setConnecting(false);
          setConnected(true);
          setErr(null);

          // Immediately sync size + scale (fullscreen “fix” without fullscreen)
          sendSize();
          // wait 1 frame so display width/height is known
          requestAnimationFrame(() => applyScaleToFit());
        } else if (state === 5) {
          setConnecting(false);
          setConnected(false);
          setErr((prev) => prev ?? 'Disconnected');
        } else {
          setConnecting(true);
        }
      };

      client.onerror = (e: any) => {
        if (cancelled) return;
        console.error('❌ Client error:', e);
        setErr(e?.message || 'Client error');
        setConnecting(false);
        setConnected(false);
      };

      // Build the connect string and PASS IT to connect().
      // This prevents the “?undefined” URL bug. [web:11][web:10]
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

      // Match official client capability style (multiple values)
      qs.append('GUAC_AUDIO', 'audio/L8');
      qs.append('GUAC_AUDIO', 'audio/L16');
      qs.append('GUAC_IMAGE', 'image/jpeg');
      qs.append('GUAC_IMAGE', 'image/png');
      qs.append('GUAC_IMAGE', 'image/webp');

      client.connect(qs.toString()); // [web:10]

      const mouse = new (Guacamole as any).Mouse(display.getElement());
      mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (ms: any) => client.sendMouseState(ms);

      const keyboard = new (Guacamole as any).Keyboard(document);
      keyboard.onkeydown = (keysym: number) => {
        client.sendKeyEvent(1, keysym);
        return true;
      };
      keyboard.onkeyup = (keysym: number) => client.sendKeyEvent(0, keysym);
      keyboardRef.current = keyboard;

      ro = new ResizeObserver(() => {
        if (!clientRef.current) return;
        sendSize();
        requestAnimationFrame(() => applyScaleToFit());
      });
      ro.observe(wrapRef.current!);
    };

    connect();

    return () => {
      cancelled = true;
      try {
        ro?.disconnect();
      } catch {}
      try {
        keyboardRef.current?.reset?.();
      } catch {}
      try {
        clientRef.current?.disconnect?.();
      } catch {}
      clientRef.current = null;
    };
  }, [hydrated, isAuthenticated, user?.authToken, user?.dataSource, id, guacBase]);

  const toggleFullscreen = async () => {
    const el = wrapRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const disconnect = () => {
    try {
      clientRef.current?.disconnect?.();
    } catch {}
    router.push('/dashboard');
  };

  if (!hydrated) return null;

  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      <div className="h-12 px-3 flex items-center justify-between bg-zinc-900 border-b border-zinc-800">
        <Button variant="ghost" size="sm" onClick={disconnect} className="text-zinc-300">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Disconnect
        </Button>

        <div className="flex items-center gap-3 text-xs text-zinc-300">
          {connecting && !err && <span>Connecting…</span>}
          {connected && !err && <span>Connected</span>}
          {err && <span className="text-red-400">{err}</span>}

          <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-zinc-300">
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* key layout fix: min-h-0 + overflow-hidden so the flex child gets real height */}
      <div ref={wrapRef} className="flex-1 min-h-0 overflow-hidden">
        <div ref={displayRef} className="w-full h-full" />
      </div>
    </div>
  );
}
