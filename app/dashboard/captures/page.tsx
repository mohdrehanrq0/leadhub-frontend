'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { LinkedInLink } from '@/components/leads/LinkedInLink';
import { ImportDestinationFields } from '@/components/leads/ImportDestinationFields';
import { EnrichmentAgentPicker } from '@/components/leads/EnrichmentAgentPicker';
import { ListEnrichmentHint } from '@/components/leads/ListEnrichmentHint';
import type { LeadCategory, LeadList } from '@/components/leads/types';
import {
  CAPTURE_KIND_LABEL,
  CAPTURE_STATUS_STYLE,
  captureKind,
  commentSnippet,
  formatCapturedAt,
  isEnrichmentPending,
  isFromPostComment,
  RESOLUTION_STYLE,
  sourcePostInfo,
  type CaptureListRow,
  type CaptureType,
} from '@/lib/captures';
import {
  IconArrowRight,
  IconBookmark,
  IconBuilding,
  IconExternalLink,
  IconMessage2,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconUser,
  IconX,
} from '@tabler/icons-react';

type CapturesTab = 'all' | CaptureType | 'comments';

const TABS: Array<{ id: CapturesTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'profile', label: 'Profiles' },
  { id: 'comments', label: 'From comments' },
  { id: 'post', label: 'Posts' },
];

/** Columns that only apply on certain tabs — Type hidden when already filtered by kind. */
function tableColumns(tab: CapturesTab) {
  return {
    showType: tab === 'all',
    showComment: tab === 'all' || tab === 'comments',
    showSource: tab === 'all' || tab === 'comments',
    showPost: tab === 'all' || tab === 'post',
  };
}

const POLL_INTERVAL_MS = 5000;

