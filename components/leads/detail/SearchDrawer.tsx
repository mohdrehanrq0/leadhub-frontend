'use client';

import { useEffect } from 'react';
import type { SearchRow } from './model';

export function SearchDrawer({
  open,
  rows,
  onClose,
}: {
  open: boolean;
  rows: SearchRow[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-label="Searches"
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Searches</h2>
          <button type="button" onClick={onClose} className="text-sm font-medium text-slate-500 hover:text-slate-900">
            Close
          </button>
        </div>
        <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {rows.length === 0 ? (
            <li className="text-sm text-slate-500">No searches were recorded for this run.</li>
          ) : (
            rows.map((row) => (
              <li key={`${row.n}-${row.query}`} className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.05em] text-slate-400">
                  #{String(row.n).padStart(2, '0')}
                  {row.detail ? ` · ${row.detail}` : ''}
                </p>
                <p className="mt-0.5 text-sm leading-normal text-slate-800">{row.query}</p>
              </li>
            ))
          )}
        </ol>
      </aside>
    </div>
  );
}
