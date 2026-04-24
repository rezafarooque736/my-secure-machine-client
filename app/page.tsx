/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { toast } from 'sonner';
import axios from 'axios';
import { Loader2, ShieldCheck, KeyRound, User, Wifi, Monitor, Lock, Globe } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { loginSchema } from '@/lib/validations/auth';
import { cyberSecurityQuotes } from '@/constants/cyber-security-quotes';

type LoginValues = { username: string; password: string };

// ── Floating tech card on the left panel ─────────────────────────────────────
function TechCard({
  icon: Icon,
  title,
  desc,
  className,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'absolute flex items-center gap-3 bg-white/10 dark:bg-white/5 backdrop-blur-md',
        'border border-white/20 rounded-2xl px-4 py-3 shadow-xl',
        'animate-in fade-in slide-in-from-bottom-4 duration-700',
        className,
      )}
    >
      <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-white text-xs font-semibold">{title}</p>
        <p className="text-white/60 text-xs">{desc}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const loginDelayTime = Number(process.env.NEXT_PUBLIC_APP_LOGIN_DELAY_TIME);
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [quote, setQuote] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(loginDelayTime);
  const [showLoadingQuotes, setShowLoadingQuotes] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  useEffect(() => setIsHydrated(true), []);

  useEffect(() => {
    if (isHydrated && isAuthenticated && !showLoadingQuotes) {
      router.replace('/dashboard');
    }
  }, [isHydrated, isAuthenticated, showLoadingQuotes, router]);

  useEffect(() => {
    if (!showLoadingQuotes) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.replace('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showLoadingQuotes, router]);

  if (showLoadingQuotes) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center max-w-lg px-6">
          <Loader2 className="mx-auto h-12 w-12 text-sky-400 animate-spin mb-6" />
          <p className="text-white text-xl font-semibold mb-4">{quote}</p>
          <div className="w-full bg-zinc-800 rounded-full h-2 mb-2">
            <div
              className="bg-sky-500 h-2 rounded-full"
              style={{ width: `${((loginDelayTime - countdown) / loginDelayTime) * 100}%` }}
            />
          </div>
          <p className="text-zinc-400 text-sm">Redirecting in {countdown}s...</p>
        </div>
      </div>
    );
  }

  // Update performLogin function
  const performLogin = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      // Client-side validation
      loginSchema.parse(values);

      const res = await axios.post('/api/auth/login', {
        username: values.username.trim(),
        password: values.password.trim(),
      });

      setAuth({
        authToken: res.data.authToken,
        username: res.data.username,
        dataSource: res.data.dataSource,
        availableDataSources: res.data.availableDataSources ?? ['postgresql'],
        sessionId: res.data.sessionId,
      });

      // Show quotes for 7 seconds
      const randomQuote = cyberSecurityQuotes[Math.floor(Math.random() * cyberSecurityQuotes.length)];

      setQuote(randomQuote);
      setCountdown(loginDelayTime);
      setShowLoadingQuotes(true);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error('Validation Error', {
          description: error.errors[0]?.message || 'Invalid input',
        });
        return;
      }

      toast.error('Login failed', {
        description: error.response?.data?.error || 'Invalid credentials',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isHydrated) return null;

  return (
    <div className="min-h-screen flex overflow-hidden bg-zinc-950">
      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col items-center justify-center overflow-hidden">
        {/* Deep gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-900" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Radial glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-sky-400/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-500/30 rounded-full blur-[100px]" />

        {/* Floating tech cards */}
        <TechCard
          icon={Lock}
          title="End-to-End Encrypted"
          desc="TLS 1.3 secured sessions"
          className="top-[15%] left-[8%] delay-100"
        />
        <TechCard
          icon={Monitor}
          title="Remote Desktop"
          desc="RDP · VNC · SSH protocols"
          className="top-[38%] right-[6%] delay-200"
        />
        <TechCard
          icon={Wifi}
          title="Always Connected"
          desc="99.9% uptime guaranteed"
          className="bottom-[28%] left-[6%] delay-300"
        />
        <TechCard
          icon={Globe}
          title="Multi-Region Access"
          desc="Global infrastructure"
          className="bottom-[12%] right-[8%] delay-500"
        />

        {/* Center hero content */}
        <div className="relative z-10 text-center px-12 space-y-6 max-w-lg">
          {/* Shield icon */}
          <div className="mx-auto w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-2xl">
            <ShieldCheck className="h-12 w-12 text-white" />
          </div>

          <div className="space-y-3">
            <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
              Secure Remote
              <br />
              <span className="text-sky-300">Access Platform</span>
            </h2>
            <p className="text-white/70 text-base leading-relaxed">
              Enterprise-grade remote desktop management with military-level security protocols.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-center gap-8 pt-4">
            {[
              { value: '256-bit', label: 'Encryption' },
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Support' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom branding */}
        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2 text-white/30 text-sm">
          <Lock className="size-4" />
          <span>Powered by {process.env.NEXT_PUBLIC_COMPANY_NAME}</span>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 relative">
        {/* Theme toggle */}
        <div className="absolute top-5 right-5 z-20">
          <ThemeToggle />
        </div>

        {/* Subtle background texture for right panel */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-sky-50/50 via-transparent to-transparent dark:from-sky-950/20 pointer-events-none" />

        {/* Form area */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 sm:px-12 lg:px-16 relative z-10">
          <div className="w-full max-w-100 space-y-8">
            {/* Logo + brand */}
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center">
                  <Image
                    src="/railtel_logo_dark.svg"
                    alt="Logo"
                    width={48}
                    height={48}
                    className="dark:hidden"
                  />
                  <Image
                    src="/railtel_logo_light.svg"
                    alt="Logo"
                    width={48}
                    height={48}
                    className="hidden dark:block"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">
                    {process.env.NEXT_PUBLIC_APP_NAME || 'My Secure Machines'}
                  </h1>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                    {process.env.NEXT_PUBLIC_APP_TAGLINE || 'Secure Remote Desktop Access'}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                  Welcome back
                </h2>
                <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1">
                  Sign in to your account to continue
                </p>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={form.handleSubmit(performLogin)}
              className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150"
            >
              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Username
                </Label>
                <div className="relative group">
                  <div
                    className={cn(
                      'absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200',
                      focusedField === 'username' ? 'text-sky-500' : 'text-zinc-400',
                    )}
                  >
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    {...form.register('username')}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    className={cn(
                      'pl-10 h-12 text-sm rounded-xl border-2 bg-zinc-50 dark:bg-zinc-900',
                      'transition-all duration-200',
                      'focus-visible:ring-0 focus-visible:border-sky-500',
                      focusedField === 'username'
                        ? 'border-sky-500 bg-white dark:bg-zinc-800 shadow-sm shadow-sky-500/10'
                        : 'border-zinc-200 dark:border-zinc-800',
                    )}
                    placeholder="Enter your username"
                    disabled={isLoading}
                  />
                </div>
                {form.formState.errors.username && (
                  <p className="text-xs text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="relative">
                  <div
                    className={cn(
                      'absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200',
                      focusedField === 'password' ? 'text-sky-500' : 'text-zinc-400',
                    )}
                  >
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...form.register('password')}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className={cn(
                      'pl-10 h-12 text-sm rounded-xl border-2 bg-zinc-50 dark:bg-zinc-900',
                      'transition-all duration-200',
                      'focus-visible:ring-0 focus-visible:border-sky-500',
                      focusedField === 'password'
                        ? 'border-sky-500 bg-white dark:bg-zinc-800 shadow-sm shadow-sky-500/10'
                        : 'border-zinc-200 dark:border-zinc-800',
                    )}
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="w-1 h-1 rounded-full bg-red-500 inline-block" />
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'w-full h-12 text-sm font-semibold rounded-xl transition-all duration-300',
                  'bg-gradient-to-r from-sky-500 to-blue-600',
                  'hover:from-sky-600 hover:to-blue-700',
                  'shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40',
                  'hover:scale-[1.01] active:scale-[0.99]',
                  'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100',
                )}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Sign In Securely
                  </span>
                )}
              </Button>

              {/* Security note */}
              <div className="flex items-center justify-center gap-2 text-zinc-400 dark:text-zinc-600 text-xs">
                <Lock className="h-3 w-3" />
                <span>Protected with 256-bit TLS encryption</span>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pb-6 text-center text-xs text-zinc-300 dark:text-zinc-700">
          © {new Date().getFullYear()} Secure Access Platform. All rights reserved.
        </div>
      </div>
    </div>
  );
}
