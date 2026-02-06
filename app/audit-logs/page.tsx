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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
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
} from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';

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
  return <Badge className={`font-mono text-xs border ${config.className}`}>{config.label}</Badge>;
};

const getCategoryBadge = (category: string) => {
  const variants: Record<string, { color: string; label: string }> = {
    AUTH: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', label: 'Auth' },
    CONNECTION: { color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', label: 'Connection' },
    SYSTEM: { color: 'bg-green-500/10 text-green-400 border-green-500/20', label: 'System' },
    USER_ACTION: { color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', label: 'Action' },
  };
  const config = variants[category] || variants.SYSTEM;
  return <Badge className={`font-mono text-xs border ${config.color}`}>{config.label}</Badge>;
};

export default function AuditLogsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    search: '',
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
      if (filters.search) params.append('search', filters.search);

      const response = await axios.get(`/api/logs/activity?${params.toString()}`);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
      if (response.data.statistics) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hydrated && user) {
      fetchLogs();
    }
  }, [hydrated, user, pagination.page, filters]);

  const columns: ColumnDef<ActivityLog>[] = [
    {
      accessorKey: 'timestamp',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-zinc-800"
          >
            Timestamp
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue('timestamp'));
        return (
          <div className="font-mono text-xs text-zinc-400">
            <div>{format(date, 'MMM dd, yyyy')}</div>
            <div className="text-zinc-600">{format(date, 'HH:mm:ss')}</div>
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
          <span className="font-mono text-sm text-zinc-300">{username}</span>
        ) : (
          <span className="text-zinc-600 text-xs">System</span>
        );
      },
    },
    {
      accessorKey: 'message',
      header: 'Message',
      cell: ({ row }) => {
        return <div className="max-w-md truncate text-sm text-zinc-300">{row.getValue('message')}</div>;
      },
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }) => {
        const ip = row.getValue('ipAddress') as string;
        return ip ? (
          <span className="font-mono text-xs text-zinc-500">{ip}</span>
        ) : (
          <span className="text-zinc-700 text-xs">—</span>
        );
      },
    },
  ];

  const table = useReactTable({
    data: logs,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
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
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!hydrated || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-zinc-400 hover:text-zinc-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="h-8 w-px bg-zinc-800" />
            <div>
              <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-400" />
                Audit Logs
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                {user?.role === 'admin' ? 'System-wide activity logs' : 'Your activity logs'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              className="border-zinc-800 hover:bg-zinc-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="border-zinc-800 hover:bg-zinc-800"
              disabled={logs.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Statistics Cards (Admin Only) */}
        {user?.role === 'admin' && statistics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-zinc-900/30 border-zinc-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-semibold">Total Logs</p>
                    <p className="text-2xl font-bold text-zinc-100 mt-1">
                      {statistics.totalLogs.toLocaleString()}
                    </p>
                  </div>
                  <Database className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/30 border-zinc-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-semibold">Auth Events</p>
                    <p className="text-2xl font-bold text-zinc-100 mt-1">
                      {statistics.authLogs.toLocaleString()}
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/30 border-zinc-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-semibold">Connections</p>
                    <p className="text-2xl font-bold text-zinc-100 mt-1">
                      {statistics.connectionLogs.toLocaleString()}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/30 border-zinc-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-semibold">Errors</p>
                    <p className="text-2xl font-bold text-zinc-100 mt-1">
                      {statistics.errorLogs.toLocaleString()}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/30 border-zinc-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-semibold">Users</p>
                    <p className="text-2xl font-bold text-zinc-100 mt-1">
                      {statistics.uniqueUsers.toLocaleString()}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="bg-zinc-900/30 border-zinc-800/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-400" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="bg-zinc-950/50 border-zinc-800 pl-10"
                  />
                </div>
              </div>
              <Select
                value={filters.level || 'all'}
                onValueChange={(value) => setFilters({ ...filters, level: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="w-[180px] bg-zinc-950/50 border-zinc-800">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="WARN">Warning</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => setFilters({ ...filters, category: value === 'all' ? '' : value })}
              >
                <SelectTrigger className="w-[180px] bg-zinc-950/50 border-zinc-800">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="AUTH">Authentication</SelectItem>
                  <SelectItem value="CONNECTION">Connection</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                  <SelectItem value="USER_ACTION">User Action</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-zinc-800 hover:bg-zinc-800">
                    Columns <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
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
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-zinc-900/30 border-zinc-800/50">
          <CardContent className="p-0">
            <div className="rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-zinc-800 hover:bg-zinc-800/30">
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id} className="text-zinc-400 font-semibold">
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i} className="border-zinc-800">
                        {Array.from({ length: columns.length }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-8 w-full bg-zinc-800" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && 'selected'}
                        className="border-zinc-800 hover:bg-zinc-800/30 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-500">
                        No logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            Showing {logs.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total.toLocaleString()} logs
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="border-zinc-800 hover:bg-zinc-800"
            >
              Previous
            </Button>
            <div className="text-sm text-zinc-400">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.totalPages}
              className="border-zinc-800 hover:bg-zinc-800"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
