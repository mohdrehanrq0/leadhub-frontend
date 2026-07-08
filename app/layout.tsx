import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: {
    default: 'LeadHub — AI GTM Platform',
    template: '%s | LeadHub',
  },
  description:
    'LeadHub is an AI-powered B2B lead intelligence platform. Discover, enrich, verify and organize high-quality leads with AI-assisted search and persistent company memory.',
  keywords: ['B2B leads', 'lead generation', 'AI sales', 'GTM platform', 'lead intelligence'],
};

import { ClientProviders } from '../components/common/ClientProviders';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ClientProviders>
          {children}
        </ClientProviders>
        <Toaster
          theme="light"
          position="bottom-right"
        />
      </body>
    </html>
  );
}
