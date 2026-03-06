"use client";

import { useEffect, useState, useCallback, useRef } from "react"; // ← added useRef
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import axios from "axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UsersRound,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Save,
  Shield,
  Monitor,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Hash,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface GuacGroup {
  identifier: string;
  disabled: boolean;
  attributes: Record<string, any>;
  memberUsers: string[];
  memberCount: number;
  connectionCount: number;
  connectionIds: string[];
}

interface GroupDetail extends GuacGroup {
  memberGroups: string[];
  permissions: {
    connectionIds: string[];
    connectionPermissions: Record<string, string[]>;
    systemPermissions: string[];
  };
}

interface AllUser {
  username: string;
  fullName: string | null;
}

interface Connection {
  identifier: string;
  name: string;
  protocol: string;
}

interface GroupForm {
  identifier: string;
  disabled: boolean;
  users: string[];
  connections: string[];
}

const EMPTY_FORM: GroupForm = {
  identifier: "",
  disabled: false,
  users: [],
  connections: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getInitials(name: string | null, username: string): string {
  if (name?.trim()) {
    const p = name.trim().split(" ");
    return p.length >= 2
      ? `${p[0][0]}${p[1][0]}`.toUpperCase()
      : p[0].substring(0, 2).toUpperCase();
  }
  return username.substring(0, 2).toUpperCase();
}

function getProtocolColor(protocol: string): string {
  const map: Record<string, string> = {
    rdp: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    vnc: "bg-green-500/10 text-green-600 border-green-500/20",
    ssh: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    telnet: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  };
  return (
    map[protocol?.toLowerCase()] ??
    "bg-gray-500/10 text-gray-600 border-gray-500/20"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UserPicker — checkbox list
// ─────────────────────────────────────────────────────────────────────────────

function UserPicker({
  allUsers,
  selected,
  onChange,
  disabled,
}: {
  allUsers: AllUser[];
  selected: string[];
  onChange: (users: string[]) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = allUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.fullName?.toLowerCase().includes(q)
    );
  });

  const toggle = (username: string) => {
    onChange(
      selected.includes(username)
        ? selected.filter((u) => u !== username)
        : [...selected, username],
    );
  };

  const toggleAll = () => {
    if (selected.length === allUsers.length) {
      onChange([]);
    } else {
      onChange(allUsers.map((u) => u.username));
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          className="pl-7 h-7 text-xs"
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
        <span>
          {selected.length} of {allUsers.length} selected
        </span>
        <button
          type="button"
          onClick={toggleAll}
          disabled={disabled}
          className="text-primary hover:underline text-xs"
        >
          {selected.length === allUsers.length ? "Deselect all" : "Select all"}
        </button>
      </div>

      <div className="border rounded-lg overflow-y-auto max-h-[200px] divide-y">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No users found
          </p>
        ) : (
          filtered.map((u) => {
            const checked = selected.includes(u.username);
            return (
              <label
                key={u.username}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/40",
                  checked && "bg-primary/5",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(u.username)}
                  disabled={disabled}
                  className="h-3.5 w-3.5 shrink-0"
                />
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
                  {getInitials(u.fullName, u.username)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">
                    {u.fullName || u.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{u.username}
                  </p>
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConnectionPicker — FIXED: uses Radix <Checkbox> instead of raw <input>
// ─────────────────────────────────────────────────────────────────────────────

function ConnectionPicker({
  allConnections,
  selected,
  onChange,
  disabled,
  loading, // ← NEW: skeleton while detail is loading
}: {
  allConnections: Connection[];
  selected: string[];
  onChange: (conns: string[]) => void;
  disabled?: boolean;
  loading?: boolean; // ← NEW
}) {
  const [search, setSearch] = useState("");

  const filtered = allConnections.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.identifier.includes(search),
  );

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((c) => c !== id)
        : [...selected, id],
    );
  };

  // ← NEW: show skeleton while group detail is loading
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-7 w-full rounded-md" />
        <div className="border rounded-lg divide-y">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2">
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-3.5 flex-1 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search connections…"
          className="pl-7 h-7 text-xs"
          disabled={disabled}
        />
      </div>

      <div className="text-xs text-muted-foreground px-0.5">
        {selected.length} of {allConnections.length} selected
      </div>

      <div className="border rounded-lg overflow-y-auto max-h-[180px] divide-y">
        {allConnections.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No connections available
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No connections match search
          </p>
        ) : (
          filtered.map((c) => {
            const checked = selected.includes(c.identifier);
            return (
              <label
                key={c.identifier}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/40",
                  checked && "bg-primary/5",
                )}
              >
                {/* ← FIXED: Radix Checkbox instead of raw <input> */}
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(c.identifier)}
                  disabled={disabled}
                  className="h-3.5 w-3.5 shrink-0"
                />
                <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {c.identifier}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs px-1.5 py-0 h-4 uppercase font-mono shrink-0",
                    getProtocolColor(c.protocol),
                  )}
                >
                  {c.protocol}
                </Badge>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GroupCard — expandable row
// ─────────────────────────────────────────────────────────────────────────────

function GroupCard({
  group,
  allUsers,
  connections,
  onEdit,
  onDelete,
  onToggleDisabled,
  actionBusy,
}: {
  group: GuacGroup;
  allUsers: AllUser[];
  connections: Connection[];
  onEdit: (g: GuacGroup) => void;
  onDelete: (g: GuacGroup) => void;
  onToggleDisabled: (g: GuacGroup) => void;
  actionBusy: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const busy = actionBusy === group.identifier;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-all",
        group.disabled && "opacity-60",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <UsersRound className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm truncate">
                {group.identifier}
              </p>
              {group.disabled && (
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0 h-4 bg-red-500/10 text-red-500 border-red-500/20"
                >
                  Disabled
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {group.memberCount} member{group.memberCount !== 1 ? "s" : ""} ·{" "}
              {group.connectionCount} connection
              {group.connectionCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {group.memberUsers.length > 0 && (
          <div className="hidden sm:flex items-center -space-x-1.5 shrink-0">
            {group.memberUsers.slice(0, 4).map((username) => {
              const u = allUsers.find((u) => u.username === username);
              return (
                <div
                  key={username}
                  title={username}
                  className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold border-2 border-background select-none"
                >
                  {getInitials(u?.fullName ?? null, username)}
                </div>
              );
            })}
            {group.memberUsers.length > 4 && (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                +{group.memberUsers.length - 4}
              </div>
            )}
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0"
              disabled={busy}
            >
              {busy ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs">
              {group.identifier}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs gap-2"
              onClick={() => onEdit(group)}
            >
              <Edit className="h-3.5 w-3.5" />
              Edit Group
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2"
              onClick={() => onToggleDisabled(group)}
            >
              {group.disabled ? (
                <>
                  <ToggleRight className="h-3.5 w-3.5 text-green-600" /> Enable
                  Group
                </>
              ) : (
                <>
                  <ToggleLeft className="h-3.5 w-3.5 text-amber-500" /> Disable
                  Group
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs gap-2 text-red-600 focus:text-red-600"
              onClick={() => onDelete(group)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && (
        <div className="border-t px-4 py-3 bg-muted/20 space-y-3">
          {/* ── Member Users ── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Users className="h-3 w-3" /> Members
            </p>
            {group.memberUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-2">
                No members in this group.{" "}
                <button
                  type="button"
                  onClick={() => onEdit(group)}
                  className="text-primary hover:underline"
                >
                  Add members
                </button>
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {group.memberUsers.map((username) => {
                  const u = allUsers.find((u) => u.username === username);
                  return (
                    <div
                      key={username}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-background border text-xs"
                    >
                      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
                        {getInitials(u?.fullName ?? null, username)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {u?.fullName || username}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          @{username}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Connections ── */}
          {group.connectionCount > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Monitor className="h-3 w-3" /> Connections
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {(group.connectionIds ?? []).map((connId) => {
                  const conn = connections.find((c) => c.identifier === connId);
                  return (
                    <div
                      key={connId}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-background border text-xs"
                    >
                      <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {conn?.name ?? `ID: ${connId}`}
                        </p>
                        <p className="text-muted-foreground truncate text-xs font-mono">
                          ID: {connId}
                        </p>
                      </div>
                      {conn && (
                        <span
                          className={`text-xs px-1.5 py-0 rounded border font-mono uppercase shrink-0 ${getProtocolColor(conn.protocol)}`}
                        >
                          {conn.protocol}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function GroupsManagementPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [groups, setGroups] = useState<GuacGroup[]>([]);
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "enabled" | "disabled"
  >("all");

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GuacGroup | null>(null);
  const [editTarget, setEditTarget] = useState<GuacGroup | null>(null);

  const [createForm, setCreateForm] = useState<GroupForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<GroupForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);

  // ← NEW: track loading state for group detail fetch inside edit dialog
  const [detailLoading, setDetailLoading] = useState(false);
  // ← NEW: AbortController ref — cancels stale fetch if user opens another group
  const editAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/groups", {
        params: { token: user.authToken, dataSource: user.dataSource },
      });
      setGroups(res.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchAllUsers = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get("/api/admin/users", {
        params: { token: user.authToken, dataSource: user.dataSource },
      });
      setAllUsers(
        (res.data ?? []).map((u: any) => ({
          username: u.username,
          fullName: u.fullName ?? null,
        })),
      );
    } catch {
      /* non-fatal */
    }
  }, [user]);

  const fetchConnections = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get("/api/connections", {
        params: { token: user.authToken, dataSource: user.dataSource },
      });
      const raw: any[] = Array.isArray(res.data)
        ? res.data
        : Object.values(res.data ?? {});
      setConnections(
        raw.map((c: any) => ({
          identifier: String(c.identifier ?? c.id ?? ""),
          name: c.name ?? c.connectionName ?? "Unknown",
          protocol: c.protocol ?? "rdp",
        })),
      );
    } catch {
      /* non-fatal */
    }
  }, [user]);

  useEffect(() => {
    fetchGroups();
    fetchAllUsers();
    fetchConnections();
  }, [fetchGroups, fetchAllUsers, fetchConnections]);

  const filtered = groups.filter((g) => {
    const matchSearch =
      !search || g.identifier.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "enabled" && !g.disabled) ||
      (filterStatus === "disabled" && g.disabled);
    return matchSearch && matchStatus;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!user) return;
    if (!createForm.identifier.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (/\s/.test(createForm.identifier)) {
      toast.error("Group name cannot contain spaces");
      return;
    }
    setCreating(true);
    try {
      await axios.post(
        "/api/admin/groups",
        {
          identifier: createForm.identifier.trim(),
          disabled: createForm.disabled,
          users: createForm.users,
          connections: createForm.connections,
        },
        { params: { token: user.authToken, dataSource: user.dataSource } },
      );
      toast.success(`Group "${createForm.identifier}" created`);
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      fetchGroups();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // OPEN EDIT
  // ← FIXED: opens dialog immediately with skeleton; fetches detail in bg;
  //           AbortController cancels any previous in-flight request.
  // ─────────────────────────────────────────────────────────────────────────

  const openEdit = async (group: GuacGroup) => {
    // Cancel any previous in-flight detail fetch
    editAbortRef.current?.abort();
    const controller = new AbortController();
    editAbortRef.current = controller;

    // Seed the form with list data so the dialog has something to show
    // immediately, even before the detail request completes.
    setEditTarget(group);
    setEditForm({
      identifier: group.identifier,
      disabled: group.disabled,
      users: group.memberUsers, // list data — may have raw IDs, overwritten below
      connections: [], // unknown until detail loads
    });
    setDetailLoading(true);
    setShowEdit(true); // ← dialog opens NOW with loading state

    try {
      const res = await axios.get(
        `/api/admin/groups/${encodeURIComponent(group.identifier)}`,
        {
          params: { token: user?.authToken, dataSource: user?.dataSource },
          signal: controller.signal, // ← abort if user switches group
        },
      );

      // Bail out if this request was already superseded
      if (controller.signal.aborted) return;

      const detail: GroupDetail = res.data;
      setEditForm({
        identifier: detail.identifier,
        disabled: detail.disabled,
        users: detail.memberUsers, // ← correct usernames from API
        connections: detail.permissions.connectionIds, // ← correct IDs from API
      });
    } catch (err: any) {
      if (err?.code === "ERR_CANCELED" || err?.name === "AbortError") return;
      // Detail fetch failed — keep list data but warn the user
      toast.error(
        "Could not load full group details. Some fields may be incomplete.",
      );
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT
  // ─────────────────────────────────────────────────────────────────────────

  const handleEdit = async () => {
    if (!user || !editTarget) return;
    setEditing(true);
    try {
      await axios.put(
        `/api/admin/groups/${encodeURIComponent(editTarget.identifier)}`,
        {
          disabled: editForm.disabled,
          users: editForm.users,
          connections: editForm.connections,
        },
        { params: { token: user.authToken, dataSource: user.dataSource } },
      );
      toast.success(`Group "${editTarget.identifier}" updated`);
      setShowEdit(false);
      setEditTarget(null);
      fetchGroups();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to update group");
    } finally {
      setEditing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TOGGLE DISABLED
  // ─────────────────────────────────────────────────────────────────────────

  const handleToggleDisabled = async (group: GuacGroup) => {
    if (!user) return;
    setActionBusy(group.identifier);
    try {
      await axios.put(
        `/api/admin/groups/${encodeURIComponent(group.identifier)}`,
        { disabled: !group.disabled },
        { params: { token: user.authToken, dataSource: user.dataSource } },
      );
      toast.success(
        `Group "${group.identifier}" ${group.disabled ? "enabled" : "disabled"}`,
      );
      fetchGroups();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to update group");
    } finally {
      setActionBusy(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!user || !deleteTarget) return;
    setActionBusy(deleteTarget.identifier);
    try {
      await axios.delete(
        `/api/admin/groups/${encodeURIComponent(deleteTarget.identifier)}`,
        {
          params: { token: user.authToken, dataSource: user.dataSource },
        },
      );
      toast.success(`Group "${deleteTarget.identifier}" deleted`);
      setDeleteTarget(null);
      fetchGroups();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to delete group");
    } finally {
      setActionBusy(null);
    }
  };

  const stats = {
    total: groups.length,
    enabled: groups.filter((g) => !g.disabled).length,
    disabled: groups.filter((g) => g.disabled).length,
    withUsers: groups.filter((g) => g.memberCount > 0).length,
  };

  return (
    <div className="flex flex-col gap-4 p-4 animate-in fade-in duration-300">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            Groups Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage user groups, members, and connection permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={fetchGroups}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />
            Refresh
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => {
              setCreateForm(EMPTY_FORM);
              setShowCreate(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            New Group
          </Button>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 text-xs">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Enabled", value: stats.enabled, color: "text-green-600" },
          { label: "Disabled", value: stats.disabled, color: "text-red-500" },
          {
            label: "With Users",
            value: stats.withUsers,
            color: "text-blue-600",
          },
        ].map((item, i) => (
          <span key={item.label} className="flex items-center gap-1">
            {i > 0 && <span className="text-border">·</span>}
            <span className="text-muted-foreground">{item.label}:</span>
            {loading ? (
              <Skeleton className="h-3 w-5 inline-block" />
            ) : (
              <span className={cn("font-bold", item.color)}>{item.value}</span>
            )}
          </span>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search groups…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex rounded-md border overflow-hidden text-xs h-8">
          {(["all", "enabled", "disabled"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={cn(
                "px-3 h-full capitalize transition-colors",
                filterStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted text-muted-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground">
          {loading ? "…" : `${filtered.length} of ${groups.length}`}
        </span>
      </div>

      {/* ── Groups list ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((group) => (
            <GroupCard
              key={group.identifier}
              group={group}
              allUsers={allUsers}
              connections={connections}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onToggleDisabled={handleToggleDisabled}
              actionBusy={actionBusy}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border bg-card">
          <UsersRound className="h-10 w-10 text-muted-foreground/20" />
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">
              No groups found
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {search || filterStatus !== "all"
                ? "Try adjusting your filters."
                : "Create your first group to get started."}
            </p>
          </div>
          {!search && filterStatus === "all" && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 mt-1"
              onClick={() => {
                setCreateForm(EMPTY_FORM);
                setShowCreate(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Create First Group
            </Button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CREATE GROUP DIALOG                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showCreate}
        onOpenChange={(o) => {
          if (!creating) {
            setShowCreate(o);
            if (!o) setCreateForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" />
              Create New Group
            </DialogTitle>
            <DialogDescription className="text-xs">
              Creates a Guacamole user group. Add members and assign connection
              access in one step.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Identity
              </legend>

              <div className="space-y-1.5">
                <Label htmlFor="cg-name" className="text-xs font-semibold">
                  Group Name <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="cg-name"
                    value={createForm.identifier}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        identifier: e.target.value.replace(/\s/g, "-"),
                      })
                    }
                    placeholder="e.g. network-team"
                    className="pl-8 h-8 text-xs font-mono"
                    disabled={creating}
                    autoComplete="off"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Spaces are replaced with hyphens automatically.
                </p>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-semibold">Disabled</p>
                  <p className="text-xs text-muted-foreground">
                    Disable this group immediately on creation
                  </p>
                </div>
                <button
                  type="button"
                  disabled={creating}
                  onClick={() =>
                    setCreateForm({
                      ...createForm,
                      disabled: !createForm.disabled,
                    })
                  }
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    createForm.disabled ? "bg-red-500" : "bg-input",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform",
                      createForm.disabled ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            </fieldset>

            <Separator />

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Member Users
                {createForm.users.length > 0 && (
                  <Badge className="text-xs px-1.5 py-0 h-4 ml-1">
                    {createForm.users.length}
                  </Badge>
                )}
              </legend>
              <UserPicker
                allUsers={allUsers}
                selected={createForm.users}
                onChange={(users) => setCreateForm({ ...createForm, users })}
                disabled={creating}
              />
            </fieldset>

            <Separator />

            {/* ── Connection Access ─────────────────────────────────────── */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" />
                Connection Access
                {createForm.connections.length > 0 && (
                  <Badge className="text-xs px-1.5 py-0 h-4 ml-1">
                    {createForm.connections.length}
                  </Badge>
                )}
              </legend>
              <p className="text-xs text-muted-foreground">
                Selected connections will be granted READ access to this group.
              </p>
              <ConnectionPicker
                allConnections={connections}
                selected={createForm.connections}
                onChange={(conns) =>
                  setCreateForm({ ...createForm, connections: conns })
                }
                disabled={creating}
              />
            </fieldset>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setShowCreate(false);
                setCreateForm(EMPTY_FORM);
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleCreate}
              disabled={creating || !createForm.identifier.trim()}
            >
              {creating ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {creating ? "Creating…" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EDIT GROUP DIALOG                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={showEdit}
        onOpenChange={(o) => {
          if (!editing) {
            // Cancel any in-flight fetch when user closes the dialog
            if (!o) editAbortRef.current?.abort();
            setShowEdit(o);
            if (!o) {
              setEditTarget(null);
              setDetailLoading(false);
            }
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit className="h-4 w-4 text-primary" />
              Edit Group —{" "}
              <span className="font-mono text-sm">
                {editTarget?.identifier}
              </span>
              {/* ← NEW: spinner while detail is loading */}
              {detailLoading && (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Group name cannot be changed. Modify members and connection
              access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Group name — read-only */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Group Name (read-only)
              </Label>
              <div className="relative">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={editTarget?.identifier ?? ""}
                  disabled
                  className="pl-8 h-8 text-xs font-mono bg-muted"
                />
              </div>
            </div>

            {/* Disabled toggle */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-semibold">Disabled</p>
                <p className="text-xs text-muted-foreground">
                  Disabled groups cannot be used for access
                </p>
              </div>
              {detailLoading ? (
                <Skeleton className="h-5 w-9 rounded-full" />
              ) : (
                <button
                  type="button"
                  disabled={editing}
                  onClick={() =>
                    setEditForm({ ...editForm, disabled: !editForm.disabled })
                  }
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    editForm.disabled ? "bg-red-500" : "bg-input",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform",
                      editForm.disabled ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </button>
              )}
            </div>

            <Separator />

            {/* ── Member Users ─────────────────────────────────────────── */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Member Users
                {editForm.users.length > 0 && !detailLoading && (
                  <Badge className="text-xs px-1.5 py-0 h-4 ml-1">
                    {editForm.users.length}
                  </Badge>
                )}
              </legend>
              {/* ← Show skeleton rows while detail is loading */}
              {detailLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-7 w-full rounded-md" />
                  <div className="border rounded-lg divide-y">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 px-3 py-2"
                      >
                        <Skeleton className="h-3.5 w-3.5 rounded" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <UserPicker
                  allUsers={allUsers}
                  selected={editForm.users}
                  onChange={(users) => setEditForm({ ...editForm, users })}
                  disabled={editing}
                />
              )}
            </fieldset>

            <Separator />

            {/* ── Connection Access ─────────────────────────────────────── */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" />
                Connection Access
                {editForm.connections.length > 0 && !detailLoading && (
                  <Badge className="text-xs px-1.5 py-0 h-4 ml-1">
                    {editForm.connections.length}
                  </Badge>
                )}
              </legend>
              {/* ← Pass loading prop — ConnectionPicker renders its own skeleton */}
              <ConnectionPicker
                allConnections={connections}
                selected={editForm.connections}
                onChange={(conns) =>
                  setEditForm({ ...editForm, connections: conns })
                }
                disabled={editing}
                loading={detailLoading} // ← NEW prop
              />
            </fieldset>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                editAbortRef.current?.abort();
                setShowEdit(false);
                setEditTarget(null);
                setDetailLoading(false);
              }}
              disabled={editing}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleEdit}
              disabled={editing || detailLoading} // ← block save while detail loads
            >
              {editing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {editing ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRM                                                        */}
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
              Delete Group
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                Permanently delete group{" "}
                <span className="font-mono font-semibold text-foreground">
                  {deleteTarget?.identifier}
                </span>
                ?
              </span>

              {/* ← FIXED: <div> → <span className="block"> to stay inside <p> */}
              {deleteTarget && deleteTarget.memberCount > 0 && (
                <span className="mt-2 block rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
                  ⚠️ This group has <strong>{deleteTarget.memberCount}</strong>{" "}
                  member
                  {deleteTarget.memberCount !== 1 ? "s" : ""}. Deleting will
                  remove their group-based connection access.
                </span>
              )}

              <span className="block text-xs text-muted-foreground">
                This cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs bg-destructive hover:bg-destructive/90 gap-1.5"
              onClick={handleDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
