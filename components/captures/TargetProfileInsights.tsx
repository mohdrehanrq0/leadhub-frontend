'use client';

import Link from 'next/link';
import { LinkedInLink } from '@/components/leads/LinkedInLink';
import {
  IconArrowRight,
  IconMessageCircle,
  IconSparkles,
  IconUserPlus,
} from '@tabler/icons-react';

export type TargetInsightPayload = {
  leadId?: string | null;
  personName?: string | null;
  role?: string | null;
  companyName?: string | null;
  personLinkedinUrl?: string | null;
  captureReason?: 'linkedin_profile' | 'linkedin_post' | string | null;
  enrichmentStatus?: string | null;
  productFit?: { value?: string | null; score?: number | null } | null;
  personSummary?: { value?: string | null } | null;
  outreachAngle?: string | null;
  suggestedCta?: string | null;
  connectionDegree?: string | null;
};

/**
 * Person-first narrative after enrichment: why they're a fit, how to connect,
 * how to communicate. Reuses existing lead intelligence — never re-enriches.
 */
export function TargetProfileInsights({ data }: { data: TargetInsightPayload }) {
  const fitText =
    data.productFit?.value ||
    data.personSummary?.value ||
    (data.enrichmentStatus === 'completed'
      ? null
      : 'Enrich this profile and the sequence is written from what we find.');
  const fitScore =
    data.productFit?.score != null ? ` · ${data.productFit.score}%` : '';

  const connectBits: string[] = [];
  if (data.role) connectBits.push(data.role);
  if (data.companyName) connectBits.push(`at ${data.companyName}`);
  if (data.connectionDegree) connectBits.push(`${data.connectionDegree} connection`);
  const connectContext =
    data.captureReason === 'linkedin_post'
      ? 'Captured from a LinkedIn post — reply to that context or send a connection note tied to what they shared.'
      : 'Captured from their LinkedIn profile — lead with a specific observation from their role or company.';

  const communicate =
    data.outreachAngle ||
    data.suggestedCta ||
    (data.enrichmentStatus === 'completed'
      ? null
      : 'The sequence for this profile appears after enrichment.');

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-main">
            Target profile
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-text-100">
            {data.personName ?? 'Captured person'}
          </h2>
          {connectBits.length ? (
            <p className="mt-0.5 text-xs text-text-300">{connectBits.join(' · ')}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {data.personLinkedinUrl ? (
            <LinkedInLink url={data.personLinkedinUrl} compact />
          ) : null}
          {data.leadId ? (
            <Link
              href={`/dashboard/leads/${data.leadId}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-main/40 hover:text-brand-main"
            >
              Open in CRM
              <IconArrowRight size={13} />
            </Link>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 p-5 md:grid-cols-3">
        <InsightCard
          icon={<IconSparkles size={15} />}
          title={`Why this profile is a fit${fitScore}`}
        >
          <p className="text-sm leading-6 text-text-200">
            {fitText || 'Fit narrative will appear here after enrichment finishes.'}
          </p>
        </InsightCard>

        <InsightCard icon={<IconUserPlus size={15} />} title="How to connect">
          <p className="text-sm leading-6 text-text-200">{connectContext}</p>
          {data.personLinkedinUrl ? (
            <a
              href={data.personLinkedinUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 inline-flex text-xs font-semibold text-brand-main hover:underline"
            >
              Open LinkedIn profile
            </a>
          ) : null}
        </InsightCard>

        <InsightCard icon={<IconMessageCircle size={15} />} title="How to communicate">
          <p className="text-sm leading-6 text-text-200">
            {communicate || 'Outreach angle will appear after enrichment finishes.'}
          </p>
          {data.suggestedCta && data.outreachAngle ? (
            <p className="mt-2 text-xs text-text-300">
              <span className="font-semibold text-text-200">CTA · </span>
              {data.suggestedCta}
            </p>
          ) : null}
        </InsightCard>
      </div>
    </section>
  );
}

function InsightCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{title}</h3>
      </div>
      {children}
    </div>
  );
}
