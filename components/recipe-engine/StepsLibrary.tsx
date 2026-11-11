'use client';

import { useMemo, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import type { NodeMeta } from '@/lib/recipe-engine-api';
import { cn } from '@/lib/utils';
import {
  CATEGORY_ACCENT,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  iconForNode,
  type FlowCategory,
} from './flow-meta';

export function StepsLibrary({
  nodes,
  onAdd,
}: {
  nodes: NodeMeta[];
  onAdd: (type: string) => void;
}) {
  const [q, setQ] = useState('');

  const grouped = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = nodes.filter((n) => {
      if (!query) return true;
      return (
        n.label.toLowerCase().includes(query) ||
        n.type.toLowerCase().includes(query) ||
        n.description.toLowerCase().includes(query) ||
        n.category.toLowerCase().includes(query)
      );
    });
    const map = new Map<FlowCategory, NodeMeta[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const node of filtered) {
      map.get(node.category)?.push(node);
    }
    return CATEGORY_ORDER.map((cat) => ({ cat, items: map.get(cat) ?? [] })).filter((g) => g.items.length);
  }, [nodes, q]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-slate-200 bg-white">
      <div className="shrink-0 border-b border-slate-100 px-3 py-3">
        <h2 className="text-[13px] font-semibold text-slate-900">Steps</h2>
        <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
          Click to append, or use + on the canvas to insert.
        </p>
        <div className="relative mt-2.5">
          <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search steps"
            className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-main focus:bg-white focus:ring-2 focus:ring-brand-main/20"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-2 py-3">
        {grouped.map(({ cat, items }) => (
          <div key={cat}>
            <p className="mb-1 px-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {CATEGORY_LABEL[cat]}
            </p>
            <div className="space-y-0.5">
              {items.map((node) => {
                const Icon = iconForNode(node.type, node.category);
                const accent = CATEGORY_ACCENT[node.category];
                return (
                  <button
                    key={node.type}
                    type="button"
                    onClick={() => onAdd(node.type)}
                    className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-slate-50"
                  >
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', accent.icon)}>
                      <Icon size={12} stroke={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium text-slate-800">{node.label}</span>
                      <span className="block truncate text-[10px] text-slate-400">{node.type}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {grouped.length === 0 ? (
          <p className="px-1.5 text-xs text-slate-500">No steps match that search.</p>
        ) : null}
      </div>
    </aside>
  );
}
