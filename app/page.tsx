'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import Image from 'next/image';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  useEffect(() => setIsHydrated(true), []);

  useEffect(() => {
    if (isHydrated && isAuthenticated) router.push('/dashboard');
  }, [isHydrated, isAuthenticated, router]);

  const performLogin = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', {
        username: values.username.trim(),
        password: values.password.trim(),
      });

      setAuth(response.data);
      toast.success('Welcome back! Authentication successful', {
        description: `Logged in as ${response.data.username}`,
      });
      router.push('/dashboard');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please check your credentials.';
      toast.error('Authentication Failed', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isHydrated) return null;

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Guacamole Portal';
  const appTagline = process.env.NEXT_PUBLIC_APP_TAGLINE || 'Secure Remote Desktop Access';

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Animated background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/5 via-transparent to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="mb-10 text-center space-y-4">
            {/* <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-50" /> */}

            <div className="mx-auto flex items-center justify-center">
              <Image
                src="/railtel_logo_light.svg"
                priority
                alt="RailTel Logo"
                width={70}
                height={70}
                className="relative"
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">
                {appName}
              </h1>
              <p className="text-zinc-400 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                {appTagline}
              </p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="bg-zinc-900/50 border-zinc-800/50 backdrop-blur-xl shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl text-zinc-100">Welcome Back</CardTitle>
              <CardDescription className="text-zinc-400">
                Enter your credentials to access your secure connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(performLogin)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-zinc-200">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    {...form.register('username')}
                    className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-zinc-100 h-12"
                    placeholder="Enter your username"
                    disabled={isLoading}
                  />
                  {form.formState.errors.username && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-zinc-200">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...form.register('password')}
                    className="bg-zinc-950/50 border-zinc-800 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-zinc-100 h-12"
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs text-red-400">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full font-semibold h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/30 transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Authenticating...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              {process.env.NEXT_PUBLIC_SHOW_DEBUG_INFO === 'true' && (
                <div className="mt-6 p-4 bg-zinc-950/50 rounded-lg border border-zinc-800">
                  <p className="text-xs text-zinc-500 font-mono text-center">Demo: guacadmin / guacadmin</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-zinc-600 mt-8">© 2026 {appName}. All rights reserved.</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
