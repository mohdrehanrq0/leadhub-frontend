'use client';

import { IconPlayerPlay } from '@tabler/icons-react';
import type { EngineStep, NodeMeta } from '@/lib/recipe-engine-api';
import { cn } from '@/lib/utils';
import { CATEGORY_ACCENT, iconForNode, previewForStep } from './flow-meta';

export function StartFlowNode() {
  return (
    <div className="relative mx-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <IconPlayerPlay size={13} stroke={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900">Start</p>
          <p className="text-[11px] text-slate-500">Prospects enter here</p>
        </div>
      </div>
    </div>
  );
}

export function FlowNode({
  step,
  node,
  selected,
  cacheHit,
  rowsOut,
  onSelect,
}: {
  step: EngineStep;
  node?: NodeMeta;
  selected: boolean;
  cacheHit?: boolean;
  rowsOut?: number;
  onSelect: () => void;
}) {
  const category = node?.category ?? 'transform';
  const accent = CATEGORY_ACCENT[category];
  const Icon = iconForNode(step.type, category);
  const preview = previewForStep(step.config, node);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative mx-auto block w-full max-w-sm rounded-xl border bg-white px-3 py-2.5 text-left shadow-sm transition',
        selected
          ? cn(accent.selected, 'ring-2')
          : 'border-slate-200 hover:border-slate-300 hover:shadow',
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', accent.icon)}>
          <Icon size={13} stroke={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-semibold text-slate-900">{node?.label ?? step.type}</p>
            {cacheHit ? (
              <span className="rounded bg-emerald-50 px-1.5 py-px text-[10px] font-medium text-emerald-700">
                cache
              </span>
            ) : null}
            {typeof rowsOut === 'number' ? (
              <span className="rounded bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-500">
                {rowsOut}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500">
            {preview || step.type}
          </p>
        </div>
      </div>
    </button>
  );
}

export function FlowConnector({ onInsert }: { onInsert?: () => void }) {
  return (
    <div className="relative mx-auto flex h-7 w-full max-w-sm items-center justify-center">
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-200" />
      {onInsert ? (
        <button
          type="button"
          onClick={onInsert}
          className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-500 shadow-sm transition hover:border-brand-main hover:text-brand-main"
          aria-label="Insert step"
          title="Insert step"
        >
          +
        </button>
      ) : (
        <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-slate-300" />
      )}
    </div>
  );
}
