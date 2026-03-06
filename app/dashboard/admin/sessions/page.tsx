"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import axios from "axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Monitor,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  User,
  Clock,
  Database,
  Activity,
  XCircle,
  Globe,
  Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ActiveSession {
  id: string; // "dataSource:connectionId"
  connectionId: string;
  dataSource: string;
  username: string;
  remoteHost: string | null;
  startDate: string | null;
  connectionName: string;
  connectionIdentifier: string;
  protocol: string;
  duration: number; // seconds
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " " +
      d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    );
  } catch {
    return "—";
  }
}

function getProtocolColor(protocol: string): string {
  const map: Record<string, string> = {
    rdp: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    vnc: "bg-green-500/10 text-green-600 border-green-500/20",
    ssh: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    telnet: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  };
  return (
    map[protocol.toLowerCase()] ??
    "bg-gray-500/10 text-gray-600 border-gray-500/20"
  );
}

function getInitials(username: string): string {
  return username.substring(0, 2).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats bar
// ─────────────────────────────────────────────────────────────────────────────

function StatsBar({
  sessions,
  loading,
  lastRefresh,
}: {
  sessions: ActiveSession[];
  loading: boolean;
  lastRefresh: Date | null;
}) {
  const byProtocol = sessions.reduce(
    (acc, s) => {
      const p = s.protocol.toLowerCase();
      acc[p] = (acc[p] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const byDs = sessions.reduce(
    (acc, s) => {
      acc[s.dataSource] = (acc[s.dataSource] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {/* Total */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
        <Wifi className="h-3.5 w-3.5 text-green-600" />
        {loading ? (
          <Skeleton className="h-3 w-8" />
        ) : (
          <span className="font-bold text-green-600">
            {sessions.length} active
          </span>
        )}
      </div>

      {/* By protocol */}
      {!loading &&
        Object.entries(byProtocol).map(([proto, count]) => (
          <span
            key={proto}
            className={`px-2 py-0.5 rounded-full border text-xs font-medium ${getProtocolColor(proto)}`}
          >
            {proto.toUpperCase()}: {count}
          </span>
        ))}

      {/* Divider */}
      {!loading && Object.keys(byDs).length > 0 && (
        <span className="text-border">|</span>
      )}

      {/* By dataSource */}
      {!loading &&
        Object.entries(byDs).map(([ds, count]) => (
          <span
            key={ds}
            className="flex items-center gap-1 text-muted-foreground"
          >
            <Database className="h-3 w-3" />
            {ds}: {count}
          </span>
        ))}

      {/* Last refresh */}
      {lastRefresh && (
        <span className="ml-auto text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Updated {formatTime(lastRefresh.toISOString())}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live duration counter — ticks every second
// ─────────────────────────────────────────────────────────────────────────────

function LiveDuration({ startDate }: { startDate: string | null }) {
  const [seconds, setSeconds] = useState(
    startDate
      ? Math.floor((Date.now() - new Date(startDate).getTime()) / 1000)
      : 0,
  );

  useEffect(() => {
    if (!startDate) return;
    const id = setInterval(() => {
      setSeconds(
        Math.floor((Date.now() - new Date(startDate).getTime()) / 1000),
      );
    }, 1000);
    return () => clearInterval(id);
  }, [startDate]);

  return (
    <span className="font-mono text-xs text-green-600 font-semibold">
      {formatDuration(seconds)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const AUTO_REFRESH_INTERVAL = 15_000; // 15 seconds — matches Guacamole's own poll

export default function AdminSessionsPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [killTarget, setKillTarget] = useState<ActiveSession | null>(null);
  const [killing, setKilling] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDs, setFilterDs] = useState<string>("all");
  const [filterProto, setFilterProto] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Guard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  // ── Fetch sessions ─────────────────────────────────────────────────────────
  const fetchSessions = useCallback(
    async (silent = false) => {
      if (!user) return;
      if (!silent) setLoading(true);
      try {
        const res = await axios.get("/api/admin/active-sessions", {
          params: {
            token: user.authToken,
            dataSource: user.dataSource,
            allDataSources: (
              user.availableDataSources ?? [user.dataSource]
            ).join(","),
          },
        });
        setSessions(res.data?.sessions ?? []);
        setLastRefresh(new Date());
      } catch (err: any) {
        if (!silent) {
          toast.error(err?.response?.data?.error ?? "Failed to load sessions");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user],
  );

  // Initial load
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-refresh every 15 s
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(
        () => fetchSessions(true),
        AUTO_REFRESH_INTERVAL,
      );
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, fetchSessions]);

  // ── Kill session ──────────────────────────────────────────────────────────
  const handleKill = async () => {
    if (!user || !killTarget) return;
    setKilling(true);
    try {
      await axios.delete("/api/admin/active-sessions", {
        params: {
          token: user.authToken,
          dataSource: killTarget.dataSource,
          connectionId: killTarget.connectionId,
        },
      });
      toast.success(`Session for "${killTarget.username}" terminated`);
      setKillTarget(null);
      fetchSessions(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to terminate session");
    } finally {
      setKilling(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const allDataSources = Array.from(new Set(sessions.map((s) => s.dataSource)));
  const allProtocols = Array.from(
    new Set(sessions.map((s) => s.protocol.toLowerCase())),
  );

  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.username.toLowerCase().includes(q) ||
      s.connectionName.toLowerCase().includes(q) ||
      s.remoteHost?.toLowerCase().includes(q) ||
      s.protocol.toLowerCase().includes(q);

    const matchDs = filterDs === "all" || s.dataSource === filterDs;
    const matchProto =
      filterProto === "all" || s.protocol.toLowerCase() === filterProto;

    return matchSearch && matchDs && matchProto;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-4 animate-in fade-in duration-300">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Active Sessions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live view of all active Guacamole connections. Auto-refreshes every
            15 s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2
              border-transparent transition-colors ${autoRefresh ? "bg-primary" : "bg-input"}`}
            role="switch"
            aria-checked={autoRefresh}
            title={autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow
                ring-0 transition-transform ${autoRefresh ? "translate-x-4" : "translate-x-0"}`}
            />
          </button>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {autoRefresh ? "Auto" : "Manual"}
          </span>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => fetchSessions()}
            disabled={loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <StatsBar
        sessions={sessions}
        loading={loading}
        lastRefresh={lastRefresh}
      />

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search user, connection, host…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* DataSource filter */}
        {allDataSources.length > 1 && (
          <select
            value={filterDs}
            onChange={(e) => setFilterDs(e.target.value)}
            className="h-8 text-xs px-2 rounded-md border border-input bg-background
              text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Sources</option>
            {allDataSources.map((ds) => (
              <option key={ds} value={ds}>
                {ds}
              </option>
            ))}
          </select>
        )}

        {/* Protocol filter */}
        {allProtocols.length > 1 && (
          <select
            value={filterProto}
            onChange={(e) => setFilterProto(e.target.value)}
            className="h-8 text-xs px-2 rounded-md border border-input bg-background
              text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Protocols</option>
            {allProtocols.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        )}

        <span className="text-xs text-muted-foreground">
          {loading ? "…" : `${filtered.length} of ${sessions.length}`}
        </span>
      </div>

      {/* ── Sessions Table ─────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/70 border-b">
              <tr>
                {[
                  "User",
                  "Connection",
                  "Protocol",
                  "Remote Host",
                  "Data Source",
                  "Started",
                  "Duration",
                  "Action",
                ].map((col) => (
                  <th
                    key={col}
                    className="text-left font-medium text-muted-foreground
                      px-3 py-2.5 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((session) => (
                  <tr
                    key={session.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    {/* User */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded-full bg-gradient-to-br
                          from-blue-500 to-purple-600 flex items-center justify-center
                          text-white text-xs font-bold shrink-0 select-none"
                        >
                          {getInitials(session.username)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-medium">
                            {session.username}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Connection */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Monitor className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate max-w-[160px]">
                          {session.connectionName}
                        </span>
                      </div>
                      <p className="text-muted-foreground font-mono text-xs mt-0.5">
                        ID: {session.connectionIdentifier}
                      </p>
                    </td>

                    {/* Protocol */}
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className={`text-xs px-1.5 py-0 h-5 uppercase font-mono
                          ${getProtocolColor(session.protocol)}`}
                      >
                        {session.protocol}
                      </Badge>
                    </td>

                    {/* Remote Host */}
                    <td className="px-3 py-2.5">
                      {session.remoteHost ? (
                        <div className="flex items-center gap-1 text-muted-foreground font-mono">
                          <Globe className="h-3 w-3 shrink-0" />
                          {session.remoteHost}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">—</span>
                      )}
                    </td>

                    {/* Data Source */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Database className="h-3 w-3 shrink-0" />
                        <span className="font-mono">{session.dataSource}</span>
                      </div>
                    </td>

                    {/* Started */}
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(session.startDate)}
                    </td>

                    {/* Duration — live ticker */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-green-500 shrink-0" />
                        <LiveDuration startDate={session.startDate} />
                      </div>
                    </td>

                    {/* Kill action */}
                    <td className="px-3 py-2.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1.5 text-red-500 hover:text-red-600
                          hover:bg-red-50 px-2"
                        onClick={() => setKillTarget(session)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Kill
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <WifiOff className="h-10 w-10 text-muted-foreground/20" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          No active sessions
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          {search || filterDs !== "all" || filterProto !== "all"
                            ? "No sessions match your filters."
                            : "There are currently no active Guacamole connections."}
                        </p>
                      </div>
                      {!search &&
                        filterDs === "all" &&
                        filterProto === "all" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5 mt-1"
                            onClick={() => fetchSessions()}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Check again
                          </Button>
                        )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Kill Confirm Dialog ─────────────────────────────────────────── */}
      <AlertDialog
        open={!!killTarget}
        onOpenChange={(o) => {
          if (!o && !killing) setKillTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Terminate Session
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <span>
                  Are you sure you want to forcefully terminate the active
                  session for{" "}
                  <span className="font-semibold text-foreground">
                    {killTarget?.username}
                  </span>
                  ?
                </span>

                {/* Session summary */}
                {killTarget && (
                  <div className="mt-3 rounded-lg border bg-muted/40 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Connection</span>
                      <span className="font-medium">
                        {killTarget.connectionName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Protocol</span>
                      <Badge
                        variant="outline"
                        className={`text-xs px-1.5 py-0 h-4 ${getProtocolColor(killTarget.protocol)}`}
                      >
                        {killTarget.protocol.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data Source</span>
                      <span className="font-mono">{killTarget.dataSource}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Started</span>
                      <span>{formatDateTime(killTarget.startDate)}</span>
                    </div>
                  </div>
                )}

                <span className="block text-xs text-muted-foreground">
                  The user will be disconnected immediately. This action cannot
                  be undone.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-8 text-xs"
              onClick={() => setKillTarget(null)}
              disabled={killing}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs bg-destructive hover:bg-destructive/90 gap-1.5"
              onClick={handleKill}
              disabled={killing}
            >
              {killing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {killing ? "Terminating…" : "Terminate Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
