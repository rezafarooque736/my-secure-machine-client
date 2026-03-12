'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  User,
  Mail,
  Building2,
  Shield,
  Clock,
  Activity,
  KeyRound,
  Edit,
  Save,
  X,
  RefreshCw,
  Monitor,
  CalendarClock,
  Hash,
  Briefcase,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileData {
  username: string;
  email: string | null;
  fullName: string | null;
  organization: string | null;
  organizationalRole: string | null;
  role: 'user';
  lastActive: string | null;
  accountCreated: string | null;
}

interface ActivityStats {
  totalSessions: number;
  totalDuration: number; // minutes
  lastLogin: string;
  mostUsedProtocol: string;
  activeToday: number;
}

interface EditForm {
  fullName: string;
  email: string;
  organization: string;
  organizationalRole: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatDuration(minutes: number): string {
  if (!minutes) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function getInitials(name: string | null, username: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].substring(0, 2).toUpperCase();
  }
  return username.substring(0, 2).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  loading?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 p-1.5 rounded-md bg-muted shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="h-4 w-32 mt-1" />
        ) : (
          <p className="text-sm font-medium truncate mt-0.5">
            {value || <span className="text-muted-foreground italic">Not set</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-5 w-12 mb-1" />
        ) : (
          <p className="text-base font-bold leading-tight">{value}</p>
        )}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<EditForm>({
    fullName: '',
    email: '',
    organization: '',
    organizationalRole: '',
  });

  // ── Fetch profile ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setProfileLoading(true);
    try {
      const res = await axios.get('/api/profile', {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
          username: user.username,
        },
      });
      setProfile(res.data);
      setForm({
        fullName: res.data.fullName ?? '',
        email: res.data.email ?? '',
        organization: res.data.organization ?? '',
        organizationalRole: res.data.organizationalRole ?? '',
      });
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  // ── Fetch activity stats ───────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const res = await axios.get('/api/stats/activity', {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
          username: user.username,
        },
      });
      setStats(res.data);
    } catch {
      // Non-fatal — stats section shows zeros
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, [fetchProfile, fetchStats]);

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await axios.put(
        '/api/profile',
        {
          fullName: form.fullName,
          email: form.email,
          organization: form.organization,
          organizationalRole: form.organizationalRole,
        },
        {
          params: {
            token: user.authToken,
            dataSource: user.dataSource,
            username: user.username,
          },
        },
      );
      toast.success('Profile updated successfully');
      setIsEditing(false);
      fetchProfile();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setForm({
      fullName: profile?.fullName ?? '',
      email: profile?.email ?? '',
      organization: profile?.organization ?? '',
      organizationalRole: profile?.organizationalRole ?? '',
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4 animate-in fade-in duration-300">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">My Profile</h1>
          <p className="text-xs text-muted-foreground mt-0.5">View and manage your account information</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => {
            fetchProfile();
            fetchStats();
          }}
          disabled={profileLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${profileLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Top row: Avatar card + Info card ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Avatar / identity */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
            {/* Avatar circle */}
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg select-none">
                {getInitials(profile?.fullName ?? null, user?.username ?? 'U')}
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-background" />
            </div>

            {/* Name / username */}
            {profileLoading ? (
              <>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : (
              <>
                <div>
                  <p className="font-bold text-base leading-tight">{profile?.fullName || user?.username}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">@{user?.username}</p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs bg-blue-500/10 text-blue-600 border-blue-500/20`}
                >
                  {profile?.role?.toUpperCase() ?? 'USER'}
                </Badge>
              </>
            )}

            <Separator className="w-full" />

            {/* Quick actions */}
            <div className="w-full space-y-1.5">
              {!isEditing ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs gap-1.5"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs gap-1"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile details / edit form */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              {isEditing ? 'Edit Profile' : 'Profile Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isEditing ? (
              /* ── Edit form ──────────────────────────────────────────────── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-semibold">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="h-8 text-xs"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. user@example.com"
                    className="h-8 text-xs"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="org" className="text-xs font-semibold">
                    Organization
                  </Label>
                  <Input
                    id="org"
                    value={form.organization}
                    onChange={(e) => setForm({ ...form, organization: e.target.value })}
                    placeholder="e.g. Railtel"
                    className="h-8 text-xs"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="orgRole" className="text-xs font-semibold">
                    Organizational Role
                  </Label>
                  <Input
                    id="orgRole"
                    value={form.organizationalRole}
                    onChange={(e) => setForm({ ...form, organizationalRole: e.target.value })}
                    placeholder="e.g. Network Engineer"
                    className="h-8 text-xs"
                    disabled={saving}
                  />
                </div>

                {/* Username (read-only) */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Username (cannot be changed)
                  </Label>
                  <Input value={user?.username ?? ''} disabled className="h-8 text-xs bg-muted" />
                </div>
              </div>
            ) : (
              /* ── Read-only info rows ─────────────────────────────────────── */
              <div className="divide-y">
                <InfoRow icon={User} label="Full Name" value={profile?.fullName} loading={profileLoading} />
                <InfoRow icon={Hash} label="Username" value={user?.username} loading={profileLoading} />
                <InfoRow icon={Mail} label="Email Address" value={profile?.email} loading={profileLoading} />
                <InfoRow
                  icon={Building2}
                  label="Organization"
                  value={profile?.organization}
                  loading={profileLoading}
                />
                <InfoRow
                  icon={Briefcase}
                  label="Organizational Role"
                  value={profile?.organizationalRole}
                  loading={profileLoading}
                />
                <InfoRow
                  icon={Shield}
                  label="System Role"
                  value={profile?.role?.toUpperCase()}
                  loading={profileLoading}
                />
                <InfoRow icon={Monitor} label="Data Source" value={user?.dataSource} />
                <InfoRow
                  icon={CalendarClock}
                  label="Last Active"
                  value={formatDate(profile?.lastActive)}
                  loading={profileLoading}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Activity Stats ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={Monitor}
              label="Total Sessions"
              value={stats?.totalSessions?.toString() ?? '0'}
              color="bg-blue-500/10 text-blue-500"
              loading={statsLoading}
            />
            <StatCard
              icon={Clock}
              label="Total Time"
              value={formatDuration(stats?.totalDuration ?? 0)}
              color="bg-purple-500/10 text-purple-500"
              loading={statsLoading}
            />
            <StatCard
              icon={Activity}
              label="Active Today"
              value={stats?.activeToday?.toString() ?? '0'}
              color="bg-green-500/10 text-green-500"
              loading={statsLoading}
            />
            <StatCard
              icon={Shield}
              label="Top Protocol"
              value={stats?.mostUsedProtocol ?? 'N/A'}
              color="bg-orange-500/10 text-orange-500"
              loading={statsLoading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
