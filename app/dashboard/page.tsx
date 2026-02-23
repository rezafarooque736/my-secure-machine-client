'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import api from '@/lib/api-client';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Monitor, Activity, Clock, TrendingUp, Users, Shield, ArrowRight, Sparkles } from 'lucide-react';

interface Connection {
  identifier: string;
  name: string;
  protocol: string;
  lastUsed?: string;
}

interface DashboardStats {
  activeSessions: number;
  totalUsage: string;
  totalUsageMinutes: number;
  connectionCount: number;
  accountStatus: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [recentConnections, setRecentConnections] = useState<Connection[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch connections
        const connectionsResponse = await api.get(`/session/data/${user.dataSource}/connections`);
        const connectionsData = connectionsResponse.data;
        const connectionsList = Object.keys(connectionsData)
          .map((id) => ({ ...connectionsData[id], identifier: id }))
          .filter((conn: any) => conn.name);

        setConnections(connectionsList);

        // Fetch recent connections from API
        const recentResponse = await axios.get('/api/connections/recent', {
          params: {
            token: user.authToken,
            dataSource: user.dataSource,
            limit: 3,
          },
        });
        setRecentConnections(recentResponse.data);

        // Fetch dashboard statistics
        const statsResponse = await axios.get('/api/stats/dashboard', {
          params: {
            token: user.authToken,
            dataSource: user.dataSource,
            username: user.username,
          },
        });
        setStats(statsResponse.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleConnectionClick = (connectionId: string) => {
    window.open(`/connection/${connectionId}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          Welcome back, <span className="text-primary">{user?.username}</span>
          <Sparkles className="h-6 w-6 text-yellow-500" />
        </h1>
        <p className="text-muted-foreground text-lg">
          Here&apos;s what&apos;s happening with your remote connections today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Connections</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{connections.length}</div>
                <p className="text-xs text-muted-foreground">Available remote desktops</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.activeSessions || 0}</div>
                <p className="text-xs text-muted-foreground">Currently connected</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalUsage || '0h'}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    {stats?.accountStatus || 'Active'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{user?.role} account</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Connections */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Connections
            </CardTitle>
            <CardDescription>Quick access to your most used connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : recentConnections.length > 0 ? (
              recentConnections.map((conn) => (
                <div
                  key={conn.identifier}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors group"
                  onClick={() => handleConnectionClick(conn.identifier)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Monitor className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium group-hover:text-primary transition-colors">{conn.name}</p>
                      <p className="text-xs text-muted-foreground uppercase">{conn.protocol}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent connections</p>
            )}
            {recentConnections.length > 0 && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/dashboard/connections')}
              >
                View All Connections
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={() => router.push('/dashboard/connections')}
            >
              <Monitor className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Browse Connections</div>
                <div className="text-xs text-muted-foreground">View all available desktops</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={() => router.push('/dashboard/activity')}
            >
              <Activity className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Activity Log</div>
                <div className="text-xs text-muted-foreground">View your connection history</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={() => router.push('/dashboard/profile')}
            >
              <Users className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Profile Settings</div>
                <div className="text-xs text-muted-foreground">Manage your account</div>
              </div>
            </Button>

            {user?.role === 'admin' && (
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4 border-primary/20 bg-primary/5"
                onClick={() => router.push('/dashboard/admin/users')}
              >
                <Shield className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Admin Panel</div>
                  <div className="text-xs text-muted-foreground">Manage users and system</div>
                </div>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Connections Grid */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Connections</CardTitle>
            <CardDescription>Click on any connection to start a remote session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : (
                connections.map((conn) => (
                  <div
                    key={conn.identifier}
                    className="group relative rounded-lg border p-4 hover:border-primary hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleConnectionClick(conn.identifier)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          <Monitor className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold group-hover:text-primary transition-colors">
                            {conn.name}
                          </h3>
                          <p className="text-xs text-muted-foreground uppercase mt-1">{conn.protocol}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Available
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnectionClick(conn.identifier);
                      }}
                    >
                      Connect
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
