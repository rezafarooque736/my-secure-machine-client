'use client';

import { ThemeProvider as NextThemesProvider, ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="secure-machine-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
