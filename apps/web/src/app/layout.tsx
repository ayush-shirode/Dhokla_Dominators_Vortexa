import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/context/AppContext';
import { PwaRegister } from '@/components/PwaRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'RationSaathi — Entitlement & Grievance Companion',
  description:
    'Evidence-linked, transparent monthly ration entitlement companion operating under the National Food Security Act 2013.',
  applicationName: 'RationSaathi',
  appleWebApp: { capable: true, title: 'RationSaathi', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

// Pinch-zoom stays enabled (FRONTEND_SPEC §8: must work with large text / zoom).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f6e5c',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <PwaRegister />
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
