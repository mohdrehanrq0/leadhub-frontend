'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { LinkedInLink } from '@/components/leads/LinkedInLink';
import {
  CAPTURE_STATUS_STYLE,
  formatCapturedAt,
  hasBlockingGap,
  isEnrichmentPending,
  RESOLUTION_STYLE,
  type CaptureListRow,
  type CaptureType,
} from '@/lib/captures';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBookmark,
  IconBuilding,
  IconMessage2,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';

const TABS: Array<{ id: 'all' | CaptureType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'profile', label: 'Profiles' },
  { id: 'post', label: 'Posts' },
];

const POLL_INTERVAL_MS = 5000;

export default function CapturesPage() {
  const [rows, setRows] = useState<CaptureListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<'all' | CaptureType>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const res = await api.get('/api/captures', {
          params: {
            type: tab === 'all' ? undefined : tab,
            q: debouncedQuery || undefined,
            pageSize: 50,
          },
        });
        setRows(res.data?.data ?? []);
        setTotal(res.data?.total ?? 0);
      } catch (err: unknown) {
        if (!opts.silent) {
          const message = (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message;
          toast.error(message ?? 'Failed to load captures.');
        }
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [tab, debouncedQuery],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  // Enrichment runs in a worker, so the list refreshes itself while any row is mid-flight.
  useEffect(() => {
    if (!rows.some(isEnrichmentPending)) return;
    const timer = setInterval(() => void load({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [rows, load]);

  const stats = useMemo(() => {
    const needsAttention = rows.filter(
      (row) => hasBlockingGap(row.dataGaps) || row.error === 'author_unresolved',
    ).length;
    return {
      unresolved: rows.filter((row) => !row.companyResolution).length,
      needsAttention,
      inCrm: rows.filter((row) => row.leadId).length,
    };
  }, [rows]);

  async function resolve(id: string) {
    setBusyId(id);
    try {
      const res = await api.post(`/api/captures/${id}/resolve`);
      toast.success(res.data?.message ?? 'Company resolved.');
      await load({ silent: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(message ?? 'Could not resolve the company.');
    } finally {
      setBusyId(null);
    }
  }

  async function enrich(id: string) {
    setBusyId(id);
    try {
      await api.post(`/api/captures/${id}/enrich`);
      toast.success('Company resolved and enrichment started.');
      await load({ silent: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(message ?? 'Could not start enrichment.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this capture? Any lead it already created stays in your CRM.')) return;
    try {
      await api.delete(`/api/captures/${id}`);
      setRows((prev) => prev.filter((row) => row.id !== id));
      toast.success('Capture deleted.');
    } catch {
      toast.error('Failed to delete capture.');
    }
  }

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6 text-text">
      <PageHeader
        eyebrow="Lead capture"
        title="Captures"
        description="Profiles and posts saved from LinkedIn. LeadHub resolves each person's employer from their current role before anything reaches your CRM."
        actions={
          <Link
            href="/dashboard/settings/extension"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Connect extension
          </Link>
        }
      />

      {rows.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Captures" value={total} tone="slate" />
          <StatCard label="Awaiting resolve" value={stats.unresolved} tone="blue" />
          <StatCard label="Needs attention" value={stats.needsAttention} tone="amber" />
          <StatCard label="In CRM" value={stats.inCrm} tone="emerald" />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                tab === item.id ? 'bg-brand-main text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-80">
          <IconSearch
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, company or post text"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-main focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 skeleton" />
          <div className="h-20 skeleton" />
          <div className="h-20 skeleton" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <IconBookmark size={32} className="mx-auto text-slate-300" />
          <h2 className="mt-3 text-base font-semibold text-text-100">No captures yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-text-300">
            Install the LeadHub extension, then press Save to LeadHub on any LinkedIn profile or
            post. The capture lands here, and LeadHub works out who they work for.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row) => (
            <CaptureCard
              key={row.id}
              row={row}
              busy={busyId === row.id}
              onResolve={() => void resolve(row.id)}
              onEnrich={() => void enrich(row.id)}
              onDelete={() => void remove(row.id)}
            />
          ))}
          <p className="px-1 pt-1 text-xs text-text-300">
            Showing {rows.length} of {total} captures
          </p>
        </div>
      )}
    </div>
  );
}

const STAT_TONE = {
  slate: 'text-slate-900',
  blue: 'text-blue-700',
  amber: 'text-amber-700',
  emerald: 'text-emerald-700',
} as const;

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof STAT_TONE;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-300">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${STAT_TONE[tone]}`}>{value}</p>
    </div>
  );
}

/**
 * One capture, as a card rather than a table row.
 *
 * The company line is the important part of this screen — it is the field a
 * capture starts life without — so it gets its own column with the resolution
 * state attached, instead of a bare string cell.
 */
function CaptureCard({
  row,
  busy,
  onResolve,
  onEnrich,
  onDelete,
}: {
  row: CaptureListRow;
  busy: boolean;
  onResolve: () => void;
  onEnrich: () => void;
  onDelete: () => void;
}) {
  const status = CAPTURE_STATUS_STYLE[row.status];
  const resolution = row.companyResolution;
  const blocked = hasBlockingGap(row.dataGaps);
  const gapCount = row.dataGaps?.length ?? 0;
  const authorMissing = row.error === 'author_unresolved';

  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Person */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-linear-to-br from-slate-100 to-slate-200 text-sm font-bold text-slate-500">
            {(row.personName ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/captures/${row.id}`}
                className="truncate font-semibold text-text-100 transition hover:text-brand-main"
              >
                {row.personName ?? 'Unknown person'}
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                {row.type === 'post' ? <IconMessage2 size={10} /> : <IconUser size={10} />}
                {row.type === 'post' ? 'Post' : 'Profile'}
              </span>
            </div>
            {row.positionTitle || row.headline ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-text-300">
                {row.positionTitle ?? row.headline}
              </p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {row.personProfileUrl ? (
                <LinkedInLink url={row.personProfileUrl} compact />
              ) : null}
              <span className="text-[11px] text-text-300">
                {formatCapturedAt(row.capturedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Company */}
        <div className="min-w-0 lg:w-64">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-300">
            Company
          </p>
          {resolution?.name || row.companyName ? (
            <>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-medium text-text-100">
                <IconBuilding size={13} className="shrink-0 text-slate-400" />
                {resolution?.name ?? row.companyName}
              </p>
              {resolution ? (
                <span
                  className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${RESOLUTION_STYLE[resolution.status].className}`}
                >
                  {RESOLUTION_STYLE[resolution.status].label}
                </span>
              ) : null}
            </>
          ) : (
            <p className="mt-0.5 text-xs text-text-300">
              {authorMissing ? 'Author profile missing' : 'Not resolved yet'}
            </p>
          )}
          {gapCount > 0 ? (
            <p
              className={`mt-1 inline-flex items-center gap-1 text-[10px] font-semibold ${blocked ? 'text-red-600' : 'text-amber-700'}`}
              title="Fields LinkedIn did not carry"
            >
              <IconAlertTriangle size={10} />
              {gapCount} data gap{gapCount > 1 ? 's' : ''}
            </p>
          ) : null}
        </div>

        {/* Status + actions */}
        <div className="flex shrink-0 items-center gap-2 lg:flex-col lg:items-end">
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.className}`}
            title={row.error ?? undefined}
          >
            {authorMissing ? 'Needs profile' : status.label}
          </span>
          <div className="flex items-center gap-1.5">
            {!resolution && !authorMissing ? (
              <button
                type="button"
                onClick={onResolve}
                disabled={busy}
                title="Resolve the company from LinkedIn"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand-main/40 hover:text-brand-main disabled:opacity-50"
              >
                <IconSearch size={13} />
                Resolve
              </button>
            ) : null}
            {row.status !== 'enriching' && !authorMissing ? (
              <button
                type="button"
                onClick={onEnrich}
                disabled={busy}
                title="Resolve, create the lead and enrich it"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-brand-main/40 hover:text-brand-main disabled:opacity-50"
              >
                <IconSparkles size={15} />
              </button>
            ) : null}
            {row.leadId ? (
              <Link
                href={`/dashboard/leads/${row.leadId}`}
                title="Open lead in CRM"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-brand-main/40 hover:text-brand-main"
              >
                <IconArrowRight size={15} />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onDelete}
              title="Delete capture"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-red-300 hover:text-red-600"
            >
              <IconTrash size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
