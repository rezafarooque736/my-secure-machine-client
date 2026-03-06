"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Clock,
  Monitor,
  TrendingUp,
  BarChart3,
  PieChart,
  Timer,
  RefreshCw,
  Search,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Shield,
  AlertCircle,
  CheckCircle2,
  Info,
  Wifi,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Session {
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

interface UsageStats {
  totalSessions: number;
  totalDuration: number;
  averageDuration: number;
  lastLogin: string;
  mostUsedProtocol: string;
  activeToday: number;
  protocolUsage: { protocol: string; count: number; duration: number }[];
  sessionHistory: { date: string; sessions: number; duration: number }[];
}

interface AuditLog {
  id: number;
  level: string;
  category: string;
  message: string;
  username?: string | null;
  ipAddress?: string | null;
  metadata?: string | null;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];
const PAGE_SIZE = 10;

const PROTOCOL_COLORS: Record<string, string> = {
  RDP: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  VNC: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  SSH: "bg-green-500/10 text-green-600 border-green-500/20",
  TELNET: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

const AUDIT_LEVEL_META: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  INFO: { icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
  SUCCESS: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  WARN: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
  ERROR: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
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
    full: `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}`,
  };
}

function getProtocolColor(protocol: string) {
  return (
    PROTOCOL_COLORS[protocol?.toUpperCase()] ??
    "bg-gray-500/10 text-gray-500 border-gray-500/20"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card (compact)
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  iconBg = "bg-muted",
  iconColor = "text-muted-foreground",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  loading: boolean;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-3 flex items-center gap-3">
      <div
        className={`shrink-0 flex items-center justify-center rounded-lg p-2 ${iconBg}`}
      >
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        {loading ? (
          <>
            <Skeleton className="h-5 w-14 mb-1" />
            <Skeleton className="h-3 w-20" />
          </>
        ) : (
          <>
            <p className="text-lg font-bold leading-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Button
// ─────────────────────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap
        ${
          active
            ? "bg-background text-foreground shadow-sm border"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

type TabKey = "sessions" | "timeline" | "protocols" | "duration" | "auditlogs";

export default function ActivityPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("sessions");

  // ── Sessions state ────────────────────────────────────────────────────────
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [filterProtocol, setFilterProtocol] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filtersApplied, setFiltersApplied] = useState(false);

  // ── Charts / stats state ──────────────────────────────────────────────────
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Audit logs state (admin) ──────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditCategory, setAuditCategory] = useState("all");
  const [auditLevel, setAuditLevel] = useState("all");

  // ── Derived: unique protocols from sessions ───────────────────────────────
  const protocols = [
    "all",
    ...Array.from(new Set(allSessions.map((s) => s.protocol))),
  ];

  // ── Derived: unique machines ──────────────────────────────────────────────
  const uniqueMachines = new Set(allSessions.map((s) => s.connectionId)).size;

  // ── Derived: active sessions ──────────────────────────────────────────────
  const activeSessions = allSessions.filter(
    (s) => s.status === "ACTIVE",
  ).length;

  // ── Total time ────────────────────────────────────────────────────────────
  const totalMinutes = allSessions.reduce(
    (acc, s) => acc + s.durationMinutes,
    0,
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch: All sessions (no limit — full list for the table)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setSessionsLoading(true);
    try {
      const res = await axios.get("/api/sessions/recent", {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
          limit: 50,
          // Non-admin: filter to own sessions only
          ...(isAdmin ? {} : { username: user.username }),
        },
      });
      const sessions: Session[] = res.data?.sessions ?? [];
      setAllSessions(sessions);
      setFilteredSessions(sessions);
    } catch (err) {
      console.error("Sessions fetch error:", err);
      toast.error("Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  }, [user, isAdmin]);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch: Activity stats (charts)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const res = await axios.get("/api/stats/activity", {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
          username: isAdmin ? undefined : user.username,
        },
      });
      setStats(res.data);
    } catch (err) {
      console.error("Stats fetch error:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [user, isAdmin]);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch: Audit logs (admin only)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchAuditLogs = useCallback(async () => {
    if (!user || !isAdmin) return;
    setAuditLoading(true);
    try {
      const res = await axios.get("/api/admin/audit-logs", {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
          page: auditPage,
          limit: PAGE_SIZE,
          search: auditSearch || undefined,
          category: auditCategory !== "all" ? auditCategory : undefined,
          level: auditLevel !== "all" ? auditLevel : undefined,
        },
      });
      setAuditLogs(res.data?.logs ?? []);
      setAuditTotal(res.data?.total ?? 0);
    } catch (err) {
      console.error("Audit logs fetch error:", err);
      toast.error("Failed to load audit logs");
    } finally {
      setAuditLoading(false);
    }
  }, [user, isAdmin, auditPage, auditSearch, auditCategory, auditLevel]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSessions();
    fetchStats();
  }, [fetchSessions, fetchStats]);

  // ── Load audit logs when tab selected ────────────────────────────────────
  useEffect(() => {
    if (activeTab === "auditlogs") {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  // ─────────────────────────────────────────────────────────────────────────
  // Apply filters
  // ─────────────────────────────────────────────────────────────────────────
  const applyFilters = () => {
    let result = [...allSessions];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.connectionName.toLowerCase().includes(q) ||
          s.username.toLowerCase().includes(q) ||
          s.remoteHost.toLowerCase().includes(q),
      );
    }

    if (filterProtocol !== "all") {
      result = result.filter((s) => s.protocol === filterProtocol);
    }

    if (filterStatus !== "all") {
      result = result.filter((s) => s.status === filterStatus);
    }

    if (filterFrom) {
      const from = new Date(filterFrom);
      result = result.filter((s) => new Date(s.startDate) >= from);
    }

    if (filterTo) {
      const to = new Date(filterTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((s) => new Date(s.startDate) <= to);
    }

    setFilteredSessions(result);
    setCurrentPage(1);
    setFiltersApplied(true);
  };

  const resetFilters = () => {
    setSearch("");
    setFilterProtocol("all");
    setFilterStatus("all");
    setFilterFrom("");
    setFilterTo("");
    setFilteredSessions(allSessions);
    setCurrentPage(1);
    setFiltersApplied(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Pagination
  // ─────────────────────────────────────────────────────────────────────────
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSessions.length / PAGE_SIZE),
  );
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / PAGE_SIZE));

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-4 animate-in fade-in duration-300">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Activity
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Session history, usage stats
            {isAdmin ? ", and system audit logs" : ""}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchSessions();
            fetchStats();
          }}
          disabled={sessionsLoading || statsLoading}
          className="h-8 text-xs gap-1.5"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${sessionsLoading || statsLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* ── Summary Stats Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Monitor}
          label="Total Sessions"
          value={sessionsLoading ? "..." : allSessions.length}
          loading={sessionsLoading}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={Clock}
          label="Total Time"
          value={sessionsLoading ? "..." : formatDuration(totalMinutes)}
          loading={sessionsLoading}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          icon={Wifi}
          label="Active Now"
          value={sessionsLoading ? "..." : activeSessions}
          loading={sessionsLoading}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Unique Machines"
          value={sessionsLoading ? "..." : uniqueMachines}
          loading={sessionsLoading}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 overflow-x-auto">
        <TabBtn
          active={activeTab === "sessions"}
          onClick={() => setActiveTab("sessions")}
          icon={Monitor}
          label="Sessions Table"
        />
        <TabBtn
          active={activeTab === "timeline"}
          onClick={() => setActiveTab("timeline")}
          icon={BarChart3}
          label="Timeline"
        />
        <TabBtn
          active={activeTab === "protocols"}
          onClick={() => setActiveTab("protocols")}
          icon={PieChart}
          label="Protocols"
        />
        <TabBtn
          active={activeTab === "duration"}
          onClick={() => setActiveTab("duration")}
          icon={Clock}
          label="Duration"
        />
        {isAdmin && (
          <TabBtn
            active={activeTab === "auditlogs"}
            onClick={() => setActiveTab("auditlogs")}
            icon={Shield}
            label="Audit Logs"
          />
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: Sessions Table                                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "sessions" && (
        <div className="rounded-xl border bg-card shadow-sm flex flex-col gap-0">
          {/* Filters */}
          <div className="p-3 border-b">
            <div className="flex items-center gap-1.5 mb-3">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">Filters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              {/* Search */}
              <div className="relative md:col-span-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                />
              </div>

              {/* Protocol */}
              <Select value={filterProtocol} onValueChange={setFilterProtocol}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Protocols" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Protocols</SelectItem>
                  {protocols
                    .filter((p) => p !== "all")
                    .map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Status */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DISCONNECTED">Disconnected</SelectItem>
                </SelectContent>
              </Select>

              {/* From Date */}
              <Input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="h-8 text-xs"
                placeholder="From Date"
              />

              {/* To Date */}
              <Input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="h-8 text-xs"
                placeholder="To Date"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                onClick={applyFilters}
                className="h-8 text-xs flex-1 md:flex-none md:w-40 gap-1.5"
              >
                <Filter className="h-3.5 w-3.5" />
                Apply Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="h-8 text-xs gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>

          {/* Row count */}
          <div className="px-3 py-1.5 border-b bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {filteredSessions.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {allSessions.length}
              </span>{" "}
              sessions
              {filtersApplied && (
                <span className="ml-2 text-primary">(filtered)</span>
              )}
            </p>
          </div>

          {/* Table */}
          <div
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "420px" }}
          >
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/70 backdrop-blur-sm z-10">
                <tr className="border-b">
                  {[
                    "Start Date & Time",
                    "End Date & Time",
                    "Machine",
                    "Protocol",
                    "Duration",
                    "IP Address",
                    "Status",
                  ].map((col) => (
                    <th
                      key={col}
                      className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessionsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-3 py-2.5">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginatedSessions.length > 0 ? (
                  paginatedSessions.map((session) => {
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
                          <p className="font-semibold text-foreground">
                            {start.date}
                          </p>
                          <p className="text-muted-foreground">{start.time}</p>
                        </td>
                        {/* End */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          {end ? (
                            <>
                              <p className="font-semibold text-foreground">
                                {end.date}
                              </p>
                              <p className="text-muted-foreground">
                                {end.time}
                              </p>
                            </>
                          ) : (
                            <span className="text-green-600 font-semibold">
                              Active
                            </span>
                          )}
                        </td>
                        {/* Machine */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[140px]">
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
                        <td className="px-3 py-2 text-muted-foreground font-mono">
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
                    <td colSpan={7} className="px-3 py-10 text-center">
                      <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        {filtersApplied
                          ? "No sessions match your filters."
                          : "No sessions recorded yet."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!sessionsLoading && filteredSessions.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Page{" "}
                <span className="font-semibold text-foreground">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {totalPages}
                </span>
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: Timeline                                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "timeline" && (
        <div className="rounded-xl border bg-card shadow-sm p-4">
          <p className="text-sm font-semibold mb-1">Session Activity</p>
          <p className="text-xs text-muted-foreground mb-4">
            Connection sessions over the past 7 days
          </p>
          {statsLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats?.sessionHistory ?? []}>
                <defs>
                  <linearGradient
                    id="colorSessions"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border/50"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  className="text-xs"
                  tick={{ fontSize: 11 }}
                />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSessions)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: Protocols                                                        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "protocols" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pie Chart */}
          <div className="rounded-xl border bg-card shadow-sm p-4">
            <p className="text-sm font-semibold mb-1">Protocol Distribution</p>
            <p className="text-xs text-muted-foreground mb-4">
              Sessions by protocol type
            </p>
            {statsLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <RePieChart>
                  <Pie
                    data={stats?.protocolUsage ?? []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.protocol} (${entry.count})`}
                    outerRadius={90}
                    dataKey="count"
                  >
                    {(stats?.protocolUsage ?? []).map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Protocol Details */}
          <div className="rounded-xl border bg-card shadow-sm p-4">
            <p className="text-sm font-semibold mb-1">Protocol Details</p>
            <p className="text-xs text-muted-foreground mb-4">
              Usage breakdown by protocol
            </p>
            <div
              className="flex flex-col gap-2 overflow-y-auto"
              style={{ maxHeight: "260px" }}
            >
              {statsLoading ? (
                [1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))
              ) : (stats?.protocolUsage ?? []).length > 0 ? (
                (stats?.protocolUsage ?? []).map((proto, i) => (
                  <div
                    key={proto.protocol}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                      <div>
                        <p className="text-sm font-semibold">
                          {proto.protocol}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {proto.count} sessions ·{" "}
                          {formatDuration(proto.duration)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stats?.totalSessions
                        ? `${((proto.count / stats.totalSessions) * 100).toFixed(0)}%`
                        : "0%"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No data available
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: Duration                                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "duration" && (
        <div className="grid grid-cols-1 gap-4">
          {/* Bar chart */}
          <div className="rounded-xl border bg-card shadow-sm p-4">
            <p className="text-sm font-semibold mb-1">Session Duration</p>
            <p className="text-xs text-muted-foreground mb-4">
              Time spent in remote sessions (last 7 days)
            </p>
            {statsLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats?.sessionHistory ?? []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border/50"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Minutes",
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 11 },
                    }}
                  />
                  <Tooltip
                    formatter={(v: number | undefined) =>
                      v !== undefined
                        ? [`${v} minutes`, "Duration"]
                        : ["0 minutes", "Duration"]
                    }
                    contentStyle={{
                      backgroundColor: "oklch(81.1% 0.111 293.571)",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "14px",
                      color: "hsl(var(--foreground))",
                      padding: "4px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      backdropFilter: "blur(4px)",
                      WebkitBackdropFilter: "blur(4px)",
                    }}
                  />
                  <Bar
                    dataKey="duration"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* TAB: Audit Logs (admin only)                                          */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === "auditlogs" && isAdmin && (
        <div className="rounded-xl border bg-card shadow-sm flex flex-col">
          {/* Audit filters */}
          <div className="p-3 border-b flex flex-wrap gap-2 items-end">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={auditSearch}
                onChange={(e) => {
                  setAuditSearch(e.target.value);
                  setAuditPage(1);
                }}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select
              value={auditCategory}
              onValueChange={(v) => {
                setAuditCategory(v);
                setAuditPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs w-[150px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="AUTH">AUTH</SelectItem>
                <SelectItem value="CONNECTION">CONNECTION</SelectItem>
                <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                <SelectItem value="USER_ACTION">USER_ACTION</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={auditLevel}
              onValueChange={(v) => {
                setAuditLevel(v);
                setAuditPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                <SelectItem value="WARN">WARN</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={fetchAuditLogs}
              disabled={auditLoading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${auditLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {/* Audit table */}
          <div
            className="overflow-x-auto overflow-y-auto"
            style={{ maxHeight: "420px" }}
          >
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/70 backdrop-blur-sm z-10">
                <tr className="border-b">
                  {[
                    "Timestamp",
                    "Level",
                    "Category",
                    "User",
                    "IP Address",
                    "Message",
                  ].map((col) => (
                    <th
                      key={col}
                      className="text-left font-medium text-muted-foreground px-3 py-2 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-3 py-2.5">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : auditLogs.length > 0 ? (
                  auditLogs.map((log) => {
                    const meta =
                      AUDIT_LEVEL_META[log.level] ?? AUDIT_LEVEL_META["INFO"];
                    const LevelIcon = meta.icon;
                    const ts = formatDate(log.timestamp);
                    return (
                      <tr
                        key={log.id}
                        className="border-b last:border-0 hover:bg-muted/40 transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <p className="font-medium">{ts.date}</p>
                          <p className="text-muted-foreground">{ts.time}</p>
                        </td>
                        {/* Level */}
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}
                          >
                            <LevelIcon className="h-3 w-3" />
                            {log.level}
                          </span>
                        </td>
                        {/* Category */}
                        <td className="px-3 py-2">
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0 h-5"
                          >
                            {log.category}
                          </Badge>
                        </td>
                        {/* User */}
                        <td className="px-3 py-2 font-medium">
                          {log.username ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        {/* IP */}
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          {log.ipAddress ?? "—"}
                        </td>
                        {/* Message */}
                        <td className="px-3 py-2 max-w-[300px]">
                          <p className="truncate">{log.message}</p>
                          {log.metadata &&
                            (() => {
                              try {
                                const parsed = JSON.parse(log.metadata);
                                return (
                                  <p className="text-muted-foreground/70 truncate mt-0.5">
                                    {Object.entries(parsed)
                                      .map(([k, v]) => `${k}: ${v}`)
                                      .join(" · ")}
                                  </p>
                                );
                              } catch {
                                return null;
                              }
                            })()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center">
                      <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        No audit logs found.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Audit pagination */}
          {!auditLoading && auditTotal > PAGE_SIZE && (
            <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Page{" "}
                <span className="font-semibold text-foreground">
                  {auditPage}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {auditTotalPages}
                </span>{" "}
                ·{" "}
                <span className="font-semibold text-foreground">
                  {auditTotal}
                </span>{" "}
                total
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  disabled={auditPage === 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() =>
                    setAuditPage((p) => Math.min(auditTotalPages, p + 1))
                  }
                  disabled={auditPage === auditTotalPages}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
