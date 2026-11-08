'use client';

import { IconArrowDown, IconArrowUp, IconTrash } from '@tabler/icons-react';
import type { EngineStep, NodeMeta } from '@/lib/recipe-engine-api';
import { cn } from '@/lib/utils';

export function StepCard({
  step,
  node,
  index,
  total,
  selected,
  cacheHit,
  onSelect,
  onMove,
  onRemove,
}: {
  step: EngineStep;
  node?: NodeMeta;
  index: number;
  total: number;
  selected: boolean;
  cacheHit?: boolean;
  onSelect: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm transition',
        selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300',
      )}
    >
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{index + 1}. {node?.label ?? step.type}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{node?.category ?? 'node'}</span>
          {cacheHit ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">cache hit</span> : null}
        </div>
        <p className="mt-1 truncate text-sm text-slate-500">{node?.description ?? step.type}</p>
        <p className="mt-1 text-xs text-slate-400">
          {step.type} · est. {node?.estimatedCostPerRow ?? 0} credits/row
        </p>
      </button>
      <div className="flex shrink-0 flex-col gap-1">
        <button type="button" aria-label="Move up" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30" disabled={index === 0} onClick={() => onMove(-1)}>
          <IconArrowUp size={14} />
        </button>
        <button type="button" aria-label="Move down" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30" disabled={index === total - 1} onClick={() => onMove(1)}>
          <IconArrowDown size={14} />
        </button>
        <button type="button" aria-label="Remove step" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600" onClick={onRemove}>
          <IconTrash size={14} />
        </button>
      </div>
    </div>
  );
}
