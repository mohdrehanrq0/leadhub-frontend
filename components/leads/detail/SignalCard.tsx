'use client';

import { useState, type ReactNode } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import { DetailCard, SectionLabel } from './primitives';
import type { SignalModel } from './model';

const VERDICT_TONE: Record<SignalModel['verdict'], string> = {
  strong: 'text-emerald-700',
  possible: 'text-blue-700',
  weak: 'text-amber-700',
  none: 'text-slate-500',
};

const RING: Record<SignalModel['verdict'], string> = {
  strong: 'stroke-emerald-500',
  possible: 'stroke-blue-500',
  weak: 'stroke-amber-500',
  none: 'stroke-slate-300',
};

function Mark({ state }: { state: 'pass' | 'fail' | 'unknown' }) {
  if (state === 'pass') return <span className="text-sm text-emerald-600">✓</span>;
  if (state === 'fail') return <span className="text-sm text-rose-600">✕</span>;
  return <span className="text-sm text-slate-400">○</span>;
}

function ScoreRing({ score, verdict }: { score: number; verdict: SignalModel['verdict'] }) {
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <div className="relative grid h-[72px] w-[72px] shrink-0 place-items-center">
      <svg viewBox="0 0 72 72" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="36" cy="36" r={radius} className="fill-none stroke-slate-100" strokeWidth="5" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          className={`fill-none ${RING[verdict]}`}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="text-lg font-semibold tabular-nums text-slate-950">{score}</span>
    </div>
  );
}

export function SignalCard({
  signal,
  agentControl,
  onViewSearches,
}: {
  signal: SignalModel;
  agentControl: ReactNode;
  onViewSearches: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DetailCard>
      <div className="flex min-w-0 items-center gap-2">
        <SectionLabel>Fit for</SectionLabel>
        <div className="min-w-0 flex-1">{agentControl}</div>
      </div>
      {signal.scoredAgainstOtherAgent ? (
        <p className="mt-2 text-sm text-slate-500">Score is from the last run. Re-enrich to judge this mission.</p>
      ) : null}

      <div className="mt-4 flex min-w-0 items-start gap-4">
        <ScoreRing score={signal.score} verdict={signal.verdict} />
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${VERDICT_TONE[signal.verdict]}`}>{signal.verdictLabel}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-normal text-slate-600">{signal.reason}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {signal.signal.prominent ? (
          <div className="flex min-w-0 items-center gap-2 rounded-lg bg-violet-50 px-3 py-2">
            <span className="text-sm text-emerald-600">✓</span>
            <p className="min-w-0 flex-1 truncate text-sm text-slate-800">
              <span className="mr-2 text-[11px] uppercase tracking-[0.05em] text-violet-700">Signal</span>
              {signal.signal.text}
            </p>
            {signal.signal.sourceUrl ? (
              <a
                href={signal.signal.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 text-sm font-medium text-violet-700 hover:underline"
              >
                Source ↗
              </a>
            ) : null}
            {signal.searches.length ? (
              <button
                type="button"
                onClick={onViewSearches}
                className="shrink-0 text-sm font-medium text-violet-700 hover:underline"
              >
                View searches
              </button>
            ) : null}
          </div>
        ) : (
          <CheckRow label="Signal" state={signal.signal.state} value={signal.signal.text}>
            {signal.searches.length ? (
              <button
                type="button"
                onClick={onViewSearches}
                className="shrink-0 text-sm font-medium text-violet-700 hover:underline"
              >
                View searches
              </button>
            ) : null}
          </CheckRow>
        )}
        <CheckRow label="Role match" state={signal.role.state} value={signal.role.text} />
        <CheckRow label="Location" state={signal.location.state} value={signal.location.text} />
        {signal.objectives.total > 0 ? (
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <span className="w-3.5 shrink-0" />
              <span className="w-[92px] shrink-0 text-[11px] uppercase tracking-[0.05em] text-slate-400">
                Objectives
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                {signal.objectives.met} of {signal.objectives.total} met
              </span>
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                {open ? 'Hide' : 'Expand'}
                <IconChevronDown size={14} className={open ? 'rotate-180' : ''} />
              </button>
            </div>
            {open ? (
              <div className="mt-3 space-y-2 pl-[104px]">
                {signal.objectives.items.map((item) => (
                  <div key={item.id} className="min-w-0">
                    <div className="flex items-center justify-between gap-3 text-sm text-slate-700">
                      <span className="min-w-0 truncate">{item.label}</span>
                      <span className="shrink-0 tabular-nums text-slate-400">{Math.round(item.score * (item.score <= 1 ? 100 : 1))}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${item.satisfied ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        style={{ width: `${Math.max(0, Math.min(100, item.score <= 1 ? item.score * 100 : item.score))}%` }}
                      />
                    </div>
                  </div>
                ))}
                {signal.coverage.identity != null || signal.coverage.data != null ? (
                  <p className="text-sm text-slate-500">
                    Coverage
                    {signal.coverage.identity != null ? ` · Identity ${signal.coverage.identity}%` : ''}
                    {signal.coverage.data != null ? ` · Data ${signal.coverage.data}%` : ''}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </DetailCard>
  );
}

function CheckRow({
  label,
  state,
  value,
  children,
}: {
  label: string;
  state: 'pass' | 'fail' | 'unknown';
  value: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Mark state={state} />
      <span className="w-[92px] shrink-0 text-[11px] uppercase tracking-[0.05em] text-slate-400">{label}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-slate-800" title={value}>
        {value}
      </span>
      {children}
    </div>
  );
}
