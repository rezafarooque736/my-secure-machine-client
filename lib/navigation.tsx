import { LayoutDashboard, Monitor, Activity, User } from 'lucide-react';
import React from 'react';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  items?: NavItem[];
}

export const navigationItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'My Computers', href: '/dashboard/connections', icon: Monitor },
  { title: 'Activity', href: '/dashboard/activity', icon: Activity },
  { title: 'Profile', href: '/dashboard/profile', icon: User },
];
