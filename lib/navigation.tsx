import {
  LayoutDashboard,
  Monitor,
  Activity,
  User,
  Users,
  Settings,
  Shield,
  FileText,
  Clock,
  Key,
  LogOut,
  ChevronRight,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
  items?: NavItem[];
}

export const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Connections',
    href: '/dashboard/connections',
    icon: Monitor,
    items: [
      {
        title: 'All Connections',
        href: '/dashboard/connections',
        icon: Monitor,
      },
      {
        title: 'Recent',
        href: '/dashboard/connections/recent',
        icon: Clock,
      },
    ],
  },
  {
    title: 'Activity',
    href: '/dashboard/activity',
    icon: Activity,
  },
  {
    title: 'Profile',
    href: '/dashboard/profile',
    icon: User,
  },
];

export const adminNavigationItems: NavItem[] = [
  {
    title: 'User Management',
    href: '/dashboard/admin/users',
    icon: Users,
    adminOnly: true,
  },
  {
    title: 'Groups',
    href: '/dashboard/admin/groups',
    icon: Users,
    adminOnly: true,
  },
  {
    title: 'Audit Logs',
    href: '/dashboard/admin/audit-logs',
    icon: FileText,
    adminOnly: true,
  },
  {
    title: 'System Settings',
    href: '/dashboard/admin/settings',
    icon: Shield,
    adminOnly: true,
  },
];

export const bottomNavigationItems: NavItem[] = [
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
  {
    title: 'Change Password',
    href: '/dashboard/change-password',
    icon: Key,
  },
];
