'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Activity, Clock, Monitor, TrendingUp, BarChart3, PieChart, Timer, RefreshCw } from 'lucide-react';
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
} from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UsageStats {
  totalSessions: number;
  totalDuration: number;
  averageDuration: number;
  lastLogin: string;
  mostUsedProtocol: string;
  activeToday: number;
  protocolUsage: Array<{ protocol: string; count: number; duration: number }>;
  sessionHistory: Array<{ date: string; sessions: number; duration: number }>;
}

export default function ActivityPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UsageStats | null>(null);

  const fetchActivityStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await axios.get('/api/stats/activity', {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
          username: user.username,
        },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch activity stats:', error);
      toast.error('Failed to load activity statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityStats();
  }, [user]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6 py-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Activity Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Personal usage statistics and insights</p>
        </div>
        <Button variant="outline" onClick={fetchActivityStats} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">All time connections</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatDuration(stats?.totalDuration || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Connected time</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.averageDuration || 0}m</div>
                <p className="text-xs text-muted-foreground mt-1">Average duration</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-500">{stats?.activeToday || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Active sessions</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="protocols" className="gap-2">
            <PieChart className="h-4 w-4" />
            Protocols
          </TabsTrigger>
          <TabsTrigger value="duration" className="gap-2">
            <Clock className="h-4 w-4" />
            Duration
          </TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Activity</CardTitle>
              <CardDescription>Your connection sessions over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats?.sessionHistory || []}>
                    <defs>
                      <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      }
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Protocols Tab */}
        <TabsContent value="protocols" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Protocol Distribution</CardTitle>
                <CardDescription>Sessions by protocol type</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={stats?.protocolUsage || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ protocol, count }) => `${protocol}: ${count}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {(stats?.protocolUsage || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Protocol Details</CardTitle>
                <CardDescription>Usage breakdown by protocol</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <>
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </>
                  ) : (
                    (stats?.protocolUsage || []).map((proto, index) => (
                      <div
                        key={proto.protocol}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div>
                            <p className="font-semibold">{proto.protocol}</p>
                            <p className="text-sm text-muted-foreground">
                              {proto.count} sessions • {formatDuration(proto.duration)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {stats?.totalSessions ? ((proto.count / stats.totalSessions) * 100).toFixed(0) : 0}%
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Duration Tab */}
        <TabsContent value="duration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Duration</CardTitle>
              <CardDescription>Time spent in remote sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats?.sessionHistory || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      }
                      className="text-xs"
                    />
                    <YAxis
                      className="text-xs"
                      label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value} minutes`, 'Duration']}
                    />
                    <Bar dataKey="duration" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Most Used Protocol */}
      <Card>
        <CardHeader>
          <CardTitle>Favorite Protocol</CardTitle>
          <CardDescription>Your most frequently used connection type</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="flex items-center gap-4 p-6 bg-primary/5 rounded-lg border border-primary/20">
              <div className="p-4 bg-primary/10 rounded-xl">
                <Monitor className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats?.mostUsedProtocol || 'N/A'}</h3>
                <p className="text-muted-foreground">Most used protocol</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
