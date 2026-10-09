'use client';

import Link from 'next/link';
import type { LeadList } from './types';

function autoEnrichLabel(value: boolean | null | undefined): string {
  if (value === true) return 'Always enrich on capture';
  if (value === false) return 'Never auto-enrich';
  return 'Inherit workspace enrich mode';
}

/**
 * Compact summary + link to configure list motive / agent / auto-enrich.
 * Used wherever lists can be created name-only (Captures CRM, import, etc.).
 */
export function ListEnrichmentHint({
  list,
  className = '',
}: {
  list: LeadList | null | undefined;
  className?: string;
}) {
  if (!list?.id) {
    return (
      <p className={`text-[11px] leading-4 text-slate-500 ${className}`}>
        Creating a list saves the name only. Configure outreach motive, default agent, and
        auto-enrich on the{' '}
        <Link href="/dashboard/leads/lists" className="font-semibold text-brand-main hover:underline">
          Lists
        </Link>{' '}
        page.
      </p>
    );
  }

  const hasConfig =
    Boolean(list.outreachMotive?.trim()) ||
    Boolean(list.defaultEnrichmentAgentId) ||
    list.autoEnrichOnCapture != null;

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[11px] leading-4 text-slate-600 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold text-slate-800">{list.name}</p>
          {list.outreachMotive?.trim() ? (
            <p className="text-slate-600">
              Motive: <span className="text-slate-800">{list.outreachMotive.trim()}</span>
            </p>
          ) : (
            <p className="text-slate-500">No outreach motive set yet.</p>
          )}
          <p className="text-slate-500">{autoEnrichLabel(list.autoEnrichOnCapture)}</p>
          {!hasConfig ? (
            <p className="text-slate-500">
              Name-only lists inherit workspace defaults until you configure them.
            </p>
          ) : null}
        </div>
        <Link
          href={`/dashboard/leads/lists/${list.id}`}
          className="shrink-0 font-semibold text-brand-main hover:underline"
        >
          Configure list
        </Link>
      </div>
    </div>
  );
}
