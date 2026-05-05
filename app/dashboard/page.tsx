'use client';

import { ElementType, useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Monitor,
  ArrowRight,
  Sparkles,
  Megaphone,
  Pin,
  AlertTriangle,
  Info,
  ChevronRight,
  Tv2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NoticeType } from '@/lib/generated/prisma/enums';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Connection {
  identifier: string;
  name: string;
  protocol: string;
  hostname?: string | null;
  activeConnections?: number;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  type: NoticeType;
  isPinned: boolean;
  createdAt: string;
  createdBy?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const PROTOCOL_COLORS: Record<string, string> = {
  RDP: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  VNC: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  SSH: 'bg-green-500/10 text-green-600 border-green-500/20',
  TELNET: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
};

const PROTOCOL_ICON_BG: Record<string, string> = {
  RDP: 'bg-blue-500/10 group-hover:bg-blue-500/20',
  VNC: 'bg-purple-500/10 group-hover:bg-purple-500/20',
  SSH: 'bg-green-500/10 group-hover:bg-green-500/20',
  TELNET: 'bg-yellow-500/10 group-hover:bg-yellow-500/20',
};

const PROTOCOL_ICON_COLOR: Record<string, string> = {
  RDP: 'text-blue-500',
  VNC: 'text-purple-500',
  SSH: 'text-green-500',
  TELNET: 'text-yellow-500',
};

function getProtocolColor(protocol: string) {
  return PROTOCOL_COLORS[protocol?.toUpperCase()] ?? 'bg-gray-500/10 text-gray-500 border-gray-500/20';
}

function getProtocolIconBg(protocol: string) {
  return PROTOCOL_ICON_BG[protocol?.toUpperCase()] ?? 'bg-gray-500/10 group-hover:bg-gray-500/20';
}

function getProtocolIconColor(protocol: string) {
  return PROTOCOL_ICON_COLOR[protocol?.toUpperCase()] ?? 'text-gray-500';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
  };
}

{
  /* ── Notice type metadata ── update NOTICE_META colors to use theme tokens */
}
const NOTICE_META: Record<string, { icon: ElementType; bg: string; border: string; color: string }> = {
  INFO: {
    icon: Info,
    bg: 'bg-blue-500/8  dark:bg-blue-500/12',
    border: 'border-blue-500/20 dark:border-blue-500/30',
    color: 'text-blue-600 dark:text-blue-400',
  },
  WARNING: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/8  dark:bg-amber-500/12',
    border: 'border-amber-500/20 dark:border-amber-500/30',
    color: 'text-amber-600 dark:text-amber-400',
  },
  ERROR: {
    icon: AlertCircle,
    bg: 'bg-red-500/8  dark:bg-red-500/12',
    border: 'border-red-500/20 dark:border-red-500/30',
    color: 'text-red-600 dark:text-red-400',
  },
  SUCCESS: {
    icon: CheckCircle,
    bg: 'bg-green-500/8  dark:bg-green-500/12',
    border: 'border-green-500/20 dark:border-green-500/30',
    color: 'text-green-600 dark:text-green-400',
  },
};

