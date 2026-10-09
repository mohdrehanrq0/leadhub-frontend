'use client';

import { useState } from 'react';
import { CappedChips, ClampText, DetailCard, SectionLabel, SnapshotRow } from './primitives';
import type { LinkedInColleagueView, LinkedInCompanyView } from '../../enrichment/types';
import type { LeadDetail } from './types';

export function CompanyTab({
  lead,
  linkedin,
  colleagues,
  phone,
}: {
  lead: LeadDetail;
  linkedin?: LinkedInCompanyView;
  colleagues: LinkedInColleagueView[];
  phone: string | null;
}) {
  const [more, setMore] = useState(false);
  const company = lead.company;
  const industry = company?.industry || linkedin?.industry || '';
  const size = company?.size || linkedin?.employeeRange || (linkedin?.employeeCount ? String(linkedin.employeeCount) : '');
  const location =
    [company?.city, company?.country].filter(Boolean).join(', ') || linkedin?.headquarters || '';
  const website = company?.website || linkedin?.website || '';
  const domain = (company?.domain || website).replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  const description = company?.description || '';
  const about = linkedin?.description || '';
  const products = company?.products ?? [];
  const services = company?.services ?? [];
  const similar = linkedin?.similarCompanies ?? [];
  const hasMore = similar.length > 0 || colleagues.length > 0;

  return (
    <div className="space-y-4">
      <DetailCard>
        <div className="@container">
          <dl className="grid min-w-0 gap-3 @min-[600px]:grid-cols-2">
            <SnapshotRow label="Industry">{industry || '—'}</SnapshotRow>
            <SnapshotRow label="Size">{size || '—'}</SnapshotRow>
            <SnapshotRow label="Location">
              <span className="block truncate" title={location}>
                {location || '—'}
              </span>
            </SnapshotRow>
            <SnapshotRow label="Website">
              {domain ? (
                <a
                  href={website.startsWith('http') ? website : `https://${domain}`}
                  target="_blank"
                  rel="noreferrer"
                  title={domain}
                  className="block truncate text-blue-700 hover:underline"
                >
                  {domain} ↗
                </a>
              ) : (
                '—'
              )}
            </SnapshotRow>
            <SnapshotRow label="Phone">
              <span className="block truncate" title={phone ?? ''}>
                {phone || '—'}
              </span>
            </SnapshotRow>
          </dl>
        </div>
        {description ? (
          <div className="mt-4">
            <SectionLabel>Description</SectionLabel>
            <div className="mt-2">
              <ClampText text={description} lines={3} />
            </div>
          </div>
        ) : null}
      </DetailCard>

      {products.length ? (
        <DetailCard>
          <SectionLabel>Products</SectionLabel>
          <div className="mt-2">
            <CappedChips items={products} max={6} />
          </div>
        </DetailCard>
      ) : null}

      {services.length ? (
        <DetailCard>
          <SectionLabel>Services</SectionLabel>
          <div className="mt-2">
            <CappedChips items={services} max={6} />
          </div>
        </DetailCard>
      ) : null}

      {about ? (
        <DetailCard>
          <SectionLabel>LinkedIn about</SectionLabel>
          <div className="mt-2">
            <ClampText text={about} lines={3} />
          </div>
        </DetailCard>
      ) : null}

      {hasMore ? (
        <DetailCard>
          <button
            type="button"
            onClick={() => setMore((open) => !open)}
            className="text-sm font-medium text-slate-700 hover:text-slate-950"
          >
            {more ? 'Hide more' : 'More'}
          </button>
          {more ? (
            <div className="mt-3 space-y-4">
              {similar.length ? (
                <div>
                  <SectionLabel>Similar companies</SectionLabel>
                  <ul className="mt-2 space-y-1">
                    {similar.map((item) => (
                      <li key={`${item.name}-${item.linkedinUrl}`} className="min-w-0 truncate text-sm text-slate-700">
                        {item.linkedinUrl ? (
                          <a href={item.linkedinUrl} target="_blank" rel="noreferrer" className="hover:underline" title={item.name}>
                            {item.name}
                          </a>
                        ) : (
                          item.name
                        )}
                        {item.industry ? <span className="text-slate-400"> · {item.industry}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {colleagues.length ? (
                <div>
                  <SectionLabel>Other profiles</SectionLabel>
                  <ul className="mt-2 space-y-1">
                    {colleagues.map((person) => (
                      <li key={`${person.fullName}-${person.linkedinUrl}`} className="min-w-0 truncate text-sm text-slate-700">
                        {person.linkedinUrl ? (
                          <a href={person.linkedinUrl} target="_blank" rel="noreferrer" className="hover:underline">
                            {person.fullName}
                          </a>
                        ) : (
                          person.fullName
                        )}
                        {person.title || person.headline ? (
                          <span className="text-slate-400"> · {person.title || person.headline}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </DetailCard>
      ) : null}
    </div>
  );
}
