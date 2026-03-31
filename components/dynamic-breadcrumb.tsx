'use client';

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  connections: 'Connections',
  activity: 'Activity',
  profile: 'Profile',
  recent: 'Recent',
};

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Home/Dashboard link - always first */}
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>

        {/* Render separators and items alternately */}
        {segments.map((segment, index) => {
          // Skip 'dashboard' segment since we already rendered it
          if (segment === 'dashboard') return null;

          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
          const isLast = index === segments.length - 1;

          return (
            <div key={href} className="flex items-center">
              {/* Separator comes BEFORE the item (not inside it) */}
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