// ── SectionHeader ─────────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  sub,
  action,
}: {
  icon: ElementType;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 pt-3 pb-2.5 border-b bg-muted/30 dark:bg-zinc-900/40 rounded-t-xl">
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate text-foreground">{title}</p>
          {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── ComputerCard ──────────────────────────────────────────────────────────────
function ComputerCard({ conn, onClick }: { conn: Connection; onClick: () => void }) {
  const proto = conn.protocol?.toUpperCase() ?? 'RDP';
  const iconBg = getProtocolIconBg(proto);
  const iconColor = getProtocolIconColor(proto);
  const badgeColor = getProtocolColor(proto);
  const isActive = (conn.activeConnections ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left flex items-center gap-4 px-3 py-3
    rounded-xl cursor-pointer
    bg-gradient-to-r from-muted/60 to-muted/30
    dark:from-zinc-800/80 dark:to-zinc-900/60
    border border-sky-500/40 dark:border-sky-400/30
    shadow-sm shadow-sky-500/20 dark:shadow-sky-400/25
    ring-1 ring-inset ring-sky-400/20 dark:ring-sky-500/15
    [box-shadow:0_0_0_1px_rgba(56,189,248,0.15),0_2px_8px_rgba(56,189,248,0.12),0_1px_2px_rgba(0,0,0,0.08)]
    dark:[box-shadow:0_0_0_1px_rgba(56,189,248,0.2),0_2px_12px_rgba(56,189,248,0.18),0_1px_3px_rgba(0,0,0,0.4)]
    hover:border-sky-400/70 dark:hover:border-sky-400/60
    hover:[box-shadow:0_0_0_1px_rgba(56,189,248,0.3),0_4px_16px_rgba(56,189,248,0.25),0_1px_3px_rgba(0,0,0,0.1)]
    dark:hover:[box-shadow:0_0_0_1px_rgba(56,189,248,0.4),0_4px_20px_rgba(56,189,248,0.35),0_2px_4px_rgba(0,0,0,0.5)]
    active:scale-[0.985] active:shadow-sm
    transition-all duration-200"
    >
      {/* Subtle glow layer behind — always visible, intensifies on hover */}
      <span
        className="pointer-events-none absolute inset-0 rounded-xl opacity-40
          group-hover:opacity-100 transition-opacity duration-300"
      />

      {/* Protocol icon */}
      <div
        className={`relative shrink-0 flex items-center justify-center rounded-lg p-2.5
          shadow-sm ring-1 ring-inset ring-white/20 dark:ring-white/10
          transition-transform duration-200 group-hover:scale-105 ${iconBg}`}
      >
        <Tv2 className={`h-4 w-4 ${iconColor}`} />
      </div>

      {/* Name + badges */}
      <div className="relative flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors duration-200">
          {conn.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <Badge variant="outline" className={`text-xs py-0 px-1.5 h-4 font-medium ${badgeColor}`}>
            {proto}
          </Badge>
          {isActive ? (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              Live
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60 font-medium">Ready</span>
          )}
        </div>
      </div>

      {/* Connect CTA */}
      <div
        className="relative shrink-0 flex items-center gap-1.5
        px-2.5 py-1 rounded-lg
        bg-sky-500/8 dark:bg-sky-400/10
        border border-sky-400/25 dark:border-sky-400/20
        text-sky-600 dark:text-sky-400 text-xs font-semibold
        group-hover:bg-sky-500 group-hover:border-sky-500 group-hover:text-white
        group-hover:shadow-[0_0_12px_rgba(14,165,233,0.5)]
        transition-all duration-200"
      >
        Connect
        <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [noticesLoading, setNoticesLoading] = useState(true);

  // ── Fetch all dashboard data ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const params = { token: user.authToken, dataSource: user.dataSource };

    // Connections + Stats (parallel)
    const fetchMain = async () => {
      try {
        const connRes = await axios.get('/api/connections/list', { params });
        setConnections(connRes.data ?? []);
      } catch (err) {
        console.error('Dashboard main fetch error:');
      } finally {
        setLoading(false);
      }
    };

    // Notices
    const fetchNotices = async () => {
      try {
        const res = await axios.get('/api/notices', { params });
        setNotices(res.data?.notices ?? []);
      } catch (err) {
        console.error('Notices fetch error:');
      } finally {
        setNoticesLoading(false);
      }
    };

    fetchMain();
    fetchNotices();
  }, [user]);

  const handleConnectionClick = (id: string) => {
    window.open(`/connection/${id}`, '_blank', 'noopener,noreferrer');
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 p-4 animate-in fade-in duration-300">
      {/* ── Welcome ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-1.5">
            Welcome back, <span className="text-primary">{user?.username}</span>
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Here&apos;s your remote connections.</p>
        </div>
      </div>

      {/* ── Middle Row: My Computers (50%) | Notices (50%) ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 min-h-[50vh] lg:min-h-125">
        {/* ── My Computers ─────────────────────────────────────────────── */}
        <div className="rounded-xl border bg-card shadow-sm flex flex-col h-full">
          <SectionHeader
            icon={Tv2}
            title="My Computers"
            sub={
              loading
                ? 'Loading...'
                : `${connections.length} machine${connections.length !== 1 ? 's' : ''} available`
            }
            action={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 hover:text-primary"
                onClick={() => router.push('/dashboard/connections')}
              >
                Browse <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            }
          />
          <div className="flex flex-col gap-1.5 p-2.5 overflow-y-auto flex-1">
            {loading ? (
              [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
            ) : connections.length > 0 ? (
              connections.map((conn) => (
                <ComputerCard
                  key={conn.identifier}
                  conn={conn}
                  onClick={() => handleConnectionClick(conn.identifier)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                  <Monitor className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground text-center">No computers available</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Notices / News Room ──────────────────────────────────────── */}
        <div className="rounded-xl border bg-card shadow-sm flex flex-col h-full">
          <SectionHeader icon={Megaphone} title="Notices / News Room" sub="Latest announcements" />
          <div className="flex flex-col gap-1.5 p-2.5 overflow-y-auto flex-1">
            {noticesLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
            ) : notices.length > 0 ? (
              notices.map((notice) => {
                const meta = NOTICE_META[notice.type] ?? NOTICE_META['INFO'];
                const NoticeIcon = meta.icon;
                const { date } = formatDate(notice.createdAt);
                return (
                  <div
                    key={notice.id}
                    className={cn('rounded-lg border p-2.5 transition-colors', meta.bg, meta.border)}
                  >
                    <div className="flex items-start gap-2">
                      {notice.isPinned && <Pin className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />}
                      <NoticeIcon className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', meta.color)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-xs font-semibold leading-tight', meta.color)}>
                            {notice.title}
                          </p>
                          {/* ── date badge: theme-aware, no hardcoded bg-white/90 ── */}
                          <span className="text-xs text-muted-foreground bg-background/80 dark:bg-muted/60 border border-border/50 rounded-full px-2 py-0.5 shrink-0 leading-tight">
                            {date}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notice.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="p-3 rounded-full bg-muted">
                  <Megaphone className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground text-center">No announcements yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
