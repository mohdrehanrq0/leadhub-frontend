'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { IconFilter, IconFilterFilled, IconX } from '@tabler/icons-react';
import {
  COLUMN_FILTER_CONFIG,
  type ColumnFilterKey,
} from './columnFilters';

type Props = {
  filterKey: ColumnFilterKey;
  value: string;
  onChange: (value: string) => void;
  /** Column label shown next to grip */
  label: string;
};

export function ColumnFilterHeader({ filterKey, value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const config = COLUMN_FILTER_CONFIG[filterKey];
  const active = value !== 'all';
  const activeLabel = active
    ? config.options.find((o) => o.value === value)?.label ?? value
    : null;

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
    <div ref={rootRef} className="relative flex min-w-0 flex-1 items-center gap-1">
      <span className="truncate">{label}</span>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Filter ${config.label}${activeLabel ? `: ${activeLabel}` : ''}`}
        title={activeLabel ? `Filtered: ${activeLabel}` : `Filter ${config.label}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={`inline-flex size-5 shrink-0 items-center justify-center rounded-md transition ${
          active
            ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
            : 'text-slate-400 hover:bg-slate-200/80 hover:text-slate-700'
        }`}
      >
        {active ? <IconFilterFilled size={12} /> : <IconFilter size={12} />}
      </button>

      {open && (
        <div
          id={menuId}
          role="listbox"
          aria-label={`${config.label} filter`}
          className="absolute left-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Filter {config.label}
            </span>
            {active && (
              <button
                type="button"
                onClick={() => {
                  onChange('all');
                  setOpen(false);
                }}
                className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <IconX size={10} /> Clear
              </button>
            )}
          </div>
          <button
            type="button"
            role="option"
            aria-selected={!active}
            onClick={() => {
              onChange('all');
              setOpen(false);
            }}
            className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold transition ${
              !active ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {config.allLabel}
          </button>
          {config.options.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-xs font-semibold transition ${
                  selected ? 'bg-blue-50 text-blue-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
