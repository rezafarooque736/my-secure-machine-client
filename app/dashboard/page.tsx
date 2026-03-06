"use client";

import { ElementType, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Monitor,
  Activity,
  Clock,
  ArrowRight,
  Sparkles,
  Wifi,
  CalendarClock,
  Megaphone,
  Pin,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  ChevronRight,
  Tv2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface DashboardStats {
  activeSessions: number;
  totalConnections: number;
  totalUsageToday: string;
  totalUsageTodayMinutes: number;
  totalSessionsToday: number;
  totalUsageMonth: string;
  totalUsageMonthMinutes: number;
  totalSessionsMonth: number;
}

interface RecentSession {
  historyEntryIdentifier: string;
  connectionId: string;
  connectionName: string;
  username: string;
  protocol: string;
  remoteHost: string;
  startDate: string;
  endDate: string | null;
  durationMinutes: number;
  durationFormatted: string;
  status: "ACTIVE" | "DISCONNECTED";
}

interface Notice {
  id: number;
  title: string;
  content: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "UPDATE";
  isPinned: boolean;
  createdAt: string;
  createdBy?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const PROTOCOL_COLORS: Record<string, string> = {
  RDP: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  VNC: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  SSH: "bg-green-500/10 text-green-600 border-green-500/20",
  TELNET: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

const PROTOCOL_ICON_BG: Record<string, string> = {
  RDP: "bg-blue-500/10 group-hover:bg-blue-500/20",
  VNC: "bg-purple-500/10 group-hover:bg-purple-500/20",
  SSH: "bg-green-500/10 group-hover:bg-green-500/20",
  TELNET: "bg-yellow-500/10 group-hover:bg-yellow-500/20",
};

const PROTOCOL_ICON_COLOR: Record<string, string> = {
  RDP: "text-blue-500",
  VNC: "text-purple-500",
  SSH: "text-green-500",
  TELNET: "text-yellow-500",
};

function getProtocolColor(protocol: string) {
  return (
    PROTOCOL_COLORS[protocol?.toUpperCase()] ??
    "bg-gray-500/10 text-gray-500 border-gray-500/20"
  );
}

function getProtocolIconBg(protocol: string) {
  return (
    PROTOCOL_ICON_BG[protocol?.toUpperCase()] ??
    "bg-gray-500/10 group-hover:bg-gray-500/20"
  );
}

function getProtocolIconColor(protocol: string) {
  return PROTOCOL_ICON_COLOR[protocol?.toUpperCase()] ?? "text-gray-500";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  };
}

{
  /* ── Notice type metadata ── update NOTICE_META colors to use theme tokens */
}
const NOTICE_META: Record<
  string,
  { icon: ElementType; bg: string; border: string; color: string }
> = {
  INFO: {
    icon: Info,
    bg: "bg-blue-500/8  dark:bg-blue-500/12",
    border: "border-blue-500/20 dark:border-blue-500/30",
    color: "text-blue-600 dark:text-blue-400",
  },
  WARNING: {
    icon: AlertTriangle,
    bg: "bg-amber-500/8  dark:bg-amber-500/12",
    border: "border-amber-500/20 dark:border-amber-500/30",
    color: "text-amber-600 dark:text-amber-400",
  },
  ERROR: {
    icon: AlertCircle,
    bg: "bg-red-500/8  dark:bg-red-500/12",
    border: "border-red-500/20 dark:border-red-500/30",
    color: "text-red-600 dark:text-red-400",
  },
  SUCCESS: {
    icon: CheckCircle,
    bg: "bg-green-500/8  dark:bg-green-500/12",
    border: "border-green-500/20 dark:border-green-500/30",
    color: "text-green-600 dark:text-green-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Compact Stat Card
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  iconColor = "text-muted-foreground",
  iconBg = "bg-muted",
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  sub?: string;
  loading: boolean;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-3 flex items-center gap-3 min-w-0">
      <div
        className={`shrink-0 flex items-center justify-center rounded-lg p-2 ${iconBg}`}
      >
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        {loading ? (
          <>
            <Skeleton className="h-5 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <p className="text-lg font-bold leading-tight truncate">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            {sub && (
              <p className="text-xs text-muted-foreground/70 truncate">{sub}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Header
// ─────────────────────────────────────────────────────────────────────────────

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
    <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">
            {title}
          </p>
          {sub && (
            <p className="text-xs text-muted-foreground truncate">{sub}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// My Computer Card — beautiful button-like card per connection
// ─────────────────────────────────────────────────────────────────────────────

function ComputerCard({
  conn,
  onClick,
}: {
  conn: Connection;
  onClick: () => void;
}) {
  const proto = conn.protocol?.toUpperCase() ?? "RDP";
  const iconBg = getProtocolIconBg(proto);
  const iconColor = getProtocolIconColor(proto);
  const badgeColor = getProtocolColor(proto);
  const isActive = (conn.activeConnections ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left flex items-center gap-3 px-3 py-2.5
        rounded-xl border border-border bg-card
        hover:border-primary/40 hover:bg-accent hover:shadow-md
        active:scale-[0.98] transition-all duration-150 cursor-pointer"
    >
      {/* Protocol icon */}
      <div
        className={`shrink-0 flex items-center justify-center rounded-lg p-2.5
          transition-colors duration-150 ${iconBg}`}
      >
        <Tv2 className={`h-4 w-4 ${iconColor}`} />
      </div>

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
          {conn.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <Badge
            variant="outline"
            className={`text-xs py-0 px-1.5 h-4 font-medium ${badgeColor}`}
          >
            {proto}
          </Badge>
          {isActive && (
            <span className="flex items-center gap-0.5 text-xs text-green-600 font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              Live
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ArrowRight
        className="h-4 w-4 text-muted-foreground shrink-0
          group-hover:text-primary group-hover:translate-x-0.5
          transition-all duration-150"
      />
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [noticesLoading, setNoticesLoading] = useState(true);

  // ── Fetch all dashboard data ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const params = { token: user.authToken, dataSource: user.dataSource };

    // Connections + Stats (parallel)
    const fetchMain = async () => {
      try {
        const [connRes, statsRes] = await Promise.all([
          axios.get("/api/connections/list", { params }),
          axios.get("/api/stats/dashboard", { params }),
        ]);
        setConnections(connRes.data ?? []);
        setStats(statsRes.data ?? null);
      } catch (err) {
        console.error("Dashboard main fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    // Recent sessions
    const fetchSessions = async () => {
      try {
        const res = await axios.get("/api/sessions/recent", {
          params: { ...params, limit: 5 },
        });
        setRecentSessions(res.data?.sessions ?? []);
        setTotalSessions(res.data?.total ?? 0);
      } catch (err) {
        console.error("Recent sessions fetch error:", err);
      } finally {
        setSessionsLoading(false);
      }
    };

    // Notices
    const fetchNotices = async () => {
      try {
        const res = await axios.get("/api/notices", { params });
        setNotices(res.data?.notices ?? []);
      } catch (err) {
        console.error("Notices fetch error:", err);
      } finally {
        setNoticesLoading(false);
      }
    };

    fetchMain();
    fetchSessions();
    fetchNotices();
  }, [user]);

  const handleConnectionClick = (id: string) => {
    window.open(`/connection/${id}`, "_blank", "noopener,noreferrer");
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-4 animate-in fade-in duration-300">
      {/* ── Welcome ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-1.5">
            Welcome back, <span className="text-primary">{user?.username}</span>
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Here&apos;s what&apos;s happening with your remote connections
            today.
          </p>
        </div>
      </div>

      {/* ── Compact Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Monitor}
          label="Total Connections"
          value={stats?.totalConnections ?? connections.length}
          sub="Available machines"
          loading={loading}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={Wifi}
          label="Active Sessions"
          value={stats?.activeSessions ?? 0}
          sub="Currently connected"
          loading={loading}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          icon={Clock}
          label="Usage Today"
          value={stats?.totalUsageToday ?? "0m"}
          sub={`${stats?.totalSessionsToday ?? 0} session${(stats?.totalSessionsToday ?? 0) !== 1 ? "s" : ""} today`}
          loading={loading}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          icon={CalendarClock}
          label="Usage This Month"
          value={stats?.totalUsageMonth ?? "0h"}
          sub={`${stats?.totalSessionsMonth ?? 0} session${(stats?.totalSessionsMonth ?? 0) !== 1 ? "s" : ""} this month`}
          loading={loading}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
      </div>

      {/* ── Middle Row: My Computers (50%) | Notices (50%) ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── My Computers ─────────────────────────────────────────────── */}
        <div className="rounded-xl border bg-card shadow-sm flex flex-col">
          <SectionHeader
            icon={Tv2}
            title="My Computers"
            sub={
              loading
                ? "Loading..."
                : `${connections.length} machine${connections.length !== 1 ? "s" : ""} available`
            }
            action={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => router.push("/dashboard/connections")}
              >
                Browse <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            }
          />
          <div
            className="flex flex-col gap-1.5 p-2 overflow-y-auto"
            style={{ maxHeight: "260px" }}
          >
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))
            ) : connections.length > 0 ? (
              connections.map((conn) => (
                <ComputerCard
                  key={conn.identifier}
                  conn={conn}
                  onClick={() => handleConnectionClick(conn.identifier)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="p-3 rounded-full bg-muted">
                  <Monitor className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  No computers available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Notices / News Room ──────────────────────────────────────── */}
        <div className="rounded-xl border bg-card shadow-sm flex flex-col">
          <SectionHeader
            icon={Megaphone}
            title="Notices / News Room"
            sub="Latest announcements"
          />
          <div
            className="flex flex-col gap-1.5 p-2 overflow-y-auto"
            style={{ maxHeight: "260px" }}
          >
            {noticesLoading ? (
              [1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : notices.length > 0 ? (
              notices.map((notice) => {
                const meta = NOTICE_META[notice.type] ?? NOTICE_META["INFO"];
                const NoticeIcon = meta.icon;
                const { date } = formatDate(notice.createdAt);
                return (
                  <div
                    key={notice.id}
                    className={cn(
                      "rounded-lg border p-2.5 transition-colors",
                      meta.bg,
                      meta.border,
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {notice.isPinned && (
                        <Pin className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <NoticeIcon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 mt-0.5",
                          meta.color,
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-xs font-semibold leading-tight",
                              meta.color,
                            )}
                          >
                            {notice.title}
                          </p>
                          {/* ── date badge: theme-aware, no hardcoded bg-white/90 ── */}
                          <span className="text-xs text-muted-foreground bg-background/80 dark:bg-muted/60 border border-border/50 rounded-full px-2 py-0.5 shrink-0 leading-tight">
                            {date}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notice.content}
                        </p>
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
                <p className="text-xs text-muted-foreground text-center">
                  No announcements yet
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Sessions Table (bottom) ───────────────────────────────── */}
      <div className="rounded-xl border bg-card shadow-sm flex flex-col">
        <SectionHeader
          icon={Activity}
          title="Recent Sessions"
          sub={
            sessionsLoading
              ? "Loading..."
              : `Showing latest 5 of ${totalSessions} total`
          }
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => router.push("/dashboard/activity")}
            >
              More <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          }
        />

        {/* Table wrapper with overflow */}
        <div
          className="overflow-x-auto overflow-y-auto"
          style={{ maxHeight: "280px" }}
        >
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm z-10">
              <tr className="border-b">
                <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">
                  Start Date &amp; Time
                </th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">
                  End Date &amp; Time
                </th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">
                  Machine
                </th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2">
                  Protocol
                </th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2">
                  Duration
                </th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2">
                  IP Address
                </th>
                <th className="text-left font-medium text-muted-foreground px-3 py-2">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sessionsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-3 py-2">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : recentSessions.length > 0 ? (
                recentSessions.map((session) => {
                  const start = formatDate(session.startDate);
                  const end = session.endDate
                    ? formatDate(session.endDate)
                    : null;
                  return (
                    <tr
                      key={session.historyEntryIdentifier}
                      className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                    >
                      {/* Start */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <p className="font-medium text-foreground">
                          {start.date}
                        </p>
                        <p className="text-muted-foreground">{start.time}</p>
                      </td>
                      {/* End */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        {end ? (
                          <>
                            <p className="font-medium text-foreground">
                              {end.date}
                            </p>
                            <p className="text-muted-foreground">{end.time}</p>
                          </>
                        ) : (
                          <span className="text-green-600 font-medium">
                            Active
                          </span>
                        )}
                      </td>
                      {/* Machine */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[130px]">
                            {session.connectionName}
                          </span>
                        </div>
                      </td>
                      {/* Protocol */}
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 py-0 h-5 ${getProtocolColor(session.protocol)}`}
                        >
                          {session.protocol}
                        </Badge>
                      </td>
                      {/* Duration */}
                      <td className="px-3 py-2 font-medium">
                        {session.durationFormatted}
                      </td>
                      {/* IP */}
                      <td className="px-3 py-2 text-muted-foreground">
                        {session.remoteHost}
                      </td>
                      {/* Status */}
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={
                            session.status === "ACTIVE"
                              ? "border-green-500/30 bg-green-50 text-green-600 text-xs px-1.5 py-0 h-5"
                              : "border-red-500/30 bg-red-50 text-red-600 text-xs px-1.5 py-0 h-5"
                          }
                        >
                          {session.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Activity className="h-6 w-6 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">
                        No sessions recorded yet
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!sessionsLoading && recentSessions.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {recentSessions.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {totalSessions}
              </span>{" "}
              sessions
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => router.push("/dashboard/activity")}
            >
              View All Sessions
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
