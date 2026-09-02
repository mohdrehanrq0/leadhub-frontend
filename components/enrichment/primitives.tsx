/**
 * Layout primitives shared by every enrichment panel.
 *
 * The lead detail page already had a `SectionCard`/`FactRow` pair, but they
 * were private to that file, so the capture page could not match it. These are
 * the same shapes, extracted so both pages render identically and there is one
 * place to change the look.
 */

import type { ReactNode } from 'react';

export function EnrichmentSection({
  id,
  title,
  subtitle,
  icon,
  actions,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs leading-5 text-slate-500">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/**
 * A label/value row. Renders nothing when empty, so a panel of optional
 * fields collapses instead of showing a column of dashes.
 */
export function FactRow({
  label,
  children,
  hint,
}: {
  label: string;
  children?: ReactNode;
  hint?: string;
}) {
  if (children === null || children === undefined || children === '' || children === false) {
    return null;
  }

  return (
    <div className="grid gap-1 sm:grid-cols-[150px_1fr] sm:gap-3">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400" title={hint}>
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export type ChipTone = 'slate' | 'emerald' | 'amber' | 'rose' | 'blue' | 'violet';

const CHIP_TONE: Record<ChipTone, string> = {
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
};

export function Chip({
  children,
  tone = 'slate',
  title,
}: {
  children: ReactNode;
  tone?: ChipTone;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CHIP_TONE[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * A labelled row of chips, capped so a long tech stack cannot swamp the card.
 */
export function ChipRow({
  label,
  items,
  tone = 'slate',
  max = 12,
}: {
  label: string;
  items?: string[] | null;
  tone?: ChipTone;
  max?: number;
}) {
  if (!items?.length) return null;
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {shown.map((item) => (
          <Chip key={item} tone={tone}>
            {item}
          </Chip>
        ))}
        {rest > 0 ? (
          <span className="px-1 py-0.5 text-[11px] text-slate-400">+{rest} more</span>
        ) : null}
      </div>
    </div>
  );
}

/** Consistent "we have nothing here yet, and here's why" state. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-5 text-slate-500">{children}</p>;
}

/** Relative age of a cached payload, so stale data is obvious. */
export function formatAge(iso?: string): string | undefined {
  if (!iso) return undefined;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return undefined;
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** LinkedIn / Apify may return a plain string or `{ number, extension }`. */
export function formatPhoneValue(
  phone?: string | { number?: string | null; extension?: string | null } | null,
): string | undefined {
  if (!phone) return undefined;
  if (typeof phone === 'string') {
    const trimmed = phone.trim();
    return trimmed || undefined;
  }
  const number = phone.number?.trim();
  const extension = phone.extension?.trim();
  if (number && extension) return `${number} ext. ${extension}`;
  return number || extension || undefined;
}
