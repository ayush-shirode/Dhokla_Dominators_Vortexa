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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#244b38',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#E9EDE4] dark:bg-[#111413] text-[#1c1917] dark:text-[#f5f5f4]">
        <PwaRegister />
        <AppProvider>
          {/* Centered Desktop Shell */}
          <div className="flex-1 w-full flex justify-center">
            <div className="w-full max-w-md min-h-screen bg-[#FAF8F1] dark:bg-[#181d1a] flex flex-col shadow-subtle border-x border-[#E0E5DC] dark:border-[#222824]">
              {children}
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
