import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { ClientProviders } from '../components/common/ClientProviders';
import { cn } from '../lib/utils';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'LeadHub — AI GTM Platform',
    template: '%s | LeadHub',
  },
  description:
    'LeadHub is an AI-powered B2B lead intelligence platform. Discover, enrich, verify and organize high-quality leads with AI-assisted search and persistent company memory.',
  keywords: ['B2B leads', 'lead generation', 'AI sales', 'GTM platform', 'lead intelligence'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={cn(inter.className, 'bg-bg-100 text-text-100 antialiased')} suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
        <Toaster
          theme="light"
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
            },
          }}
        />
      </body>
    </html>
  );
}
