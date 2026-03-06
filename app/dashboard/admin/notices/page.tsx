"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Megaphone,
  Plus,
  RefreshCw,
  Pin,
  PinOff,
  Trash2,
  Eye,
  EyeOff,
  Info,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Search,
  CalendarClock,
  User,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type NoticeType = "INFO" | "WARNING" | "SUCCESS" | "UPDATE";

interface Notice {
  id: number;
  title: string;
  content: string;
  type: NoticeType;
  isPinned: boolean;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
}

interface CreateForm {
  title: string;
  content: string;
  type: NoticeType;
  isPinned: boolean;
  expiresAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const NOTICE_META: Record<
  NoticeType,
  {
    icon: React.ElementType;
    color: string;
    border: string;
    bg: string;
    badgeClass: string;
    label: string;
  }
> = {
  INFO: {
    icon: Info,
    color: "text-blue-600",
    border: "border-blue-200",
    bg: "bg-blue-50",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    label: "Info",
  },
  WARNING: {
    icon: AlertTriangle,
    color: "text-amber-600",
    border: "border-amber-200",
    bg: "bg-amber-50",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    label: "Warning",
  },
  SUCCESS: {
    icon: CheckCircle2,
    color: "text-green-600",
    border: "border-green-200",
    bg: "bg-green-50",
    badgeClass: "bg-green-500/10 text-green-600 border-green-500/20",
    label: "Success",
  },
  UPDATE: {
    icon: Zap,
    color: "text-purple-600",
    border: "border-purple-200",
    bg: "bg-purple-50",
    badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    label: "Update",
  },
};

const EMPTY_FORM: CreateForm = {
  title: "",
  content: "",
  type: "INFO",
  isPinned: false,
  expiresAt: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );
}

