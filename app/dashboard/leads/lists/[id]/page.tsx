'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { IconArrowLeft, IconDeviceFloppy, IconEye, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../../../../lib/api';
import { EnrichmentAgentPicker } from '../../../../../components/leads/EnrichmentAgentPicker';
import { leadName, LeadList, LeadRow, priorityTone, stageMeta } from '../../../../../components/leads/types';

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

type AutoEnrichMode = 'inherit' | 'always' | 'never';

function fromApiAutoEnrich(value: boolean | null | undefined): AutoEnrichMode {
  if (value === true) return 'always';
  if (value === false) return 'never';
  return 'inherit';
}

function toApiAutoEnrich(mode: AutoEnrichMode): boolean | null {
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return null;
}

export default function LeadListDetailPage() {
  const { id } = useParams() as { id: string };
  const [list, setList] = useState<LeadList | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [outreachMotive, setOutreachMotive] = useState('');
  const [defaultEnrichmentAgentId, setDefaultEnrichmentAgentId] = useState('');
  const [autoEnrichMode, setAutoEnrichMode] = useState<AutoEnrichMode>('inherit');

  async function fetchData() {
    try {
      setLoading(true);
      const [listsRes, leadsRes] = await Promise.all([
        api.get('/api/lists'),
        api.get(`/api/lists/${id}/leads?limit=100`),
      ]);
      const found = (listsRes.data.data ?? []).find((item: LeadList) => item.id === id) ?? null;
      setList(found);
      if (found) {
        setName(found.name ?? '');
        setDescription(found.description ?? '');
        setOutreachMotive(found.outreachMotive ?? '');
        setDefaultEnrichmentAgentId(found.defaultEnrichmentAgentId ?? '');
        setAutoEnrichMode(fromApiAutoEnrich(found.autoEnrichOnCapture));
      }
      setLeads(leadsRes.data.data ?? []);
    } catch {
      toast.error('Failed to load list.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.patch(`/api/lists/${id}`, {
        name: name.trim(),
        description: description.trim() || null,
        outreachMotive: outreachMotive.trim() || null,
        defaultEnrichmentAgentId: defaultEnrichmentAgentId || null,
        autoEnrichOnCapture: toApiAutoEnrich(autoEnrichMode),
      });
      setList(res.data.data ?? { ...list, name: name.trim() });
      toast.success('List settings saved.');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save list.'));
    } finally {
      setSaving(false);
    }
  };

  const removeLead = async (leadId: string) => {
    try {
      await api.delete(`/api/lists/${id}/leads`, { data: { leadIds: [leadId] } });
      toast.success('Lead removed from list.');
      await fetchData();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to remove lead.'));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/dashboard/leads/lists" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
        <IconArrowLeft size={14} /> Back to Lists
      </Link>

      <form onSubmit={saveSettings} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-main">Lead list</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full border-0 bg-transparent p-0 text-3xl font-bold tracking-tight text-text-100 outline-none focus:ring-0"
          placeholder="List name"
        />
        <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
          placeholder="Who belongs here"
        />
        <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Outreach motive</label>
        <textarea
          value={outreachMotive}
          onChange={(e) => setOutreachMotive(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
          placeholder="Why these people are being targeted"
        />
        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          Fed into outreach so messages reference this targeting angle plus each capture’s source context.
        </p>
        <div className="mt-4 max-w-xl">
          <EnrichmentAgentPicker
            value={defaultEnrichmentAgentId}
            onChange={setDefaultEnrichmentAgentId}
            showDescription
          />
        </div>
        <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          Auto-enrich on capture
        </label>
        <select
          value={autoEnrichMode}
          onChange={(e) => setAutoEnrichMode(e.target.value as AutoEnrichMode)}
          className="mt-2 h-11 max-w-md rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
        >
          <option value="inherit">Inherit workspace</option>
          <option value="always">Always</option>
          <option value="never">Never</option>
        </select>
        <button
          type="submit"
          disabled={saving || loading}
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-main px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          <IconDeviceFloppy size={16} />
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6"><div className="h-24 skeleton" /></div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No leads in this list yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="p-4">Lead</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Stage</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4">Score</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <p className="font-black text-slate-950">{leadName(lead)}</p>
                      <p className="text-slate-500">{lead.contact?.email || lead.contact?.role || 'No contact detail'}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{lead.company?.name || 'Unknown'}</p>
                      <p className="text-slate-500">{lead.company?.domain}</p>
                    </td>
                    <td className="p-4"><span className={`rounded-full border px-2 py-1 font-bold ${stageMeta(lead.pipelineStage).tone}`}>{stageMeta(lead.pipelineStage).label}</span></td>
                    <td className="p-4"><span className={`rounded-full border px-2 py-1 font-bold capitalize ${priorityTone(lead.priority)}`}>{lead.priority}</span></td>
                    <td className="p-4 font-black text-slate-800">{lead.icpScore ?? 0}%</td>
                    <td className="p-4 text-right">
                      <div className="inline-flex gap-2">
                        <Link href={`/dashboard/leads/${lead.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50"><IconEye size={13} /></Link>
                        <button onClick={() => removeLead(lead.id)} className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-rose-600 hover:bg-rose-100"><IconTrash size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
