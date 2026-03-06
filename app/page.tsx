"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import axios from "axios";
import { Loader2, ShieldCheck, Sparkles, KeyRound, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from "next/image";

const createLoginSchema = () =>
  z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
  });

type LoginValues = {
  username: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const loginSchema = createLoginSchema();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => setIsHydrated(true), []);

  useEffect(() => {
    if (isHydrated && isAuthenticated) router.push("/dashboard");
  }, [isHydrated, isAuthenticated, router]);

  const performLogin = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      const res = await axios.post("/api/auth/login", {
        username: values.username.trim(),
        password: values.password.trim(),
      });

      // res.data shape (from File 10):
      // { authToken, username, dataSource, availableDataSources, role, sessionId }

      setAuth({
        authToken: res.data.authToken,
        username: res.data.username,
        dataSource: res.data.dataSource,
        availableDataSources: res.data.availableDataSources ?? ["mysql"],
        role: res.data.role,
        sessionId: res.data.sessionId, // ← stored in Zustand + localStorage
      });

      router.push("/dashboard");
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Invalid credentials";
      toast.error("Login failed", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isHydrated) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-400/20 via-transparent to-transparent dark:from-blue-500/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-sky-400/20 via-transparent to-transparent dark:from-sky-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-sky-300/20 to-yellow-300/20 dark:from-sky-500/10 dark:to-yellow-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Top Bar - Language and Theme Selectors */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and Branding */}
          <div className="mb-8 text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="mx-auto w-20 h-20 flex items-center justify-center animate-float">
              <Image
                src="/railtel_logo_dark.svg"
                alt="Logo"
                width={70}
                height={70}
                className="dark:hidden"
              />
              <Image
                src="/railtel_logo_light.svg"
                alt="Logo"
                width={70}
                height={70}
                className="hidden dark:block"
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-sky-500 to-sky-600 bg-clip-text text-transparent">
                {process.env.NEXT_PUBLIC_APP_NAME || "My Secure Machines"}
              </h1>
              <p className="text-muted-foreground flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                {process.env.NEXT_PUBLIC_APP_TAGLINE ||
                  "Secure Remote Desktop Access"}
              </p>
            </div>
          </div>

          {/* Login Card */}
          <Card className="border-2 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Login</CardTitle>
              <CardDescription className="text-base">
                Enter your credentials to access the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={form.handleSubmit(performLogin)}
                className="space-y-5"
              >
                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      autoComplete="username"
                      {...form.register("username")}
                      className="pl-10 h-12 transition-all focus-visible:ring-2 focus-visible:ring-blue-500"
                      placeholder="Enter your username"
                      disabled={isLoading}
                    />
                  </div>
                  {form.formState.errors.username && (
                    <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-300">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      {...form.register("password")}
                      className="pl-10 h-12 transition-all focus-visible:ring-2 focus-visible:ring-blue-500"
                      placeholder="Enter your password"
                      disabled={isLoading}
                    />
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1 duration-300">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked: any) =>
                        setRememberMe(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Remember Me
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-sm"
                    disabled={isLoading}
                  >
                    Forgot Password
                  </Button>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8 animate-in fade-in duration-1000 delay-700">
            © {new Date().getFullYear()} Secure Access Platform. All rights
            reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
