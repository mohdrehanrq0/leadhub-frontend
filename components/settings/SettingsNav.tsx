'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SETTINGS_NAV, isSettingsNavActive } from '@/lib/settings-nav';

export function SettingsNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  if (compact) {
    return (
      <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto pb-1">
        {SETTINGS_NAV.map((item) => {
          const active = isSettingsNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                active ? 'bg-brand-main text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-0.5">
      {SETTINGS_NAV.map((item) => {
        const active = isSettingsNavActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
              active
                ? 'bg-brand-main/10 text-brand-main'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-brand-main' : 'text-slate-400')} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
