import {
  IconBuilding,
  IconRefresh,
  IconSearch,
  IconWorld,
} from '@tabler/icons-react';
import { LinkedInLink } from '@/components/leads/LinkedInLink';
import {
  gapsByField,
  RESOLUTION_STYLE,
  type CaptureCompanyResolution,
  type CaptureDataGap,
} from '@/lib/captures';
import { GapValue } from './DataGaps';

/**
 * The employer LeadHub walked to from the captured profile.
 *
 * Every value renders through {@link GapValue} so a blank cell always explains
 * itself rather than showing an unexplained dash.
 */
export function CompanyResolutionCard({
  resolution,
  gaps,
  resolving,
  onResolve,
}: {
  resolution: CaptureCompanyResolution | null;
  gaps: CaptureDataGap[] | null;
  resolving: boolean;
  onResolve: () => void;
}) {
  const byField = gapsByField(gaps);

  if (!resolution) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        <IconSearch size={26} className="mx-auto text-slate-300" />
        <h2 className="mt-3 text-sm font-semibold text-text-100">Company not resolved yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-text-300">
          LeadHub reads the current role from this profile, follows it to the company&apos;s
          LinkedIn page, and pulls the company details from there.
        </p>
        <button
          type="button"
          onClick={onResolve}
          disabled={resolving}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-main px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-main/80 disabled:opacity-50"
        >
          <IconSearch size={15} />
          {resolving ? 'Resolving…' : 'Resolve company'}
        </button>
      </section>
    );
  }

  const badge = RESOLUTION_STYLE[resolution.status];
  const size = resolution.sizeLabel ?? resolution.employeeCount;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200">
            <IconBuilding size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-text-100">
                {resolution.name ?? 'Unknown company'}
              </h2>
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>
            <p className="mt-1 max-w-xl text-xs leading-5 text-text-300">{resolution.message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onResolve}
          disabled={resolving}
          title="Re-read the company from LinkedIn"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <IconRefresh size={13} className={resolving ? 'animate-spin' : undefined} />
          {resolving ? 'Resolving…' : 'Re-resolve'}
        </button>
      </header>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2">
        <Field label="Current role">
          <GapValue value={resolution.currentRole?.title} />
          {resolution.currentRole?.dateRange ? (
            <span className="ml-1.5 text-xs text-text-300">
              · {resolution.currentRole.dateRange}
            </span>
          ) : null}
        </Field>
        <Field label="Industry">
          <GapValue value={resolution.industry} gap={byField.get('industry')} />
        </Field>
        <Field label="Website">
          {resolution.website ? (
            <a
              href={resolution.website}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 font-medium text-brand-main hover:underline"
            >
              <IconWorld size={13} className="shrink-0" />
              {resolution.domain ?? resolution.website}
            </a>
          ) : (
            <GapValue gap={byField.get('website') ?? byField.get('domain')} />
          )}
        </Field>
        <Field label="Company size">
          <GapValue value={size} gap={byField.get('employeeCount')} />
        </Field>
        <Field label="Location">
          <GapValue value={resolution.location} gap={byField.get('location')} />
        </Field>
        <Field label="Founded">
          <GapValue value={resolution.foundedYear} gap={byField.get('foundedYear')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            {resolution.description ? (
              <p className="mt-0.5 line-clamp-4 text-sm leading-6 text-text-200">
                {resolution.description}
              </p>
            ) : (
              <GapValue gap={byField.get('description')} />
            )}
          </Field>
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
        {resolution.companyLinkedinUrl ? (
          <LinkedInLink url={resolution.companyLinkedinUrl} kind="company" compact />
        ) : (
          <GapValue gap={byField.get('companyLinkedinUrl')} />
        )}
        {resolution.fromCache ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            Cached
          </span>
        ) : null}
        {resolution.specialities?.slice(0, 4).map((item) => (
          <span
            key={item}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
          >
            {item}
          </span>
        ))}
      </footer>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-300">{label}</p>
      <div className="mt-1 text-sm text-text-100">{children}</div>
    </div>
  );
}
