'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function DetailCard({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      {title ? <h2 className="mb-3 text-lg font-semibold text-slate-950">{title}</h2> : null}
      {children}
    </section>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-slate-400">{children}</p>
  );
}

export function SnapshotRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 grid-cols-[90px_minmax(0,1fr)] items-baseline gap-3">
      <dt className="text-[11px] uppercase tracking-[0.05em] text-slate-400">{label}</dt>
      <dd className="min-w-0 text-sm leading-normal text-slate-800">{children}</dd>
    </div>
  );
}

export function Ellipsis({
  value,
  href,
}: {
  value: string;
  href?: string;
}) {
  const className = 'block min-w-0 truncate text-sm';
  if (!href) {
    return (
      <span title={value} className={className}>
        {value}
      </span>
    );
  }
  const external = /^https?:/i.test(href);
  return (
    <a
      href={href}
      title={value}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer noopener' : undefined}
      className={`${className} text-blue-700 hover:underline`}
    >
      {value}
    </a>
  );
}

const CLAMP: Record<2 | 3 | 4, string> = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
};

export function ClampText({
  text,
  lines = 3,
}: {
  text: string;
  lines?: 2 | 3 | 4;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, open, lines]);

  return (
    <div className="min-w-0">
      <p ref={ref} className={`text-sm leading-normal text-slate-700 ${open ? '' : CLAMP[lines]}`}>
        {text}
      </p>
      {overflows || open ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mt-1 text-sm font-medium text-violet-700 hover:underline"
        >
          {open ? 'Show less' : 'Read more'}
        </button>
      ) : null}
    </div>
  );
}

export function CappedChips({
  items,
  max = 6,
  onChip,
}: {
  items: string[];
  max?: number;
  onChip?: (item: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  const visible = open ? items : items.slice(0, max);
  const extra = items.length - max;

  return (
    <div className="flex min-w-0 flex-wrap gap-1.5">
      {visible.map((item) =>
        onChip ? (
          <button
            key={item}
            type="button"
            title={item}
            onClick={() => onChip(item)}
            className="inline-flex h-6 max-w-full min-w-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700 hover:border-violet-200 hover:text-violet-800"
          >
            <span className="truncate">{item}</span>
          </button>
        ) : (
          <span
            key={item}
            title={item}
            className="inline-flex h-6 max-w-full min-w-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700"
          >
            <span className="truncate">{item}</span>
          </span>
        ),
      )}
      {!open && extra > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-6 items-center rounded-full border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          +{extra}
        </button>
      ) : null}
    </div>
  );
}

export function GenericInboxTag() {
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2 text-xs font-medium text-amber-800">
      Generic inbox
    </span>
  );
}

export const primaryButtonClass =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50';

export const quietButtonClass =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
