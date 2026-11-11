'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconFolder,
  IconPlus,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { CreateListDialog } from '@/components/prospects/CreateListDialog';
import {
  errorMessage,
  filterLists,
  formatListDate,
  type ListFilter,
} from '@/components/prospects/utils';
import type { LeadList } from '@/components/leads/types';

export default function ProspectListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState<ListFilter>('all');
  const [query, setQuery] = useState('');

  async function fetchLists() {
    try {
      setLoading(true);
      const res = await api.get('/api/lists');
      setLists(res.data.data ?? []);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load prospect lists.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchLists();
  }, []);

  const filtered = useMemo(() => filterLists(lists, filter, query), [lists, filter, query]);

  const counts = useMemo(() => {
    const withProspects = lists.filter((list) => (list.leadCount ?? 0) > 0).length;
    const empty = lists.length - withProspects;
    return {
      all: lists.length,
      with_prospects: withProspects,
      empty,
    };
  }, [lists]);

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
      if (created?.id) router.push(`/dashboard/prospect-lists/${created.id}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create list.'));
    } finally {
      setCreating(false);
    }
  };

  const deleteList = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? Prospects stay in LeadHub; only the list is removed.`)) return;
    try {
      await api.delete(`/api/lists/${id}`);
      toast.success('List deleted.');
      setLists((prev) => prev.filter((list) => list.id !== id));
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete list.'));
    }
  };

  const tabs: Array<{ id: ListFilter; label: string; count: number }> = [
    { id: 'all', label: 'All lists', count: counts.all },
    { id: 'with_prospects', label: 'With prospects', count: counts.with_prospects },
    { id: 'empty', label: 'Empty lists', count: counts.empty },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="Prospects"
        title="Prospect lists"
        description="Organize captured LinkedIn people into named lists before outreach."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-main px-4 text-sm font-semibold text-white hover:bg-brand-main/90"
          >
            <IconPlus size={16} />
            Create
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              filter === tab.id
                ? 'bg-brand-main text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search list names"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-300"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6">
            <div className="h-28 skeleton" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-semibold text-slate-900">
              {lists.length === 0 ? 'No prospect lists yet' : 'No lists match this filter'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {lists.length === 0
                ? 'Create a list, then save LinkedIn people into it from the extension.'
                : 'Try another filter or clear the search.'}
            </p>
            {lists.length === 0 ? (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-main px-4 text-sm font-semibold text-white"
              >
                <IconPlus size={16} />
                Create list
              </button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">List</th>
                  <th className="px-5 py-3.5">Prospects</th>
                  <th className="px-5 py-3.5">Motive</th>
                  <th className="px-5 py-3.5">Created</th>
                  <th className="px-5 py-3.5 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((list) => (
                  <tr key={list.id} className="group hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/prospect-lists/${list.id}`}
                        className="flex min-w-0 items-center gap-3"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand-main">
                          <IconFolder size={17} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-950 group-hover:text-brand-main">
                            {list.name}
                          </span>
                          {list.description ? (
                            <span className="mt-0.5 block truncate text-xs text-slate-500">{list.description}</span>
                          ) : null}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">{list.leadCount ?? 0}</td>
                    <td className="px-5 py-4">
                      {list.outreachMotive ? (
                        <span className="inline-flex max-w-[220px] truncate rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                          {list.outreachMotive}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{formatListDate(list.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void deleteList(list.id, list.name)}
                        className="rounded-lg border border-transparent p-2 text-slate-400 opacity-0 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                        aria-label={`Delete ${list.name}`}
                      >
                        <IconTrash size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
          <span>
            {filtered.length} list{filtered.length === 1 ? '' : 's'}
            {query || filter !== 'all' ? ` shown · ${lists.length} total` : ''}
          </span>
          <span>A prospect can be in several lists.</span>
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
