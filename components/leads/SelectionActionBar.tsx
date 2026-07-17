'use client';

import {
  IconDownload,
  IconLoader2,
  IconRefresh,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import { PIPELINE_STAGES, type LeadCategory, type LeadList, type PipelineStage } from './types';

type Props = {
  selectedCount: number;
  matchAll: boolean;
  enriching: boolean;
  reEnriching: boolean;
  deleting: boolean;
  exporting?: boolean;
  creditBalance?: number | null;
  onEnrich: () => void;
  onReEnrich: () => void;
  onDelete: () => void;
  onExportCsv?: () => void;
  onExportXlsx?: () => void;
  bulkStage: PipelineStage;
  onBulkStageChange: (stage: PipelineStage) => void;
  onApplyStage: () => void;
  bulkCategoryId: string;
  onBulkCategoryIdChange: (id: string) => void;
  onApplyCategory: () => void;
  bulkListId: string;
  onBulkListIdChange: (id: string) => void;
  onAddToList: () => void;
  categories: LeadCategory[];
  lists: LeadList[];
  onSelectAllMatching: () => void;
};

export function SelectionActionBar(props: Props) {
  const {
    selectedCount,
    matchAll,
    enriching,
    reEnriching,
    deleting,
    exporting = false,
    creditBalance = null,
    onEnrich,
    onReEnrich,
    onDelete,
    onExportCsv,
    onExportXlsx,
    bulkStage,
    onBulkStageChange,
    onApplyStage,
    bulkCategoryId,
    onBulkCategoryIdChange,
    onApplyCategory,
    bulkListId,
    onBulkListIdChange,
    onAddToList,
    categories,
    lists,
    onSelectAllMatching,
  } = props;

  if (selectedCount === 0) return null;

  const busy = enriching || reEnriching || deleting || exporting;
  const insufficientCredits =
    creditBalance !== null && creditBalance < selectedCount;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950">
      <span className="font-black">
        {selectedCount.toLocaleString()} selected
        {matchAll ? ' (all matching)' : ''}
      </span>
      {creditBalance !== null && (
        <span
          className={`rounded-lg px-2 py-1 font-bold ${
            insufficientCredits
              ? 'bg-rose-100 text-rose-800'
              : 'bg-white text-blue-800 border border-blue-200'
          }`}
        >
          {selectedCount} credit{selectedCount === 1 ? '' : 's'} · {creditBalance.toLocaleString()}{' '}
          available
        </span>
      )}
      {!matchAll && (
        <button
          type="button"
          onClick={onSelectAllMatching}
          className="rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 font-bold text-blue-700 hover:bg-blue-50"
        >
          Select all matching
        </button>
      )}
      <button
        type="button"
        onClick={onEnrich}
        disabled={busy || insufficientCredits}
        title={
          insufficientCredits
            ? `Need ${selectedCount} credits, have ${creditBalance}`
            : '1 credit per successful enrichment'
        }
        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 font-bold text-white disabled:opacity-40"
      >
        {enriching ? <IconLoader2 size={14} className="animate-spin" /> : <IconSparkles size={14} />}
        Enrich
      </button>
      <button
        type="button"
        onClick={onReEnrich}
        disabled={busy || insufficientCredits}
        title={
          insufficientCredits
            ? `Need ${selectedCount} credits, have ${creditBalance}`
            : '1 credit per successful enrichment'
        }
        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 font-bold text-violet-800 disabled:opacity-40"
      >
        {reEnriching ? <IconLoader2 size={14} className="animate-spin" /> : <IconRefresh size={14} />}
        Re-enrich
      </button>
      {onExportCsv && (
        <button
          type="button"
          onClick={onExportCsv}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-bold text-emerald-800 disabled:opacity-40"
        >
          {exporting ? <IconLoader2 size={14} className="animate-spin" /> : <IconDownload size={14} />}
          Export CSV
        </button>
      )}
      {onExportXlsx && (
        <button
          type="button"
          onClick={onExportXlsx}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 font-bold text-teal-800 disabled:opacity-40"
        >
          {exporting ? <IconLoader2 size={14} className="animate-spin" /> : <IconDownload size={14} />}
          Export Excel
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-bold text-rose-700 disabled:opacity-40"
      >
        {deleting ? <IconLoader2 size={14} className="animate-spin" /> : <IconTrash size={14} />}
        Delete
      </button>
      <select
        value={bulkStage}
        onChange={(event) => onBulkStageChange(event.target.value as PipelineStage)}
        className="h-9 rounded-lg border border-blue-200 bg-white px-2 font-semibold"
      >
        {PIPELINE_STAGES.map((item) => (
          <option key={item.value} value={item.value}>
            Move to {item.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onApplyStage}
        className="rounded-lg border border-blue-200 bg-white px-3 py-2 font-bold text-blue-700"
      >
        Apply stage
      </button>
      <select
        value={bulkCategoryId}
        onChange={(event) => onBulkCategoryIdChange(event.target.value)}
        className="h-9 rounded-lg border border-blue-200 bg-white px-2 font-semibold"
      >
        <option value="">Set category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onApplyCategory}
        className="rounded-lg border border-blue-200 bg-white px-3 py-2 font-bold text-blue-700"
      >
        {bulkCategoryId ? 'Apply category' : 'New category'}
      </button>
      <select
        value={bulkListId}
        onChange={(event) => onBulkListIdChange(event.target.value)}
        className="h-9 rounded-lg border border-blue-200 bg-white px-2 font-semibold"
      >
        <option value="">Add to list</option>
        {lists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onAddToList}
        disabled={!bulkListId}
        className="rounded-lg border border-blue-200 bg-white px-3 py-2 font-bold text-blue-700 disabled:opacity-40"
      >
        Add
      </button>
    </div>
  );
}
