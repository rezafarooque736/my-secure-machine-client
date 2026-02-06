'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import api from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { ShieldCheck, Monitor, LogOut, Activity, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

export default function DashboardPage() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => setIsHydrated(true), []);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/');
      return;
    }

    if (isHydrated && isAuthenticated && user) {
      const fetchData = async () => {
        try {
          const response = await api.get(`/session/data/${user.dataSource}/connections`);
          const connectionsData = response.data;
          const connectionsList = Object.keys(connectionsData)
            .map((id) => ({ ...connectionsData[id], identifier: id }))
            .filter((conn: any) => conn.name);
          setConnections(connectionsList);
        } catch (error) {
          console.error('Failed to fetch connections', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isHydrated, isAuthenticated, router, user]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleConnectionClick = (connectionId: string, connectionName: string) => {
    window.open(`/connection/${connectionId}`, '_blank', 'noopener,noreferrer');
  };

  if (!isHydrated || !isAuthenticated) return null;

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Guacamole Portal';

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="mx-auto flex items-center justify-center">
              <Image
                src="/railtel_logo_light.svg"
                priority
                alt="RailTel Logo"
                width={30}
                height={30}
                className="relative"
              />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight block leading-none">{appName}</span>
              <span className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                <Activity className="w-3 h-3" />
                Remote Desktop Gateway
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:block">
              <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800/30 rounded-lg border border-zinc-700/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <div className="text-sm">
                  <p className="text-zinc-400 text-xs">Logged in as</p>
                  <p className="text-zinc-100 font-semibold">{user?.username}</p>
                </div>
              </div>
            </div>

            <Separator orientation="vertical" className="h-10 bg-zinc-800" />
            {user?.role === 'admin' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/audit-logs')}
                  className="text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 gap-2"
                >
                  <Activity className="w-4 h-4" />
                  <span className="text-xs uppercase font-bold tracking-wider">Audit Logs</span>
                </Button>
                <Separator orientation="vertical" className="h-8 bg-zinc-900" />
              </>
            )}

            <Separator orientation="vertical" className="h-10 bg-zinc-800" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-zinc-400 hover:text-red-400 hover:bg-red-400/10 gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-semibold">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-blue-400" />
            Your Connections
          </h2>
          <p className="text-zinc-400 text-lg">
            Select a connection to establish a secure remote desktop session
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48 rounded-2xl bg-zinc-800/30" />)
          ) : connections.length > 0 ? (
            connections.map((conn) => (
              <Card
                key={conn.identifier}
                className="bg-zinc-900/30 border-zinc-800/50 hover:border-blue-500/50 group transition-all duration-300 rounded-2xl cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
                onClick={() => handleConnectionClick(conn.identifier, conn.name)}
              >
                <div className="p-6 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">
                        {conn.name}
                      </h3>
                      <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mt-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                        {conn.protocol} · Secure
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-950/50 rounded-xl group-hover:bg-blue-500/10 transition-colors">
                      <Monitor className="w-6 h-6 text-zinc-600 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                  <div className="mt-8">
                    <Button
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnectionClick(conn.identifier, conn.name);
                      }}
                    >
                      Connect Now
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-32 text-center space-y-6">
              <div className="w-20 h-20 bg-zinc-800/30 rounded-full flex items-center justify-center mx-auto">
                <Monitor className="w-10 h-10 text-zinc-700" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-zinc-300 mb-2">No Connections Available</h3>
                <p className="text-zinc-500">Contact your administrator to get access to remote desktops</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
