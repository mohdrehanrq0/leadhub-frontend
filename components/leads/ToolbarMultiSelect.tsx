'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { IconCheck, IconChevronDown, IconX } from '@tabler/icons-react';
import type { ColumnFilterOption } from './columnFilters';

type Props = {
  label: string;
  emptyLabel: string;
  options: ColumnFilterOption[];
  values: string[];
  onChange: (values: string[]) => void;
  activeClassName?: string;
};

function toggleValue(current: string[], value: string): string[] {
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

export function ToolbarMultiSelect({
  label,
  emptyLabel,
  options,
  values,
  onChange,
  activeClassName = 'border-blue-300 bg-blue-50/60',
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const active = values.length > 0;
  const summary = active
    ? values.length === 1
      ? options.find((o) => o.value === values[0])?.label ?? values[0]
      : `${label} (${values.length})`
    : emptyLabel;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${
          active ? activeClassName : ''
        }`}
      >
        <span className="truncate">{summary}</span>
        <span className="flex shrink-0 items-center gap-1">
          {active && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Clear ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange([]);
                }
              }}
              className="rounded p-0.5 text-slate-400 hover:bg-white/80 hover:text-slate-700"
            >
              <IconX size={12} />
            </span>
          )}
          <IconChevronDown size={14} className="text-slate-400" />
        </span>
      </button>
      {open && (
        <div
          id={menuId}
          className="absolute left-0 top-full z-40 mt-1 w-full min-w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {label} · multi-select
            </span>
            {active && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] font-semibold text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
            )}
          </div>
          {options.map((opt) => {
            const selected = values.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => onChange(toggleValue(values, opt.value))}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold transition ${
                  selected ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                    selected
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-white text-transparent'
                  }`}
                >
                  <IconCheck size={11} stroke={3} />
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
