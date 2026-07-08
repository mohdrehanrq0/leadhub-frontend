'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconListDetails, IconPlus, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../../../lib/api';
import { LeadList } from '../../../../components/leads/types';

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function LeadListsPage() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  async function fetchLists() {
    try {
      setLoading(true);
      const res = await api.get('/api/lists');
      setLists(res.data.data ?? []);
    } catch {
      toast.error('Failed to load lists.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLists();
  }, []);

  const createList = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/api/lists', { name: name.trim(), description: description.trim() || undefined });
      toast.success('List created.');
      setName('');
      setDescription('');
      await fetchLists();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create list.'));
    }
  };

  const deleteList = async (id: string) => {
    if (!window.confirm('Delete this list? Leads will remain in the CRM.')) return;
    try {
      await api.delete(`/api/lists/${id}`);
      toast.success('List deleted.');
      await fetchLists();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete list.'));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/dashboard/leads" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
        <IconArrowLeft size={14} /> Back to Leads
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#e0f2fe,transparent_28%),linear-gradient(135deg,#fff,#f8fafc)] p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">List Manager</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Organize lead segments and working lists.</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Create named lead lists for campaigns, territories, events, target accounts, and sales queues.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={createList} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-950"><IconPlus size={17} /> New list</h2>
          <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-300 focus:bg-white" placeholder="Q3 enterprise accounts" />
          <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Description</label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-300 focus:bg-white" placeholder="Who belongs here and why" />
          <button className="mt-4 h-11 w-full rounded-xl bg-blue-600 text-sm font-black text-white">Create list</button>
        </form>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-black text-slate-950">Lists</h2>
          </div>
          {loading ? (
            <div className="p-6"><div className="h-24 skeleton" /></div>
          ) : lists.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No lists yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {lists.map((list) => (
                <div key={list.id} className="flex items-center justify-between gap-4 p-4">
                  <Link href={`/dashboard/leads/lists/${list.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <IconListDetails size={16} className="text-blue-600" />
                      <p className="truncate text-sm font-black text-slate-950">{list.name}</p>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{list.description || 'No description'} · {list.leadCount ?? 0} leads</p>
                  </Link>
                  <button onClick={() => deleteList(list.id)} className="rounded-lg border border-rose-100 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100">
                    <IconTrash size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
