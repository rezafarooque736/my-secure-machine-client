// app/error.tsx
// Global error boundary — catches uncaught errors in the App Router tree.
// Must be a Client Component.

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[Global Error Boundary]', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          An unexpected error occurred. Try refreshing the page or contact your administrator if the problem
          persists.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">Error ID: {error.digest}</p>
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Back to Login
        </Button>
      </div>
    </main>
  );
}
