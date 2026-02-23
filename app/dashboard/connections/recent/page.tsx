'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Monitor, Play, ArrowRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface RecentConnection {
  identifier: string;
  name: string;
  protocol: string;
  lastUsed: string;
  duration?: number;
}

export default function RecentConnectionsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [recentConnections, setRecentConnections] = useState<RecentConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentConnections = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await axios.get('/api/connections/recent', {
        params: {
          token: user.authToken,
          dataSource: user.dataSource,
          limit: 20,
        },
      });
      setRecentConnections(response.data);
    } catch (error) {
      console.error('Failed to fetch recent connections:', error);
      toast.error('Failed to load recent connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentConnections();
  }, [user]);

  const handleConnectionClick = (connectionId: string) => {
    window.open(`/connection/${connectionId}`, '_blank', 'noopener,noreferrer');
  };

  const getProtocolColor = (protocol: string) => {
    const colors: Record<string, string> = {
      rdp: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      vnc: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      ssh: 'bg-green-500/10 text-green-400 border-green-500/20',
      telnet: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    };
    return colors[protocol.toLowerCase()] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Recent Connections
          </h1>
          <p className="text-muted-foreground mt-1">Quick access to your recently used connections</p>
        </div>
        <Button variant="outline" onClick={fetchRecentConnections} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : recentConnections.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {recentConnections.map((conn) => (
            <Card
              key={conn.identifier}
              className="group hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => handleConnectionClick(conn.identifier)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-4 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <Monitor className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                        {conn.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className={cn('text-xs', getProtocolColor(conn.protocol))}>
                          {conn.protocol.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Last used {formatDistanceToNow(new Date(conn.lastUsed), { addSuffix: true })}
                        </span>
                        {conn.duration && (
                          <span className="text-sm text-muted-foreground">• {conn.duration}min session</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnectionClick(conn.identifier);
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No recent connections</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start connecting to see your recent activity here
            </p>
            <Button onClick={() => router.push('/dashboard/connections')}>
              Browse Connections
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
