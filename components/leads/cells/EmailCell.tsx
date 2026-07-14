'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IconCheck, IconCopy, IconExternalLink, IconMail, IconPlayerPlay, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import { canEnrichLead, type LeadRow } from '../types';

type Props = {
  lead: LeadRow;
  onEnrich?: (lead: LeadRow) => void;
  enriching?: boolean;
};

export function EmailCell({ lead, onEnrich, enriching }: Props) {
  const email = lead.contact?.email?.trim() || null;
  const enrichable = canEnrichLead(lead) && lead.enrichmentStatus !== 'in_progress';
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const copyEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      toast.success('Email copied');
    } catch {
      toast.error('Could not copy email');
    }
  };

  if (email) {
    return (
      <div ref={rootRef} className="relative min-w-0">
        <button
          type="button"
          title="View email"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2 py-1 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
        >
          <IconCheck size={12} className="shrink-0 text-emerald-600" />
          <span className="truncate font-mono text-[11px] font-semibold text-emerald-900">{email}</span>
        </button>

        {open && (
          <div
            className="absolute left-0 top-full z-40 mt-1 w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p>
                <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-900">{email}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <IconX size={14} />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => void copyEmail()}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <IconCopy size={12} /> Copy
              </button>
              {onEnrich && (
                <button
                  type="button"
                  title={enrichable ? 'Re-run enrichment' : 'Enrichment unavailable'}
                  disabled={!enrichable || enriching}
                  onClick={() => onEnrich(lead)}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                >
                  <IconPlayerPlay size={12} /> Enrich
                </button>
              )}
              <Link
                href={`/dashboard/leads/${lead.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <IconExternalLink size={12} /> Case
              </Link>
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
              >
                <IconMail size={12} /> Open
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        title="Find email"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-400 hover:border-slate-300 hover:text-slate-600"
      >
        <IconMail size={12} /> No email
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-40 mt-1 w-[240px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-2 text-[11px] text-slate-500">No email on this lead yet.</p>
          <div className="flex flex-wrap gap-1.5">
            {onEnrich && (
              <button
                type="button"
                title={enrichable ? 'Find email (enrich)' : 'Enrichment unavailable'}
                disabled={!enrichable || enriching}
                onClick={() => onEnrich(lead)}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
              >
                <IconPlayerPlay size={12} /> Find email
              </button>
            )}
            <Link
              href={`/dashboard/leads/${lead.id}`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
            >
              <IconExternalLink size={12} /> Case
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
