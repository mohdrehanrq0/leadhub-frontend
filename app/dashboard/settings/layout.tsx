'use client';

import { SettingsChrome } from '@/components/settings/SettingsNav';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full min-w-0 flex-col bg-settings-canvas">
      <SettingsChrome />
      <div className="min-w-0 flex-1 px-5 py-6 sm:px-7">{children}</div>
    </div>
  );
}
