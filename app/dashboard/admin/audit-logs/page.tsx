'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowUpDown,
  ChevronDown,
  Download,
  Filter,
  RefreshCw,
  Search,
  Activity,
  Shield,
  AlertCircle,
  Users,
  Database,
  Eye,
  CalendarIcon,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ActivityLog {
  id: number;
  level: string;
  category: string;
  message: string;
  username: string | null;
  ipAddress: string | null;
  metadata: string | null;
  timestamp: string;
}

interface Statistics {
  totalLogs: number;
  authLogs: number;
  connectionLogs: number;
  errorLogs: number;
  uniqueUsers: number;
}

const getLevelBadge = (level: string) => {
  const variants: Record<string, { className: string; label: string }> = {
    INFO: { className: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Info' },
    SUCCESS: { className: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'Success' },
    WARN: { className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', label: 'Warning' },
    ERROR: { className: 'bg-red-500/10 text-red-400 border-red-500/20', label: 'Error' },
  };
  const config = variants[level] || variants.INFO;
  return (
    <Badge variant="outline" className={`font-mono text-xs border ${config.className}`}>
      {config.label}
    </Badge>
  );
};

const getCategoryBadge = (category: string) => {
  const variants: Record<string, { color: string; label: string }> = {
    AUTH: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Auth' },
    CONNECTION: { color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'Connection' },
    SYSTEM: { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'System' },
    USER_ACTION: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Action' },
  };
  const config = variants[category] || variants.SYSTEM;
  return (
    <Badge variant="outline" className={`font-mono text-xs border ${config.color}`}>
      {config.label}
    </Badge>
  );
};

export default function AuditLogsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/');
    }
  }, [hydrated, isAuthenticated, router]);

  const fetchLogs = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        username: user.username,
        role: user.role,
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (filters.level) params.append('level', filters.level);
      if (filters.category) params.append('category', filters.category);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (globalFilter) params.append('search', globalFilter);

      const response = await axios.get(`/api/logs/activity?${params.toString()}`);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
      if (response.data.statistics) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hydrated && user) {
      fetchLogs();
    }
  }, [hydrated, user, pagination.page, filters.level, filters.category, filters.startDate, filters.endDate]);

  const columns: ColumnDef<ActivityLog>[] = [
    {
      accessorKey: 'timestamp',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-accent -ml-4"
          >
            Timestamp
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue('timestamp'));
        return (
          <div className="font-mono text-xs">
            <div className="font-semibold">{format(date, 'MMM dd, yyyy')}</div>
            <div className="text-muted-foreground">{format(date, 'HH:mm:ss')}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'level',
      header: 'Level',
      cell: ({ row }) => getLevelBadge(row.getValue('level')),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => getCategoryBadge(row.getValue('category')),
    },
    {
      accessorKey: 'username',
      header: 'User',
      cell: ({ row }) => {
        const username = row.getValue('username') as string;
        return username ? (
          <span className="font-mono text-sm font-medium">{username}</span>
        ) : (
          <span className="text-muted-foreground text-xs italic">System</span>
        );
      },
    },
    {
      accessorKey: 'message',
      header: 'Message',
      cell: ({ row }) => {
        return <div className="max-w-md truncate text-sm">{row.getValue('message')}</div>;
      },
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }) => {
        const ip = row.getValue('ipAddress') as string;
        return ip ? (
          <span className="font-mono text-xs text-muted-foreground">{ip}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const log = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[400px]">
              <DropdownMenuLabel>Log Details</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 space-y-2 text-sm">
                <div>
                  <span className="font-semibold">ID:</span> {log.id}
                </div>
                <div>
                  <span className="font-semibold">Timestamp:</span> {format(new Date(log.timestamp), 'PPpp')}
                </div>
                <div>
                  <span className="font-semibold">Level:</span> {log.level}
                </div>
                <div>
                  <span className="font-semibold">Category:</span> {log.category}
                </div>
                <div>
                  <span className="font-semibold">User:</span> {log.username || 'System'}
                </div>
                <div>
                  <span className="font-semibold">IP:</span> {log.ipAddress || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">Message:</span>
                  <p className="mt-1 text-muted-foreground">{log.message}</p>
                </div>
                {log.metadata && (
                  <div>
                    <span className="font-semibold">Metadata:</span>
                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: logs,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Level', 'Category', 'User', 'Message', 'IP Address'],
      ...logs.map((log) => [
        format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        log.level,
        log.category,
        log.username || 'System',
        log.message,
        log.ipAddress || '',
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    a.click();
    toast.success('Audit logs exported successfully');
  };

  const clearFilters = () => {
    setFilters({
      level: '',
      category: '',
      startDate: undefined,
      endDate: undefined,
    });
    setGlobalFilter('');
    toast.info('Filters cleared');
  };

  if (!hydrated || !isAuthenticated) return null;

  return (
    <div className="space-y-6 py-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'admin' ? 'System-wide activity logs' : 'Your activity logs'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards (Admin Only) */}
      {user?.role === 'admin' && statistics && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalLogs.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auth Events</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.authLogs.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Login/Logout</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connections</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.connectionLogs.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Remote sessions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{statistics.errorLogs.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.uniqueUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Level Filter */}
            <Select value={filters.level} onValueChange={(value) => setFilters({ ...filters, level: value })}>
              <SelectTrigger>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Levels</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="WARN">Warning</SelectItem>
                <SelectItem value="ERROR">Error</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters({ ...filters, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                <SelectItem value="AUTH">Auth</SelectItem>
                <SelectItem value="CONNECTION">Connection</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
                <SelectItem value="USER_ACTION">User Action</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal',
                      !filters.startDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? format(filters.startDate, 'PP') : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date: any) => setFilters({ ...filters, startDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.level || filters.category || filters.startDate || globalFilter) && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {globalFilter && (
                <Badge variant="secondary" className="gap-1">
                  Search: {globalFilter}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setGlobalFilter('')} />
                </Badge>
              )}
              {filters.level && (
                <Badge variant="secondary" className="gap-1">
                  Level: {filters.level}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setFilters({ ...filters, level: '' })}
                  />
                </Badge>
              )}
              {filters.category && (
                <Badge variant="secondary" className="gap-1">
                  Category: {filters.category}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setFilters({ ...filters, category: '' })}
                  />
                </Badge>
              )}
              {filters.startDate && (
                <Badge variant="secondary" className="gap-1">
                  From: {format(filters.startDate, 'PP')}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setFilters({ ...filters, startDate: undefined })}
                  />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>
                Showing {logs.length} of {pagination.total} logs
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          No logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
