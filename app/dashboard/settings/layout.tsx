'use client';

import { SettingsNav } from '@/components/settings/SettingsNav';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-100">Settings</h1>
        <p className="mt-1 text-sm text-text-200">
          Manage your workspace, integrations, enrichment, and account preferences.
        </p>
      </div>

      <div className="mb-6 lg:hidden">
        <SettingsNav compact />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-6 rounded-xl border border-slate-200/80 bg-white p-2 shadow-sm">
            <SettingsNav />
          </div>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
