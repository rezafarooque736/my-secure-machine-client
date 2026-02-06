'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2, Activity } from 'lucide-react';
import Guacamole from 'guacamole-common-js';

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

  const guacBase = useMemo(() => {
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
      const el = wrapRef.current;
      if (!el) return { w: 800, h: 600 }; // fallback
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

      const tunnel = new (Guacamole as any).WebSocketTunnel(tunnelURL);

      tunnel.onerror = (status: any) => {
        if (cancelled) return;
        console.error('❌ Tunnel error:', status);
        setErr(`Connection error (${status?.code ?? 'unknown'})`);
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

        if (state === 3) {
          setConnecting(false);
          setConnected(true);
          setErr(null);
          sendSize();
          requestAnimationFrame(() => applyScaleToFit());
        } else if (state === 5) {
          setConnecting(false);
          setConnected(false);
          setErr((prev) => prev ?? 'Disconnected');

          // Log session end
          if (sessionStartTime.current) {
            const duration = Math.floor(
              (new Date().getTime() - sessionStartTime.current.getTime()) / 1000 / 60,
            );
            console.log(`Session ended. Duration: ${duration} minutes`);
            // You can call an API here to log to database
          }
        } else {
          setConnecting(true);
        }
      };

      client.onerror = (e: any) => {
        if (cancelled) return;
        console.error('❌ Client error:', e);
        setErr(e?.message || 'Connection error');
        setConnecting(false);
        setConnected(false);
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

      qs.append('GUAC_AUDIO', 'audio/L8');
      qs.append('GUAC_AUDIO', 'audio/L16');
      qs.append('GUAC_IMAGE', 'image/jpeg');
      qs.append('GUAC_IMAGE', 'image/png');
      qs.append('GUAC_IMAGE', 'image/webp');

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
    if (!wrapRef.current) return;

    if (!document.fullscreenElement) {
      await wrapRef.current.requestFullscreen();
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
      <div className="h-14 px-4 flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-700">
        <Button variant="ghost" size="sm" onClick={disconnect} className="text-zinc-300 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Disconnect
        </Button>

        <div className="flex items-center gap-4 text-sm text-zinc-300">
          {connecting && !err && (
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 animate-pulse" />
              Connecting…
            </span>
          )}
          {connected && !err && (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Connected
            </span>
          )}
          {err && <span className="text-red-400">{err}</span>}

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-zinc-300 hover:text-white"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div ref={wrapRef} className="flex-1 min-h-0 overflow-hidden bg-black">
        <div ref={displayRef} className="w-full h-full" />
      </div>
    </div>
  );
}
