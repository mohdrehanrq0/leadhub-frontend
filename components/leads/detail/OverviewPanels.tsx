'use client';

import { ClampText, DetailCard, Ellipsis, GenericInboxTag, SectionLabel, SnapshotRow } from './primitives';
import { isGenericInbox } from './model';
import type { EmailEntry } from './types';

export function PersonSnapshot({
  headline,
  location,
  reach,
  email,
}: {
  headline: string;
  location: string;
  reach: string;
  email: EmailEntry | null;
}) {
  if (!headline && !location && !reach && !email) return null;

  return (
    <DetailCard title="Person">
      <dl className="space-y-2.5">
        {headline ? (
          <SnapshotRow label="Headline">
            <ClampText text={headline} lines={2} />
          </SnapshotRow>
        ) : null}
        {location ? (
          <SnapshotRow label="Location">
            <span className="block truncate" title={location}>
              {location}
            </span>
          </SnapshotRow>
        ) : null}
        {reach ? <SnapshotRow label="Reach">{reach}</SnapshotRow> : null}
        {email ? (
          <SnapshotRow label="Email">
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Ellipsis value={email.email} href={`mailto:${email.email}`} />
              {isGenericInbox(email.email) ? <GenericInboxTag /> : null}
            </span>
          </SnapshotRow>
        ) : null}
      </dl>
    </DetailCard>
  );
}

export function CompanySnapshot({
  industry,
  location,
  does,
  domain,
  href,
}: {
  industry: string;
  location: string;
  does: string;
  domain: string;
  href: string;
}) {
  if (!industry && !location && !does && !domain) return null;

  return (
    <DetailCard title="Company">
      <dl className="space-y-2.5">
        {industry ? <SnapshotRow label="Industry">{industry}</SnapshotRow> : null}
        {location ? (
          <SnapshotRow label="Location">
            <span className="block truncate" title={location}>
              {location}
            </span>
          </SnapshotRow>
        ) : null}
        {does ? (
          <SnapshotRow label="Does">
            <ClampText text={does} lines={2} />
          </SnapshotRow>
        ) : null}
        {domain ? (
          <SnapshotRow label="Site">
            <a
              href={href || `https://${domain}`}
              target="_blank"
              rel="noreferrer"
              title={domain}
              className="block truncate text-blue-700 hover:underline"
            >
              {domain} ↗
            </a>
          </SnapshotRow>
        ) : null}
      </dl>
    </DetailCard>
  );
}

export function OutreachPreview({
  subject,
  body,
  onOpen,
}: {
  subject: string;
  body: string;
  onOpen: () => void;
}) {
  const hasDraft = Boolean(subject.trim() || body.trim());
  return (
    <DetailCard>
      <SectionLabel>Outreach</SectionLabel>
      {hasDraft ? (
        <div className="mt-2 min-w-0">
          {subject ? <p className="truncate text-sm font-semibold text-slate-900">{subject}</p> : null}
          {body ? <p className="mt-1 line-clamp-2 text-sm leading-normal text-slate-600">{body}</p> : null}
          <button type="button" onClick={onOpen} className="mt-3 text-sm font-medium text-violet-700 hover:underline">
            Review draft
          </button>
        </div>
      ) : (
        <button type="button" onClick={onOpen} className="mt-2 text-sm font-medium text-violet-700 hover:underline">
          No email drafted yet → Generate
        </button>
      )}
    </DetailCard>
  );
}
