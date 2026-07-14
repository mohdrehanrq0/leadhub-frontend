'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { IconArrowLeft, IconEye, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../../../../lib/api';
import { leadName, LeadList, LeadRow, priorityTone, stageMeta } from '../../../../../components/leads/types';

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function LeadListDetailPage() {
  const { id } = useParams() as { id: string };
  const [list, setList] = useState<LeadList | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      setLoading(true);
      const [listsRes, leadsRes] = await Promise.all([
        api.get('/api/lists'),
        api.get(`/api/lists/${id}/leads?limit=100`),
      ]);
      setList((listsRes.data.data ?? []).find((item: LeadList) => item.id === id) ?? null);
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

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Lead List</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{list?.name ?? 'List'}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{list?.description || `${leads.length} leads in this list.`}</p>
      </section>

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
