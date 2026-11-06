import { cn } from '@/lib/utils';
import type { BriefFieldStatus } from '@/lib/research-types';

const LABELS: Record<BriefFieldStatus, string> = {
  found: 'Found',
  uncertain: 'Uncertain',
  not_found: 'Not found',
  provider_error: 'Provider error',
  not_requested: 'Not requested',
  pending: 'Pending',
};

const STYLES: Record<BriefFieldStatus, string> = {
  found: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  uncertain: 'bg-amber-50 text-amber-900 border-amber-200',
  not_found: 'bg-slate-100 text-slate-600 border-slate-200',
  provider_error: 'bg-rose-50 text-rose-800 border-rose-200',
  not_requested: 'bg-slate-50 text-slate-500 border-slate-200',
  pending: 'bg-sky-50 text-sky-800 border-sky-200',
};

export function StatusPill({ status }: { status: BriefFieldStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        STYLES[status],
      )}
    >
      {LABELS[status]}
    </span>
  );
}
