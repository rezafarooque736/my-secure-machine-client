"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import axios from "axios";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  RefreshCw,
  Key,
  Eye,
  EyeOff,
  Building2,
  Mail,
  Save,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

/* ── Types ────────────────────────────────────────────────────────────────── */

interface GuacUser {
  username: string;
  fullName: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  organization: string | null;
  organizationalRole?: string | null;
  role: "ADMIN" | "USER";
  status: "ACTIVE" | "INACTIVE";
  lastLoginAt: string | null;
}

interface Group {
  identifier: string;
  disabled: boolean;
}

interface Connection {
  identifier: string;
  name: string;
  protocol: string;
}

interface CreateForm {
  username: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  email: string;
  organization: string;
  organizationalRole: string;
  role: "ADMIN" | "USER";
  groups: string[];
  connections: string[];
}

// NOTE: groups intentionally removed from EditForm — managed by selectedGroups state
interface EditForm {
  fullName: string;
  email: string;
  organization: string;
  organizationalRole: string;
  role: "ADMIN" | "USER";
}

const EMPTYCREATE: CreateForm = {
  username: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  email: "",
  organization: "",
  organizationalRole: "",
  role: "USER",
  groups: [],
  connections: [],
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Never";
  }
}

function getInitials(name: string | null, username: string): string {
  if (name?.trim()) {
    const p = name.trim().split(" ");
    return p.length >= 2
      ? `${p[0][0]}${p[1][0]}`.toUpperCase()
      : p[0].substring(0, 2).toUpperCase();
  }
  return username.substring(0, 2).toUpperCase();
}

/* ── PasswordInput ────────────────────────────────────────────────────────── */

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-9 h-8 text-xs"
        disabled={disabled}
        autoComplete="new-password"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

