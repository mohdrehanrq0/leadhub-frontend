'use client';

import { startTransition } from 'react';
import { IconLayoutKanban, IconSearch, IconTable } from '@tabler/icons-react';
import { LeadFilterChips } from './LeadFilterChips';
import type { ExtraFilterChip } from './filterTypes';
import { PIPELINE_STAGES, type LeadCategory, type LeadList, type PipelineStage } from './types';

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  stage: 'all' | PipelineStage;
  onStageChange: (value: 'all' | PipelineStage) => void;
  priority: 'all' | 'hot' | 'warm' | 'cold' | 'unknown';
  onPriorityChange: (value: 'all' | 'hot' | 'warm' | 'cold' | 'unknown') => void;
  source: string;
  onSourceChange: (value: string) => void;
  categoryId: string;
  onCategoryIdChange: (value: string) => void;
  listId: string;
  onListIdChange: (value: string) => void;
  enrichmentStatus: string;
  onEnrichmentStatusChange: (value: string) => void;
  extras: ExtraFilterChip[];
  onExtrasChange: (chips: ExtraFilterChip[]) => void;
  view: 'table' | 'kanban';
  onViewChange: (view: 'table' | 'kanban') => void;
  categories: LeadCategory[];
  lists: LeadList[];
  loadedCount: number;
  totalCount: number;
};

const SOURCE_OPTIONS = ['all', 'apollo', 'apify', 'google_maps', 'csv', 'manual'];

export function LeadsToolbar(props: Props) {
  const {
    query,
    onQueryChange,
    stage,
    onStageChange,
    priority,
    onPriorityChange,
    source,
    onSourceChange,
    categoryId,
    onCategoryIdChange,
    listId,
    onListIdChange,
    enrichmentStatus,
    onEnrichmentStatusChange,
    extras,
    onExtrasChange,
    view,
    onViewChange,
    categories,
    lists,
    loadedCount,
    totalCount,
  } = props;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <span className="text-xs font-bold text-slate-600">
          {loadedCount.toLocaleString()} / {totalCount.toLocaleString()} Rows
        </span>
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => onViewChange('table')}
            className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold ${view === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
          >
            <IconTable size={14} /> Table
          </button>
          <button
            type="button"
            onClick={() => onViewChange('kanban')}
            className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold ${view === 'kanban' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
          >
            <IconLayoutKanban size={14} /> Board
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(6,minmax(120px,1fr))]">
        <label className="relative">
          <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => startTransition(() => onQueryChange(event.target.value))}
            placeholder="Search contact, company, email, domain"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
          />
        </label>

        <select
          value={stage}
          onChange={(event) => onStageChange(event.target.value as 'all' | PipelineStage)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
        >
          <option value="all">All stages</option>
          {PIPELINE_STAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(event) =>
            onPriorityChange(event.target.value as 'all' | 'hot' | 'warm' | 'cold' | 'unknown')
          }
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
        >
          <option value="all">All priority</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
          <option value="unknown">Unknown</option>
        </select>
        <select
          value={source}
          onChange={(event) => onSourceChange(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
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
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
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
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
        >
          <option value="all">All lists</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
        <select
          value={enrichmentStatus}
          onChange={(event) => onEnrichmentStatusChange(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
        >
          <option value="all">All Enrichment</option>
          <option value="not_started">Not Enriched</option>
          <option value="in_progress">Enriching...</option>
          <option value="completed">Completed</option>
          <option value="partial">Partial</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <LeadFilterChips chips={extras} onChange={onExtrasChange} />
    </div>
  );
}
