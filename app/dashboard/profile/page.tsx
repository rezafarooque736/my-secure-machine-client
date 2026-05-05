'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  User,
  Mail,
  Building2,
  Shield,
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
  lastActive: string | null;
  accountCreated: string | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
              </>
            )}
          </CardContent>
        </Card>

        {/* Profile details */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
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
              <InfoRow icon={Shield} label="System Role" loading={profileLoading} />
              <InfoRow icon={Monitor} label="Data Source" value={user?.dataSource} />
              <InfoRow
                icon={CalendarClock}
                label="Last Active"
                value={formatDate(profile?.lastActive)}
                loading={profileLoading}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
