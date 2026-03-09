import {
  LayoutDashboard,
  Monitor,
  Activity,
  User,
  Users,
  Settings,
  Shield,
  Clock,
  Key,
  Megaphone,
  Network,
} from "lucide-react";
import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
  items?: NavItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main navigation — visible to ALL authenticated users
// ─────────────────────────────────────────────────────────────────────────────

export const navigationItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    // Collapsible group — expands to show sub-pages
    title: "My Computers",
    href: "/dashboard/connections",
    icon: Monitor,
  },
  {
    // Activity now absorbs Audit Logs content.
    // Non-admin users see their own session history + charts.
    // Admin users additionally see system-wide audit logs tab.
    title: "Activity",
    href: "/dashboard/activity",
    icon: Activity,
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Admin navigation — only rendered when user.role === 'admin'
// NOTE: "Audit Logs" has been intentionally removed here.
//       Its content now lives inside the Activity page (admin tab).
// ─────────────────────────────────────────────────────────────────────────────

export const adminNavigationItems: NavItem[] = [
  {
    // Notices/News Room management for admins
    title: "Notices",
    href: "/dashboard/admin/notices",
    icon: Megaphone,
    adminOnly: true,
  },
  {
    title: "User Management",
    href: "/dashboard/admin/users",
    icon: Users,
    adminOnly: true,
  },
  {
    title: "Groups",
    href: "/dashboard/admin/groups",
    icon: Users,
    adminOnly: true,
  },
  {
    title: "Active Sessions",
    href: "/dashboard/admin/sessions",
    icon: Activity,
    adminOnly: true,
  },
  {
    title: "Seat Management",
    href: "/dashboard/admin/seat",
    icon: Network,
    adminOnly: true,
  },
  {
    title: "Change Password",
    href: "/dashboard/change-password",
    icon: Key,
    adminOnly: true,
  },
];
