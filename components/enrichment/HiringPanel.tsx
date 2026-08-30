/**
 * Open roles and buying signals — the two "why reach out now" panels.
 *
 * Both were being collected in full and shown as prose. The pipeline reads
 * careers pages plus Greenhouse, Lever, Ashby, Workable, Recruitee and
 * Teamtailor and extracts structured roles; buying signals carry a weight, an
 * evidence quote and a source url. None of that detail reached the screen.
 */

import { IconBriefcase2, IconExternalLink, IconTrendingUp } from '@tabler/icons-react';
import { Chip, EmptyNote, EnrichmentSection } from './primitives';
import { sourceHost, type BuyingSignalDetail, type OpenRole } from './types';

export function HiringPanel({
  roles,
  sources,
  id = 'hiring',
}: {
  roles?: OpenRole[];
  sources?: string[];
  id?: string;
}) {
  if (!roles?.length) {
    return (
      <EnrichmentSection id={id} title="Open roles" icon={<IconBriefcase2 size={16} />}>
        <EmptyNote>
          No open roles were found on this company&apos;s careers pages or job boards.
        </EmptyNote>
      </EnrichmentSection>
    );
  }

  // Grouping by department turns a flat list of thirty jobs into a readable
  // shape, and the grouping itself is the hiring signal worth reading.
  const byDepartment = new Map<string, OpenRole[]>();
  for (const role of roles) {
    const key = role.department?.trim() || 'Other';
    const list = byDepartment.get(key) ?? [];
    list.push(role);
    byDepartment.set(key, list);
  }

  return (
    <EnrichmentSection
      id={id}
      title="Open roles"
      icon={<IconBriefcase2 size={16} />}
      subtitle={`${roles.length} ${roles.length === 1 ? 'role' : 'roles'} read from this company's own careers pages and job boards${
        sources?.length ? ` (${sources.length} source${sources.length === 1 ? '' : 's'})` : ''
      }. Who they are hiring says what they are investing in.`}
    >
      <div className="space-y-4">
        {[...byDepartment.entries()].map(([department, list]) => (
          <div key={department}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {department}
              <span className="ml-1.5 font-medium text-slate-300">{list.length}</span>
            </p>
            <ul className="mt-1.5 space-y-1.5">
              {list.map((role, index) => (
                <li
                  key={role.url ?? `${role.title}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{role.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {[role.location, role.postedDate, sourceHost(role.url)]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {role.url ? (
                    <a
                      href={role.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="shrink-0 text-slate-400 hover:text-blue-600"
                      title="Open posting"
                    >
                      <IconExternalLink size={14} />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {sources?.length ? (
          <p className="text-[11px] text-slate-400">
            Read from {sources.slice(0, 3).join(', ')}
            {sources.length > 3 ? ` and ${sources.length - 3} more` : ''}.
          </p>
        ) : null}
      </div>
    </EnrichmentSection>
  );
}

/** Heavier signals are the ones worth acting on, so they sort to the top. */
function signalTone(weight?: number) {
  if (!weight) return 'slate' as const;
  if (weight >= 25) return 'emerald' as const;
  if (weight >= 15) return 'blue' as const;
  return 'slate' as const;
}

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * How strongly a signal should be read.
 *
 * Signals are matched from search results, so a low-weight one is frequently a
 * keyword coincidence rather than a real event. Saying so plainly is better
 * than presenting every match as an established fact.
 */
function strengthOf(weight?: number): { label: string; hint: string } {
  if ((weight ?? 0) >= 25) {
    return { label: 'Strong', hint: 'A clear, specific event worth leading with.' };
  }
  if ((weight ?? 0) >= 15) {
    return { label: 'Moderate', hint: 'Supporting context — verify before quoting it.' };
  }
  return {
    label: 'Weak',
    hint: 'Matched from a search result and may be a coincidence. Check the source.',
  };
}

export function SignalsPanel({
  signals,
  intentScore,
  id = 'signals',
}: {
  signals?: BuyingSignalDetail[];
  intentScore?: number;
  id?: string;
}) {
  if (!signals?.length) {
    return (
      <EnrichmentSection id={id} title="Buying signals" icon={<IconTrendingUp size={16} />}>
        <EmptyNote>No buying signals were detected for this company.</EmptyNote>
      </EnrichmentSection>
    );
  }

  const sorted = [...signals].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

  return (
    <EnrichmentSection
      id={id}
      title="Buying signals"
      icon={<IconTrendingUp size={16} />}
      subtitle={
        intentScore != null
          ? `Intent score ${intentScore}, built from ${signals.length} signals. Strength shows how much each one is worth trusting.`
          : undefined
      }
    >
      <ul className="space-y-2">
        {sorted.map((signal, index) => {
          const label = signal.label ?? (signal.type ? titleCase(signal.type) : 'Signal');
          const strength = strengthOf(signal.weight);
          const host = sourceHost(signal.sourceUrl);

          return (
            <li
              key={`${signal.type}-${index}`}
              className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <Chip tone={signalTone(signal.weight)} title={strength.hint}>
                  {strength.label}
                </Chip>
                {signal.weight ? (
                  <span className="text-[11px] text-slate-400" title="Contribution to intent score">
                    +{signal.weight} intent
                  </span>
                ) : null}
                {signal.date ? (
                  <span className="text-[11px] text-slate-400">{signal.date}</span>
                ) : null}
              </div>

              {signal.description ? (
                <p className="mt-1 text-xs leading-5 text-slate-600">{signal.description}</p>
              ) : null}

              {/* Evidence is a raw page excerpt and can run very long, so it is
                  clamped — the full text is one click away at the source. */}
              {signal.evidence ? (
                <p className="mt-1.5 line-clamp-2 border-l-2 border-slate-200 pl-2 text-xs italic leading-5 text-slate-500">
                  {signal.evidence}
                </p>
              ) : null}

              {signal.sourceUrl ? (
                <a
                  href={signal.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  <IconExternalLink size={11} />
                  {host ?? 'Source'}
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </EnrichmentSection>
  );
}