function isExpired(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// ─────────────────────────────────────────────────────────────────────────────
// Notice Preview Card (mirrors exact dashboard render)
// ─────────────────────────────────────────────────────────────────────────────

function NoticePreviewCard({
  notice,
}: {
  notice: Partial<CreateForm> & { createdAt?: string };
}) {
  const type = (notice.type ?? "INFO") as NoticeType;
  const meta = NOTICE_META[type];
  const Icon = meta.icon;

  return (
    <div className={`rounded-lg border p-2 ${meta.bg} ${meta.border}`}>
      <div className="flex items-start gap-1.5">
        {notice.isPinned && (
          <Pin className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${meta.color}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold leading-tight ${meta.color}`}>
            {notice.title || (
              <span className="italic opacity-60">Title preview</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notice.content || (
              <span className="italic opacity-60">Content preview</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            {notice.createdAt ? formatDate(notice.createdAt) : "Just now"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats Bar
// ─────────────────────────────────────────────────────────────────────────────

function StatsBar({
  notices,
  loading,
}: {
  notices: Notice[];
  loading: boolean;
}) {
  const stats = {
    total: notices.length,
    active: notices.filter((n) => n.isActive && !isExpired(n.expiresAt)).length,
    pinned: notices.filter((n) => n.isPinned).length,
    expired: notices.filter((n) => isExpired(n.expiresAt)).length,
    inactive: notices.filter((n) => !n.isActive).length,
  };

  const items = [
    { label: "Total", value: stats.total, color: "text-foreground" },
    { label: "Active", value: stats.active, color: "text-green-600" },
    { label: "Pinned", value: stats.pinned, color: "text-blue-600" },
    { label: "Expired", value: stats.expired, color: "text-red-500" },
    {
      label: "Inactive",
      value: stats.inactive,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1">
          {i > 0 && <span className="text-border">·</span>}
          <span className="text-muted-foreground">{item.label}:</span>
          {loading ? (
            <Skeleton className="h-3 w-5 inline-block" />
          ) : (
            <span className={`font-bold ${item.color}`}>{item.value}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminNoticesPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | NoticeType>("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive" | "expired"
  >("all");

  // ── Create dialog ─────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);

  // ── Guard: admin only ─────────────────────────────────────────────────────
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  // ─────────────────────────────────────────────────────────────────────────
  // Fetch all notices (includeInactive for admin)
  // ─────────────────────────────────────────────────────────────────────────
  const fetchNotices = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get("/api/notices", {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
          includeInactive: true,
        },
      });
      setNotices(res.data?.notices ?? []);
    } catch (err) {
      console.error("Notices fetch error:", err);
      toast.error("Failed to load notices");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // ─────────────────────────────────────────────────────────────────────────
  // Derived: filtered list
  // ─────────────────────────────────────────────────────────────────────────
  const filtered = notices.filter((n) => {
    const matchesSearch =
      !search.trim() ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === "all" || n.type === filterType;

    const matchesStatus = (() => {
      if (filterStatus === "all") return true;
      if (filterStatus === "expired") return isExpired(n.expiresAt);
      if (filterStatus === "active")
        return n.isActive && !isExpired(n.expiresAt);
      if (filterStatus === "inactive") return !n.isActive;
      return true;
    })();

    return matchesSearch && matchesType && matchesStatus;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** Toggle isActive */
  const handleToggleActive = async (notice: Notice) => {
    if (!user) return;
    setActionLoading(notice.id);
    try {
      await axios.patch("/api/notices", {
        token: user.authToken,
        dataSource: user.dataSource,
        id: notice.id,
        isActive: !notice.isActive,
      });
      toast.success(
        notice.isActive ? "Notice deactivated" : "Notice activated",
      );
      await fetchNotices();
    } catch {
      toast.error("Failed to update notice");
    } finally {
      setActionLoading(null);
    }
  };

  /** Toggle isPinned */
  const handleTogglePin = async (notice: Notice) => {
    if (!user) return;
    setActionLoading(notice.id);
    try {
      await axios.patch("/api/notices", {
        token: user.authToken,
        dataSource: user.dataSource,
        id: notice.id,
        isPinned: !notice.isPinned,
      });
      toast.success(notice.isPinned ? "Notice unpinned" : "Notice pinned");
      await fetchNotices();
    } catch {
      toast.error("Failed to update notice");
    } finally {
      setActionLoading(null);
    }
  };

  /** Delete */
  const handleDelete = async () => {
    if (!user || !deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      await axios.delete("/api/notices", {
        data: {
          token: user.authToken,
          dataSource: user.dataSource,
          id: deleteTarget.id,
        },
      });
      toast.success(`Notice "${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
      await fetchNotices();
    } catch {
      toast.error("Failed to delete notice");
    } finally {
      setActionLoading(null);
    }
  };

  /** Create */
  const handleCreate = async () => {
    if (!user) return;

    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.content.trim()) {
      toast.error("Content is required");
      return;
    }

    setCreating(true);
    try {
      await axios.post("/api/notices", {
        token: user.authToken,
        dataSource: user.dataSource,
        title: form.title.trim(),
        content: form.content.trim(),
        type: form.type,
        isPinned: form.isPinned,
        expiresAt: form.expiresAt || null,
      });
      toast.success("Notice created successfully");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      await fetchNotices();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to create notice");
    } finally {
      setCreating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-4 animate-in fade-in duration-300">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Notices Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create and manage dashboard announcements visible to all users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotices}
            disabled={loading}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setForm(EMPTY_FORM);
              setShowCreate(true);
            }}
            className="h-8 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New Notice
          </Button>
        </div>
      </div>

      {/* ── Stats Bar ────────────────────────────────────────────────────── */}
      <StatsBar notices={notices} loading={loading} />

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search notices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Type filter */}
        <Select
          value={filterType}
          onValueChange={(v) => setFilterType(v as typeof filterType)}
        >
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="INFO">Info</SelectItem>
            <SelectItem value="WARNING">Warning</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
        >
          <SelectTrigger className="h-8 text-xs w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground">
          {loading ? "..." : `${filtered.length} of ${notices.length}`}
        </span>
      </div>

      {/* ── Notices Table ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/70 border-b">
              <tr>
                {[
                  "Type",
                  "Title & Content",
                  "Status",
                  "Pinned",
                  "Created By",
                  "Created At",
                  "Expires At",
                  "Actions",
                ].map((col) => (
                  <th
                    key={col}
                    className="text-left font-medium text-muted-foreground px-3 py-2.5 whitespace-nowrap"
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
                filtered.map((notice) => {
                  const meta = NOTICE_META[notice.type];
                  const Icon = meta.icon;
                  const busy = actionLoading === notice.id;
                  const expired = isExpired(notice.expiresAt);

                  return (
                    <tr
                      key={notice.id}
                      className={`border-b last:border-0 transition-colors
                        ${!notice.isActive || expired ? "opacity-60 bg-muted/20" : "hover:bg-muted/30"}`}
                    >
                      {/* Type */}
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-xs px-1.5 py-0 h-5 gap-1 ${meta.badgeClass}`}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </Badge>
                      </td>

                      {/* Title & Content */}
                      <td className="px-3 py-2.5 max-w-[280px]">
                        <div className="flex items-center gap-1.5">
                          {notice.isPinned && (
                            <Pin className="h-3 w-3 text-blue-500 shrink-0" />
                          )}
                          <p className="font-semibold text-foreground truncate">
                            {notice.title}
                          </p>
                        </div>
                        <p className="text-muted-foreground truncate mt-0.5">
                          {notice.content}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5">
                        {expired ? (
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0 h-5 bg-red-50 text-red-500 border-red-200"
                          >
                            Expired
                          </Badge>
                        ) : notice.isActive ? (
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0 h-5 bg-green-50 text-green-600 border-green-200"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0 h-5 bg-muted text-muted-foreground"
                          >
                            Inactive
                          </Badge>
                        )}
                      </td>

                      {/* Pinned */}
                      <td className="px-3 py-2.5">
                        {notice.isPinned ? (
                          <span className="inline-flex items-center gap-1 text-blue-600">
                            <Pin className="h-3.5 w-3.5" />
                            <span>Yes</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Created By */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3 shrink-0" />
                          <span>{notice.createdBy ?? "system"}</span>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatDate(notice.createdAt)}</span>
                        </div>
                      </td>

                      {/* Expires At */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {notice.expiresAt ? (
                          <div
                            className={`flex items-center gap-1 ${expired ? "text-red-500" : "text-muted-foreground"}`}
                          >
                            <CalendarClock className="h-3 w-3 shrink-0" />
                            <span>{formatDate(notice.expiresAt)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {/* Pin / Unpin */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title={notice.isPinned ? "Unpin" : "Pin to top"}
                            disabled={busy}
                            onClick={() => handleTogglePin(notice)}
                          >
                            {notice.isPinned ? (
                              <PinOff className="h-3.5 w-3.5 text-blue-500" />
                            ) : (
                              <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </Button>

                          {/* Activate / Deactivate */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title={notice.isActive ? "Deactivate" : "Activate"}
                            disabled={busy || expired}
                            onClick={() => handleToggleActive(notice)}
                          >
                            {notice.isActive ? (
                              <EyeOff className="h-3.5 w-3.5 text-amber-500" />
                            ) : (
                              <Eye className="h-3.5 w-3.5 text-green-600" />
                            )}
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:text-red-600 hover:bg-red-50"
                            title="Delete"
                            disabled={busy}
                            onClick={() => setDeleteTarget(notice)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Megaphone className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">
                        {search ||
                        filterType !== "all" ||
                        filterStatus !== "all"
                          ? "No notices match your filters."
                          : "No notices yet. Create your first one."}
                      </p>
                      {!search &&
                        filterType === "all" &&
                        filterStatus === "all" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs mt-1 gap-1.5"
                            onClick={() => {
                              setForm(EMPTY_FORM);
                              setShowCreate(true);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Create Notice
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Create Dialog                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showCreate}
        onOpenChange={(o) => {
          if (!creating) {
            setShowCreate(o);
            if (!o) setForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Create New Notice
            </DialogTitle>
            <DialogDescription>
              This notice will appear in the News Room panel on every user's
              dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
            {/* ── Left: Form ──────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="n-title" className="text-xs font-semibold">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="n-title"
                  placeholder="e.g. Scheduled Maintenance Tonight"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="h-8 text-xs"
                  maxLength={120}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {form.title.length}/120
                </p>
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <Label htmlFor="n-content" className="text-xs font-semibold">
                  Content <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="n-content"
                  placeholder="Describe the notice in detail..."
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  rows={4}
                  className="text-xs resize-none"
                  maxLength={600}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {form.content.length}/600
                </p>
              </div>

              {/* Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm({ ...form, type: v as NoticeType })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFO">
                      <span className="flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-blue-600" /> Info
                      </span>
                    </SelectItem>
                    <SelectItem value="WARNING">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />{" "}
                        Warning
                      </span>
                    </SelectItem>
                    <SelectItem value="SUCCESS">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />{" "}
                        Success
                      </span>
                    </SelectItem>
                    <SelectItem value="UPDATE">
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-purple-600" /> Update
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expires At */}
              <div className="space-y-1.5">
                <Label htmlFor="n-expires" className="text-xs font-semibold">
                  Expires At{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="n-expires"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) =>
                    setForm({ ...form, expiresAt: e.target.value })
                  }
                  className="h-8 text-xs"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to never expire.
                </p>
              </div>

              {/* Pin toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isPinned: !form.isPinned })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors
                    ${form.isPinned ? "bg-primary" : "bg-input"}`}
                  role="switch"
                  aria-checked={form.isPinned}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform
                      ${form.isPinned ? "translate-x-4" : "translate-x-0"}`}
                  />
                </button>
                <Label className="text-xs cursor-pointer select-none">
                  Pin to top of News Room
                </Label>
              </div>
            </div>

            {/* ── Right: Live Preview ──────────────────────────────────────── */}
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">
                  Live Preview
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  This is exactly how the notice will appear on the dashboard.
                </p>
                <NoticePreviewCard notice={form} />
              </div>

              {/* Checklist */}
              <div className="rounded-lg border bg-muted/30 p-3 mt-2">
                <p className="text-xs font-semibold mb-2">Before publishing</p>
                <ul className="space-y-1.5">
                  {[
                    {
                      label: "Title is descriptive",
                      ok: form.title.trim().length >= 5,
                    },
                    {
                      label: "Content is informative",
                      ok: form.content.trim().length >= 10,
                    },
                    { label: "Type is appropriate", ok: true },
                    {
                      label: "Expiry set if temporary",
                      ok: true,
                      warn: !form.expiresAt,
                    },
                  ].map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {item.warn ? (
                        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                      ) : item.ok ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                      )}
                      <span
                        className={
                          item.ok && !item.warn
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setShowCreate(false);
                setForm(EMPTY_FORM);
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleCreate}
              disabled={creating || !form.title.trim() || !form.content.trim()}
            >
              {creating ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Megaphone className="h-3.5 w-3.5" />
              )}
              {creating ? "Publishing..." : "Publish Notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Delete Confirm Dialog                                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              Delete Notice
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-foreground">
                &quot;{deleteTarget?.title}&quot;
              </span>
              ? This action cannot be undone and the notice will immediately
              disappear from all users&apos; dashboards.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Preview of what's being deleted */}
          {deleteTarget && (
            <div className="my-2">
              <NoticePreviewCard
                notice={{
                  ...deleteTarget,
                  createdAt: deleteTarget.createdAt,
                  expiresAt: deleteTarget.expiresAt || undefined,
                }}
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel
              className="h-8 text-xs"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs bg-destructive hover:bg-destructive/90 gap-1.5"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
