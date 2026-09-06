import type { Icon } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const settingsInputClass =
  'h-10 w-full min-w-0 rounded-lg border border-settings-line bg-settings-canvas px-3 text-sm text-settings-ink placeholder:text-settings-faint outline-none transition focus:border-settings-accent focus:bg-settings-surface focus:ring-[3px] focus:ring-settings-accent/20 disabled:cursor-not-allowed disabled:opacity-50';

export const settingsSelectClass = settingsInputClass;

export const settingsBtnPrimary =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-settings-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-settings-hover disabled:pointer-events-none disabled:opacity-50';

export const settingsBtnSecondary =
  'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-settings-line bg-settings-surface px-3.5 text-sm font-medium text-settings-ink shadow-sm transition hover:bg-settings-canvas disabled:pointer-events-none disabled:opacity-50';

export const settingsBtnDanger =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-settings-line bg-settings-surface px-2.5 text-sm font-medium text-settings-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-50';

export function SettingsPanel({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn('mx-auto w-full min-w-0 space-y-5', wide ? 'max-w-6xl' : 'max-w-4xl', className)}>
      {children}
    </div>
  );
}

export function SettingsCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  padded = true,
  className,
}: {
  title?: string;
  description?: string;
  icon?: Icon;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  className?: string;
}) {
  const hasHeader = Boolean(title || description || actions || Icon);

  return (
    <section
      className={cn(
        'min-w-0 overflow-hidden rounded-2xl border border-settings-line bg-settings-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      {hasHeader ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-settings-line/80 bg-settings-soft/40 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-settings-mid text-settings-accent">
                <Icon className="h-4 w-4" stroke={1.75} />
              </div>
            ) : null}
            <div className="min-w-0">
              {title ? <h2 className="text-[15px] font-semibold tracking-tight text-settings-ink">{title}</h2> : null}
              {description ? <p className="mt-0.5 text-sm leading-5 text-settings-muted">{description}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn(padded ? 'p-5' : '')}>{children}</div>
    </section>
  );
}

export function SettingsField({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-settings-muted">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-5 text-settings-faint">{hint}</p> : null}
    </div>
  );
}

export function SettingsEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-settings-line bg-settings-canvas px-4 py-8 text-center text-sm text-settings-muted">
      {children}
    </div>
  );
}
