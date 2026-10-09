'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconListDetails, IconPlus, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../../../lib/api';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { EnrichmentAgentPicker } from '../../../../components/leads/EnrichmentAgentPicker';
import { LeadList } from '../../../../components/leads/types';

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

type AutoEnrichMode = 'inherit' | 'always' | 'never';

function autoEnrichToApi(mode: AutoEnrichMode): boolean | null {
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return null;
}

function autoEnrichLabel(value: boolean | null | undefined): string {
  if (value === true) return 'Always enrich';
  if (value === false) return 'Never auto-enrich';
  return 'Inherit workspace';
}

export default function LeadListsPage() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [outreachMotive, setOutreachMotive] = useState('');
  const [defaultEnrichmentAgentId, setDefaultEnrichmentAgentId] = useState('');
  const [autoEnrichMode, setAutoEnrichMode] = useState<AutoEnrichMode>('inherit');
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
      await api.post('/api/lists', {
        name: name.trim(),
        description: description.trim() || undefined,
        outreachMotive: outreachMotive.trim() || null,
        defaultEnrichmentAgentId: defaultEnrichmentAgentId || null,
        autoEnrichOnCapture: autoEnrichToApi(autoEnrichMode),
      });
      toast.success(`List "${name.trim()}" created.`);
      setName('');
      setDescription('');
      setOutreachMotive('');
      setDefaultEnrichmentAgentId('');
      setAutoEnrichMode('inherit');
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

      <PageHeader
        eyebrow="Lists"
        title="Lead lists"
        description="Create named segments with a targeting motive, default enrichment agent, and auto-enrich on capture."
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={createList} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900"><IconPlus size={17} /> New list</h2>
          <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-300 focus:bg-white" placeholder="Dot commenters" />
          <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Description</label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-300 focus:bg-white" placeholder="Who belongs here" />
          <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Outreach motive</label>
          <textarea
            value={outreachMotive}
            onChange={(event) => setOutreachMotive(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
            placeholder="Asked for the tool in comments on Divyanshi’s post"
          />
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            Why people in this list are targeted — used to personalize outreach.
          </p>
          <div className="mt-4">
            <EnrichmentAgentPicker
              value={defaultEnrichmentAgentId}
              onChange={setDefaultEnrichmentAgentId}
              showDescription
            />
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Optional. Captures into this list use this agent when none is picked.
            </p>
          </div>
          <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
            Auto-enrich on capture
          </label>
          <select
            value={autoEnrichMode}
            onChange={(e) => setAutoEnrichMode(e.target.value as AutoEnrichMode)}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
          >
            <option value="inherit">Inherit workspace</option>
            <option value="always">Always</option>
            <option value="never">Never</option>
          </select>
          <button className="mt-4 h-11 w-full rounded-xl bg-brand-main text-sm font-semibold text-white hover:bg-brand-main/80">Create list</button>
        </form>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {list.outreachMotive || list.description || 'No motive'} · {list.leadCount ?? 0} leads ·{' '}
                      {autoEnrichLabel(list.autoEnrichOnCapture)}
                    </p>
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
