'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IconBrandLinkedin,
  IconBuilding,
  IconLoader2,
  IconMail,
  IconPhone,
  IconPlayerStop,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconWorld,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
  getLinkedInContactInfoSyncProgress,
  requestLinkedInConnectionsSync,
  stopLinkedInContactInfoSync,
  type ContactInfoSyncProgress,
} from '@/lib/linkedin-connections-sync';
import { CreateListDialog } from '@/components/prospects/CreateListDialog';
import { errorMessage } from '@/components/prospects/utils';
import type { LeadList } from '@/components/leads/types';

type ContactFilter = 'all' | 'has_email' | 'missing_email' | 'has_phone' | 'not_fetched';

type ConnectionRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  headline: string | null;
  linkedinUrl: string;
  connectedOnDate: string | null;
  email: string | null;
  phone: string | null;
  websites: string[];
  twitterHandle: string | null;
  birthday: string | null;
  address: string | null;
  companyName: string | null;
  companyWebsite: string | null;
  companyLinkedinUrl: string | null;
  currentTitle: string | null;
  location: string | null;
  industry: string | null;
  contactInfoFetchedAt: string | null;
  contactInfoStatus: string | null;
  lastSeenAt: string;
};

type SyncStatus = {
  has_cursor: boolean;
  connectionCount: number;
  withEmailCount: number;
  withPhoneCount: number;
  withCompanyCount?: number;
  contactInfoFetchedCount: number;
  contactInfoPendingCount: number;
  last_sync: {
    id: string;
    mode: string;
    status: string;
    batchCount: number;
    parsedCount: number;
    syncedCount: number;
    totalCount: number | null;
    headlineFilter: string | null;
    error: string | null;
    updatedAt: string;
    lastSyncedAt: string | null;
  } | null;
};