/** Filter value: all lists, only unlisted, or a specific list id. */
type ListFilter = '' | 'none' | string;

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function CapturesPage() {
  const [rows, setRows] = useState<CaptureListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<CapturesTab>('all');
  const cols = tableColumns(tab);
  const [listFilter, setListFilter] = useState<ListFilter>('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [crmOpen, setCrmOpen] = useState(false);
  const [crmIds, setCrmIds] = useState<string[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [listId, setListId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [enrichmentAgentId, setEnrichmentAgentId] = useState('');
  const [workspaceDefaultAgentId, setWorkspaceDefaultAgentId] = useState('');
  const [startEnrichment, setStartEnrichment] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [day, setDay] = useState<'all' | 'today' | 'yesterday'>('all');
  const [daily, setDaily] = useState({
    profiles: 0,
    comments: 0,
    posts: 0,
    sequences: 0,
    sent: 0,
    queued: 0,
  });

  function resolveListDefaultAgent(targetListId: string | null | undefined): string | null {
    if (!targetListId) return null;
    const list = lists.find((l) => l.id === targetListId);
    return list?.defaultEnrichmentAgentId ?? null;
  }

  function applyListAgentPreference(nextListId: string) {
    setListId(nextListId);
    const listAgent = resolveListDefaultAgent(nextListId);
    if (listAgent) {
      setEnrichmentAgentId(listAgent);
    } else if (workspaceDefaultAgentId) {
      setEnrichmentAgentId(workspaceDefaultAgentId);
    }
  }

  /** Prefer list defaults (destination → filter → capture list), else picker / workspace. */
  function resolveEnrichAgentForCaptures(captureIds: string[], destinationListId?: string | null) {
    const fromDest = resolveListDefaultAgent(destinationListId);
    if (fromDest) return fromDest;
    const fromFilter = resolveListDefaultAgent(listFilter || null);
    if (fromFilter) return fromFilter;
    for (const id of captureIds) {
      const row = rows.find((r) => r.id === id);
      const fromCapture = resolveListDefaultAgent(row?.listId);
      if (fromCapture) return fromCapture;
    }
    return enrichmentAgentId || workspaceDefaultAgentId || null;
  }

  const loadLists = useCallback(async () => {
    try {
      const [listsRes, catsRes] = await Promise.all([
        api.get('/api/lists'),
        api.get('/api/categories'),
      ]);
      setLists(listsRes.data?.data ?? listsRes.data ?? []);
      setCategories(catsRes.data?.data ?? catsRes.data ?? []);
    } catch {
      /* destination fields degrade gracefully */
    }
  }, []);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const [res, summaryRes] = await Promise.all([
          api.get('/api/captures', {
            params: {
              type: tab === 'all' || tab === 'comments' ? undefined : tab,
              fromComments: tab === 'comments' ? true : undefined,
              listId: listFilter || undefined,
              q: debouncedQuery || undefined,
              day: day === 'all' ? undefined : day,
              pageSize: 50,
            },
          }),
          api.get('/api/captures/daily-summary', { params: { day } }).catch(() => null),
        ]);
        setRows(res.data?.data ?? []);
        setTotal(res.data?.total ?? 0);
        const summary = summaryRes?.data?.data;
        if (summary) {
          setDaily({
            profiles: summary.profiles ?? 0,
            comments: summary.comments ?? 0,
            posts: summary.posts ?? 0,
            sequences: summary.sequences ?? 0,
            sent: summary.sent ?? 0,
            queued: summary.queued ?? 0,
          });
        }
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
    [tab, listFilter, debouncedQuery, day],
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

  useEffect(() => {
    if (!rows.some(isEnrichmentPending)) return;
    const timer = setInterval(() => void load({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [rows, load]);

  useEffect(() => {
    void (async () => {
      try {
        await loadLists();
        const agentsRes = await api.get('/api/enrichment-agents').catch(() => null);
        const agents = (agentsRes?.data?.data ?? agentsRes?.data ?? []) as Array<{
          id: string;
          isDefault?: boolean;
        }>;
        const defaultAgent = agents.find((a) => a.isDefault) ?? agents[0];
        if (defaultAgent?.id) {
          setWorkspaceDefaultAgentId(defaultAgent.id);
          setEnrichmentAgentId(defaultAgent.id);
        }
      } catch {
        /* destination fields degrade gracefully */
      }
    })();
  }, [loadLists]);

  // Keep Captures list filter in sync with lists created in the extension.
  useEffect(() => {
    const onFocus = () => void loadLists();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadLists]);

  async function createListFromCaptures(event?: FormEvent) {
    event?.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    setCreatingList(true);
    try {
      const res = await api.post('/api/lists', { name });
      const created = res.data.data as LeadList;
      setLists((prev) => (prev.some((l) => l.id === created.id) ? prev : [created, ...prev]));
      setListFilter(created.id);
      setNewListName('');
      setShowCreateList(false);
      toast.success(
        `List "${created.name}" created. Set motive, agent, and auto-enrich on Lists if needed.`,
      );
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(message ?? 'Failed to create list.');
    } finally {
      setCreatingList(false);
    }
  }

  const stats = useMemo(
    () => ({
      ready: rows.filter((row) => !row.leadId && row.error !== 'author_unresolved').length,
      enriching: rows.filter((row) => row.status === 'enriching').length,
      inCrm: rows.filter((row) => row.leadId).length,
      withList: rows.filter((row) => row.listId).length,
      noList: rows.filter((row) => !row.listId).length,
    }),
    [rows],
  );

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((r) => r.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function enrich(id: string) {
    setBusyId(id);
    try {
      await api.post(`/api/captures/${id}/enrich`);
      toast.success('Target person linked and enrichment started.');
      await load({ silent: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(message ?? 'Could not start enrichment.');
    } finally {
      setBusyId(null);
    }
  }

  async function enrichBulk(ids: string[]) {
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const res = await api.post('/api/captures/enrich-bulk', {
        captureIds: ids,
        enrich: true,
        enrichmentAgentId: resolveEnrichAgentForCaptures(ids),
      });
      const results = (res.data?.data?.results ?? []) as Array<{ error?: string }>;
      const failed = results.filter((r) => r.error).length;
      toast.success(
        failed
          ? `Enrichment started for ${ids.length - failed}; ${failed} failed.`
          : `Enrichment started for ${ids.length} capture${ids.length > 1 ? 's' : ''}.`,
      );
      setSelected(new Set());
      await load({ silent: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(message ?? 'Bulk enrich failed.');
    } finally {
      setBulkBusy(false);
    }
  }

  function openCrm(ids: string[]) {
    if (!ids.length) return;
    void loadLists();
    setCrmIds(ids);
    setStartEnrichment(false);
    // Prefer destination list / first capture list default agent when opening CRM.
    const first = rows.find((r) => r.id === ids[0]);
    const preferred =
      resolveListDefaultAgent(listId || null) ||
      resolveListDefaultAgent(first?.listId) ||
      workspaceDefaultAgentId;
    if (preferred) setEnrichmentAgentId(preferred);
    setCrmOpen(true);
  }

  async function submitCrm() {
    if (!crmIds.length) return;
    setBulkBusy(true);
    try {
      const body = {
        captureIds: crmIds,
        enrich: startEnrichment,
        listId: listId || null,
        categoryId: categoryId || null,
        tags: parseTags(tags),
        enrichmentAgentId: startEnrichment
          ? enrichmentAgentId ||
            resolveEnrichAgentForCaptures(crmIds, listId || null)
          : null,
      };
      const res = await api.post('/api/captures/enrich-bulk', body);
      const results = (res.data?.data?.results ?? []) as Array<{
        error?: string;
        skippedEnrichment?: boolean;
      }>;
      const failed = results.filter((r) => r.error).length;
      const enriched = results.filter((r) => !r.error && !r.skippedEnrichment && startEnrichment).length;
      toast.success(
        failed
          ? `Added ${crmIds.length - failed} to CRM; ${failed} failed.`
          : startEnrichment
            ? enriched
              ? `Added ${crmIds.length} to CRM and enrichment started.`
              : `Added to CRM (already enriched — skipped re-enrichment).`
            : `Added ${crmIds.length} to CRM. Enrichment was not started.`,
      );
      setCrmOpen(false);
      setSelected(new Set());
      setCrmIds([]);
      await load({ silent: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      toast.error(message ?? 'Could not add to CRM.');
    } finally {
      setBulkBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this capture? Any lead it already created stays in your CRM.')) return;
    try {
      await api.delete(`/api/captures/${id}`);
      setRows((prev) => prev.filter((row) => row.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success('Capture deleted.');
    } catch {
      toast.error('Failed to delete capture.');
    }
  }

  const selectedIds = Array.from(selected);

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6 text-text">
      <PageHeader
        eyebrow="Lead capture"
        title="Captures"
        description="LinkedIn people saved as targets. Create or filter by list here — same lists as the extension (same workspace)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/leads/lists"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Manage lists
            </Link>
            <Link
              href="/dashboard/settings/extension"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Capture settings
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['today', 'Today'],
            ['yesterday', 'Yesterday'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setDay(id)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              day === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Profiles saved" value={daily.profiles} tone="slate" />
        <StatCard label="Comments saved" value={daily.comments} tone="blue" />
        <StatCard label="Posts saved" value={daily.posts} tone="slate" />
        <StatCard label="Sequences" value={daily.sequences} tone="blue" />
        <StatCard label="Messages sent" value={daily.sent} tone="emerald" />
        <StatCard label="Still queued" value={daily.queued} tone="amber" />
      </div>

      {rows.length > 0 || total > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard label="Captures" value={total} tone="slate" />
          <StatCard label="With list" value={stats.withList} tone="blue" />
          <StatCard label="No list" value={stats.noList} tone="amber" />
          <StatCard label="Enriching" value={stats.enriching} tone="amber" />
          <StatCard label="In CRM" value={stats.inCrm} tone="emerald" />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setSelected(new Set());
              }}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                tab === item.id ? 'bg-brand-main text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <div className="flex items-center gap-2">
            <select
              value={listFilter}
              onChange={(e) => {
                setListFilter(e.target.value as ListFilter);
                setSelected(new Set());
              }}
              className="h-10 min-w-[10rem] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-brand-main focus:outline-none"
            >
              <option value="">All lists</option>
              <option value="none">No list</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowCreateList((v) => !v)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-brand-main/40 hover:text-brand-main"
              title="Create a new list"
            >
              <IconPlus size={14} />
              New list
            </button>
          </div>
          <div className="relative w-full sm:w-72">
            <IconSearch
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, company, list or post"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-main focus:outline-none"
            />
          </div>
        </div>
      </div>

      {showCreateList ? (
        <form
          onSubmit={(e) => void createListFromCaptures(e)}
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              New list name
            </label>
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g. Dot commenters"
              autoFocus
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-brand-main focus:bg-white"
            />
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Same lists as the extension. Name only here — set motive, agent, and auto-enrich on{' '}
              <Link href="/dashboard/leads/lists" className="font-semibold text-brand-main hover:underline">
                Lists
              </Link>
              .
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateList(false);
                setNewListName('');
              }}
              className="h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingList || !newListName.trim()}
              className="h-10 rounded-lg bg-brand-main px-4 text-xs font-semibold text-white disabled:opacity-50"
            >
              {creatingList ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      ) : null}

      {listFilter && listFilter !== 'none' ? (
        <ListEnrichmentHint list={lists.find((l) => l.id === listFilter) ?? null} />
      ) : null}

      {rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <span className="text-xs text-slate-400">{selectedIds.length} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!selectedIds.length || bulkBusy}
              onClick={() => void enrichBulk(selectedIds)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-main/40 hover:text-brand-main disabled:opacity-50"
            >
              <IconSparkles size={13} />
              Enrich selected
            </button>
            <button
              type="button"
              disabled={!rows.length || bulkBusy}
              onClick={() => void enrichBulk(rows.map((r) => r.id))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-brand-main/40 hover:text-brand-main disabled:opacity-50"
            >
              Enrich all
            </button>
            <button
              type="button"
              disabled={!selectedIds.length || bulkBusy}
              onClick={() => openCrm(selectedIds)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-main px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-main/80 disabled:opacity-50"
            >
              Add to CRM
            </button>
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-10 skeleton" />
            <div className="h-10 skeleton" />
            <div className="h-10 skeleton" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <IconBookmark size={32} className="mx-auto text-slate-300" />
            <h2 className="mt-3 text-base font-semibold text-text-100">
              {listFilter || debouncedQuery || tab !== 'all'
                ? 'No captures match these filters'
                : 'No captures yet'}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-text-300">
              {listFilter || debouncedQuery || tab !== 'all'
                ? 'Try another list filter or clear search.'
                : 'Install the LeadHub extension, then press Save on any LinkedIn profile or post and pick a list.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="w-10 p-3">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="h-3.5 w-3.5 rounded border-slate-300"
                        aria-label="Select all captures"
                      />
                    </th>
                    <th className="p-3">Person</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">LinkedIn</th>
                    {cols.showType ? <th className="p-3">Type</th> : null}
                    {cols.showComment ? <th className="p-3">Comment</th> : null}
                    {cols.showSource ? <th className="p-3">Source post</th> : null}
                    {cols.showPost ? <th className="p-3">Post</th> : null}
                    <th className="p-3">List</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Captured</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <CaptureTableRow
                      key={row.id}
                      row={row}
                      cols={cols}
                      busy={busyId === row.id}
                      selected={selected.has(row.id)}
                      onToggle={() => toggleOne(row.id)}
                      onEnrich={() => void enrich(row.id)}
                      onAddToCrm={() => openCrm([row.id])}
                      onDelete={() => void remove(row.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-4 py-3 text-xs text-text-300">
              Showing {rows.length} of {total} captures
              {listFilter === 'none'
                ? ' · No list'
                : listFilter
                  ? ` · ${lists.find((l) => l.id === listFilter)?.name ?? 'List'}`
                  : ''}
            </p>
          </>
        )}
      </section>

      {crmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Add to LeadHub CRM</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {crmIds.length} target{crmIds.length > 1 ? 's' : ''}. Creates the lead only —
                  enrichment stays off unless you turn it on below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCrmOpen(false)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-slate-800"
              >
                <IconX size={15} />
              </button>
            </div>
            <ImportDestinationFields
              lists={lists}
              categories={categories}
              listId={listId}
              categoryId={categoryId}
              tags={tags}
              onListIdChange={applyListAgentPreference}
              onCategoryIdChange={setCategoryId}
              onTagsChange={setTags}
              onListCreated={(list) => setLists((prev) => [...prev, list])}
              onCategoryCreated={(cat) => setCategories((prev) => [...prev, cat])}
              compact
            />
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3">
              <input
                type="checkbox"
                checked={startEnrichment}
                onChange={(e) => setStartEnrichment(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Also start enrichment
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                  Scrapes LinkedIn/company details and runs your selected agent. Leave off to only
                  create the CRM lead.
                </span>
              </span>
            </label>
            {startEnrichment ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                <EnrichmentAgentPicker
                  value={enrichmentAgentId}
                  onChange={setEnrichmentAgentId}
                  showDescription
                />
              </div>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCrmOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => void submitCrm()}
                className="rounded-lg bg-brand-main px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {bulkBusy ? 'Adding…' : 'Add to CRM'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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

function CaptureTableRow({
  row,
  cols,
  busy,
  selected,
  onToggle,
  onEnrich,
  onAddToCrm,
  onDelete,
}: {
  row: CaptureListRow;
  cols: ReturnType<typeof tableColumns>;
  busy: boolean;
  selected: boolean;
  onToggle: () => void;
  onEnrich: () => void;
  onAddToCrm: () => void;
  onDelete: () => void;
}) {
  const status = CAPTURE_STATUS_STYLE[row.status];
  const resolution = row.companyResolution;
  const authorMissing = row.error === 'author_unresolved';
  const companyLabel = resolution?.name ?? row.companyName;
  const kind = captureKind(row);
  const fromComment = isFromPostComment(row);
  const comment = fromComment ? commentSnippet(row) : null;
  const source = fromComment ? sourcePostInfo(row) : null;
  const linkedInUrl =
    row.personProfileUrl ?? (row.type === 'post' && row.url ? row.url : null);

  return (
    <tr className={`hover:bg-slate-50 ${selected ? 'bg-brand-main/5' : ''}`}>
      <td className="p-3 align-middle">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-3.5 w-3.5 rounded border-slate-300"
          aria-label={`Select ${row.personName ?? 'capture'}`}
        />
      </td>

      <td className="p-3 align-middle">
        <div className="flex min-w-[11rem] max-w-[16rem] items-start gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
            {(row.personName ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <Link
              href={`/dashboard/captures/${row.id}`}
              className="block truncate font-bold text-slate-950 transition hover:text-brand-main"
            >
              {row.personName ?? 'Unknown person'}
            </Link>
            <p className="mt-0.5 line-clamp-2 text-slate-500">
              {row.positionTitle ?? row.headline ?? '—'}
            </p>
          </div>
        </div>
      </td>

      <td className="p-3 align-middle">
        {companyLabel ? (
          <div className="min-w-0 max-w-[12rem]">
            <p className="flex items-center gap-1.5 font-bold text-slate-800">
              <IconBuilding size={13} className="shrink-0 text-slate-400" />
              <span className="truncate">{companyLabel}</span>
            </p>
            {resolution ? (
              <span
                className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${RESOLUTION_STYLE[resolution.status].className}`}
              >
                {RESOLUTION_STYLE[resolution.status].label}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="text-slate-400">
            {authorMissing ? 'Author missing' : 'Not resolved'}
          </p>
        )}
      </td>

      <td className="p-3 align-middle">
        {linkedInUrl ? (
          <LinkedInLink
            url={linkedInUrl}
            compact
            label={row.personProfileUrl ? 'LinkedIn' : 'Post'}
          />
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>

      {cols.showType ? (
        <td className="p-3 align-middle">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-bold ${
              kind === 'comment'
                ? 'border-sky-200 bg-sky-50 text-sky-700'
                : kind === 'post'
                  ? 'border-violet-200 bg-violet-50 text-violet-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
            }`}
          >
            {kind === 'post' ? <IconMessage2 size={11} /> : <IconUser size={11} />}
            {CAPTURE_KIND_LABEL[kind]}
          </span>
        </td>
      ) : null}

      {cols.showComment ? (
        <td className="p-3 align-middle">
          {fromComment ? (
            <p className="line-clamp-3 max-w-[14rem] text-slate-700">
              {comment ?? 'From post comments'}
            </p>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
      ) : null}

      {cols.showSource ? (
        <td className="p-3 align-middle">
          {source && (source.author || source.url || source.authorUrl) ? (
            <div className="min-w-0 max-w-[14rem]">
              {source.author ? (
                source.authorUrl ? (
                  <a
                    href={source.authorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate font-semibold text-slate-800 hover:text-brand-main"
                  >
                    {source.author}
                  </a>
                ) : (
                  <p className="truncate font-semibold text-slate-800">{source.author}</p>
                )
              ) : (
                <p className="font-semibold text-slate-600">Source post</p>
              )}
              <p className="mt-0.5 text-[11px] text-slate-500">
                {source.author ? 'Post author' : 'LinkedIn post'}
              </p>
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-main hover:underline"
                >
                  Open post
                  <IconExternalLink size={10} />
                </a>
              ) : null}
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
      ) : null}

      {cols.showPost ? (
        <td className="p-3 align-middle">
          {row.type === 'post' && row.postText ? (
            <p className="line-clamp-3 max-w-[16rem] text-slate-700">{row.postText}</p>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
      ) : null}

      <td className="p-3 align-middle">
        {row.listName ? (
          <span className="inline-flex max-w-[160px] truncate rounded-full border border-blue-200 bg-blue-50 px-2 py-1 font-bold text-blue-700">
            {row.listName}
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-bold text-slate-500">
            No list
          </span>
        )}
      </td>

      <td className="p-3 align-middle">
        <span
          className={`inline-flex rounded-full border px-2 py-1 font-bold ${status.className}`}
          title={row.error ?? undefined}
        >
          {authorMissing ? 'Needs profile' : status.label}
        </span>
      </td>

      <td className="p-3 align-middle whitespace-nowrap text-slate-500">
        {formatCapturedAt(row.capturedAt)}
      </td>

      <td className="p-3 align-middle text-right">
        <div className="inline-flex items-center gap-1.5">
          {row.status !== 'enriching' && !authorMissing ? (
            <button
              type="button"
              onClick={onEnrich}
              disabled={busy}
              title="Enrich this target person"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-brand-main/40 hover:text-brand-main disabled:opacity-50"
            >
              <IconSparkles size={14} />
            </button>
          ) : null}
          {!authorMissing ? (
            <button
              type="button"
              onClick={onAddToCrm}
              disabled={busy}
              title="Add to LeadHub CRM"
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 transition hover:border-brand-main/40 hover:text-brand-main disabled:opacity-50"
            >
              CRM
            </button>
          ) : null}
          {row.leadId ? (
            <Link
              href={`/dashboard/leads/${row.leadId}`}
              title="Open lead in CRM"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-brand-main/40 hover:text-brand-main"
            >
              <IconArrowRight size={14} />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            title="Delete capture"
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-red-300 hover:text-red-600"
          >
            <IconTrash size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}
