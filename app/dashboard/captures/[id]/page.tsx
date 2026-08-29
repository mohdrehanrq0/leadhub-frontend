'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { LinkedInLink } from '@/components/leads/LinkedInLink';
import { CompanyResolutionCard } from '@/components/captures/CompanyResolutionCard';
import { DataGapsPanel } from '@/components/captures/DataGaps';
import {
  CAPTURE_STATUS_STYLE,
  formatCapturedAt,
  hasBlockingGap,
  type CaptureDetail,
} from '@/lib/captures';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconBriefcase,
  IconDeviceFloppy,
  IconHeart,
  IconMapPin,
  IconMessageCircle,
  IconRepeat,
  IconSparkles,
} from '@tabler/icons-react';

const POLL_INTERVAL_MS = 5000;

export default function CaptureDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const captureId = params.id;

  const [capture, setCapture] = useState<CaptureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [positionTitle, setPositionTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyProfileUrl, setCompanyProfileUrl] = useState('');
  const [personProfileUrl, setPersonProfileUrl] = useState('');

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const res = await api.get(`/api/captures/${captureId}`);
        const data = res.data?.data as CaptureDetail;
        setCapture(data);
        setPositionTitle(data.positionTitle ?? '');
        setCompanyName(data.companyName ?? '');
        setCompanyProfileUrl(data.companyProfileUrl ?? '');
        setPersonProfileUrl(data.personProfileUrl ?? '');
      } catch {
        if (!opts.silent) toast.error('Capture not found.');
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [captureId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (capture?.status !== 'enriching') return;
    const timer = setInterval(() => void load({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [capture?.status, load]);

  async function saveCorrections() {
    setSaving(true);
    try {
      await api.patch(`/api/captures/${captureId}`, {
        positionTitle: positionTitle.trim() || null,
        companyName: companyName.trim() || null,
        companyProfileUrl: companyProfileUrl.trim() || null,
        personProfileUrl: personProfileUrl.trim() || null,
      });
      toast.success('Capture updated. Re-resolve to pull the company again.');
      await load({ silent: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(message ?? 'Failed to update capture.');
    } finally {
      setSaving(false);
    }
  }

  async function resolve() {
    setResolving(true);
    try {
      const res = await api.post(`/api/captures/${captureId}/resolve`);
      toast.success(res.data?.message ?? 'Company resolved.');
      await load({ silent: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(message ?? 'Could not resolve the company.');
    } finally {
      setResolving(false);
    }
  }

  async function enrich() {
    setEnriching(true);
    try {
      await api.post(`/api/captures/${captureId}/enrich`);
      toast.success('Lead created and enrichment started.');
      await load({ silent: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(message ?? 'Could not start enrichment.');
    } finally {
      setEnriching(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-3">
        <div className="h-24 skeleton" />
        <div className="h-64 skeleton" />
      </div>
    );
  }

  if (!capture) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-text-300">This capture no longer exists.</p>
        <button
          type="button"
          onClick={() => router.push('/dashboard/captures')}
          className="mt-4 text-sm font-semibold text-brand-main"
        >
          Back to captures
        </button>
      </div>
    );
  }

  const badge = CAPTURE_STATUS_STYLE[capture.status];
  const person = capture.personSnapshot ?? {};
  const experience = person.experience ?? [];
  const blocked = hasBlockingGap(capture.dataGaps);
  const authorMissing = capture.error === 'author_unresolved';

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6 text-text">
      <Link
        href="/dashboard/captures"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-300 transition hover:text-brand-main"
      >
        <IconArrowLeft size={15} />
        Captures
      </Link>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_35%),linear-gradient(135deg,#ffffff,#f8fafc)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-[#0A66C2] to-blue-500 text-2xl font-black text-white shadow-lg">
              {(capture.personName ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-main">
                {capture.type === 'post' ? 'LinkedIn post' : 'LinkedIn profile'}
              </p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-950">
                {capture.personName ?? 'Unknown person'}
              </h1>
              {capture.headline ? (
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  {capture.headline}
                </p>
              ) : null}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${badge.className}`}
                >
                  {authorMissing ? 'Needs profile' : badge.label}
                </span>
                {capture.location ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    <IconMapPin size={11} />
                    {capture.location}
                  </span>
                ) : null}
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                  Saved {formatCapturedAt(capture.capturedAt)}
                </span>
                {capture.personProfileUrl ? (
                  <LinkedInLink url={capture.personProfileUrl} compact />
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {capture.leadId ? (
              <Link
                href={`/dashboard/leads/${capture.leadId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Open lead
                <IconArrowRight size={15} />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void enrich()}
              disabled={enriching || capture.status === 'enriching' || authorMissing}
              title={
                blocked
                  ? 'Resolve the missing company fields first'
                  : 'Create the lead and enrich it'
              }
              className="inline-flex items-center gap-2 rounded-xl bg-brand-main px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-main/80 disabled:opacity-50"
            >
              <IconSparkles size={15} />
              {capture.status === 'enriching'
                ? 'Enriching…'
                : capture.leadId
                  ? 'Re-enrich'
                  : 'Create lead & enrich'}
            </button>
          </div>
        </div>
      </div>

      {authorMissing ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <IconAlertTriangle size={17} className="mt-px shrink-0 text-amber-600" />
          <p className="text-sm leading-6 text-amber-900">
            LeadHub could not read the author&apos;s profile from this post. Paste their LinkedIn
            profile url below and save to continue.
          </p>
        </div>
      ) : null}

      {!capture.leadId ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs leading-5 text-text-300">
          This capture is not in your Lead CRM. LeadHub resolves the person&apos;s employer from
          their current LinkedIn role first, so the lead arrives with a real company attached.
        </p>
      ) : null}

      {/* ── Company resolution ─────────────────────────────────── */}
      <CompanyResolutionCard
        resolution={capture.companyResolution}
        gaps={capture.dataGaps}
        resolving={resolving}
        onResolve={() => void resolve()}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {capture.companyResolution ? (
            <DataGapsPanel gaps={capture.dataGaps} />
          ) : null}

          {/* ── Corrections ──────────────────────────────────── */}
          <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-sm font-semibold text-text-100">Correct the source</h2>
              <p className="mt-1 text-xs leading-5 text-text-300">
                Read from the profile, or parsed from the headline on post captures. Fixing the
                company url here is the fastest way to resolve a stubborn capture.
              </p>
            </div>
            <LabelledInput
              label="Position title"
              value={positionTitle}
              onChange={setPositionTitle}
              placeholder="VP of Sales"
            />
            <LabelledInput
              label="Company name"
              value={companyName}
              onChange={setCompanyName}
              placeholder="Acme Inc"
            />
            <LabelledInput
              label="Company LinkedIn url"
              value={companyProfileUrl}
              onChange={setCompanyProfileUrl}
              placeholder="https://www.linkedin.com/company/..."
            />
            <LabelledInput
              label="Person LinkedIn url"
              value={personProfileUrl}
              onChange={setPersonProfileUrl}
              placeholder="https://www.linkedin.com/in/..."
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => void saveCorrections()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <IconDeviceFloppy size={14} />
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <span className="text-[11px] text-text-300">
                Saving a company change clears the current resolution.
              </span>
            </div>
          </section>

          {/* ── Profile detail ───────────────────────────────── */}
          {person.about ? (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-text-100">About</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-text-200">
                {person.about}
              </p>
            </section>
          ) : null}

          {experience.length ? (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-text-100">Experience</h2>
              <ol className="mt-3 space-y-0">
                {experience.map((row, index) => (
                  <li
                    key={`${row.company ?? 'role'}-${index}`}
                    className="relative flex gap-3 pb-4 last:pb-0"
                  >
                    {index < experience.length - 1 ? (
                      <span className="absolute left-[13px] top-7 h-full w-px bg-slate-200" />
                    ) : null}
                    <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400 ring-4 ring-white">
                      <IconBriefcase size={13} />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-sm font-medium text-text-100">
                        {row.title ?? 'Role'}
                        {row.isCurrent ? (
                          <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                            current
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-text-300">
                        {[row.company, row.dateRange, row.location].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        <div className="space-y-6">
          {capture.type === 'post' ? (
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text-100">Captured post</h2>
                <a
                  href={capture.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-xs font-semibold text-brand-main hover:underline"
                >
                  Open on LinkedIn
                </a>
              </div>
              {capture.postPublishedAt ? (
                <p className="mt-1 text-xs text-text-300">Posted {capture.postPublishedAt}</p>
              ) : null}
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-text-200">
                {capture.postText || 'No post text was captured.'}
              </p>
              {capture.postMetrics &&
              (capture.postMetrics.reactions ||
                capture.postMetrics.comments ||
                capture.postMetrics.reposts) ? (
                <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 text-xs text-text-300">
                  <Metric
                    icon={<IconHeart size={13} />}
                    value={capture.postMetrics.reactions ?? 0}
                    label="reactions"
                  />
                  <Metric
                    icon={<IconMessageCircle size={13} />}
                    value={capture.postMetrics.comments ?? 0}
                    label="comments"
                  />
                  <Metric
                    icon={<IconRepeat size={13} />}
                    value={capture.postMetrics.reposts ?? 0}
                    label="reposts"
                  />
                </div>
              ) : null}
              {capture.postMedia?.length ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {capture.postMedia.map((media, index) => (
                    <span
                      key={`${media.url ?? media.type}-${index}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {media.type}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-text-100">Enrichment</h2>
            <p className="mt-2 text-sm leading-6 text-text-200">
              {capture.status === 'enriched' && capture.leadId ? (
                <>
                  LeadHub finished enriching this person.{' '}
                  <Link
                    href={`/dashboard/leads/${capture.leadId}`}
                    className="font-semibold text-brand-main hover:underline"
                  >
                    Open the lead
                  </Link>{' '}
                  to see contacts and research.
                </>
              ) : capture.status === 'enriching' ? (
                'Enrichment is running. This page refreshes on its own.'
              ) : capture.status === 'failed' ? (
                <span className="text-red-700">{capture.error ?? 'Enrichment failed.'}</span>
              ) : blocked ? (
                'Resolve the missing company fields above before this capture can become a lead.'
              ) : (
                'Not enriched yet. Create the lead to have LeadHub research this person and their company.'
              )}
            </p>

            {capture.note ? (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-text-300">
                  Note
                </p>
                <p className="mt-1 text-sm text-text-200">{capture.note}</p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function LabelledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-300">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-main focus:outline-none"
      />
    </label>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span className="font-semibold text-text-200 tabular-nums">{value}</span>
      {label}
    </span>
  );
}
