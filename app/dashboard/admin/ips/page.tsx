"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import axios from "axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Network,
  Plus,
  RefreshCw,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  Wifi,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IPEntry {
  id: number;
  ip: string;
  group_name: string;
  gateway: string | null;
  user_id: number | null;
  username: string | null;
  is_available_user: number;
  connection_id: number | null;
  container_name: string | null;
}

interface GuacGroup {
  identifier: string;
  disabled: boolean;
}

interface AddAllocation {
  amount: number;
  group_name: string;
  firstIp: string;
  gateway: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const IPv4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

function validateIp(ip: string) {
  return IPv4_RE.test(ip.trim());
}

function nextIp(ip: string): string {
  const p = ip.split(".").map(Number);
  for (let i = 3; i >= 0; i--) {
    p[i] += 1;
    if (p[i] <= 255) break;
    p[i] = 0;
  }
  return p.join(".");
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ ips, loading }: { ips: IPEntry[]; loading: boolean }) {
  const total = ips.length;
  const available = ips.filter((i) => i.is_available_user === 1).length;
  const assigned = ips.filter((i) => i.username).length;
  const groups = new Set(ips.map((i) => i.group_name)).size;

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {[
        { label: "Total", value: total, color: "text-foreground" },
        { label: "Available", value: available, color: "text-green-600" },
        { label: "Assigned", value: assigned, color: "text-blue-600" },
        { label: "Groups", value: groups, color: "text-purple-600" },
      ].map((item, i) => (
        <span key={item.label} className="flex items-center gap-1">
          {i > 0 && <span className="text-border">·</span>}
          <span className="text-muted-foreground">{item.label}</span>
          {loading ? (
            <Skeleton className="h-3 w-5 inline-block" />
          ) : (
            <span className={cn("font-bold", item.color)}>{item.value}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IPManagementPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [ips, setIps] = useState<IPEntry[]>([]);
  const [groups, setGroups] = useState<GuacGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");

  // Edit dialog
  const [showEdit, setShowEdit] = useState(false);
  const [editEntry, setEditEntry] = useState<IPEntry | null>(null);
  const [editForm, setEditForm] = useState({
    ip: "",
    group_name: "",
    gateway: "",
  });
  const [editing, setEditing] = useState(false);

  // Add dialog
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [totalCount, setTotalCount] = useState(1);
  const [allocations, setAllocations] = useState<AddAllocation[]>([
    { amount: 1, group_name: "", firstIp: "", gateway: "" },
  ]);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<IPEntry | null>(null);

  // Guard
  useEffect(() => {
    if (user && user.role !== "admin") router.push("/dashboard");
  }, [user, router]);

  // ── Fetch IPs ──────────────────────────────────────────────────────────────
  const fetchIps = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/ips");
      setIps(res.data?.data ?? res.data ?? []);
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Failed to load IPs");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── Fetch Groups ───────────────────────────────────────────────────────────
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

  useEffect(() => {
    fetchIps();
    fetchGroups();
  }, [fetchIps, fetchGroups]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = ips.filter((ip) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      ip.ip.includes(s) ||
      ip.group_name.toLowerCase().includes(s) ||
      ip.username?.toLowerCase().includes(s) ||
      ip.gateway?.includes(s);
    const matchGroup = filterGroup === "all" || ip.group_name === filterGroup;
    return matchSearch && matchGroup;
  });

  // ── Edit ───────────────────────────────────────────────────────────────────
  const openEdit = (entry: IPEntry) => {
    setEditEntry(entry);
    setEditForm({
      ip: entry.ip,
      group_name: entry.group_name,
      gateway: entry.gateway ?? "",
    });
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!editEntry) return;
    if (!validateIp(editForm.ip)) return toast.error("Invalid IP address");
    if (!editForm.group_name) return toast.error("Group is required");
    if (editForm.gateway && !validateIp(editForm.gateway))
      return toast.error("Invalid gateway IP");

    setEditing(true);
    try {
      await axios.put("/api/admin/ips", [
        {
          id: editEntry.id,
          ip: editForm.ip.trim(),
          group_name: editForm.group_name,
          gateway: editForm.gateway.trim() || null,
        },
      ]);
      toast.success("IP updated successfully");
      setShowEdit(false);
      setEditEntry(null);
      fetchIps();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Failed to update IP");
    } finally {
      setEditing(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionBusy(deleteTarget.id);
    try {
      await axios.delete(`/api/admin/ips/${deleteTarget.id}`);
      toast.success(`IP ${deleteTarget.ip} deleted`);
      setDeleteTarget(null);
      fetchIps();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Failed to delete IP");
    } finally {
      setActionBusy(null);
    }
  };

  // ── Add IPs ────────────────────────────────────────────────────────────────
  const totalAllocated = allocations.reduce((s, a) => s + (a.amount || 0), 0);
  const isAllocationValid = totalAllocated === totalCount;

  const addAllocation = () =>
    setAllocations((prev) => [
      ...prev,
      { amount: 0, group_name: "", firstIp: "", gateway: "" },
    ]);

  const removeAllocation = (i: number) =>
    setAllocations((prev) => prev.filter((_, idx) => idx !== i));

  const updateAllocation = (i: number, patch: Partial<AddAllocation>) =>
    setAllocations((prev) =>
      prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
    );

  const handleAdd = async () => {
    if (!isAllocationValid) {
      return toast.error(
        `Allocations (${totalAllocated}) must equal total count (${totalCount})`,
      );
    }
    for (const alloc of allocations) {
      if (!alloc.group_name) return toast.error("All allocations need a group");
      if (alloc.firstIp && !validateIp(alloc.firstIp))
        return toast.error(`Invalid First IP: ${alloc.firstIp}`);
      if (alloc.gateway && !validateIp(alloc.gateway))
        return toast.error(`Invalid Gateway: ${alloc.gateway}`);
    }

    setAdding(true);
    try {
      await axios.post("/api/admin/ips", {
        count: totalCount,
        allocations,
      });
      toast.success(`${totalCount} IP(s) created successfully`);
      setShowAdd(false);
      setAllocations([{ amount: 1, group_name: "", firstIp: "", gateway: "" }]);
      setTotalCount(1);
      fetchIps();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Failed to create IPs");
    } finally {
      setAdding(false);
    }
  };

  // ── Unique group names for filter ──────────────────────────────────────────
  const groupNames = Array.from(new Set(ips.map((i) => i.group_name))).sort();

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            IP Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage available IP addresses and group assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={fetchIps}
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
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add IPs
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsBar ips={ips} loading={loading} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search IP, group, username, gateway..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="h-8 text-xs w-[160px]">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {groupNames.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {loading ? "" : `${filtered.length} of ${ips.length}`}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/70 border-b">
              <tr>
                {[
                  "IP Address",
                  "Group",
                  "Gateway",
                  "Username",
                  "Status",
                  "Container",
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
                      <Network className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground">
                        {search || filterGroup !== "all"
                          ? "No IPs match your filters."
                          : "No IPs configured. Click 'Add IPs' to get started."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((entry) => {
                  const busy = actionBusy === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      {/* IP */}
                      <td className="px-3 py-2.5 font-mono font-semibold text-foreground">
                        {entry.ip}
                      </td>
                      {/* Group */}
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0 h-5 bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                        >
                          {entry.group_name}
                        </Badge>
                      </td>
                      {/* Gateway */}
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">
                        {entry.gateway ?? (
                          <span className="italic opacity-50">—</span>
                        )}
                      </td>
                      {/* Username */}
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {entry.username ? (
                          <span className="flex items-center gap-1">
                            <span className="h-4 w-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 inline-flex items-center justify-center text-white text-xs font-bold select-none">
                              {entry.username[0].toUpperCase()}
                            </span>
                            @{entry.username}
                          </span>
                        ) : (
                          <span className="italic opacity-50">unassigned</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs px-1.5 py-0 h-5",
                            entry.is_available_user === 1
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20",
                          )}
                        >
                          {entry.is_available_user === 1
                            ? "Available"
                            : "In Use"}
                        </Badge>
                      </td>
                      {/* Container */}
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {entry.container_name ?? (
                          <span className="italic opacity-50">—</span>
                        )}
                      </td>
                      {/* Actions */}
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
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              className="text-xs gap-2"
                              onClick={() => openEdit(entry)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit IP
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs gap-2 text-red-600 focus:text-red-600"
                              onClick={() => setDeleteTarget(entry)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete IP
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

      {/* ── EDIT DIALOG ──────────────────────────────────────────────────────── */}
      <Dialog
        open={showEdit}
        onOpenChange={(o) => {
          if (!editing) {
            setShowEdit(o);
            if (!o) setEditEntry(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit className="h-4 w-4 text-primary" />
              Edit IP
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update IP address, group, or gateway.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                IP Address <span className="text-destructive">*</span>
              </Label>
              <Input
                value={editForm.ip}
                onChange={(e) =>
                  setEditForm({ ...editForm, ip: e.target.value })
                }
                placeholder="xxx.xxx.xxx.xxx"
                className="h-8 text-xs font-mono"
                disabled={editing}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Group <span className="text-destructive">*</span>
              </Label>
              <Select
                value={editForm.group_name}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, group_name: v })
                }
                disabled={editing}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.identifier} value={g.identifier}>
                      {g.identifier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Gateway</Label>
              <Input
                value={editForm.gateway}
                onChange={(e) =>
                  setEditForm({ ...editForm, gateway: e.target.value })
                }
                placeholder="xxx.xxx.xxx.xxx (optional)"
                className="h-8 text-xs font-mono"
                disabled={editing}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowEdit(false)}
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
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD IPs DIALOG ────────────────────────────────────────────────────── */}
      <Dialog
        open={showAdd}
        onOpenChange={(o) => {
          if (!adding) {
            setShowAdd(o);
            if (!o) {
              setAllocations([
                { amount: 1, group_name: "", firstIp: "", gateway: "" },
              ]);
              setTotalCount(1);
            }
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" />
              Add New IPs
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure new IP addresses with group assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Total Count */}
            <div className="flex items-end gap-4">
              <div className="space-y-1.5 w-40">
                <Label className="text-xs font-semibold">
                  Total IP Count <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={totalCount}
                  onChange={(e) =>
                    setTotalCount(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="h-8 text-xs"
                  disabled={adding}
                />
              </div>
              <div
                className={cn(
                  "px-3 py-2 rounded-md border text-xs font-medium",
                  isAllocationValid
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20",
                )}
              >
                {isAllocationValid ? (
                  "✓"
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                )}
                Allocated: {totalAllocated} / {totalCount}
              </div>
            </div>

            {/* Allocations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">IP Allocations</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={addAllocation}
                  disabled={adding}
                >
                  <Plus className="h-3 w-3" />
                  Add Allocation
                </Button>
              </div>

              {allocations.map((alloc, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border bg-muted/20 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Allocation {idx + 1}
                    </span>
                    {allocations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                        onClick={() => removeAllocation(idx)}
                        disabled={adding}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        min={0}
                        value={alloc.amount}
                        onChange={(e) =>
                          updateAllocation(idx, {
                            amount: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="h-8 text-xs"
                        disabled={adding}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Group <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={alloc.group_name}
                        onValueChange={(v) =>
                          updateAllocation(idx, { group_name: v })
                        }
                        disabled={adding}
                      >
                        <SelectTrigger className="max-h-8 text-xs px-1">
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((g) => (
                            <SelectItem key={g.identifier} value={g.identifier}>
                              {g.identifier}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">First IP (Optional)</Label>
                      <Input
                        value={alloc.firstIp}
                        onChange={(e) =>
                          updateAllocation(idx, { firstIp: e.target.value })
                        }
                        placeholder="10.0.0.1"
                        className="h-8 text-xs font-mono"
                        disabled={adding}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Gateway</Label>
                      <Input
                        value={alloc.gateway}
                        onChange={(e) =>
                          updateAllocation(idx, { gateway: e.target.value })
                        }
                        placeholder="10.0.0.254"
                        className="h-8 text-xs font-mono"
                        disabled={adding}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowAdd(false)}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleAdd}
              disabled={adding || !isAllocationValid}
            >
              {adding ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Create IPs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ────────────────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete IP</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete IP{" "}
              <strong className="font-mono">{deleteTarget?.ip}</strong> from
              group <strong>{deleteTarget?.group_name}</strong>? This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
