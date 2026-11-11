'use client';

import { useEffect, useState } from 'react';
import { IconX } from '@tabler/icons-react';
import { BodyPortal } from '@/components/ui/BodyPortal';

type CreateListDialogProps = {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; description?: string; outreachMotive?: string }) => Promise<void>;
};

export function CreateListDialog({ open, busy, onClose, onCreate }: CreateListDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [outreachMotive, setOutreachMotive] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setOutreachMotive('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => !busy && onClose()}>
        <div
          role="dialog"
          aria-label="Create prospect list"
          className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-main">Prospect lists</p>
              <h2 className="mt-1 text-xl font-bold text-text-100">Create list</h2>
              <p className="mt-1 text-sm text-text-200">Name a segment for captured LinkedIn prospects.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              aria-label="Close"
            >
              <IconX size={18} />
            </button>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim() || busy) return;
              void onCreate({
                name: name.trim(),
                description: description.trim() || undefined,
                outreachMotive: outreachMotive.trim() || undefined,
              });
            }}
          >
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Name</span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Founders · STK commenters"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder="Who belongs in this list"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Outreach motive</span>
              <textarea
                value={outreachMotive}
                onChange={(event) => setOutreachMotive(event.target.value)}
                rows={3}
                placeholder="Why these people are being targeted"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="h-10 rounded-xl bg-brand-main px-4 text-sm font-semibold text-white hover:bg-brand-main/90 disabled:opacity-50"
              >
                {busy ? 'Creating…' : 'Create list'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </BodyPortal>
  );
}
