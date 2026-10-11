import type { Metadata } from 'next';
import { AppProvider } from '@/context/AppContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'RationSaathi — Entitlement & Grievance Companion',
  description:
    'Evidence-linked, transparent monthly ration entitlement companion operating under the National Food Security Act 2013.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-full flex flex-col bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
