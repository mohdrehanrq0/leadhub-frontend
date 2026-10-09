'use client';

import { useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { sourceHost, type EnrichmentFact } from '../../enrichment/types';
import { DetailCard, SectionLabel } from './primitives';
import type { ResearchActivity } from '../types';

function factText(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function confidenceLabel(confidence: number | null): string {
  if (confidence == null) return '—';
  const pct = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
  return `${pct}%`;
}

export function EvidenceTab({
  kept,
  rejected,
  gaps,
  stats,
  snapshot,
  activities,
  showActivities,
}: {
  kept: EnrichmentFact[];
  rejected: EnrichmentFact[];
  gaps: string[];
  stats: { searches: number; urlsFound: number; pagesRead: number; dropped: number; botWalls: number };
  snapshot: unknown;
  activities: ResearchActivity[];
  showActivities: boolean;
}) {
  const [showRejected, setShowRejected] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const rows = showRejected ? [...kept, ...rejected] : kept;

  return (
    <div className="space-y-4">
      <DetailCard>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No validated claims yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((fact) => (
              <FactLine key={fact.id} fact={fact} />
            ))}
          </ul>
        )}
        {rejected.length ? (
          <button
            type="button"
            onClick={() => setShowRejected((open) => !open)}
            className="mt-4 text-sm font-medium text-slate-600 hover:text-slate-950 hover:underline"
          >
            {showRejected ? 'Hide rejected' : `Show ${rejected.length} rejected`}
          </button>
        ) : null}
      </DetailCard>

      {gaps.length ? (
        <DetailCard>
          <SectionLabel>Data gaps</SectionLabel>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        </DetailCard>
      ) : null}

      <DetailCard>
        <button
          type="button"
          onClick={() => setLogOpen((open) => !open)}
          className="flex w-full min-w-0 items-center justify-between gap-3 text-left"
        >
          <span className="text-lg font-semibold text-slate-950">Research log</span>
          <IconChevronDown size={16} className={`shrink-0 text-slate-400 ${logOpen ? 'rotate-180' : ''}`} />
        </button>
        {logOpen ? (
          <div className="mt-3 space-y-3">
            <dl className="grid min-w-0 gap-2 text-sm text-slate-700 @container">
              <div className="grid grid-cols-2 gap-2 @min-[600px]:grid-cols-3">
                <LogStat label="Searches" value={stats.searches} />
                <LogStat label="URLs found" value={stats.urlsFound} />
                <LogStat label="Pages read" value={stats.pagesRead} />
                <LogStat label="Dropped" value={stats.dropped} />
                <LogStat label="Bot walls" value={stats.botWalls} />
              </div>
            </dl>
            {showActivities && activities.length ? (
              <ul className="max-h-56 space-y-2 overflow-y-auto">
                {activities.map((activity) => (
                  <li key={activity.id} className="min-w-0 text-sm text-slate-700">
                    <span className="text-slate-400">
                      {new Date(activity.createdAt).toLocaleTimeString('en', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>{' '}
                    {activity.title}
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              onClick={() => setRawOpen((open) => !open)}
              className="text-sm font-medium text-slate-600 hover:underline"
            >
              {rawOpen ? 'Hide raw snapshot' : 'Raw snapshot'}
            </button>
            {rawOpen ? (
              <pre className="max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-normal text-emerald-300">
                {JSON.stringify(snapshot, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
      </DetailCard>
    </div>
  );
}

function FactLine({ fact }: { fact: EnrichmentFact }) {
  const [why, setWhy] = useState(false);
  const host = sourceHost(fact.sourceUrl);
  return (
    <li className="min-w-0 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="min-w-0 text-sm leading-normal text-slate-800">{factText(fact.value)}</p>
        <span className="shrink-0 text-sm tabular-nums text-slate-500">{confidenceLabel(fact.confidence)}</span>
      </div>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
        {fact.sourceUrl ? (
          <a
            href={fact.sourceUrl}
            target="_blank"
            rel="noreferrer"
            title={fact.sourceUrl}
            className="max-w-full truncate text-sm text-blue-700 hover:underline"
          >
            {host ?? 'Source'} ↗
          </a>
        ) : (
          <span className="text-sm text-slate-400">No source</span>
        )}
        {fact.status === 'rejected' ? (
          <span className="text-[11px] uppercase tracking-[0.05em] text-rose-600">Rejected</span>
        ) : null}
        {fact.evidenceText || fact.rejectedReason ? (
          <button type="button" onClick={() => setWhy((open) => !open)} className="text-sm text-slate-500 hover:underline">
            {why ? 'Hide why' : 'Why'}
          </button>
        ) : null}
      </div>
      {why ? (
        <p className="mt-1 text-sm leading-normal text-slate-600">{fact.evidenceText || fact.rejectedReason}</p>
      ) : null}
    </li>
  );
}

function LogStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.05em] text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
