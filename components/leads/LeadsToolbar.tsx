'use client';

import { startTransition } from 'react';
import { IconFilterOff, IconLayoutKanban, IconSearch, IconTable } from '@tabler/icons-react';
import { LeadFilterChips } from './LeadFilterChips';
import { ToolbarMultiSelect } from './ToolbarMultiSelect';
import { COLUMN_FILTER_CONFIG } from './columnFilters';
import type { ExtraFilterChip } from './filterTypes';
import { PIPELINE_STAGES, type LeadCategory, type LeadList, type PipelineStage } from './types';
import { APOLLO_UI_ENABLED } from '../../lib/features';

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  stage: 'all' | PipelineStage;
  onStageChange: (value: 'all' | PipelineStage) => void;
  priorities: string[];
  onPrioritiesChange: (values: string[]) => void;
  source: string;
  onSourceChange: (value: string) => void;
  categoryId: string;
  onCategoryIdChange: (value: string) => void;
  listId: string;
  onListIdChange: (value: string) => void;
  enrichmentStatuses: string[];
  onEnrichmentStatusesChange: (values: string[]) => void;
  emailVerificationStatuses: string[];
  onEmailVerificationStatusesChange: (values: string[]) => void;
  extras: ExtraFilterChip[];
  onExtrasChange: (chips: ExtraFilterChip[]) => void;
  view: 'table' | 'kanban';
  onViewChange: (view: 'table' | 'kanban') => void;
  categories: LeadCategory[];
  lists: LeadList[];
  loadedCount: number;
  totalCount: number;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
};

const SOURCE_OPTIONS = APOLLO_UI_ENABLED
  ? ['all', 'apollo', 'apify', 'google_maps', 'csv', 'manual']
  : ['all', 'apify', 'google_maps', 'csv', 'manual'];

const selectClass =
  'h-9 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none transition hover:bg-slate-50 focus:border-brand-main focus:ring-2 focus:ring-brand-main/20';

export function LeadsToolbar(props: Props) {
  const {
    query,
    onQueryChange,
    stage,
    onStageChange,
    priorities,
    onPrioritiesChange,
    source,
    onSourceChange,
    categoryId,
    onCategoryIdChange,
    listId,
    onListIdChange,
    enrichmentStatuses,
    onEnrichmentStatusesChange,
    emailVerificationStatuses,
    onEmailVerificationStatusesChange,
    extras,
    onExtrasChange,
    view,
    onViewChange,
    categories,
    lists,
    loadedCount,
    totalCount,
    onClearFilters,
    hasActiveFilters,
  } = props;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600">
            {loadedCount.toLocaleString()} / {totalCount.toLocaleString()} Rows
          </span>
          {hasActiveFilters && (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
              Filtered
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <IconFilterOff size={14} />
              Clear filters
            </button>
          )}
          <div className="inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => onViewChange('table')}
              className={`inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs font-semibold ${view === 'table' ? 'bg-brand-main text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <IconTable size={14} /> Table
            </button>
            <button
              type="button"
              onClick={() => onViewChange('kanban')}
              className={`inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs font-semibold ${view === 'kanban' ? 'bg-brand-main text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <IconLayoutKanban size={14} /> Board
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(4,minmax(110px,1fr))] xl:grid-cols-[1.4fr_repeat(7,minmax(110px,1fr))]">
        <label className="relative">
          <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => startTransition(() => onQueryChange(event.target.value))}
            placeholder="Search contact, company, email, domain"
            className="h-9 w-full rounded-md border border-slate-200 bg-white py-1.5 pr-3 pl-8 text-sm outline-none transition focus:border-brand-main focus:ring-2 focus:ring-brand-main/20"
          />
        </label>

        <select
          value={stage}
          onChange={(event) => onStageChange(event.target.value as 'all' | PipelineStage)}
          className={selectClass}
        >
          <option value="all">All stages</option>
          {PIPELINE_STAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <ToolbarMultiSelect
          label="Priority"
          emptyLabel="All priority"
          options={COLUMN_FILTER_CONFIG.priority.options}
          values={priorities}
          onChange={onPrioritiesChange}
          activeClassName="border-amber-300 bg-amber-50/60"
        />
        <ToolbarMultiSelect
          label="Verification"
          emptyLabel="All verification"
          options={COLUMN_FILTER_CONFIG.emailVerificationStatus.options}
          values={emailVerificationStatuses}
          onChange={onEmailVerificationStatusesChange}
          activeClassName="border-emerald-300 bg-emerald-50/60"
        />
        <ToolbarMultiSelect
          label="Enrichment"
          emptyLabel="All enrichment"
          options={COLUMN_FILTER_CONFIG.enrichmentStatus.options}
          values={enrichmentStatuses}
          onChange={onEnrichmentStatusesChange}
          activeClassName="border-violet-300 bg-violet-50/60"
        />

        <select
          value={source}
          onChange={(event) => onSourceChange(event.target.value)}
          className={selectClass}
        >
          {SOURCE_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item === 'all' ? 'All sources' : item}
            </option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(event) => onCategoryIdChange(event.target.value)}
          className={selectClass}
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={listId}
          onChange={(event) => onListIdChange(event.target.value)}
          className={selectClass}
        >
          <option value="all">All lists</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </div>

      <LeadFilterChips chips={extras} onChange={onExtrasChange} />
    </div>
  );
}
