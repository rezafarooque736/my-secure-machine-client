// app/not-found.tsx
// Global 404 page — shown for any unmatched route.

import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Page Not Found',
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <span className="text-8xl font-bold text-muted-foreground/30 select-none">404</span>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link href={'/dashboard'}>Go to Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={'/'}>Login Page</Link>
        </Button>
      </div>
    </main>
  );
}
