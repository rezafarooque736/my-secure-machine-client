import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${process.env.NEXT_PUBLIC_APP_NAME} - ${process.env.NEXT_PUBLIC_APP_TAGLINE}`,
    template: `%s | ${`${process.env.NEXT_PUBLIC_APP_NAME} - ${process.env.NEXT_PUBLIC_APP_TAGLINE}`}`,
  },
  description: `${process.env.NEXT_PUBLIC_APP_DESCRIPTION}`,
  keywords: [`${process.env.NEXT_PUBLIC_APP_KEYWORDS}`],
  authors: [{ name: `${process.env.NEXT_PUBLIC_APP_AUTHOR}` }],
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <Toaster position="top-right" richColors closeButton duration={4000} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
