"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import axios from "axios";
import { toast } from "sonner";
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
import {
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Password strength
// ─────────────────────────────────────────────────────────────────────────────

interface Rule {
  label: string;
  test: (v: string) => boolean;
}

const RULES: Rule[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "Contains uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "Contains lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "Contains a number", test: (v) => /\d/.test(v) },
  { label: "Contains special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const STRENGTH_COLORS = [
  "",
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-blue-500",
  "bg-green-500",
];

const STRENGTH_LABELS = ["", "Very Weak", "Weak", "Fair", "Good", "Strong"];

function StrengthMeter({ password }: { password: string }) {
  if (!password) return null;

  const passed = RULES.filter((r) => r.test(password)).length;

  return (
    <div className="space-y-2 mt-2">
      {/* Bar */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < passed ? STRENGTH_COLORS[passed] : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Label */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Password strength:</p>
        <p
          className={`text-xs font-semibold ${
            passed <= 1
              ? "text-red-500"
              : passed === 2
                ? "text-orange-500"
                : passed === 3
                  ? "text-yellow-600"
                  : passed === 4
                    ? "text-blue-600"
                    : "text-green-600"
          }`}
        >
          {STRENGTH_LABELS[passed]}
        </p>
      </div>

      {/* Rules checklist */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className="flex items-center gap-1.5 text-xs">
              {ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              )}
              <span
                className={ok ? "text-foreground" : "text-muted-foreground"}
              >
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Password Input with show/hide toggle
// ─────────────────────────────────────────────────────────────────────────────

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  required,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  hint?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          disabled={disabled}
          autoComplete="new-password"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2
            text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ChangePasswordPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  const passedRules = RULES.filter((r) => r.test(form.newPassword)).length;
  const isStrongEnough = passedRules >= 3; // at least "Fair"
  const passwordsMatch =
    form.newPassword && form.confirmPassword
      ? form.newPassword === form.confirmPassword
      : null;

  const canSubmit =
    form.oldPassword.trim() &&
    form.newPassword.trim() &&
    form.confirmPassword.trim() &&
    isStrongEnough &&
    passwordsMatch === true &&
    !loading;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canSubmit) return;

    if (form.oldPassword === form.newPassword) {
      toast.error("New password must be different from the current password");
      return;
    }

    setLoading(true);
    try {
      await axios.put(
        "/api/profile/change-password",
        {
          oldPassword: form.oldPassword,
          newPassword: form.newPassword,
        },
        {
          params: {
            token: user.authToken,
            dataSource: user.dataSource,
            username: user.username,
            role: user.role,
          },
        },
      );

      setSuccess(true);
      setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully");
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      // Friendly mapping of known Guacamole errors
      if (err?.response?.status === 403) {
        toast.error("Current password is incorrect. Please try again.");
      } else {
        toast.error(msg ?? "Failed to change password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Non-admin blocked state ────────────────────────────────────────────────
  if (user?.role !== "admin") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center p-4 pt-8 animate-in fade-in duration-300">
        <div className="w-full max-w-md space-y-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard/profile")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Profile
          </button>

          <Card>
            <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <KeyRound className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Permission Denied</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Password changes are restricted to administrators only. Please
                  contact your system administrator to update your password.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 mt-2"
                onClick={() => router.push("/dashboard/profile")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Profile
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground px-4">
            🔒 Your password is managed by your system administrator.
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-[calc(100vh-4rem)] flex items-start justify-center
      p-4 pt-8 animate-in fade-in duration-300"
    >
      <div className="w-full max-w-md space-y-4">
        {/* ── Back button ──────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={() => router.push("/dashboard/profile")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground
            hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Profile
        </button>

        {/* ── Success state ─────────────────────────────────────────────── */}
        {success ? (
          <Card className="text-center">
            <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4">
              <div
                className="h-16 w-16 rounded-full bg-green-500/10 flex
                items-center justify-center"
              >
                <ShieldCheck className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Password Updated</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your password has been changed successfully.
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => router.push("/dashboard/profile")}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Profile
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setSuccess(false)}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Change Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* ── Form ─────────────────────────────────────────────────────── */
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full bg-primary/10 flex
                  items-center justify-center shrink-0"
                >
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Change Password</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Update your account password for{" "}
                    <span className="font-mono font-semibold text-foreground">
                      @{user?.username}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* ── Current password ─────────────────────────────────── */}
                <PasswordField
                  id="old-password"
                  label="Current Password"
                  value={form.oldPassword}
                  onChange={(v) => setForm({ ...form, oldPassword: v })}
                  placeholder="Enter your current password"
                  disabled={loading}
                  required
                />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">
                      New password
                    </span>
                  </div>
                </div>

                {/* ── New password ──────────────────────────────────────── */}
                <div className="space-y-1">
                  <PasswordField
                    id="new-password"
                    label="New Password"
                    value={form.newPassword}
                    onChange={(v) => setForm({ ...form, newPassword: v })}
                    placeholder="Min 8 characters"
                    disabled={loading}
                    required
                  />
                  {/* Strength meter — only shows when typing */}
                  <StrengthMeter password={form.newPassword} />
                </div>

                {/* ── Confirm password ──────────────────────────────────── */}
                <div className="space-y-1.5">
                  <PasswordField
                    id="confirm-password"
                    label="Confirm New Password"
                    value={form.confirmPassword}
                    onChange={(v) => setForm({ ...form, confirmPassword: v })}
                    placeholder="Re-enter new password"
                    disabled={loading}
                    required
                  />

                  {/* Match indicator */}
                  {form.confirmPassword && (
                    <div
                      className={`flex items-center gap-1.5 text-xs ${
                        passwordsMatch === true
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {passwordsMatch === true ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          Passwords match
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          Passwords do not match
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Requirements hint ─────────────────────────────────── */}
                {!form.newPassword && (
                  <div
                    className="rounded-lg border bg-muted/40 p-3 text-xs
                    text-muted-foreground space-y-1"
                  >
                    <p className="font-semibold text-foreground">
                      Password requirements:
                    </p>
                    <ul className="space-y-0.5 list-disc list-inside">
                      <li>At least 8 characters</li>
                      <li>Mix of uppercase and lowercase letters</li>
                      <li>At least one number</li>
                      <li>At least one special character recommended</li>
                    </ul>
                  </div>
                )}

                {/* ── Submit ────────────────────────────────────────────── */}
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={!canSubmit}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Changing Password…
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Change Password
                    </>
                  )}
                </Button>

                {/* ── Cancel ────────────────────────────────────────────── */}
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs text-muted-foreground h-8"
                  onClick={() => router.push("/dashboard/profile")}
                  disabled={loading}
                >
                  Cancel — go back to Profile
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Security tip ─────────────────────────────────────────────── */}
        {!success && (
          <p className="text-center text-xs text-muted-foreground px-4">
            🔒 Your password is encrypted and never stored in plain text. You
            will not be logged out after changing your password.
          </p>
        )}
      </div>
    </div>
  );
}
