import { IconAlertTriangle, IconLoader2, IconWorldWww } from '@tabler/icons-react';
import type { CaptureCompanyProfile } from '@/lib/captures';

/**
 * What the company's own website said, as opposed to its LinkedIn page.
 *
 * LinkedIn gives a directory entry: a name, a size bucket, a one-line blurb.
 * This is the part a salesperson actually reads before reaching out, so it
 * gets its own section rather than being folded into the LinkedIn fields.
 *
 * The section is always rendered once a chain has started, including while it
 * is still running — a visible "reading the website" state is far less
 * confusing than a card that silently grows new fields ten seconds later.
 */
export function CompanyWebsitePanel({ profile }: { profile: CaptureCompanyProfile | undefined }) {
  if (!profile) return null;

  if (profile.status === 'pending') {
    return (
      <Shell>
        <p className="flex items-center gap-2 text-xs text-text-300">
          <IconLoader2 size={14} className="animate-spin text-brand-main" />
          {profile.message}
        </p>
      </Shell>
    );
  }

  if (profile.status === 'failed' || profile.status === 'skipped') {
    return (
      <Shell>
        <p className="flex items-start gap-2 text-xs leading-5 text-amber-800">
          <IconAlertTriangle size={14} className="mt-px shrink-0 text-amber-500" />
          {profile.message}
        </p>
      </Shell>
    );
  }

  const facts: Array<[string, string | number | undefined]> = [
    ['Business model', profile.businessModel],
    ['Stage', profile.companyStage],
    ['Revenue', profile.estimatedRevenue],
    ['Headquarters', profile.headquarters],
  ];
  const shown = facts.filter(([, value]) => Boolean(value));

  return (
    <Shell>
      {profile.tagline ? (
        <p className="text-sm font-medium leading-6 text-text-100">{profile.tagline}</p>
      ) : null}

      {profile.valueProposition ? (
        <p className="mt-1.5 text-sm leading-6 text-text-200">{profile.valueProposition}</p>
      ) : null}

      {shown.length ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          {shown.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-300">
                {label}
              </dt>
              <dd className="mt-0.5 truncate text-sm text-text-100" title={String(value)}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <TagRow label="Products" items={profile.products} />
      <TagRow label="Services" items={profile.services} />
      <TagRow label="Tech stack" items={profile.technologies} />
      <TagRow label="Sells to" items={profile.targetAudience} />

      {profile.sourcePages?.length ? (
        <p className="mt-3 text-[11px] text-text-300">
          Read from {profile.sourcePages.length}{' '}
          {profile.sourcePages.length === 1 ? 'page' : 'pages'} on {profile.website}
        </p>
      ) : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 px-5 py-4">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-300">
        <IconWorldWww size={13} />
        From the company website
      </p>
      {children}
    </div>
  );
}

/** A capped list of chips — these arrays can run long and would swamp the card. */
function TagRow({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  const shown = items.slice(0, 6);
  const rest = items.length - shown.length;

  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-300">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {shown.map((item) => (
          <span
            key={item}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600"
          >
            {item}
          </span>
        ))}
        {rest > 0 ? (
          <span className="rounded-full px-1.5 py-0.5 text-[11px] text-text-300">+{rest} more</span>
        ) : null}
      </div>
    </div>
  );
}