export function LinkedInConnectionsPanel() {
  const [rows, setRows] = useState<ConnectionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [headline, setHeadline] = useState('');
  const [appliedHeadline, setAppliedHeadline] = useState('');
  const [contactFilter, setContactFilter] = useState<ContactFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lists, setLists] = useState<LeadList[]>([]);
  const [listId, setListId] = useState('');
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [contactProgress, setContactProgress] = useState<ContactInfoSyncProgress | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const limit = 100;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/api/linkedin-connections/sync-status');
      setSyncStatus(res.data.data ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/linkedin-connections', {
        params: {
          page,
          limit,
          q: appliedQuery.trim() || undefined,
          headline: appliedHeadline.trim() || undefined,
          contactFilter: contactFilter !== 'all' ? contactFilter : undefined,
        },
      });
      const data = res.data.data;
      setRows(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load LinkedIn connections.'));
    } finally {
      setLoading(false);
    }
  }, [page, appliedQuery, appliedHeadline, contactFilter]);

  const fetchLists = useCallback(async () => {
    try {
      const res = await api.get('/api/lists');
      const data = (res.data.data ?? []) as LeadList[];
      setLists(data);
      if (!listId && data[0]?.id) setListId(data[0].id);
    } catch {
      /* ignore */
    }
  }, [listId]);

  useEffect(() => {
    void fetchStatus();
    void fetchLists();
    void getLinkedInContactInfoSyncProgress().then((p) => {
      if (p) setContactProgress(p);
    });
  }, [fetchStatus, fetchLists]);

  useEffect(() => {
    void fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    // Poll live enrichment & sync status every 5s so state transitions (sync -> enriching -> break -> daily limit) show immediately.
    const timer = window.setInterval(() => {
      void getLinkedInContactInfoSyncProgress().then((p) => {
        if (p) setContactProgress(p);
      });
      if (
        syncing ||
        syncStatus?.last_sync?.status === 'running' ||
        contactProgress?.status === 'running'
      ) {
        void fetchStatus();
        void fetchConnections();
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [
    syncing,
    syncStatus?.last_sync?.status,
    contactProgress?.status,
    fetchStatus,
    fetchConnections,
  ]);

  const allSelectedOnPage = useMemo(
    () => rows.length > 0 && rows.every((row) => selected.has(row.id)),
    [rows, selected],
  );

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        for (const row of rows) next.delete(row.id);
      } else {
        for (const row of rows) next.add(row.id);
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllMatching = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/linkedin-connections/ids', {
        params: {
          q: appliedQuery.trim() || undefined,
          headline: appliedHeadline.trim() || undefined,
          contactFilter: contactFilter !== 'all' ? contactFilter : undefined,
        },
      });
      const ids = (res.data.data?.ids ?? []) as string[];
      setSelected(new Set(ids));
      if (ids.length === 0) toast.message('No connections match this filter.');
      else toast.success(`Selected ${ids.length.toLocaleString()} matching connections.`);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to select matching connections.'));
    } finally {
      setLoading(false);
    }
  };

  const clearMatching = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/linkedin-connections/ids', {
        params: {
          q: appliedQuery.trim() || undefined,
          headline: appliedHeadline.trim() || undefined,
          contactFilter: contactFilter !== 'all' ? contactFilter : undefined,
        },
      });
      const drop = new Set((res.data.data?.ids ?? []) as string[]);
      setSelected((prev) => {
        const next = new Set<string>();
        for (const id of prev) {
          if (!drop.has(id)) next.add(id);
        }
        return next;
      });
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to clear matching connections.'));
    } finally {
      setLoading(false);
    }
  };

  const kickSync = async (opts?: { forceFull?: boolean; headlineFilter?: string }) => {
    setSyncing(true);
    try {
      const result = await requestLinkedInConnectionsSync(opts);
      if (!result.ok) {
        toast.error(result.message ?? 'Could not start connections sync.');
        return;
      }
      if (result.started === false) {
        toast.message(result.message ?? 'Sync already running.');
      } else {
        toast.success(opts?.headlineFilter ? 'Filtered extract started.' : 'Connections sync started.');
      }
      await fetchStatus();
      await fetchConnections();
    } finally {
      setSyncing(false);
      await fetchStatus();
      await fetchConnections();
    }
  };

  const handleStopContactInfo = async () => {
    const res = await stopLinkedInContactInfoSync();
    if (res.progress) setContactProgress(res.progress);
    toast.message('Contact & company enrichment stopped.');
    await fetchStatus();
    await fetchConnections();
  };

  const importSelected = async () => {
    if (!listId) {
      toast.error('Pick a prospect list first.');
      return;
    }
    if (selected.size === 0) {
      toast.error('Select at least one connection.');
      return;
    }
    setImporting(true);
    try {
      const ids = [...selected];
      const CHUNK = 500;
      let attached = 0;
      let created = 0;
      for (let i = 0; i < ids.length; i += CHUNK) {
        const res = await api.post('/api/linkedin-connections/import-to-list', {
          listId,
          connectionIds: ids.slice(i, i + CHUNK),
        });
        const data = res.data.data as { attached: number; created: number };
        attached += data.attached ?? 0;
        created += data.created ?? 0;
      }
      toast.success(
        `Added ${attached} people to the list${created ? ` (${created} new leads)` : ''}.`,
      );
      setSelected(new Set());
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to add connections to the list.'));
    } finally {
      setImporting(false);
    }
  };

  const createList = async (input: { name: string; description?: string; outreachMotive?: string }) => {
    setCreating(true);
    try {
      const res = await api.post('/api/lists', {
        name: input.name,
        description: input.description,
        outreachMotive: input.outreachMotive ?? null,
      });
      const created = res.data.data as LeadList;
      toast.success(`List "${created.name}" created.`);
      setCreateOpen(false);
      await fetchLists();
      if (created?.id) setListId(created.id);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create list.'));
    } finally {
      setCreating(false);
    }
  };

  const lastSync = syncStatus?.last_sync;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (contactProgress?.status !== 'running') return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [contactProgress?.status]);

  const enrichmentSummary = useMemo(() => {
    const totalConn = syncStatus?.connectionCount ?? 0;
    const fetched = syncStatus?.contactInfoFetchedCount ?? 0;
    const pending = syncStatus?.contactInfoPendingCount ?? 0;
    const coveragePct = totalConn > 0 ? Math.min(100, Math.round((fetched / totalConn) * 100)) : 0;
    const dailyLimit = contactProgress?.dailyLimit ?? 80;
    const usedToday = contactProgress?.usedToday ?? 0;
    const dailyPct = dailyLimit > 0 ? Math.min(100, Math.round((usedToday / dailyLimit) * 100)) : 0;

    const rawPhase = contactProgress?.phase ?? contactProgress?.status ?? 'idle';
    const phase =
      rawPhase === 'completed' && pending === 0 && totalConn > 0
        ? 'all_done'
        : rawPhase;

    const nextInSec =
      contactProgress?.nextTickAt
        ? Math.max(0, Math.round((Date.parse(contactProgress.nextTickAt) - nowMs) / 1000))
        : null;
    const nextInLabel =
      nextInSec == null
        ? null
        : nextInSec >= 60
          ? `${Math.floor(nextInSec / 60)}m ${nextInSec % 60}s`
          : `${nextInSec}s`;

    let badgeLabel = 'Idle';
    let badgeClass = 'bg-slate-100 text-slate-600 ring-slate-200';
    let detail =
      pending > 0
        ? `${pending.toLocaleString()} connection(s) queued — enriches automatically at a human-safe pace (up to ${dailyLimit}/day).`
        : totalConn > 0
          ? 'All synced connections have been enriched.'
          : 'Sync your LinkedIn connections to start enriching contact & company details.';

    if (phase === 'enriching') {
      const processed = contactProgress?.processedCount ?? 0;
      const runTotal = contactProgress?.totalCount ?? 0;
      const found = contactProgress?.foundCount ?? 0;
      const cur = contactProgress?.currentName ? ` · Last: ${contactProgress.currentName}` : '';
      if (nextInSec != null && nextInSec > 0 && nextInLabel) {
        badgeLabel = `Human pacing · ${nextInLabel}`;
        badgeClass = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
        detail = `Enriched ${processed}/${runTotal} in this run (${found} found)${cur} · Waiting ${nextInLabel} (human pacing) before next profile`;
      } else {
        badgeLabel = 'Fetching profile';
        badgeClass = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
        detail = `Fetching ${contactProgress?.currentName || 'next profile'} (${processed}/${runTotal} in this run, ${found} found)…`;
      }
    } else if (phase === 'taking_break') {
      badgeLabel = nextInLabel ? `Safety break · ${nextInLabel}` : 'Taking safety break';
      badgeClass = 'bg-amber-50 text-amber-700 ring-amber-200';
      detail = `Pausing ${nextInLabel ? `for ${nextInLabel} ` : ''}every 15 profiles to mimic normal LinkedIn browsing (${contactProgress?.processedCount ?? 0}/${contactProgress?.totalCount ?? 0} done in this run).`;
    } else if (phase === 'waiting_for_sync') {
      badgeLabel = 'Waiting for connections sync';
      badgeClass = 'bg-blue-50 text-blue-700 ring-blue-200';
      detail = 'Waiting for LinkedIn connections paging to finish so requests never run in parallel.';
    } else if (phase === 'daily_limit_reached') {
      badgeLabel = `Daily safety limit reached (${usedToday}/${dailyLimit})`;
      badgeClass = 'bg-indigo-50 text-indigo-700 ring-indigo-200';
      detail =
        pending > 0
          ? `Enriched ${usedToday} profiles today to keep your LinkedIn account safe. ${pending.toLocaleString()} remaining will resume automatically tomorrow.`
          : `Enriched ${usedToday} profiles today. All connections are up to date.`;
    } else if (phase === 'cooldown') {
      badgeLabel = '24h safety cooldown';
      badgeClass = 'bg-rose-50 text-rose-700 ring-rose-200';
      const until = contactProgress?.cooldownUntil
        ? new Date(contactProgress.cooldownUntil).toLocaleString()
        : null;
      detail =
        contactProgress?.error ||
        `Paused to protect your LinkedIn account${until ? ` until ${until}` : ''}.`;
    } else if (phase === 'stopped') {
      badgeLabel = 'Paused by user';
      badgeClass = 'bg-slate-100 text-slate-700 ring-slate-200';
      detail = `Enrichment was stopped (${pending.toLocaleString()} still pending). Click Sync now to resume.`;
    } else if (phase === 'failed') {
      badgeLabel = 'Paused (error)';
      badgeClass = 'bg-rose-50 text-rose-700 ring-rose-200';
      detail = contactProgress?.error || 'Contact enrichment paused. Refresh LinkedIn and click Sync now.';
    } else if (phase === 'all_done') {
      badgeLabel = 'All enriched';
      badgeClass = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
      detail = 'Every synced connection has been checked for email, phone, and company details.';
    } else if (phase === 'completed' && pending > 0) {
      badgeLabel = 'Batch complete';
      badgeClass = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
      detail = `Enriched ${contactProgress?.processedCount ?? 0} profile(s) (${contactProgress?.foundCount ?? 0} found). ${pending.toLocaleString()} remaining will continue automatically within the ${dailyLimit}/day safety limit.`;
    }

    return {
      totalConn,
      fetched,
      pending,
      coveragePct,
      dailyLimit,
      usedToday,
      dailyPct,
      badgeLabel,
      badgeClass,
      detail,
      isRunning: contactProgress?.status === 'running',
    };
  }, [syncStatus, contactProgress, nowMs]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">LinkedIn connections inventory</p>
            <p className="mt-1 text-sm text-slate-500">
              The extension opens your connections page only to authenticate, then pages LinkedIn’s
              API (40 people at a time, 2–4s between pages) until your full network is stored — not
              a visible-screen scrape. People stay here until you add them to a prospect list.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {syncStatus ? `${syncStatus.connectionCount.toLocaleString()} in LeadHub` : '—'}
              {lastSync?.totalCount
                ? ` · LinkedIn total ${lastSync.totalCount.toLocaleString()}`
                : null}
              {syncStatus
                ? ` · ${syncStatus.withEmailCount.toLocaleString()} with email · ${syncStatus.withPhoneCount.toLocaleString()} with phone`
                : null}
              {syncStatus && syncStatus.contactInfoPendingCount > 0
                ? ` · ${syncStatus.contactInfoPendingCount.toLocaleString()} pending contact lookup`
                : null}
              {lastSync?.lastSyncedAt
                ? ` · last sync ${new Date(lastSync.lastSyncedAt).toLocaleString()}`
                : lastSync?.status
                  ? ` · status ${lastSync.status}`
                  : ' · not synced yet'}
              {lastSync?.status === 'running'
                ? ` · syncing ${lastSync.syncedCount.toLocaleString()}${
                    lastSync.totalCount ? ` / ${lastSync.totalCount.toLocaleString()}` : ''
                  }`
                : lastSync && lastSync.syncedCount > 0
                  ? ` · last run ${lastSync.syncedCount.toLocaleString()}${
                      lastSync.totalCount ? ` / ${lastSync.totalCount.toLocaleString()}` : ''
                    }`
                  : null}
              {lastSync?.error ? ` · ${lastSync.error}` : null}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Auto-sync runs once when you first connect the extension, then daily to pull new
              connections at the top. Each sync automatically fetches contact details (email, phone,
              websites) and company info (company name, website, title, location) once per
              connection — never re-fetching already enriched profiles.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={syncing}
              onClick={() => void kickSync({ forceFull: false })}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-main px-4 text-sm font-semibold text-white hover:bg-brand-main/90 disabled:opacity-60"
              title="Sync new connections and automatically fetch their contact & company details"
            >
              {syncing ? <IconLoader2 size={16} className="animate-spin" /> : <IconRefresh size={16} />}
              Sync now
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={() => void kickSync({ forceFull: true })}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
              title="Re-scan your entire LinkedIn network and enrich any pending connections"
            >
              Full resync
            </button>
            {contactProgress?.status === 'running' ? (
              <button
                type="button"
                onClick={() => void handleStopContactInfo()}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-rose-50 px-4 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
              >
                <IconPlayerStop size={16} />
                Stop enrichment ({contactProgress.processedCount}/{contactProgress.totalCount})
              </button>
            ) : null}
          </div>
        </div>
        {lastSync?.status === 'running' && lastSync.totalCount ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-main transition-all"
              style={{
                width: `${Math.min(100, Math.round((lastSync.syncedCount / lastSync.totalCount) * 100))}%`,
              }}
            />
          </div>
        ) : null}

        {/* Dedicated Contact & Company Enrichment Status */}
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Contact &amp; company enrichment
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${enrichmentSummary.badgeClass}`}
              >
                {enrichmentSummary.isRunning ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                ) : null}
                {enrichmentSummary.badgeLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span>
                <strong className="text-slate-700">{(syncStatus?.withEmailCount ?? 0).toLocaleString()}</strong> emails
              </span>
              <span>
                <strong className="text-slate-700">{(syncStatus?.withPhoneCount ?? 0).toLocaleString()}</strong> phones
              </span>
              <span>
                <strong className="text-slate-700">{(syncStatus?.withCompanyCount ?? 0).toLocaleString()}</strong> companies
              </span>
              <span>
                <strong className="text-slate-700">{enrichmentSummary.pending.toLocaleString()}</strong> pending
              </span>
            </div>
          </div>

          <p className="mt-1.5 text-xs text-slate-600">{enrichmentSummary.detail}</p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>Overall enrichment coverage</span>
                <span className="font-semibold text-slate-700">
                  {enrichmentSummary.fetched.toLocaleString()} / {enrichmentSummary.totalConn.toLocaleString()} ({enrichmentSummary.coveragePct}%)
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${enrichmentSummary.coveragePct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>Today&apos;s LinkedIn safety quota</span>
                <span className="font-semibold text-slate-700">
                  {enrichmentSummary.usedToday} / {enrichmentSummary.dailyLimit} profiles
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${enrichmentSummary.dailyPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Search
          </span>
          <IconSearch size={16} className="pointer-events-none absolute bottom-3 left-3 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setPage(1);
                setAppliedQuery(query.trim());
                setAppliedHeadline(headline.trim());
              }
            }}
            placeholder="Name or headline"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-300"
          />
        </label>
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Headline contains
          </span>
          <input
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setPage(1);
                setAppliedQuery(query.trim());
                setAppliedHeadline(headline.trim());
              }
            }}
            placeholder="e.g. founder"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300"
          />
        </label>
        <label className="min-w-[170px]">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Contact
          </span>
          <select
            value={contactFilter}
            onChange={(event) => {
              setPage(1);
              setContactFilter(event.target.value as ContactFilter);
            }}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300"
          >
            <option value="all">All contacts</option>
            <option value="has_email">Has email</option>
            <option value="missing_email">Missing email</option>
            <option value="has_phone">Has phone</option>
            <option value="not_fetched">Not fetched yet</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setAppliedQuery(query.trim());
            setAppliedHeadline(headline.trim());
          }}
          className="inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          Apply filter
        </button>
        <button
          type="button"
          disabled={loading || total === 0}
          onClick={() => void selectAllMatching()}
          className="inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
        >
          Select all matching
        </button>
        <button
          type="button"
          disabled={loading || selected.size === 0}
          onClick={() => void clearMatching()}
          className="inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
        >
          Clear matching
        </button>
        <button
          type="button"
          disabled={selected.size === 0}
          onClick={() => setSelected(new Set())}
          className="inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
        >
          Clear all
        </button>
        <button
          type="button"
          disabled={syncing || !headline.trim()}
          onClick={() => void kickSync({ forceFull: true, headlineFilter: headline.trim() })}
          className="inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
          title="Ask the extension to re-scan and only upload matching headlines"
        >
          Extract matching only
        </button>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
          <span className="text-sm font-semibold text-slate-800">{selected.size} selected</span>
          <select
            value={listId}
            onChange={(event) => setListId(event.target.value)}
            className="h-10 min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">Pick a prospect list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-10 items-center gap-1 rounded-xl bg-white px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            <IconPlus size={14} />
            New list
          </button>
          <button
            type="button"
            disabled={importing || !listId}
            onClick={() => void importSelected()}
            className="inline-flex h-10 items-center rounded-xl bg-brand-main px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {importing ? 'Adding…' : 'Add to prospect list'}
          </button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6">
            <div className="h-28 skeleton" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <IconBrandLinkedin size={28} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-900">
              {total === 0 && !appliedQuery && !appliedHeadline
                ? 'No LinkedIn connections synced yet'
                : 'No connections match this filter'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {total === 0 && !appliedQuery && !appliedHeadline ? (
                <>
                  Connect the{' '}
                  <Link href="/dashboard/settings/extension" className="font-semibold text-brand-main">
                    LeadHub extension
                  </Link>
                  , stay signed into LinkedIn, then sync.
                </>
              ) : (
                'Try another search or clear the headline filter.'
              )}
            </p>
            {total === 0 && !appliedQuery && !appliedHeadline ? (
              <button
                type="button"
                disabled={syncing}
                onClick={() => void kickSync({ forceFull: true })}
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-main px-4 text-sm font-semibold text-white"
              >
                <IconRefresh size={16} />
                Sync connections
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={toggleAll}
                      aria-label="Select all on page"
                    />
                  </th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Company & Role</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Connected</th>
                  <th className="px-5 py-3.5">LinkedIn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`Select ${row.fullName}`}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-slate-900">{row.fullName}</div>
                      {row.location ? (
                        <div className="mt-0.5 text-xs text-slate-400">{row.location}</div>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {row.companyName ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <IconBuilding size={14} className="shrink-0 text-slate-400" />
                            {row.companyLinkedinUrl ? (
                              <a
                                href={row.companyLinkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-brand-main hover:underline"
                              >
                                {row.companyName}
                              </a>
                            ) : (
                              <span>{row.companyName}</span>
                            )}
                          </div>
                          {row.currentTitle || row.headline ? (
                            <div className="text-xs text-slate-500">
                              {row.currentTitle || row.headline}
                            </div>
                          ) : null}
                          {row.companyWebsite ? (
                            <a
                              href={row.companyWebsite}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-brand-main hover:underline"
                            >
                              <IconWorld size={12} className="shrink-0" />
                              <span className="truncate max-w-[200px]">
                                {row.companyWebsite.replace(/^https?:\/\/(www\.)?/i, '')}
                              </span>
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <span>{row.headline || '—'}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {row.email || row.phone || row.websites?.length || row.twitterHandle ? (
                        <div className="space-y-1">
                          {row.email ? (
                            <a
                              href={`mailto:${row.email}`}
                              className="flex items-center gap-1.5 text-slate-800 hover:text-brand-main hover:underline"
                            >
                              <IconMail size={14} className="shrink-0 text-slate-400" />
                              <span className="truncate max-w-[220px]">{row.email}</span>
                            </a>
                          ) : null}
                          {row.phone ? (
                            <a
                              href={`tel:${row.phone}`}
                              className="flex items-center gap-1.5 text-slate-700 hover:text-brand-main hover:underline"
                            >
                              <IconPhone size={14} className="shrink-0 text-slate-400" />
                              <span>{row.phone}</span>
                            </a>
                          ) : null}
                          {row.websites?.[0] ? (
                            <a
                              href={row.websites[0]}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-slate-500 hover:text-brand-main hover:underline"
                            >
                              <IconWorld size={14} className="shrink-0 text-slate-400" />
                              <span className="truncate max-w-[200px]">
                                {row.websites[0].replace(/^https?:\/\/(www\.)?/i, '')}
                              </span>
                            </a>
                          ) : null}
                          {row.twitterHandle ? (
                            <span className="inline-block text-[11px] text-slate-400">
                              @{row.twitterHandle}
                            </span>
                          ) : null}
                        </div>
                      ) : row.contactInfoFetchedAt ? (
                        <span className="text-slate-400">None listed</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{row.connectedOnDate || '—'}</td>
                    <td className="px-5 py-4">
                      <a
                        href={row.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-brand-main hover:underline"
                      >
                        Profile
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          <span>
            {rows.length} shown · {total} total
            {selected.size ? ` · ${selected.size} selected` : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg px-2 py-1 ring-1 ring-slate-200 disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg px-2 py-1 ring-1 ring-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <CreateListDialog
        open={createOpen}
        busy={creating}
        onClose={() => setCreateOpen(false)}
        onCreate={createList}
      />
    </div>
  );
}
