/**
 * Why LeadHub believes each thing it claims.
 *
 * The `enrichment_facts` table records, per fact, the url it came from, the
 * sentence it was read from, how fresh it is, whether it conflicted with
 * something else, and what the rejected alternatives were. None of it was
 * reachable from the frontend, so a surprising value had no explanation.
 *
 * Rejected facts are shown deliberately: "we saw this and threw it out
 * because…" is usually the answer to the question being asked.
 */

'use client';

import { useState } from 'react';
import { IconChevronDown, IconExternalLink, IconShieldCheck } from '@tabler/icons-react';
import { Chip, EmptyNote, EnrichmentSection, type ChipTone } from './primitives';
import { FACT_TIER_LABEL, sourceHost, type EnrichmentFact, type FactTier } from './types';

const TIER_ORDER: FactTier[] = ['identity', 'qualification', 'buyer', 'signal', 'personalization'];

/**
 * Which tiers belong in this panel.
 *
 * `buyer` is left out because the Contact panel already shows the person's
 * name, title, seniority and email as their own fields — repeating them here
 * as evidence cards just doubled the page. `signal` is left out because those
 * rows are raw search snippets matched on a keyword, so a story about a
 * property tax amendment ends up filed under "Funding". The Buying signals
 * panel shows the scored, weighted version instead.
 */
const DEFAULT_TIERS: FactTier[] = ['identity', 'qualification', 'personalization'];

const STATUS_TONE: Record<EnrichmentFact['status'], ChipTone> = {
  validated: 'emerald',
  candidate: 'slate',
  rejected: 'rose',
};

/** `identity.officialDomain` → `Official domain`. */
function humanizeKey(fieldKey: string): string {
  const leaf = fieldKey.split('.').pop() ?? fieldKey;
  return leaf.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

export function EvidencePanel({
  facts: allFacts,
  tiers = DEFAULT_TIERS,
  id = 'evidence',
}: {
  facts?: EnrichmentFact[] | null;
  /** Override which tiers to render. Defaults to the non-duplicated ones. */
  tiers?: FactTier[];
  id?: string;
}) {
  const [showRejected, setShowRejected] = useState(false);
  const facts = allFacts?.filter((fact) => tiers.includes(fact.tier));

  if (!facts?.length) {
    return (
      <EnrichmentSection id={id} title="Evidence" icon={<IconShieldCheck size={16} />}>
        <EmptyNote>
          No evidence records yet. These are written as the research agent validates each fact.
          Contact details and buying signals have their own panels above.
        </EmptyNote>
      </EnrichmentSection>
    );
  }

  const rejected = facts.filter((fact) => fact.status === 'rejected');
  const visible = showRejected ? facts : facts.filter((fact) => fact.status !== 'rejected');

  const byTier = new Map<FactTier, EnrichmentFact[]>();
  for (const fact of visible) {
    const list = byTier.get(fact.tier) ?? [];
    list.push(fact);
    byTier.set(fact.tier, list);
  }

  return (
    <EnrichmentSection
      id={id}
      title="Evidence"
      icon={<IconShieldCheck size={16} />}
      subtitle={`Where the company facts came from. ${visible.length} claims, deduplicated.`}
      actions={
        rejected.length ? (
          <button
            type="button"
            onClick={() => setShowRejected((value) => !value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {showRejected ? 'Hide' : 'Show'} {rejected.length} rejected
          </button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {TIER_ORDER.filter((tier) => byTier.has(tier)).map((tier) => (
          <div key={tier}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {FACT_TIER_LABEL[tier]}
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {byTier.get(tier)!.map((fact) => (
                <FactCard key={fact.id} fact={fact} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </EnrichmentSection>
  );
}

function FactCard({ fact }: { fact: EnrichmentFact }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(fact.evidenceText || fact.alternatives?.length || fact.rejectedReason);

  return (
    <li className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {humanizeKey(fact.fieldKey)}
          </p>
          <p className="mt-0.5 break-words text-sm font-medium text-slate-900">
            {renderValue(fact.value)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {fact.confidence != null ? <Chip>{fact.confidence}%</Chip> : null}
          {/* Independent agreement is the useful part of a repeated claim. */}
          {(fact.seenCount ?? 1) > 1 ? (
            <Chip tone="emerald" title="Independently observed more than once">
              {fact.seenCount}× confirmed
            </Chip>
          ) : null}
          {fact.conflict ? <Chip tone="amber">Conflict</Chip> : null}
          {fact.status === 'rejected' ? <Chip tone={STATUS_TONE.rejected}>rejected</Chip> : null}
          {fact.freshness === 'stale' ? <Chip tone="amber">Stale</Chip> : null}
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        {fact.sourceType ? (
          <span className="text-[11px] text-slate-400">{fact.sourceType}</span>
        ) : null}
        {fact.sourceUrl ? (
          <a
            href={fact.sourceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
          >
            <IconExternalLink size={11} />
            {sourceHost(fact.sourceUrl) ?? 'Source'}
          </a>
        ) : null}
        {hasDetail ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700"
          >
            <IconChevronDown
              size={12}
              className={open ? 'rotate-180 transition' : 'transition'}
            />
            {open ? 'Less' : 'Why'}
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-2 space-y-2">
          {fact.evidenceText ? (
            <p className="border-l-2 border-slate-200 pl-2 text-xs italic leading-5 text-slate-600">
              {fact.evidenceText}
            </p>
          ) : null}
          {fact.rejectedReason ? (
            <p className="text-xs leading-5 text-rose-700">Rejected: {fact.rejectedReason}</p>
          ) : null}
          {fact.alternatives?.length ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Alternatives considered
              </p>
              <ul className="mt-1 space-y-0.5">
                {fact.alternatives.map((alt, index) => (
                  <li key={index} className="text-xs text-slate-600">
                    {renderValue(alt.value ?? alt)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
