'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import api from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { ShieldCheck, Monitor, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/');
      return;
    }

    if (isHydrated && isAuthenticated && user) {
      const fetchData = async () => {
        try {
          // Use the specific endpoint requested: {{baseURL}}/api/session/data/{{dataSource}}/connections
          const response = await api.get(`/session/data/${user.dataSource}/connections`);

          // Guacamole connections API returns an object where keys are identifiers
          const connectionsData = response.data;
          const connectionsList = Object.keys(connectionsData)
            .map((id) => ({
              ...connectionsData[id],
              identifier: id,
            }))
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
    // Open connection in new tab
    const connectionUrl = `/connection/${connectionId}`;
    window.open(connectionUrl, '_blank', 'noopener,noreferrer');
  };

  if (!isHydrated || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-primary/30">
      <nav className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-widest uppercase block leading-none">
                Guacamole Portal
              </span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase">
                Secure Connection Gateway
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block font-mono">
              <p className="text-xs text-zinc-400 leading-tight">
                USER: <span className="text-primary">{user?.username}</span>
              </p>
              <p className="text-[10px] text-zinc-600 leading-tight">
                STATUS: <span className="text-green-500">CONNECTED</span>
              </p>
            </div>
            <Separator orientation="vertical" className="h-8 bg-zinc-900" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs uppercase font-bold tracking-wider">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Your Connections</h2>
          <p className="text-zinc-400">Click on a connection to establish a secure remote desktop session.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-40 rounded-2xl bg-zinc-900/50" />)
          ) : connections.length > 0 ? (
            connections.map((conn) => (
              <Card
                key={conn.identifier}
                className="bg-zinc-900/20 border-zinc-900 hover:border-primary/40 group transition-all duration-300 rounded-2xl cursor-pointer"
                onClick={() => handleConnectionClick(conn.identifier, conn.name)}
              >
                <div className="p-6 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100 group-hover:text-primary transition-colors">
                        {conn.name}
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
                        {conn.protocol} // SECURE
                      </p>
                    </div>
                    <div className="p-2 bg-zinc-950 rounded-xl">
                      <Monitor className="w-5 h-5 text-zinc-600 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                  <div className="mt-8">
                    <Button
                      className="w-full bg-zinc-950 border border-zinc-800 hover:bg-primary hover:border-primary text-[10px] font-black uppercase tracking-widest h-10 rounded-xl"
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
            <div className="col-span-full py-20 text-center space-y-4">
              <Monitor className="w-12 h-12 text-zinc-800 mx-auto" />
              <p className="text-zinc-500">No connections available for this account.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
