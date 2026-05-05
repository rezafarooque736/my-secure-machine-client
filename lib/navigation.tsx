import { LayoutDashboard, Monitor, User } from 'lucide-react';
import React from 'react';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const navigationItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'My Computers', href: '/dashboard/connections', icon: Monitor },
  { title: 'Profile', href: '/dashboard/profile', icon: User },
];
