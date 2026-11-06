'use client';

import { useState, type ReactNode } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { StatusPill } from '@/components/research/StatusPill';
import prospectBrief from '@/lib/sample-outputs/prospect-brief.sample.json';
import cleanList from '@/lib/sample-outputs/clean-list.sample.json';
import findContacts from '@/lib/sample-outputs/find-contacts.sample.json';
import { cn } from '@/lib/utils';

export function RecipeSamplePreview({ recipeId }: { recipeId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border-t border-zinc-100 pt-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-xs font-medium text-zinc-600 hover:text-zinc-900"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Sample output
        <IconChevronDown
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 text-sm">
          {recipeId === 'prospect-brief' ? (
            <SampleBriefCompact />
          ) : recipeId === 'clean-list' ? (
            <SampleCleanCompact />
          ) : recipeId === 'find-contacts' ? (
            <SampleFindContactsCompact />
          ) : (
            <p className="text-xs text-zinc-500">No sample available.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SampleBriefCompact() {
  const brief = prospectBrief;
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Prospect brief · sample
      </p>
      <p className="font-medium text-zinc-900">
        {brief.person.name.value}{' '}
        <span className="font-normal text-zinc-600">
          · {brief.person.title.value} · {brief.company.name.value}
        </span>
      </p>
      <SampleField label="Why now">{brief.developments[0]?.summary}</SampleField>
      <SampleField label="Opener">{brief.opener.opener.value}</SampleField>
    </div>
  );
}

function SampleCleanCompact() {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Clean list · sample
      </p>
      <p className="text-xs text-zinc-600">
        {cleanList.summary.kept} kept · {cleanList.summary.dropped} dropped from{' '}
        {cleanList.summary.inputRows} rows
      </p>
      <ul className="space-y-1.5">
        {cleanList.rows.slice(0, 3).map((row) => (
          <li key={row.fullName} className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-800">
              {row.fullName}
              <span className="font-normal text-zinc-500"> · {row.companyName}</span>
            </span>
            <StatusPill status={row.status === 'ready' ? 'found' : 'uncertain'} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SampleFindContactsCompact() {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Find contacts · sample
      </p>
      <p className="text-xs text-zinc-600">
        {findContacts.summary.found_strong} strong · {findContacts.summary.found_partial} closest
      </p>
      <ul className="space-y-1.5">
        {findContacts.candidates.map((c) => (
          <li key={c.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium text-zinc-800">
              {c.name}
              <span className="font-normal text-zinc-500">
                {' '}
                · {c.title} · {c.company}
              </span>
            </span>
            <StatusPill
              status={c.persona_match === 'strong' ? 'found' : 'uncertain'}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SampleField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-xs text-zinc-800">{children}</p>
    </div>
  );
}