function GroupPicker({
  allGroups,
  selected,
  onChange,
  disabled,
  loading,
}: {
  allGroups: Group[];
  selected: string[];
  onChange: (groups: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = allGroups.filter((g) =>
    g.identifier.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((g) => g !== id)
        : [...selected, id],
    );
  };

  const toggleAll = () => {
    if (selected.length === allGroups.length) onChange([]);
    else onChange(allGroups.map((g) => g.identifier));
  };

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-28 rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups..."
          className="pl-7 h-7 text-xs"
          disabled={disabled}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
        <span>
          {selected.length} of {allGroups.length} selected
        </span>
        <button
          type="button"
          onClick={toggleAll}
          disabled={disabled}
          className="text-primary hover:underline text-xs"
        >
          {selected.length === allGroups.length ? "Deselect all" : "Select all"}
        </button>
      </div>

      {/* List */}
      <div className="border rounded-lg overflow-y-auto max-h-[180px] divide-y">
        {allGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No groups available
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No groups match search
          </p>
        ) : (
          filtered.map((g) => {
            const checked = selected.includes(g.identifier);
            return (
              <label
                key={g.identifier}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/40",
                  checked && "bg-primary/5",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(g.identifier)}
                  disabled={disabled}
                  className="h-3.5 w-3.5 shrink-0"
                />
                <div className="h-5 w-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                  <Users className="h-3 w-3 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{g.identifier}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {g.disabled ? "disabled" : "enabled"}
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

function ConnectionPicker({
  allConnections,
  selected,
  onChange,
  disabled,
}: {
  allConnections: Connection[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
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

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search connections..."
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
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(c.identifier)}
                  disabled={disabled}
                  className="h-3.5 w-3.5 shrink-0"
                />
                <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {c.identifier}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0 rounded border font-mono uppercase shrink-0",
                    c.protocol === "vnc"
                      ? "bg-green-500/10 text-green-600 border-green-500/20"
                      : c.protocol === "ssh"
                        ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                        : "bg-blue-500/10 text-blue-600 border-blue-500/20",
                  )}
                >
                  {c.protocol}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── StatsBar ─────────────────────────────────────────────────────────────── */

function StatsBar({ users, loading }: { users: GuacUser[]; loading: boolean }) {
  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "ACTIVE").length,
    inactive: users.filter((u) => u.status === "INACTIVE").length,
    admins: users.filter((u) => u.role === "ADMIN").length,
  };
  const items = [
    { label: "Total", value: stats.total, color: "text-foreground" },
    { label: "Active", value: stats.active, color: "text-green-600" },
    { label: "Inactive", value: stats.inactive, color: "text-red-500" },
    { label: "Admins", value: stats.admins, color: "text-purple-600" },
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

/* ── Main Page ────────────────────────────────────────────────────────────── */

export default function UsersManagementPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  // data
  const [users, setUsers] = useState<GuacUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "ADMIN" | "USER">("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "ACTIVE" | "INACTIVE"
  >("all");

  // dialogs
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GuacUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<GuacUser | null>(null);

  // forms
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTYCREATE);
  const [editForm, setEditForm] = useState<EditForm>({
    fullName: "",
    email: "",
    organization: "",
    organizationalRole: "",
    role: "USER",
  });

  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const [pwForm, setPwForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  // busy states
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [changing, setChanging] = useState(false);

  /* ── Guard ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  /* ── Fetch users ─────────────────────────────────────────────────────────── */
  const fetchUsers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/users", {
        params: { token: user.authToken, dataSource: user.dataSource },
      });
      setUsers(res.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [user]);

  /* ── Fetch all groups ────────────────────────────────────────────────────── */
  const fetchGroups = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axios.get("/api/admin/groups", {
        params: { token: user.authToken, dataSource: user.dataSource },
      });
      setGroups(
        (res.data ?? []).map((g: any) => ({
          identifier: String(g.identifier ?? "").trim(),
          disabled: g.disabled === true,
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
    fetchUsers();
    fetchGroups();
    fetchConnections();
  }, [fetchUsers, fetchGroups, fetchConnections]);

  /* ── Fetch one user's group memberships ─────────────────────────────────── */
  const fetchUserGroups = useCallback(
    async (username: string): Promise<string[]> => {
      if (!user) return [];
      try {
        const res = await axios.get(
          `/api/admin/users/${encodeURIComponent(username)}/groups`,
          {
            params: { token: user.authToken, dataSource: user.dataSource },
          },
        );
        const data = res.data;

        let raw: string[] = [];
        if (Array.isArray(data?.groups)) {
          raw = data.groups; // { groups: ["test-group-1", ...] }  ← your API shape
        } else if (Array.isArray(data)) {
          raw = data; // plain array fallback
        } else if (data && typeof data === "object") {
          raw = Object.keys(data); // object map fallback
        }

        const result = raw.map((g) => String(g).trim()).filter(Boolean);
        console.log("[fetchUserGroups]", username, "→", result);
        return result;
      } catch (e) {
        console.error("[fetchUserGroups] error", e);
        return [];
      }
    },
    [user],
  );

  /* ── Derived filtered list ───────────────────────────────────────────────── */
  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      u.username.toLowerCase().includes(s) ||
      u.fullName?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.organization?.toLowerCase().includes(s);
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchStatus = filterStatus === "all" || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  /* ── CREATE ──────────────────────────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!user) return;
    if (!createForm.username.trim() || !createForm.password.trim()) {
      toast.error("Username and password are required");
      return;
    }
    if (createForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (createForm.password !== createForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setCreating(true);
    try {
      await axios.post(
        "/api/admin/users",
        {
          username: createForm.username.trim(),
          password: createForm.password,
          fullName: createForm.fullName,
          email: createForm.email,
          organization: createForm.organization,
          organizationalRole: createForm.organizationalRole,
          role: createForm.role,
          groups: createForm.groups,
          connections: createForm.connections,
        },
        { params: { token: user.authToken, dataSource: user.dataSource } },
      );
      toast.success(`User "${createForm.username}" created successfully`);
      setShowCreate(false);
      setCreateForm(EMPTYCREATE);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  /* ── OPEN EDIT ───────────────────────────────────────────────────────────── */
  // Opens dialog immediately (shows skeleton for groups), then populates groups
  // into selectedGroups via a direct state setter — not through editForm.
  const openEdit = async (u: GuacUser) => {
    setSelectedUser(u);
    setEditForm({
      fullName: u.fullName ?? "",
      email: u.email ?? "",
      organization: u.organization ?? "",
      organizationalRole: u.organizationalRole ?? "",
      role: u.role,
    });
    setSelectedGroups([]);
    // Pre-populate connections from the user list data (already fetched)
    setSelectedConnections((u as any).connectionIds ?? []);
    setGroupsLoading(true);
    setShowEdit(true);
    try {
      const fetched = await fetchUserGroups(u.username);
      setSelectedGroups(fetched);
    } finally {
      setGroupsLoading(false);
    }
  };

  /* ── SAVE EDIT ───────────────────────────────────────────────────────────── */
  const handleEdit = async () => {
    if (!user || !selectedUser) return;
    setEditing(true);
    try {
      await axios.put(
        "/api/admin/users",
        {
          fullName: editForm.fullName,
          email: editForm.email,
          organization: editForm.organization,
          organizationalRole: editForm.organizationalRole,
          role: editForm.role,
          groups: selectedGroups,
          connections: selectedConnections,
        },
        {
          params: {
            token: user.authToken,
            dataSource: user.dataSource,
            username: selectedUser.username,
          },
        },
      );
      toast.success("User updated successfully");
      setShowEdit(false);
      setSelectedUser(null);
      setSelectedGroups([]);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to update user");
    } finally {
      setEditing(false);
    }
  };

  /* ── TOGGLE STATUS ───────────────────────────────────────────────────────── */
  const handleToggleStatus = async (u: GuacUser) => {
    if (!user) return;
    const disable = u.status === "ACTIVE";
    setActionBusy(u.username);
    try {
      await axios.patch(
        "/api/admin/users",
        { disabled: disable },
        {
          params: {
            token: user.authToken,
            dataSource: user.dataSource,
            username: u.username,
          },
        },
      );
      toast.success(
        `User "${u.username}" ${disable ? "disabled" : "enabled"} successfully`,
      );
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to update status");
    } finally {
      setActionBusy(null);
    }
  };

  /* ── DELETE ──────────────────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!user || !deleteTarget) return;
    setActionBusy(deleteTarget.username);
    try {
      await axios.delete("/api/admin/users", {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
          username: deleteTarget.username,
        },
      });
      toast.success(`User "${deleteTarget.username}" deleted`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to delete user");
    } finally {
      setActionBusy(null);
    }
  };

  /* ── CHANGE PASSWORD ─────────────────────────────────────────────────────── */
  const openPassword = (u: GuacUser) => {
    setSelectedUser(u);
    setPwForm({ newPassword: "", confirmPassword: "" });
    setShowPassword(true);
  };

  const handleChangePassword = async () => {
    if (!user || !selectedUser) return;
    if (!pwForm.newPassword) {
      toast.error("Password is required");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChanging(true);
    try {
      await axios.put(
        "/api/admin/users/password",
        { newPassword: pwForm.newPassword },
        {
          params: {
            token: user.authToken,
            dataSource: user.dataSource,
            username: selectedUser.username,
          },
        },
      );
      toast.success(
        `Password for "${selectedUser.username}" changed successfully`,
      );
      setShowPassword(false);
      setSelectedUser(null);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error(
          "Session expired — please log out and log in again, then retry.",
          { duration: 6000 },
        );
      } else {
        toast.error(err?.response?.data?.error ?? "Failed to change password");
      }
    } finally {
      setChanging(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4 p-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Users Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage Guacamole user accounts, roles, and group memberships.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={fetchUsers}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />{" "}
            Refresh
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => {
              setCreateForm(EMPTYCREATE);
              setShowCreate(true);
            }}
          >
            <UserPlus className="h-3.5 w-3.5" /> Add User
          </Button>
        </div>
      </div>

      <StatsBar users={users} loading={loading} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, email…"
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select
          value={filterRole}
          onValueChange={(v) => setFilterRole(v as any)}
        >
          <SelectTrigger className="h-8 text-xs w-[130px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="USER">User</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) => setFilterStatus(v as any)}
        >
          <SelectTrigger className="h-8 text-xs w-[130px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {loading ? "…" : `${filtered.length} of ${users.length}`}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/70 border-b">
              <tr>
                {[
                  "User",
                  "Email",
                  "Organization",
                  "Role",
                  "Status",
                  "Last Login",
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
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-3 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">
                        {search ||
                        filterRole !== "all" ||
                        filterStatus !== "all"
                          ? "No users match your filters."
                          : "No users found."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const busy = actionBusy === u.username;
                  return (
                    <tr
                      key={u.username}
                      className={cn(
                        "border-b last:border-0 transition-colors",
                        u.status === "INACTIVE"
                          ? "opacity-60 bg-muted/20 hover:bg-muted/30"
                          : "hover:bg-muted/30",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600
                            flex items-center justify-center text-white text-xs font-bold shrink-0 select-none"
                          >
                            {getInitials(u.fullName, u.username)}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              {u.fullName || u.username}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              @{u.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {u.email ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            {u.email}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {u.organization ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {u.organization}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs px-1.5 py-0 h-5 gap-1",
                            u.role === "ADMIN"
                              ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20",
                          )}
                        >
                          {u.role === "ADMIN" && (
                            <Shield className="h-2.5 w-2.5" />
                          )}
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs px-1.5 py-0 h-5",
                            u.status === "ACTIVE"
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20",
                          )}
                        >
                          {u.status === "ACTIVE" ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {formatDate(u.lastLoginAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
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
                              @{u.username}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs gap-2"
                              onClick={() => openEdit(u)}
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs gap-2"
                              onClick={() => openPassword(u)}
                            >
                              <Key className="h-3.5 w-3.5" /> Change Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs gap-2"
                              onClick={() => handleToggleStatus(u)}
                            >
                              {u.status === "ACTIVE" ? (
                                <>
                                  <UserX className="h-3.5 w-3.5 text-amber-500" />{" "}
                                  Disable User
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3.5 w-3.5 text-green-600" />{" "}
                                  Enable User
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs gap-2 text-red-600 focus:text-red-600"
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════ CREATE USER DIALOG ═══════════════ */}
      <Dialog
        open={showCreate}
        onOpenChange={(o) => {
          if (!creating) {
            setShowCreate(o);
            if (!o) setCreateForm(EMPTYCREATE);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-primary" /> Create New User
            </DialogTitle>
            <DialogDescription className="text-xs">
              Creates a Guacamole user account. All fields except username and
              password are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Account
              </legend>
              <div className="space-y-1.5">
                <Label htmlFor="c-username" className="text-xs font-semibold">
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="c-username"
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, username: e.target.value })
                  }
                  placeholder="e.g. john.doe"
                  className="h-8 text-xs"
                  disabled={creating}
                  autoComplete="off"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-password" className="text-xs font-semibold">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <PasswordInput
                    id="c-password"
                    value={createForm.password}
                    onChange={(v) =>
                      setCreateForm({ ...createForm, password: v })
                    }
                    placeholder="Min 8 characters"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-confirm" className="text-xs font-semibold">
                    Confirm Password <span className="text-destructive">*</span>
                  </Label>
                  <PasswordInput
                    id="c-confirm"
                    value={createForm.confirmPassword}
                    onChange={(v) =>
                      setCreateForm({ ...createForm, confirmPassword: v })
                    }
                    placeholder="Re-enter password"
                    disabled={creating}
                  />
                  {createForm.confirmPassword &&
                    createForm.password !== createForm.confirmPassword && (
                      <p className="text-xs text-red-500">
                        Passwords do not match
                      </p>
                    )}
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Profile
              </legend>
              <div className="space-y-1.5">
                <Label htmlFor="c-fullname" className="text-xs font-semibold">
                  Full Name
                </Label>
                <Input
                  id="c-fullname"
                  value={createForm.fullName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, fullName: e.target.value })
                  }
                  placeholder="e.g. John Doe"
                  className="h-8 text-xs"
                  disabled={creating}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <Input
                  id="c-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="e.g. john@example.com"
                  className="h-8 text-xs"
                  disabled={creating}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="c-org" className="text-xs font-semibold">
                    Organization
                  </Label>
                  <Input
                    id="c-org"
                    value={createForm.organization}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        organization: e.target.value,
                      })
                    }
                    placeholder="e.g. Railtel"
                    className="h-8 text-xs"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-orgrole" className="text-xs font-semibold">
                    Org. Role
                  </Label>
                  <Input
                    id="c-orgrole"
                    value={createForm.organizationalRole}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        organizationalRole: e.target.value,
                      })
                    }
                    placeholder="e.g. Engineer"
                    className="h-8 text-xs"
                    disabled={creating}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Permissions &amp; Groups
              </legend>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">System Role</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(v) =>
                    setCreateForm({
                      ...createForm,
                      role: v as "ADMIN" | "USER",
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User — standard access</SelectItem>
                    <SelectItem value="ADMIN">
                      <span className="flex items-center gap-1.5 text-purple-600">
                        <Shield className="h-3.5 w-3.5" /> Admin — full system
                        access
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Assign to Groups{" "}
                  <span className="text-muted-foreground font-normal ml-1">
                    (click to toggle)
                  </span>
                </Label>
                <GroupPicker
                  allGroups={groups}
                  selected={createForm.groups}
                  onChange={(g) =>
                    setCreateForm((prev) => ({ ...prev, groups: g }))
                  }
                  disabled={creating}
                />
                <Separator />
                <fieldset className="space-y-2">
                  <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Monitor className="h-3.5 w-3.5" /> Connection Access
                  </legend>
                  <p className="text-xs text-muted-foreground">
                    Grant direct READ access to connections for this user.
                  </p>
                  <ConnectionPicker
                    allConnections={connections}
                    selected={createForm.connections}
                    onChange={(ids) =>
                      setCreateForm((prev) => ({ ...prev, connections: ids }))
                    }
                    disabled={creating}
                  />
                </fieldset>
              </div>
            </fieldset>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setShowCreate(false);
                setCreateForm(EMPTYCREATE);
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleCreate}
              disabled={
                creating ||
                !createForm.username.trim() ||
                !createForm.password.trim() ||
                createForm.password !== createForm.confirmPassword
              }
            >
              {creating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Creating…
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" /> Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ EDIT USER DIALOG ═══════════════ */}
      <Dialog
        open={showEdit}
        onOpenChange={(o) => {
          if (!editing) setShowEdit(o);
          if (!o) {
            setSelectedUser(null);
            setSelectedGroups([]);
            setSelectedConnections([]);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit className="h-4 w-4 text-primary" /> Edit User{" "}
              <span className="font-mono">{selectedUser?.username}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Username cannot be changed. Password is managed separately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Username read-only */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Username (read-only)
              </Label>
              <Input
                value={selectedUser?.username ?? ""}
                disabled
                className="h-8 text-xs bg-muted"
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Profile
              </legend>
              <div className="space-y-1.5">
                <Label htmlFor="e-fullname" className="text-xs font-semibold">
                  Full Name
                </Label>
                <Input
                  id="e-fullname"
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, fullName: e.target.value })
                  }
                  placeholder="e.g. John Doe"
                  className="h-8 text-xs"
                  disabled={editing}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <Input
                  id="e-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  placeholder="e.g. john@example.com"
                  className="h-8 text-xs"
                  disabled={editing}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="e-org" className="text-xs font-semibold">
                    Organization
                  </Label>
                  <Input
                    id="e-org"
                    value={editForm.organization}
                    onChange={(e) =>
                      setEditForm({ ...editForm, organization: e.target.value })
                    }
                    placeholder="e.g. Railtel"
                    className="h-8 text-xs"
                    disabled={editing}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-orgrole" className="text-xs font-semibold">
                    Org. Role
                  </Label>
                  <Input
                    id="e-orgrole"
                    value={editForm.organizationalRole}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        organizationalRole: e.target.value,
                      })
                    }
                    placeholder="e.g. Engineer"
                    className="h-8 text-xs"
                    disabled={editing}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Permissions &amp; Groups
              </legend>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">System Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, role: v as "ADMIN" | "USER" })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User — standard access</SelectItem>
                    <SelectItem value="ADMIN">
                      <span className="flex items-center gap-1.5 text-purple-600">
                        <Shield className="h-3.5 w-3.5" /> Admin — full system
                        access
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Group Memberships
                </Label>
                <GroupPicker
                  allGroups={groups}
                  selected={selectedGroups}
                  onChange={setSelectedGroups}
                  disabled={editing}
                  loading={groupsLoading}
                />
                <Separator />
                <fieldset className="space-y-2">
                  <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Monitor className="h-3.5 w-3.5" /> Connection Access
                  </legend>
                  <p className="text-xs text-muted-foreground">
                    Grant direct READ access to connections for this user.
                  </p>
                  <ConnectionPicker
                    allConnections={connections}
                    selected={selectedConnections}
                    onChange={setSelectedConnections}
                    disabled={editing}
                  />
                </fieldset>
              </div>
            </fieldset>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setShowEdit(false);
                setSelectedUser(null);
                setSelectedGroups([]);
              }}
              disabled={editing}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleEdit}
              disabled={editing}
            >
              {editing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" /> Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ CHANGE PASSWORD DIALOG ═══════════════ */}
      <Dialog
        open={showPassword}
        onOpenChange={(o) => {
          if (!changing) {
            setShowPassword(o);
            if (!o) setSelectedUser(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Key className="h-4 w-4 text-primary" /> Change Password
            </DialogTitle>
            <DialogDescription className="text-xs">
              Set a new password for{" "}
              <span className="font-mono font-semibold text-foreground">
                {selectedUser?.username}
              </span>
              . Admin reset — old password is not required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="p-new" className="text-xs font-semibold">
                New Password <span className="text-destructive">*</span>
              </Label>
              <PasswordInput
                id="p-new"
                value={pwForm.newPassword}
                onChange={(v) => setPwForm({ ...pwForm, newPassword: v })}
                placeholder="Min 8 characters"
                disabled={changing}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-confirm" className="text-xs font-semibold">
                Confirm Password <span className="text-destructive">*</span>
              </Label>
              <PasswordInput
                id="p-confirm"
                value={pwForm.confirmPassword}
                onChange={(v) => setPwForm({ ...pwForm, confirmPassword: v })}
                placeholder="Re-enter password"
                disabled={changing}
              />
              {pwForm.confirmPassword &&
                pwForm.newPassword !== pwForm.confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
              {pwForm.confirmPassword &&
                pwForm.newPassword === pwForm.confirmPassword && (
                  <p className="text-xs text-green-600">Passwords match</p>
                )}
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum 8 characters required.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setShowPassword(false);
                setSelectedUser(null);
              }}
              disabled={changing}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleChangePassword}
              disabled={
                changing ||
                !pwForm.newPassword ||
                pwForm.newPassword !== pwForm.confirmPassword
              }
            >
              {changing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Key className="h-3.5 w-3.5" /> Update Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ DELETE CONFIRM ═══════════════ */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" /> Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{" "}
              <span className="font-mono font-semibold text-foreground">
                {deleteTarget?.username}
              </span>
              ? This cannot be undone. The user will lose access immediately.
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
              <Trash2 className="h-3.5 w-3.5" /> Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
