'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Monitor,
  Search,
  Filter,
  Grid3x3,
  List,
  SortAsc,
  Clock,
  ExternalLink,
  Play,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Connection {
  identifier: string;
  name: string;
  protocol: string;
  hostname?: string;
  port?: number;
  lastUsed?: string;
}

interface RecentConnection {
  identifier: string;
  name: string;
  protocol: string;
  lastUsed: string;
  duration?: number;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'name' | 'protocol' | 'recent';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProtocolColor(protocol: string) {
  const colors: Record<string, string> = {
    rdp: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    vnc: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    ssh: 'bg-green-500/10 text-green-400 border-green-500/20',
    telnet: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  };
  return colors[protocol.toLowerCase()] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  // All connections state
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Recent connections state
  const [recentConnections, setRecentConnections] = useState<RecentConnection[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // ── Fetch all connections ────────────────────────────────────────────────
  const fetchConnections = useCallback(async () => {
    if (!user) return;
    setLoadingAll(true);
    try {
      const res = await axios.get('/api/connections/list', {
        params: { token: user.authToken, dataSource: user.dataSource },
      });
      setConnections(res.data);
    } catch {
      toast.error('Failed to load connections');
    } finally {
      setLoadingAll(false);
    }
  }, [user]);

  // ── Fetch recent connections ─────────────────────────────────────────────
  const fetchRecentConnections = useCallback(async () => {
    if (!user) return;
    setLoadingRecent(true);
    try {
      const res = await axios.get('/api/connections/recent', {
        params: { token: user.authToken, dataSource: user.dataSource, limit: 20 },
      });
      setRecentConnections(res.data);
    } catch {
      toast.error('Failed to load recent connections');
    } finally {
      setLoadingRecent(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConnections();
    fetchRecentConnections();
  }, [fetchConnections, fetchRecentConnections]);

  // ── Filter + sort ────────────────────────────────────────────────────────
  const filteredConnections = useMemo(() => {
    let filtered = [...connections];

    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.protocol.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (selectedProtocol !== 'all') {
      filtered = filtered.filter((c) => c.protocol.toLowerCase() === selectedProtocol);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'protocol':
          return a.protocol.localeCompare(b.protocol);
        case 'recent':
          return (b.lastUsed || '').localeCompare(a.lastUsed || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [connections, searchQuery, selectedProtocol, sortBy]);

  const protocols = useMemo(
    () => ['all', ...Array.from(new Set(connections.map((c) => c.protocol.toLowerCase())))],
    [connections],
  );

  // ── Click handler ────────────────────────────────────────────────────────
  const handleConnectionClick = useCallback((connectionId: string) => {
    window.open(`/connection/${connectionId}`, '_blank', 'noopener,noreferrer');
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse and connect to your available remote desktops
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="h-9">
          <TabsTrigger value="all" className="text-xs gap-1.5">
            <Monitor className="h-3.5 w-3.5" />
            All Connections
            {!loadingAll && (
              <span className="ml-1 bg-muted text-muted-foreground rounded-full px-1.5 py-0 text-[10px] font-semibold">
                {connections.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recent" className="text-xs gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Recent
            {!loadingRecent && recentConnections.length > 0 && (
              <span className="ml-1 bg-muted text-muted-foreground rounded-full px-1.5 py-0 text-[10px] font-semibold">
                {recentConnections.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── ALL CONNECTIONS TAB ──────────────────────────────────────── */}
        <TabsContent value="all" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name or protocol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
              <SelectTrigger className="h-9 text-sm w-full sm:w-[160px]">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Protocols" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Protocols</SelectItem>
                {protocols
                  .filter((p) => p !== 'all')
                  .map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.toUpperCase()}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="h-9 text-sm w-full sm:w-[150px]">
                <SortAsc className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="protocol">Protocol</SelectItem>
                <SelectItem value="recent">Recent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Count */}
          {!loadingAll && (
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredConnections.length}</span> of{' '}
              <span className="font-semibold text-foreground">{connections.length}</span> connections
            </p>
          )}

          {/* Grid / List */}
          {loadingAll ? (
            <div
              className={cn(
                'grid gap-3',
                viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1',
              )}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : filteredConnections.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredConnections.map((conn) => (
                  <Card
                    key={conn.identifier}
                    className="group cursor-pointer
                      bg-gradient-to-r from-muted/60 to-muted/30
                      dark:from-zinc-800/80 dark:to-zinc-900/60
                      border border-sky-500/40 dark:border-sky-400/30
                      [box-shadow:0_0_0_1px_rgba(56,189,248,0.15),0_2px_8px_rgba(56,189,248,0.12),0_1px_2px_rgba(0,0,0,0.08)]
                      dark:[box-shadow:0_0_0_1px_rgba(56,189,248,0.2),0_2px_12px_rgba(56,189,248,0.18),0_1px_3px_rgba(0,0,0,0.4)]
                      hover:border-sky-400/70 dark:hover:border-sky-400/60
                      hover:[box-shadow:0_0_0_1px_rgba(56,189,248,0.3),0_4px_16px_rgba(56,189,248,0.25),0_1px_3px_rgba(0,0,0,0.1)]
                      dark:hover:[box-shadow:0_0_0_1px_rgba(56,189,248,0.4),0_4px_20px_rgba(56,189,248,0.35),0_2px_4px_rgba(0,0,0,0.5)]
                      transition-all duration-200"
                    onClick={() => handleConnectionClick(conn.identifier)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors shrink-0">
                            <Monitor className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
                              {conn.name}
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className={cn(
                                'mt-1.5 text-xs py-0 h-4 px-1.5',
                                getProtocolColor(conn.protocol),
                              )}
                            >
                              {conn.protocol.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div
                        className="flex items-center gap-2
                        px-2.5 py-1.5 rounded-lg
                        bg-primary/8 dark:bg-primary/15
                        border border-primary/20
                        text-primary text-xs font-semibold
                        group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground
                        transition-all duration-200 justify-center"
                      >
                        <Play className="h-3 w-3" />
                        Connect
                        <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConnections.map((conn) => (
                  <div
                    key={conn.identifier}
                    onClick={() => handleConnectionClick(conn.identifier)}
                    className="group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer
                      bg-gradient-to-r from-muted/60 to-muted/30
                      dark:from-zinc-800/80 dark:to-zinc-900/60
                      border border-sky-500/40 dark:border-sky-400/30
                      [box-shadow:0_0_0_1px_rgba(56,189,248,0.15),0_2px_8px_rgba(56,189,248,0.12)]
                      dark:[box-shadow:0_0_0_1px_rgba(56,189,248,0.2),0_2px_12px_rgba(56,189,248,0.18)]
                      hover:border-sky-400/70
                      hover:[box-shadow:0_0_0_1px_rgba(56,189,248,0.3),0_4px_16px_rgba(56,189,248,0.25)]
                      dark:hover:[box-shadow:0_0_0_1px_rgba(56,189,248,0.4),0_4px_20px_rgba(56,189,248,0.35)]
                      active:scale-[0.99] transition-all duration-200"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors shrink-0">
                      <Monitor className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                        {conn.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="outline"
                          className={cn('text-xs py-0 h-4 px-1.5', getProtocolColor(conn.protocol))}
                        >
                          {conn.protocol.toUpperCase()}
                        </Badge>
                        {conn.hostname && (
                          <span className="text-xs text-muted-foreground truncate">{conn.hostname}</span>
                        )}
                      </div>
                    </div>
                    <div
                      className="shrink-0 flex items-center gap-1.5
                      px-2.5 py-1 rounded-lg
                      bg-primary/8 dark:bg-primary/15
                      border border-primary/20
                      text-primary text-xs font-semibold
                      group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground
                      transition-all duration-200"
                    >
                      Connect
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border bg-muted/20">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Monitor className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">No connections found</h3>
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                {searchQuery || selectedProtocol !== 'all'
                  ? 'Try adjusting your filters or search query.'
                  : 'Contact your administrator to get access to remote desktops.'}
              </p>
            </div>
          )}
        </TabsContent>

        {/* ── RECENT TAB ───────────────────────────────────────────────── */}
        <TabsContent value="recent" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Your last <span className="font-semibold text-foreground">20</span> sessions
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={fetchRecentConnections}
              disabled={loadingRecent}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loadingRecent && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {loadingRecent ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : recentConnections.length > 0 ? (
            <div className="space-y-2">
              {recentConnections.map((conn, idx) => (
                <div
                  key={conn.identifier}
                  onClick={() => handleConnectionClick(conn.identifier)}
                  className="group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer
                    bg-gradient-to-r from-muted/60 to-muted/30
                    dark:from-zinc-800/80 dark:to-zinc-900/60
                    border border-sky-500/40 dark:border-sky-400/30
                    [box-shadow:0_0_0_1px_rgba(56,189,248,0.15),0_2px_8px_rgba(56,189,248,0.12)]
                    dark:[box-shadow:0_0_0_1px_rgba(56,189,248,0.2),0_2px_12px_rgba(56,189,248,0.18)]
                    hover:border-sky-400/70
                    hover:[box-shadow:0_0_0_1px_rgba(56,189,248,0.3),0_4px_16px_rgba(56,189,248,0.25)]
                    dark:hover:[box-shadow:0_0_0_1px_rgba(56,189,248,0.4),0_4px_20px_rgba(56,189,248,0.35)]
                    active:scale-[0.99] transition-all duration-200"
                >
                  {/* Rank number */}
                  <span className="text-xs font-bold text-muted-foreground/40 w-5 text-right shrink-0">
                    {idx + 1}
                  </span>

                  {/* Icon */}
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors shrink-0">
                    <Monitor className="h-4 w-4 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {conn.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn('text-xs py-0 h-4 px-1.5', getProtocolColor(conn.protocol))}
                      >
                        {conn.protocol.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(conn.lastUsed), { addSuffix: true })}
                      </span>
                      {conn.duration && (
                        <span className="text-xs text-muted-foreground">· {conn.duration}min session</span>
                      )}
                    </div>
                  </div>

                  {/* Connect CTA */}
                  <div
                    className="shrink-0 flex items-center gap-1.5
                    px-2.5 py-1 rounded-lg
                    bg-primary/8 dark:bg-primary/15
                    border border-primary/20
                    text-primary text-xs font-semibold
                    group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground
                    transition-all duration-200"
                  >
                    Connect
                    <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform duration-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 rounded-xl border bg-muted/20">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Clock className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">No recent connections</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Start connecting to see your session history here.
              </p>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  const allTab = document.querySelector('[data-value="all"]') as HTMLElement;
                  allTab?.click();
                }}
              >
                Browse All Connections
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
