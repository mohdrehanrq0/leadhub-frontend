'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import type { BriefField, RecipeOpenerFields, ResearchBrief } from '@/lib/research-types';
import { StatusPill } from './StatusPill';
import { ProgressSteps } from './ProgressSteps';
import { btnOutline, btnPrimary } from '@/components/ui/styles';
import { cn } from '@/lib/utils';
import { deleteResearch, reResearch, researchExportUrl } from '@/lib/research-api';
import { runResultsUrl } from '@/lib/recipes-api';
import { useRouter } from 'next/navigation';

type Tab = 'overview' | 'company' | 'recent' | 'sources';

function FieldRow({
  label,
  field,
}: {
  label: string;
  field: BriefField<string | boolean | number | null>;
}) {
  const display =
    field.value === null || field.value === undefined
      ? '—'
      : typeof field.value === 'boolean'
        ? field.value
          ? 'Yes'
          : 'No'
        : String(field.value);

  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <StatusPill status={field.status} />
      </div>
      <p className="text-sm text-slate-900 whitespace-pre-wrap">{display}</p>
      {field.humanReason && field.status !== 'found' ? (
        <p className="mt-1 text-xs text-slate-500">{field.humanReason}</p>
      ) : null}
      {field.sourceUrl ? (
        <a
          href={field.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-main hover:underline"
        >
          Source <IconExternalLink size={12} />
        </a>
      ) : null}
    </div>
  );
}

