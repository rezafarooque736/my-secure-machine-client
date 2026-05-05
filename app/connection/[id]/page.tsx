/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Maximize2,
  Activity,
  Monitor,
  X,
  RefreshCwIcon,
  Expand,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import Guacamole from 'guacamole-common-js';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import axios from 'axios';

export default function ConnectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const wrapRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const keyboardRef = useRef<any>(null);
  const sessionStartTime = useRef<Date | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [connectionName, setConnectionName] = useState<string>('');
  const [stats, setStats] = useState({ duration: '00:00', latency: 0 });

  // ─── Fullscreen Gate ─────────────────────────────────────────────────────
  // true  = show the "enter fullscreen" landing screen (before VNC starts)
  // false = VNC connection is active
  const [showGate, setShowGate] = useState(true);

  const guacBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_GUACAMOLE_URL || 'http://localhost:8080/guacamole';
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Fetch human-readable connection name
  useEffect(() => {
    if (!hydrated || !user?.authToken || !id) return;
    axios
      .get(`/api/connections/${encodeURIComponent(id)}`, {
        params: { token: user.authToken, dataSource: user.dataSource ?? 'postgresql' },
      })
      .then((res) => setConnectionName(res.data?.name ?? `Connection ${id}`))
      .catch(() => setConnectionName(`Connection ${id}`));
  }, [hydrated, user?.authToken, user?.dataSource, id]);

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/');
  }, [hydrated, isAuthenticated, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionId = `guac-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('guac-session', sessionId);
    }
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      try {
        clientRef.current?.disconnect();
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Track fullscreen changes from ANY source (ESC key, browser UI, etc.)
  // This is the single source of truth for the fullscreen state.
  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Session duration counter
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

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // ─── Main Guacamole connection effect ────────────────────────────────────
  // Guard: do NOT start the connection until the gate is dismissed
  useEffect(() => {
    if (showGate) return;
    if (!hydrated || !isAuthenticated || !user?.authToken || !displayRef.current || !wrapRef.current) return;

    let ro: ResizeObserver | null = null;
    let cancelled = false;
    let handleVisibility: (() => void) | null = null;
    let blockBrowserKeys: ((e: KeyboardEvent) => void) | null = null;
    let handleBlur: (() => void) | null = null;
    let displayEl: HTMLElement | null = null;
    let isVNCRedispatch = false;

    const getContainerSize = () => {
      const el = wrapRef.current;
      if (!el) return { w: 800, h: 600 };
      return {
        w: Math.max(1, Math.floor(el.clientWidth)),
        h: Math.max(1, Math.floor(el.clientHeight)),
      };
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
      const el = display.getElement() as HTMLElement;
      el.style.position = 'absolute';
      el.style.left = `${Math.max(0, Math.round((w - dw * scale) / 2))}px`;
      el.style.top = `${Math.max(0, Math.round((h - dh * scale) / 2))}px`;
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

      const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const tunnelURL = `${wsProto}://${guacBase}/websocket-tunnel`;
      const tunnel = new (Guacamole as any).WebSocketTunnel(tunnelURL);

      const connectionTimeout = setTimeout(() => {
        setErr('Connection timeout - please try again');
        setConnecting(false);
        tunnel.disconnect();
      }, 30000);

      tunnel.onerror = (status: any) => {
        if (cancelled) return;
        clearTimeout(connectionTimeout);
        const errorMsg = `Connection error: ${status?.code ?? 'unknown'}`;
        setErr(errorMsg);
        toast.error('Connection Error', { description: errorMsg });
      };

      tunnel.onstatechange = (state: number) => {
        if (state === 2) clearTimeout(connectionTimeout);
      };

      const client = new (Guacamole as any).Client(tunnel);
      clientRef.current = client;
      const display = client.getDisplay();

      // FIX 4.1 — Dual cursor: hide browser native cursor over VNC canvas
      displayEl = display.getElement() as HTMLElement;
      displayEl.style.cursor = 'none';
      displayEl.style.display = 'block';
      displayEl.style.position = 'absolute';

      if (displayRef.current) {
        displayRef.current.innerHTML = '';
        displayRef.current.appendChild(displayEl);
      }
      display.onresize = applyScaleToFit;

      client.onstatechange = (state: number) => {
        if (cancelled) return;
        if (state === 3) {
          clearTimeout(connectionTimeout);
          setConnecting(false);
          setConnected(true);
          setErr(null);
          sendSize();
          requestAnimationFrame(applyScaleToFit);
          displayEl?.focus();
          setTimeout(() => {
            sendSize();
            requestAnimationFrame(applyScaleToFit);
          }, 800);
        } else if (state === 5) {
          clearTimeout(connectionTimeout);
          setConnecting(false);
          setConnected(false);
          setErr((prev) => prev ?? 'Disconnected');
          if (sessionStartTime.current) {
            const duration = Math.floor(
              (new Date().getTime() - sessionStartTime.current.getTime()) / 1000 / 60,
            );
            toast.info('Session Ended', { description: `Duration: ${duration} minutes` });
          }
        } else {
          setConnecting(true);
        }
      };

      client.onerror = (e: any) => {
        if (cancelled) return;
        clearTimeout(connectionTimeout);
        const errorMsg = e?.message || 'Connection error';
        setErr(errorMsg);
        setConnecting(false);
        setConnected(false);
        toast.error('Client Error', { description: errorMsg });
      };

      const { w, h } = getContainerSize();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const qs = new URLSearchParams();
      qs.set('token', user!.authToken);
      qs.set('GUAC_DATA_SOURCE', user!.dataSource || 'postgresql');
      qs.set('GUAC_ID', id);
      qs.set('GUAC_TYPE', 'c');
      qs.set('GUAC_WIDTH', String(w));
      qs.set('GUAC_HEIGHT', String(h));
      qs.set('GUAC_DPI', '96');
      qs.set('GUAC_TIMEZONE', tz);
      qs.set('t', Date.now().toString());
      qs.append('GUAC_AUDIO', 'audio/L8');
      qs.append('GUAC_AUDIO', 'audio/L16');
      qs.append('GUAC_IMAGE', 'image/jpeg');
      qs.append('GUAC_IMAGE', 'image/png');
      client.connect(qs.toString());

      const mouse = new (Guacamole as any).Mouse(displayEl);
      mouse.onmousedown = mouse.onmouseup = mouse.onmousemove = (ms: any) => client.sendMouseState(ms);

      // FIX 4.2 + 4.4 — Keyboard scoped to displayEl; blur resets stuck keys
      displayEl.setAttribute('tabindex', '0');
      displayEl.style.outline = 'none';

      const keyboard = new (Guacamole as any).Keyboard(displayEl);
      keyboard.onkeydown = (keysym: number) => {
        client.sendKeyEvent(1, keysym);
        return true;
      };
      keyboard.onkeyup = (keysym: number) => {
        client.sendKeyEvent(0, keysym);
      };
      keyboardRef.current = keyboard;
      displayEl.focus();

      handleBlur = () => {
        keyboard.reset?.();
      };
      displayEl.addEventListener('blur', handleBlur);

      // FIX 4.3 — Capture browser shortcuts before browser handles them
      blockBrowserKeys = (e: KeyboardEvent) => {
        if (isVNCRedispatch) return;
        if (!clientRef.current) return;
        const isDevTools =
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.shiftKey && e.key === 'J');
        if (isDevTools || e.key === 'Escape') return;
        e.preventDefault();
        e.stopPropagation();
        isVNCRedispatch = true;
        displayEl?.focus();
        displayEl?.dispatchEvent(
          new KeyboardEvent(e.type, {
            key: e.key,
            code: e.code,
            keyCode: e.keyCode,
            which: e.which,
            charCode: e.charCode,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            repeat: e.repeat,
            bubbles: true,
            cancelable: true,
          }),
        );
        isVNCRedispatch = false;
      };
      document.addEventListener('keydown', blockBrowserKeys, { capture: true });
      document.addEventListener('keyup', blockBrowserKeys, { capture: true });

      handleVisibility = () => {
        if (document.hidden) keyboard.reset?.();
      };
      document.addEventListener('visibilitychange', handleVisibility);

      if (wrapRef.current) {
        ro = new ResizeObserver(() => {
          if (!clientRef.current) return;
          sendSize();
          requestAnimationFrame(applyScaleToFit);
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
      if (handleVisibility) document.removeEventListener('visibilitychange', handleVisibility);
      if (blockBrowserKeys) {
        document.removeEventListener('keydown', blockBrowserKeys, { capture: true });
        document.removeEventListener('keyup', blockBrowserKeys, { capture: true });
      }
      if (handleBlur && displayEl) displayEl.removeEventListener('blur', handleBlur);
      try {
        clientRef.current?.disconnect();
      } catch {}
      clientRef.current = null;
      keyboardRef.current = null;
    };
  }, [showGate, hydrated, isAuthenticated, user?.authToken, user?.dataSource, id, guacBase]);

  // ─── Enter fullscreen + start VNC ─────────────────────────────────────────
  const enterFullscreenAndConnect = async () => {
    if (wrapRef.current) {
      try {
        await wrapRef.current.requestFullscreen();
        if ((navigator as any).keyboard?.lock) await (navigator as any).keyboard.lock();
      } catch {
        toast.error('Fullscreen denied', {
          description: 'Browser blocked fullscreen. Connecting normally.',
        });
      }
    }
    setShowGate(false);
  };

  const connectWithoutFullscreen = () => {
    setShowGate(false);
  };

  const toggleFullscreen = async () => {
    if (!wrapRef.current) return;
    if (!document.fullscreenElement) {
      await wrapRef.current.requestFullscreen();
      if ((navigator as any).keyboard?.lock) await (navigator as any).keyboard.lock();
    } else {
      if ((navigator as any).keyboard?.unlock) (navigator as any).keyboard.unlock();
      await document.exitFullscreen();
    }
  };

  const disconnect = () => {
    try {
      clientRef.current?.disconnect?.();
    } catch {}
    toast.info('Disconnected', { description: 'Returning to dashboard' });
    router.push('/dashboard');
  };

  if (!hydrated) return null;

  return (
    <div ref={wrapRef} className="h-screen w-screen bg-black flex flex-col">
      {/* ── FULLSCREEN GATE SCREEN ─────────────────────────────────────────── */}
      {showGate && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10 flex flex-col items-center gap-8 px-6 max-w-lg w-full text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-zinc-800 border border-zinc-700 shadow-2xl">
              <Monitor className="w-10 h-10 text-zinc-300" />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">Remote Desktop</p>
              <h1 className="text-white text-3xl font-bold tracking-tight">
                {connectionName || `Connection ${id}`}
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                You are about to connect to a remote machine via VNC.
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={enterFullscreenAndConnect}
                className="group w-full flex items-center justify-center gap-3 px-8 py-5 rounded-xl bg-white text-zinc-900 font-semibold text-lg shadow-2xl hover:bg-zinc-100 active:scale-[0.98] transition-all duration-150"
              >
                <Expand className="w-5 h-5 transition-transform group-hover:scale-110" />
                Continue in Full Screen
              </button>

              <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-left">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-amber-300/90 text-xs leading-relaxed">
                  <span className="font-semibold text-amber-300">Full screen is strongly recommended.</span>{' '}
                  Without it, browser keyboard shortcuts (Ctrl+T, Ctrl+W, Ctrl+A etc.) will interfere with
                  your remote session and some keys may not work correctly.
                </p>
              </div>

              <button
                onClick={connectWithoutFullscreen}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800/50 active:scale-[0.98] transition-all duration-150"
              >
                Connect without full screen
                <span className="text-zinc-600 text-xs">(not recommended)</span>
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center justify-center gap-2 text-zinc-600 text-xs hover:text-zinc-400 transition-colors mt-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control bar only in non-fullscreen mode */}
      {!showGate && !fullscreen && (
        <div
          className={cn(
            'h-14 px-4 flex items-center justify-between bg-gradient-to-r from-zinc-900 to-zinc-800 border-b border-zinc-700 transition-all duration-300',
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
              <span className="text-sm text-zinc-300 font-medium">
                {connectionName || `Connection ${id}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-zinc-300">
            {connecting && !err && (
              <Badge variant="outline" className="gap-2 border-yellow-500/50 text-yellow-400">
                <Activity className="w-3 h-3 animate-pulse" /> Connecting
              </Badge>
            )}
            {connected && !err && (
              <Badge variant="outline" className="gap-2 border-green-500/50 text-green-400">
                <Activity className="w-3 h-3" /> Connected
              </Badge>
            )}
            {err && (
              <Badge variant="outline" className="gap-2 border-red-500/50 text-red-400">
                <X className="w-3 h-3" /> Error
              </Badge>
            )}
            {connected && <span className="font-mono text-xs text-zinc-400">{stats.duration}</span>}
            {err && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="text-zinc-300 hover:text-white hover:bg-zinc-800"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" /> Retry
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-zinc-300 hover:text-white hover:bg-zinc-800 h-8 w-8"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={disconnect}
              className="text-zinc-300 hover:text-red-400 hover:bg-zinc-800 h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Remote Desktop Display */}
      {!showGate && (
        <div
          className="flex-1 min-h-0 overflow-hidden bg-black relative"
          style={{ cursor: connected ? 'none' : 'default' }}
          onMouseMove={resetControlsTimer}
        >
          <div
            ref={displayRef}
            className="w-full h-full relative overflow-hidden"
            onClick={() => {
              const el = displayRef.current?.querySelector('[tabindex]') as HTMLElement | null;
              el?.focus();
            }}
          />

          {connecting && !err && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
              <Card className="w-72 bg-zinc-900 border-zinc-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 animate-pulse text-yellow-400" />
                    Establishing Connection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-400 text-sm">Connecting to remote desktop…</p>
                  <div className="mt-3 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 animate-pulse rounded-full w-3/4" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {err && !connecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
              <Card className="w-80 bg-zinc-900 border-red-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-red-400 text-base flex items-center gap-2">
                    <X className="w-4 h-4" /> Connection Failed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-zinc-400 text-sm">{err}</p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => window.location.reload()} className="flex-1">
                      <RefreshCwIcon className="w-3 h-3 mr-2" /> Retry
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={disconnect}
                      className="flex-1 border-zinc-600 text-zinc-300"
                    >
                      Go Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
