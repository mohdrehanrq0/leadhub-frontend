'use client';

import { PIPELINE_STAGES, PRIORITIES, apolloCategoryLabel } from '../types';
import { APOLLO_UI_ENABLED } from '../../../lib/features';
import { DetailCard, SectionLabel, primaryButtonClass } from './primitives';
import { lowFit, type SignalModel } from './model';
import type { LeadCategory, LeadList } from '../types';
import type { LeadDetail } from './types';

export function RightRail({
  lead,
  signal,
  hasDraft,
  categories,
  lists,
  notes,
  setNotes,
  saving,
  listToAdd,
  setListToAdd,
  formatDate,
  onPatch,
  onSaveNotes,
  onAddToList,
  onGenerate,
  onReview,
  onSkip,
  onConfirmIdentity,
}: {
  lead: LeadDetail;
  signal: SignalModel;
  hasDraft: boolean;
  categories: LeadCategory[];
  lists: LeadList[];
  notes: string;
  setNotes: (value: string) => void;
  saving: boolean;
  listToAdd: string;
  setListToAdd: (value: string) => void;
  formatDate: (iso?: string | null) => string;
  onPatch: (payload: Record<string, unknown>) => void;
  onSaveNotes: () => void;
  onAddToList: () => void;
  onGenerate: () => void;
  onReview: () => void;
  onSkip: () => void;
  onConfirmIdentity: () => void;
}) {
  const needsIdentity = lead.enrichmentStatus === 'needs_identity_confirmation';
  const weak = lowFit(signal.verdict) && lead.enrichmentStatus !== 'not_started' && lead.enrichmentStatus !== 'in_progress';

  let actionLabel = 'Generate outreach email';
  let onAction = onGenerate;
  let tone = primaryButtonClass;
  if (needsIdentity) {
    actionLabel = 'Confirm company';
    onAction = onConfirmIdentity;
  } else if (weak && lead.pipelineStage !== 'lost') {
    actionLabel = 'Mark as not a fit';
    onAction = onSkip;
    tone =
      'inline-flex h-9 w-full items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100';
  } else if (hasDraft) {
    actionLabel = 'Review draft';
    onAction = onReview;
  }

  const info: Array<[string, string]> = [
    ['Source', lead.source || '—'],
    ['Status', lead.status || '—'],
    ['Agent', lead.enrichmentAgent?.name || '—'],
    ['Created', formatDate(lead.createdAt)],
    ['Enriched', formatDate(lead.enrichmentCompletedAt)],
  ];
  if (APOLLO_UI_ENABLED) {
    info.splice(3, 0, ['Apollo', apolloCategoryLabel(lead.apolloCategory) ?? '—']);
  }

  return (
    <div className="space-y-4">
      <DetailCard>
        <SectionLabel>Next action</SectionLabel>
        <button type="button" onClick={onAction} className={`mt-3 w-full ${tone}`}>
          {actionLabel}
        </button>
      </DetailCard>

      <DetailCard>
        <SectionLabel>Lead info</SectionLabel>
        <dl className="mt-3 space-y-2">
          {info.map(([label, value]) => (
            <div key={label} className="grid min-w-0 grid-cols-[90px_minmax(0,1fr)] gap-3">
              <dt className="text-[11px] uppercase tracking-[0.05em] text-slate-400">{label}</dt>
              <dd className="truncate text-sm text-slate-800" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </DetailCard>

      <DetailCard>
        <SectionLabel>My data</SectionLabel>
        <div className="mt-3 space-y-3">
          <Field label="Stage">
            <select
              className="h-9 w-full min-w-0 truncate rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800"
              value={lead.pipelineStage}
              disabled={saving}
              onChange={(event) => onPatch({ pipelineStage: event.target.value })}
            >
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select
              className="h-9 w-full min-w-0 truncate rounded-lg border border-slate-200 bg-white px-2 text-sm capitalize text-slate-800"
              value={lead.priority}
              disabled={saving}
              onChange={(event) => onPatch({ priority: event.target.value })}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              className="h-9 w-full min-w-0 truncate rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800"
              value={lead.category?.id ?? ''}
              disabled={saving}
              onChange={(event) => onPatch({ categoryId: event.target.value || null })}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <textarea
              className="w-full min-w-0 resize-none rounded-lg border border-slate-200 bg-white p-2 text-sm leading-normal text-slate-800 outline-none focus:border-violet-300"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Private notes"
            />
          </Field>
          <button type="button" onClick={onSaveNotes} disabled={saving} className={primaryButtonClass}>
            {saving ? 'Saving' : 'Save'}
          </button>
          <Field label="List">
            <div className="flex min-w-0 gap-2">
              <select
                value={listToAdd}
                onChange={(event) => setListToAdd(event.target.value)}
                className="h-9 min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800"
              >
                <option value="">Select list</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onAddToList}
                disabled={!listToAdd}
                className="h-9 shrink-0 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Add
              </button>
            </div>
            {(lead.lists ?? []).length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lead.lists!.map((list) => (
                  <span key={list.id} className="inline-flex h-6 max-w-full items-center truncate rounded-full border border-slate-200 px-2.5 text-xs text-slate-700">
                    {list.name}
                  </span>
                ))}
              </div>
            ) : null}
          </Field>
          {(lead.activities ?? []).length ? (
            <div>
              <p className="text-[11px] uppercase tracking-[0.05em] text-slate-400">Activity</p>
              <ul className="mt-2 space-y-2">
                {lead.activities!.map((activity) => (
                  <li key={activity.id} className="min-w-0">
                    <p className="truncate text-sm text-slate-800">{activity.title}</p>
                    <p className="text-[11px] text-slate-400">{formatDate(activity.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </DetailCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="text-[11px] uppercase tracking-[0.05em] text-slate-400">{label}</span>
      <div className="mt-1 min-w-0">{children}</div>
    </label>
  );
}
