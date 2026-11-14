'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IconBrandLinkedin,
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { requestLinkedInConnectionsSync } from '@/lib/linkedin-connections-sync';
import { CreateListDialog } from '@/components/prospects/CreateListDialog';
import { errorMessage } from '@/components/prospects/utils';
import type { LeadList } from '@/components/leads/types';

type ConnectionRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  headline: string | null;
  linkedinUrl: string;
  connectedOnDate: string | null;
  lastSeenAt: string;
};

type SyncStatus = {
  has_cursor: boolean;
  connectionCount: number;
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lists, setLists] = useState<LeadList[]>([]);
  const [listId, setListId] = useState('');
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
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
  }, [page, appliedQuery, appliedHeadline]);

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
  }, [fetchStatus, fetchLists]);

  useEffect(() => {
    void fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    const running = syncing || syncStatus?.last_sync?.status === 'running';
    if (!running) return;
    const timer = window.setInterval(() => {
      void fetchStatus();
      void fetchConnections();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [syncing, syncStatus?.last_sync?.status, fetchStatus, fetchConnections]);

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
              Auto-sync runs once when you first connect the extension, then at most every 7 days.
              Sync now / Full resync always work manually. Full resync walks your entire network in
              pages of 40 — keep LinkedIn signed in; large networks can take 10–25 minutes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={syncing}
              onClick={() => void kickSync({ forceFull: false })}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-main px-4 text-sm font-semibold text-white hover:bg-brand-main/90 disabled:opacity-60"
              title="Fetch only connections newer than the last sync cursor"
            >
              {syncing ? <IconLoader2 size={16} className="animate-spin" /> : <IconRefresh size={16} />}
              Sync now
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={() => void kickSync({ forceFull: true })}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
              title="Re-scan your entire LinkedIn network into LeadHub"
            >
              Full resync
            </button>
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
                  <th className="px-5 py-3.5">Headline</th>
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
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900">{row.fullName}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{row.headline || '—'}</td>
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
