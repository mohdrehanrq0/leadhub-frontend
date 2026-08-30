/**
 * The two halves of a company's story: what its own website says, and what its
 * LinkedIn page says.
 *
 * They are kept separate on purpose. The two sources disagree often enough
 * that collapsing them into one card would hide which one a given number came
 * from, and a stale LinkedIn headcount next to a fresh website claim is
 * exactly the kind of thing a salesperson needs to see as two facts.
 */

import { IconBrandLinkedin, IconBuilding, IconUsers, IconWorld } from '@tabler/icons-react';
import { LinkedInLink } from '@/components/leads/LinkedInLink';
import { Chip, ChipRow, EmptyNote, EnrichmentSection, FactRow, formatAge } from './primitives';
import type { LinkedInColleagueView, LinkedInCompanyView } from './types';

/** The website-derived company record, as stored on the `companies` row. */
export interface CompanyRecordView {
  name?: string | null;
  domain?: string | null;
  website?: string | null;
  description?: string | null;
  industry?: string | null;
  size?: string | null;
  foundedYear?: number | null;
  country?: string | null;
  city?: string | null;
  products?: string[] | null;
  services?: string[] | null;
  technologies?: string[] | null;
  socialLinks?: Record<string, string> | null;
}

/** Social keys worth a link, in the order they matter for outreach. */
const SOCIAL_ORDER = [
  'linkedin',
  'twitter',
  'youtube',
  'github',
  'crunchbase',
  'producthunt',
  'g2',
  'capterra',
];

export function CompanyProfilePanel({
  company,
  id = 'company-profile',
}: {
  company?: CompanyRecordView | null;
  id?: string;
}) {
  if (!company) {
    return (
      <EnrichmentSection id={id} title="Company" icon={<IconBuilding size={16} />}>
        <EmptyNote>No company is linked yet.</EmptyNote>
      </EnrichmentSection>
    );
  }

  const place = [company.city, company.country].filter(Boolean).join(', ');
  const socials = Object.entries(company.socialLinks ?? {})
    .filter(([key, url]) => Boolean(url) && key !== 'linkedin')
    .sort(([a], [b]) => SOCIAL_ORDER.indexOf(a) - SOCIAL_ORDER.indexOf(b));

  return (
    <EnrichmentSection
      id={id}
      title={company.name ?? 'Company'}
      icon={<IconBuilding size={16} />}
      subtitle={company.domain ?? undefined}
      actions={
        company.socialLinks?.linkedin ? (
          <LinkedInLink url={company.socialLinks.linkedin} kind="company" compact />
        ) : undefined
      }
    >
      <div className="space-y-5">
        <dl className="space-y-3">
          <FactRow label="Website">
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline"
              >
                <IconWorld size={13} />
                {company.domain ?? company.website}
              </a>
            ) : undefined}
          </FactRow>
          <FactRow label="Industry">{company.industry}</FactRow>
          <FactRow label="Size">{company.size}</FactRow>
          <FactRow label="Founded">{company.foundedYear}</FactRow>
          <FactRow label="Location">{place || undefined}</FactRow>
        </dl>

        {company.description ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Description
            </p>
            <p className="mt-1.5 text-sm leading-6 text-slate-700">{company.description}</p>
          </div>
        ) : null}

        <ChipRow label="Products" items={company.products} tone="blue" />
        <ChipRow label="Services" items={company.services} tone="violet" />
        <ChipRow label="Tech stack" items={company.technologies} max={20} />

        {socials.length ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Other profiles
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {socials.map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-600 hover:bg-slate-100"
                >
                  {key}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </EnrichmentSection>
  );
}

export function CompanyLinkedInPanel({
  company,
  colleagues,
  id = 'company-linkedin',
}: {
  company?: LinkedInCompanyView;
  colleagues?: LinkedInColleagueView[];
  id?: string;
}) {
  const hasColleagues = Boolean(colleagues?.length);
  if (!company && !hasColleagues) return null;

  const age = formatAge(company?.fetchedAt);

  return (
    <EnrichmentSection
      id={id}
      title="Company on LinkedIn"
      icon={<IconBrandLinkedin size={16} />}
      subtitle={age ? `Last read ${age}.` : undefined}
      actions={
        company?.linkedinUrl ? (
          <LinkedInLink url={company.linkedinUrl} kind="company" compact />
        ) : undefined
      }
    >
      <div className="space-y-5">
        {company ? (
          <>
            {company.tagline ? (
              <p className="text-sm font-medium leading-6 text-slate-800">{company.tagline}</p>
            ) : null}

            <dl className="space-y-3">
              <FactRow label="Industry">{company.industry}</FactRow>
              <FactRow label="Employees">
                {company.employeeCount
                  ? `${company.employeeCount.toLocaleString()}${company.employeeRange ? ` (${company.employeeRange})` : ''}`
                  : company.employeeRange}
              </FactRow>
              <FactRow label="Followers">
                {company.followerCount ? company.followerCount.toLocaleString() : undefined}
              </FactRow>
              <FactRow label="Founded">{company.foundedYear}</FactRow>
              <FactRow label="Headquarters">{company.headquarters}</FactRow>
              <FactRow label="Phone">{company.phone}</FactRow>
            </dl>

            {company.description ? (
              <p className="text-sm leading-6 text-slate-700">{company.description}</p>
            ) : null}

            <ChipRow label="Specialities" items={company.specialities} max={16} />
            <ChipRow label="Other locations" items={company.locations} max={8} />
          </>
        ) : null}

        {hasColleagues ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <IconUsers size={13} />
              People at this company
            </p>
            <ul className="space-y-2">
              {colleagues!.map((person, index) => (
                <li
                  key={person.linkedinUrl ?? `${person.fullName}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-white bg-white px-3 py-2 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {person.fullName ?? 'Unknown'}
                    </p>
                    <p className="truncate text-xs text-slate-600">
                      {person.title ?? person.headline}
                    </p>
                    {person.location ? (
                      <p className="truncate text-[11px] text-slate-400">{person.location}</p>
                    ) : null}
                  </div>
                  {person.linkedinUrl ? (
                    <LinkedInLink url={person.linkedinUrl} compact />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {company?.similarCompanies.length ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Similar companies
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {company.similarCompanies.slice(0, 8).map((org, index) => (
                <Chip key={org.linkedinUrl ?? `${org.name}-${index}`} title={org.industry}>
                  {org.name}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </EnrichmentSection>
  );
}
