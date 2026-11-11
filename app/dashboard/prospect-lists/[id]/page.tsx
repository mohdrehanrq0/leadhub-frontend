'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconFilter,
  IconPencil,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { LeadList, LeadRow } from '@/components/leads/types';
import { ProspectDrawer } from '@/components/prospects/ProspectDrawer';
import { ProspectMembersTable } from '@/components/prospects/ProspectMembersTable';
import {
  countProspectFilters,
  errorMessage,
  filterProspects,
  listSourcePosts,
  type ProspectExtraFilter,
  type ProspectFilter,
} from '@/components/prospects/utils';

const PAGE_SIZE = 200;

export default function ProspectListDetailPage() {
  const { id } = useParams() as { id: string };
  const [list, setList] = useState<LeadList | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [outreachMotive, setOutreachMotive] = useState('');
  const [filter, setFilter] = useState<ProspectFilter>('all');
  const [extraFilter, setExtraFilter] = useState<ProspectExtraFilter>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [sourcePostKey, setSourcePostKey] = useState<string | null>(null);

  const fetchAllMembers = useCallback(async () => {
    // Promote comment captures that were saved into this list but never became leads.
    try {
      await api.post(`/api/lists/${id}/sync-captures`);
    } catch {
      /* older servers / empty pending set — ignore */
    }

    const [listsRes, firstRes] = await Promise.all([
      api.get('/api/lists'),
      api.get(`/api/lists/${id}/leads?limit=${PAGE_SIZE}&offset=0`),
    ]);
    const found = ((listsRes.data.data ?? []) as LeadList[]).find((item) => item.id === id) ?? null;
    setList(found);
    if (found) {
      setName(found.name ?? '');
      setDescription(found.description ?? '');
      setOutreachMotive(found.outreachMotive ?? '');
    }

    const meta = firstRes.data.meta as { total?: number } | undefined;
    const totalCount = Number(meta?.total ?? firstRes.data.data?.length ?? 0);
    setTotal(totalCount);

    let page = (firstRes.data.data ?? []) as LeadRow[];
    let offset = page.length;
    while (offset < totalCount) {
      const next = await api.get(`/api/lists/${id}/leads?limit=${PAGE_SIZE}&offset=${offset}`);
      const chunk = (next.data.data ?? []) as LeadRow[];
      if (!chunk.length) break;
      page = page.concat(chunk);
      offset += chunk.length;
    }
    setLeads(page);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        await fetchAllMembers();
      } catch (err) {
        if (!cancelled) toast.error(errorMessage(err, 'Failed to load list.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchAllMembers]);

  const sourcePosts = useMemo(() => listSourcePosts(leads), [leads]);
  const activeSource = useMemo(() => {
    if (!sourcePostKey) return null;
    const exact = sourcePosts.find((post) => post.key === sourcePostKey);
    if (exact) return exact;
    // Older sessions keyed chips by raw URL — map onto the deduped identity.
    return (
      sourcePosts.find(
        (post) =>
          post.url === sourcePostKey ||
          post.matchIds.some((id) => id === sourcePostKey || id.endsWith(sourcePostKey)),
      ) ?? null
    );
  }, [sourcePosts, sourcePostKey]);

  const filtered = useMemo(
    () =>
      filterProspects(leads, filter, query, extraFilter, {
        postAuthor: activeSource?.author ?? null,
        postUrl: activeSource?.url || null,
        postSnippet: activeSource?.snippet ?? null,
        postMatchIds: activeSource?.matchIds ?? null,
      }),
    [leads, filter, query, extraFilter, activeSource],
  );
  const selected = useMemo(
    () => leads.find((lead) => lead.id === selectedId) ?? null,
    [leads, selectedId],
  );
  const counts = useMemo(() => countProspectFilters(leads), [leads]);

  const saveSettings = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.patch(`/api/lists/${id}`, {
        name: name.trim(),
        description: description.trim() || null,
        outreachMotive: outreachMotive.trim() || null,
      });
      setList(res.data.data ?? { ...list, name: name.trim() });
      setRenaming(false);
      toast.success('List updated.');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save list.'));
    } finally {
      setSaving(false);
    }
  };

  const removeProspects = async (leadIds: string[]) => {
    if (!leadIds.length) return;
    try {
      await api.delete(`/api/lists/${id}/leads`, { data: { leadIds } });
      setLeads((prev) => prev.filter((lead) => !leadIds.includes(lead.id)));
      setTotal((prev) => Math.max(0, prev - leadIds.length));
      setChecked((prev) => {
        const next = new Set(prev);
        leadIds.forEach((leadId) => next.delete(leadId));
        return next;
      });
      if (selectedId && leadIds.includes(selectedId)) setSelectedId(null);
      setList((prev) =>
        prev
          ? { ...prev, leadCount: Math.max(0, (prev.leadCount ?? leadIds.length) - leadIds.length) }
          : prev,
      );
      toast.success(
        leadIds.length === 1 ? 'Removed from list.' : `Removed ${leadIds.length} prospects.`,
      );
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to remove prospect.'));
    }
  };

  const tabs: Array<{ id: ProspectFilter; label: string; count: number }> = [
    { id: 'all', label: 'All prospects', count: counts.all },
    { id: 'from_comments', label: 'From comments', count: counts.from_comments },
    { id: 'with_linkedin', label: 'With LinkedIn', count: counts.with_linkedin },
    { id: 'missing_email', label: 'Missing email', count: counts.missing_email },
    { id: 'missing_company', label: 'Missing company', count: counts.missing_company },
  ];

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-4">
      <Link
        href="/dashboard/prospect-lists"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
      >
        <IconArrowLeft size={14} /> Back to lists
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full border-0 bg-transparent p-0 text-2xl font-bold tracking-tight text-text-100 outline-none"
                placeholder="List name"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder="Description"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white"
              />
              <textarea
                value={outreachMotive}
                onChange={(event) => setOutreachMotive(event.target.value)}
                rows={2}
                placeholder="Outreach motive"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving || !name.trim()}
                  onClick={() => void saveSettings()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-main px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <IconDeviceFloppy size={15} />
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRenaming(false);
                    setName(list?.name ?? '');
                    setDescription(list?.description ?? '');
                    setOutreachMotive(list?.outreachMotive ?? '');
                  }}
                  className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  {loading ? '…' : list?.name || 'List'}
                </h1>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                  {(total || counts.all).toLocaleString()}
                </span>
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Rename list"
                >
                  <IconPencil size={15} />
                </button>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {list?.outreachMotive || list?.description || 'Prospects imported into this list.'}
              </p>
            </div>
          )}
        </div>

        {checked.size > 0 ? (
          <button
            type="button"
            onClick={() => void removeProspects([...checked])}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
          >
            <IconTrash size={14} />
            Remove {checked.size}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              filter === tab.id
                ? 'border-brand-main text-brand-main'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
            <span className="ml-1 tabular-nums text-slate-400">({tab.count})</span>
          </button>
        ))}
      </div>

      {sourcePosts.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            From post
          </span>
          <button
            type="button"
            onClick={() => {
              setSourcePostKey(null);
              setFilter('from_comments');
            }}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              !sourcePostKey && filter === 'from_comments'
                ? 'bg-brand-main text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            All comments ({counts.from_comments})
          </button>
          {sourcePosts.map((post) => (
            <button
              key={post.key}
              type="button"
              title={`${post.author} — ${post.snippet}`}
              onClick={() => {
                setSourcePostKey(post.key);
                setFilter('from_comments');
              }}
              className={`max-w-[280px] truncate rounded-full px-2.5 py-1 text-xs font-semibold ${
                sourcePostKey === post.key
                  ? 'bg-brand-main text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {post.author}
              <span className="opacity-70"> · {post.snippet || 'post'}</span>
              <span className="opacity-70"> ({post.count})</span>
            </button>
          ))}
          {sourcePostKey ? (
            <button
              type="button"
              onClick={() => setSourcePostKey(null)}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
            >
              Clear post <IconX size={11} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <IconSearch
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people, comments, post authors, or roles"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-300"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterMenuOpen((open) => !open)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium ${
              extraFilter
                ? 'border-blue-200 bg-blue-50 text-brand-main'
                : 'border-dashed border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <IconFilter size={14} />
            {extraFilter === 'missing_title' ? 'Missing title' : 'Add filter'}
          </button>
          {filterMenuOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setExtraFilter('missing_title');
                  setFilterMenuOpen(false);
                }}
              >
                Missing title
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setFilter('missing_linkedin');
                  setFilterMenuOpen(false);
                }}
              >
                Missing LinkedIn
              </button>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setFilter('with_email');
                  setFilterMenuOpen(false);
                }}
              >
                Has email
              </button>
              {extraFilter || filter !== 'all' ? (
                <button
                  type="button"
                  className="block w-full border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
                  onClick={() => {
                    setExtraFilter(null);
                    setFilter('all');
                    setFilterMenuOpen(false);
                  }}
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {extraFilter ? (
          <button
            type="button"
            onClick={() => setExtraFilter(null)}
            className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-100 px-2.5 text-xs font-semibold text-slate-600"
          >
            Missing title <IconX size={12} />
          </button>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-2 p-4">
            <div className="h-9 skeleton rounded-md" />
            <div className="h-10 skeleton rounded-md" />
            <div className="h-10 skeleton rounded-md" />
            <div className="h-10 skeleton rounded-md" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-slate-900">
              {leads.length === 0 ? 'No prospects in this list yet' : 'No prospects match this filter'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {leads.length === 0
                ? 'Import people with Get prospects on LinkedIn — they will appear here.'
                : 'Try another tab, clear search, or clear filters.'}
            </p>
          </div>
        ) : (
          <ProspectMembersTable
            listId={id}
            leads={filtered}
            checked={checked}
            selectedId={selectedId}
            onToggleAll={(on) => {
              setChecked(on ? new Set(filtered.map((lead) => lead.id)) : new Set());
            }}
            onToggleOne={(leadId, on) => {
              setChecked((prev) => {
                const next = new Set(prev);
                if (on) next.add(leadId);
                else next.delete(leadId);
                return next;
              });
            }}
            onSelect={setSelectedId}
            onRemove={(ids) => void removeProspects(ids)}
          />
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          <span className="tabular-nums">
            {filtered.length.toLocaleString()} prospect{filtered.length === 1 ? '' : 's'}
            {filtered.length !== leads.length
              ? ` shown · ${leads.length.toLocaleString()} in list`
              : ''}
          </span>
          <span>Newest first</span>
        </div>
      </section>

      <ProspectDrawer
        open={Boolean(selected)}
        lead={selected}
        list={list}
        onClose={() => setSelectedId(null)}
        onUpdated={(updated) => {
          setLeads((prev) =>
            prev.map((lead) => (lead.id === updated.id ? { ...lead, ...updated } : lead)),
          );
        }}
        fullPageHref={
          selected ? `/dashboard/prospect-lists/${id}/prospects/${selected.id}` : undefined
        }
      />
    </div>
  );
}
