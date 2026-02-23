'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail,
  Shield,
  Calendar,
  Clock,
  Edit,
  Save,
  X,
  Key,
  Activity,
  Database,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProfileData {
  username: string;
  email: string;
  fullName: string;
  organization: string;
  role: string;
  lastPasswordUpdate: string;
  accountCreated: string;
}

interface ActivityStats {
  totalSessions: number;
  totalDuration: number;
  lastLogin: string;
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Change password dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Active sessions dialog
  const [showSessionsDialog, setShowSessionsDialog] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    organization: '',
  });

  const fetchProfileData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch profile data
      const profileResponse = await axios.get('/api/profile', {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
          username: user.username,
        },
      });
      setProfileData(profileResponse.data);

      // Update form with fetched data
      setFormData({
        fullName: profileResponse.data.fullName,
        email: profileResponse.data.email,
        organization: profileResponse.data.organization,
      });

      // Fetch activity stats
      const statsResponse = await axios.get('/api/stats/activity', {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
          username: user.username,
        },
      });
      setActivityStats({
        totalSessions: statsResponse.data.totalSessions,
        totalDuration: statsResponse.data.totalDuration,
        lastLogin: statsResponse.data.lastLogin,
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await axios.put('/api/profile', formData, {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
          username: user.username,
        },
      });

      toast.success('Profile updated successfully');
      setIsEditing(false);
      fetchProfileData(); // Refresh data
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill all fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      await axios.put(
        '/api/profile/change-password',
        {
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword,
        },
        {
          params: {
            token: user.authToken,
            dataSource: user.dataSource,
            username: user.username,
          },
        }
      );

      toast.success('Password changed successfully');
      setShowPasswordDialog(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Failed to change password:', error);
      toast.error(error.response?.data?.error || 'Failed to change password');
    }
  };

  const fetchActiveSessions = async () => {
    if (!user) return;

    try {
      const response = await axios.get('/api/profile/sessions', {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
        },
      });
      setActiveSessions(response.data);
      setShowSessionsDialog(true);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to load active sessions');
    }
  };

  const getRoleBadge = () => {
    const role = profileData?.role || user?.role || 'user';
    const variants: Record<string, string> = {
      admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      user: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      guest: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };
    return (
      <Badge variant="outline" className={variants[role] || variants.user}>
        {role.toUpperCase()}
      </Badge>
    );
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6 py-6 max-w-4xl animate-in fade-in duration-500">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6 max-w-4xl animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account information</p>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={`https://avatar.vercel.sh/${user?.username}.png`} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {user?.username?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{profileData?.username || user?.username}</h2>
                {getRoleBadge()}
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  Active
                </Badge>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {profileData?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{profileData.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>Data Source: {user?.dataSource}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Joined {format(new Date(profileData?.accountCreated || new Date()), 'MMMM yyyy')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
              ) : (
                <Button onClick={() => setIsEditing(false)} variant="outline" className="gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowPasswordDialog(true)} className="gap-2">
                <Key className="h-4 w-4" />
                Change Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form or Details */}
      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@example.com"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">Organization Name (Optional)</Label>
              <Input
                id="organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                placeholder="Your Organisztion name"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-4">
              <Button onClick={handleSaveProfile} disabled={isLoading} className="gap-2">
                <Save className="h-4 w-4" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Full Name</Label>
                <p className="text-lg font-medium mt-1">{profileData?.fullName || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="text-lg font-medium mt-1">{profileData?.email || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Organization</Label>
                <p className="text-lg font-medium mt-1">{profileData?.organization || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Role</Label>
                <div className="mt-2">{getRoleBadge()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Account Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activityStats?.totalSessions || 0}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Activity className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activityStats ? formatDuration(activityStats.totalDuration) : '0h'}
                </p>
                <p className="text-sm text-muted-foreground">Total Time</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Calendar className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activityStats ? format(new Date(activityStats.lastLogin), 'MMM dd') : 'Today'}
                </p>
                <p className="text-sm text-muted-foreground">Last Active</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">
                Last changed{' '}
                {profileData ? format(new Date(profileData.lastPasswordUpdate), 'MMM dd, yyyy') : 'Unknown'}
              </p>
            </div>
            <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
              Change
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Two-Factor Authentication:</strong> Not available in this version. Contact your administrator for advanced security features.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Active Sessions</p>
              <p className="text-sm text-muted-foreground">View your currently logged-in devices</p>
            </div>
            <Button variant="outline" onClick={fetchActiveSessions}>
              View
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="oldPassword">Current Password</Label>
              <Input
                id="oldPassword"
                type="password"
                value={passwordData.oldPassword}
                onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Sessions Dialog */}
      <Dialog open={showSessionsDialog} onOpenChange={setShowSessionsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Active Sessions</DialogTitle>
            <DialogDescription>Devices where you&apos;re currently logged in</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {activeSessions.length > 0 ? (
              activeSessions.map((session, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">{session.connectionName}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.protocol.toUpperCase()} • Started{' '}
                      {format(new Date(session.startTime), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    Active
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No active sessions</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSessionsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
