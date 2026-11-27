'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ContentTab } from '@/lib/content-posts';

export function ContentTabs({
  active,
  basePath = '/dashboard/content',
  publishedLabel = 'Posts',
}: {
  active: ContentTab;
  basePath?: string;
  publishedLabel?: string;
}) {
  const tabs: { id: ContentTab; label: string }[] = [
    { id: 'drafts', label: 'Drafts' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'posts', label: publishedLabel },
  ];
  return (
    <nav className="flex gap-1 border-b border-slate-200">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={`${basePath}?tab=${tab.id}`}
          className={cn(
            'relative px-3 py-2.5 text-sm font-medium transition',
            active === tab.id ? 'text-brand-main' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {tab.label}
          {active === tab.id ? (
            <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand-main" />
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