export function BriefView({
  brief,
  opener,
  onRefresh,
}: {
  brief: ResearchBrief;
  opener?: RecipeOpenerFields | null;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [busy, setBusy] = useState(false);

  const isRunning =
    brief.status === 'pending' ||
    brief.status === 'in_progress' ||
    brief.status === 'needs_identity_confirmation';

  const markdown = useMemo(() => {
    const lines = [
      `# ${brief.person.name.value ?? 'Prospect'} — ${brief.company.name.value ?? 'Company'}`,
      '',
      `Role: ${brief.person.title.value ?? '—'}`,
      `Company: ${brief.company.description.value ?? '—'}`,
      '',
      '## Developments',
      ...(brief.developments.length
        ? brief.developments.map((d) => `- ${d.title}: ${d.summary}`)
        : ['_None confirmed_']),
    ];
    return lines.join('\n');
  }, [brief]);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'company', label: 'Company' },
    { id: 'recent', label: 'Recent activity' },
    { id: 'sources', label: 'Sources' },
  ];

  async function handleCopy() {
    await navigator.clipboard.writeText(markdown);
    toast.success('Brief copied');
  }

  async function handleReResearch() {
    setBusy(true);
    try {
      const result = await reResearch(brief.jobId, {
        includeEmail: brief.email.requested,
      });
      toast.success('Re-research started');
      router.push(`/research/jobs/${result.jobId}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not re-research';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this research job and its stored prospect data?')) return;
    setBusy(true);
    try {
      await deleteResearch(brief.jobId, true);
      toast.success('Research deleted');
      router.push('/research/history');
    } catch {
      toast.error('Could not delete research');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Prospect brief run
          </p>
          <h1 className="mt-1 font-semibold tracking-tight text-3xl text-slate-900">
            {brief.person.name.value || brief.company.name.value || 'Research brief'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {brief.person.title.value ? `${brief.person.title.value} · ` : ''}
            {brief.company.name.value || 'Company pending'}
            {brief.lastCheckedAt ? ` · Checked ${new Date(brief.lastCheckedAt).toLocaleString()}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnOutline} onClick={handleCopy} disabled={busy}>
            <IconCopy size={16} /> Copy
          </button>
          <a
            className={btnOutline}
            href={runResultsUrl(brief.jobId, 'csv')}
            target="_blank"
            rel="noreferrer"
          >
            <IconDownload size={16} /> CSV
          </a>
          <a
            className={btnOutline}
            href={researchExportUrl(brief.jobId, 'markdown')}
            target="_blank"
            rel="noreferrer"
          >
            <IconDownload size={16} /> Markdown
          </a>
          <button type="button" className={btnOutline} onClick={handleReResearch} disabled={busy}>
            <IconRefresh size={16} /> Re-research
          </button>
          <button type="button" className={btnOutline} onClick={handleDelete} disabled={busy}>
            <IconTrash size={16} /> Delete
          </button>
          {onRefresh ? (
            <button type="button" className={btnPrimary} onClick={onRefresh}>
              Refresh
            </button>
          ) : null}
        </div>
      </div>

      {isRunning ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Research progress</h2>
          <ProgressSteps progress={brief.progress} />
        </div>
      ) : null}

      {brief.status === 'failed' || brief.runOutcome === 'provider_error' ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          A provider error occurred. This is not the same as a genuine “not found” result. Check API
          keys and try again.
          {brief.runReasonCode ? ` (${brief.runReasonCode})` : ''}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition',
              tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {tab === 'overview' ? (
          <div className="grid gap-8 md:grid-cols-2">
            <section>
              <h2 className="mb-2 text-sm font-semibold text-slate-800">Person</h2>
              <FieldRow label="Name" field={brief.person.name} />
              <FieldRow label="Current role" field={brief.person.title} />
              <FieldRow label="Profile URL" field={brief.person.profileUrl} />
              <FieldRow label="Role evidence" field={brief.person.roleEvidence} />
              <FieldRow label="Company match" field={brief.person.companyMatch} />
            </section>
            <section>
              <h2 className="mb-2 text-sm font-semibold text-slate-800">Company snapshot</h2>
              <FieldRow label="Company" field={brief.company.name} />
              <FieldRow label="Overview" field={brief.company.description} />
              <FieldRow label="Industry" field={brief.company.industry} />
              <FieldRow label="Website" field={brief.company.website} />
              <div className="border-b border-slate-100 py-3 last:border-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Email discovery
                  </span>
                  <StatusPill status={brief.email.address.status} />
                </div>
                <p className="text-sm text-slate-900">
                  {brief.email.address.value ||
                    (brief.email.requested
                      ? 'No confirmed address yet. Company research can still be complete.'
                      : 'Optional — not requested for this run.')}
                </p>
              </div>
            </section>
            {opener ? (
              <section className="md:col-span-2">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">Opener</h2>
                <FieldRow label="What you sell" field={opener.whatYouSell} />
                <FieldRow label="Opening line" field={opener.opener} />
                <FieldRow label="Closing line" field={opener.closing} />
              </section>
            ) : null}
            {brief.customAnswers?.length ? (
              <section className="md:col-span-2">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">Custom answers</h2>
                {brief.customAnswers.map((a) => (
                  <FieldRow key={a.question} label={a.question} field={a.answer} />
                ))}
              </section>
            ) : null}
            {brief.personalizationNotes?.length ? (
              <section className="md:col-span-2">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">Personalization notes</h2>
                {brief.personalizationNotes.map((n) => (
                  <div key={n.angle} className="border-b border-slate-100 py-3">
                    <p className="text-sm font-medium text-slate-900">{n.angle}</p>
                    <p className="text-sm text-slate-700">{n.evidence}</p>
                  </div>
                ))}
              </section>
            ) : null}
            {brief.stakeholders?.length ? (
              <section className="md:col-span-2">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">Stakeholders</h2>
                <ul className="space-y-2">
                  {brief.stakeholders.map((s) => (
                    <li key={`${s.name}-${s.title}`} className="text-sm text-slate-800">
                      {s.name} — {s.title}
                      {s.profileUrl ? (
                        <>
                          {' · '}
                          <a href={s.profileUrl} className="text-brand-main hover:underline" target="_blank" rel="noreferrer">
                            Profile
                          </a>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {brief.icpMatch ? (
              <section className="md:col-span-2">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">ICP match</h2>
                <FieldRow label="Score" field={brief.icpMatch.score} />
                <FieldRow label="Rationale" field={brief.icpMatch.rationale} />
              </section>
            ) : null}
          </div>
        ) : null}

        {tab === 'company' ? (
          <div>
            <FieldRow label="Name" field={brief.company.name} />
            <FieldRow label="Website" field={brief.company.website} />
            <FieldRow label="Domain" field={brief.company.domain} />
            <FieldRow label="Overview" field={brief.company.description} />
            <FieldRow label="Products & services" field={brief.company.productsServices} />
            <FieldRow label="Industry" field={brief.company.industry} />
            <FieldRow label="Business model" field={brief.company.businessModel} />
          </div>
        ) : null}

        {tab === 'recent' ? (
          <div className="space-y-4">
            {!brief.developments.length ? (
              <p className="text-sm text-slate-600">
                No confirmed recent developments yet. Missing developments are shown as not found —
                not as provider failures.
              </p>
            ) : (
              brief.developments.map((d, i) => (
                <article key={`${d.title}-${i}`} className="rounded-xl border border-slate-100 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{d.title}</h3>
                    <StatusPill status={d.status} />
                  </div>
                  <p className="text-sm text-slate-700">{d.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    {d.publicationDate ? <span>Published {d.publicationDate}</span> : null}
                    {d.retrievedAt ? <span>Retrieved {new Date(d.retrievedAt).toLocaleDateString()}</span> : null}
                    {d.sourceUrl ? (
                      <a href={d.sourceUrl} target="_blank" rel="noreferrer" className="text-brand-main hover:underline">
                        Source
                      </a>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        ) : null}

        {tab === 'sources' ? (
          <div className="space-y-3">
            {!brief.sources.length ? (
              <p className="text-sm text-slate-600">No sources recorded yet.</p>
            ) : (
              brief.sources.map((s, i) => (
                <div key={`${s.fieldKey}-${i}`} className="rounded-xl border border-slate-100 px-4 py-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{s.label}</span>
                    <StatusPill status={s.status} />
                  </div>
                  {s.evidenceText ? <p className="text-sm text-slate-700">{s.evidenceText}</p> : null}
                  {s.humanReason ? <p className="text-xs text-slate-500">{s.humanReason}</p> : null}
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-brand-main hover:underline">
                      {s.url}
                    </a>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>

      <p className="text-center text-xs text-slate-500">
        Need the CRM view?{' '}
        <Link href={`/dashboard/leads/${brief.leadId}`} className="text-brand-main hover:underline">
          Open lead record
        </Link>
      </p>
    </div>
  );
}
