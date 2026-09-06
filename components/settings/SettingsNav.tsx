'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SETTINGS_NAV, getActiveSettingsItem, isSettingsNavActive } from '@/lib/settings-nav';

export function SettingsChrome() {
  const pathname = usePathname();
  const active = getActiveSettingsItem(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-settings-line bg-settings-surface/90 backdrop-blur-md">
      <div className="relative overflow-hidden px-5 pb-4 pt-5 sm:px-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_180px_at_-10%_-40%,var(--settings-accent-mid),transparent_60%)]"
        />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-settings-accent">Settings</p>
          <h1 className="mt-1 text-[1.65rem] font-semibold tracking-tight text-settings-ink">{active.name}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-settings-muted">{active.description}</p>
        </div>
      </div>

      <nav aria-label="Settings sections" className="px-4 pb-4 sm:px-6">
        <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto rounded-xl bg-settings-canvas p-1">
          {SETTINGS_NAV.map((item) => {
            const isActive = isSettingsNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-settings-surface text-settings-accent shadow-sm ring-1 ring-settings-mid'
                    : 'text-settings-muted hover:bg-white/70 hover:text-settings-ink',
                )}
              >
                <Icon
                  className={cn('h-4 w-4 shrink-0', isActive ? 'text-settings-accent' : 'text-settings-faint')}
                  stroke={1.75}
                />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
