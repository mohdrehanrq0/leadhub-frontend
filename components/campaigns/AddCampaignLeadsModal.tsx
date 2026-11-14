'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconCheck, IconSearch, IconUserPlus, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { LeadList, LeadRow } from '@/components/leads/types';
import { btnOutline, btnPrimary, inputClass } from '@/components/ui/styles';

type Mode = 'lists' | 'prospects';

type ProspectRow = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  listNames: string[];
};

function leadDisplayName(lead: LeadRow): string {
  const fromContact = [lead.contact?.firstName, lead.contact?.lastName].filter(Boolean).join(' ').trim();
  if (fromContact) return fromContact;
  const company = lead.company?.name?.trim();
  if (company) return company;
  return 'Unknown';
}

function leadTitle(lead: LeadRow): string | null {
  return lead.contact?.role ?? null;
}

type Props = {
  campaignId: string;
  onClose: () => void;
  onAdded: (result: { enrolled: number; skipped: number }) => void;
};

export function AddCampaignLeadsModal({ campaignId, onClose, onAdded }: Props) {
  const [mode, setMode] = useState<Mode>('lists');
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [prospects, setProspects] = useState<ProspectRow[]>([]);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());

  useEffect(() => {
    void (async () => {
      try {
        setLoadingLists(true);
        const [listsRes, leadsRes] = await Promise.all([
          api.get('/api/lists'),
          api.get(`/api/campaigns/${campaignId}/leads`, { params: { status: 'all', limit: 500 } }),
        ]);
        setLists(listsRes.data.data ?? []);
        const rows = (leadsRes.data.data?.leads ?? []) as Array<{ leadId: string }>;
        setEnrolled(new Set(rows.map((row) => row.leadId)));
      } catch {
        toast.error('Failed to load prospect lists.');
      } finally {
        setLoadingLists(false);
      }
    })();
  }, [campaignId]);

  const toggleList = (id: string) => {
    setSelectedListIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const loadProspectsFromLists = useCallback(async (listIds: string[]) => {
    if (!listIds.length) {
      setProspects([]);
      return;
    }
    setLoadingProspects(true);
    try {
      const PAGE = 200;
      const byId = new Map<string, ProspectRow>();
      await Promise.all(
        listIds.map(async (listId) => {
          const listName = lists.find((l) => l.id === listId)?.name ?? 'List';
          let offset = 0;
          let total = Infinity;
          while (offset < total) {
            const res = await api.get(`/api/lists/${listId}/leads`, {
              params: { limit: PAGE, offset },
            });
            const rows = (res.data.data ?? []) as LeadRow[];
            const metaTotal = Number(res.data.meta?.total ?? rows.length);
            total = metaTotal;
            for (const lead of rows) {
              if (enrolled.has(lead.id)) continue;
              const existing = byId.get(lead.id);
              if (existing) {
                if (!existing.listNames.includes(listName)) existing.listNames.push(listName);
              } else {
                byId.set(lead.id, {
                  id: lead.id,
                  name: leadDisplayName(lead),
                  title: leadTitle(lead),
                  company: lead.company?.name ?? null,
                  listNames: [listName],
                });
              }
            }
            offset += rows.length;
            if (!rows.length) break;
          }
        }),
      );
      setProspects(
        [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
      );
    } catch {
      toast.error('Failed to load prospects from lists.');
      setProspects([]);
    } finally {
      setLoadingProspects(false);
    }
  }, [enrolled, lists]);

  useEffect(() => {
    if (mode !== 'prospects') return;
    void loadProspectsFromLists(selectedListIds);
  }, [mode, selectedListIds, loadProspectsFromLists]);

  const selectedListLeadCount = useMemo(
    () =>
      lists
        .filter((list) => selectedListIds.includes(list.id))
        .reduce((sum, list) => sum + (list.leadCount ?? 0), 0),
    [lists, selectedListIds],
  );

  const filteredProspects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prospects;
    return prospects.filter((p) => {
      const hay = `${p.name} ${p.title ?? ''} ${p.company ?? ''} ${p.listNames.join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [prospects, query]);

  const allFilteredSelected =
    filteredProspects.length > 0 && filteredProspects.every((p) => selectedLeadIds.has(p.id));

  const toggleProspect = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const p of filteredProspects) next.delete(p.id);
      } else {
        for (const p of filteredProspects) next.add(p.id);
      }
      return next;
    });
  };

  async function submit() {
    if (mode === 'lists' && selectedListIds.length === 0) {
      toast.error('Select at least one prospect list.');
      return;
    }
    if (mode === 'prospects' && selectedLeadIds.size === 0) {
      toast.error('Select at least one prospect.');
      return;
    }

    setSubmitting(true);
    try {
      const payload =
        mode === 'lists'
          ? { listIds: selectedListIds }
          : { leadIds: [...selectedLeadIds] };
      const res = await api.post(`/api/campaigns/${campaignId}/leads`, payload);
      const enrolledCount = Number(res.data.data?.enrolled ?? 0);
      const skipped = Number(res.data.data?.skipped ?? 0);
      if (enrolledCount === 0 && skipped > 0) {
        toast.message('Those prospects are already on this campaign.');
      } else if (enrolledCount === 0) {
        toast.message('No new leads were added.');
      } else {
        toast.success(
          `Added ${enrolledCount} lead${enrolledCount === 1 ? '' : 's'}${
            skipped ? ` (${skipped} already enrolled)` : ''
          }.`,
        );
      }
      onAdded({ enrolled: enrolledCount, skipped });
      onClose();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not add leads.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-campaign-leads-title"
        className="flex max-h-[min(90vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="add-campaign-leads-title" className="text-base font-semibold text-slate-900">
              Add leads
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Enroll from prospect lists, or pick specific people.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-5 pt-3">
          {(
            [
              { id: 'lists' as const, label: 'Entire lists' },
              { id: 'prospects' as const, label: 'Custom prospects' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`rounded-t-lg px-3 py-2 text-sm font-semibold transition ${
                mode === tab.id
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {mode === 'lists' ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Select one or more lists. Everyone in those lists will be enrolled
                {selectedListIds.length
                  ? ` · ~${selectedListLeadCount} prospect${selectedListLeadCount === 1 ? '' : 's'}`
                  : ''}
                .
              </p>
              {loadingLists ? (
                <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
              ) : lists.length === 0 ? (
                <p className="text-sm text-slate-500">No prospect lists yet. Create one under Prospect Lists.</p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {lists.map((list) => {
                    const selected = selectedListIds.includes(list.id);
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => toggleList(list.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                          selected
                            ? 'border-brand-main bg-brand-main/5'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{list.name}</div>
                          <div className="text-xs text-slate-500">{list.leadCount ?? 0} prospects</div>
                        </div>
                        {selected ? <IconCheck size={18} className="text-brand-main" /> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Choose lists to browse, then pick individual prospects. People already on this campaign are
                hidden.
              </p>
              {loadingLists ? (
                <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {lists.map((list) => {
                    const selected = selectedListIds.includes(list.id);
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => toggleList(list.id)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                          selected
                            ? 'border-brand-main bg-brand-main/10 text-brand-main'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {list.name}
                        <span className="ml-1 opacity-70">{list.leadCount ?? 0}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {!selectedListIds.length ? (
                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                  Select at least one list to load prospects.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[180px] flex-1">
                      <IconSearch
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        className={`${inputClass} h-9 pl-8 text-xs`}
                        placeholder="Search prospects"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className={btnOutline}
                      onClick={toggleAllFiltered}
                      disabled={loadingProspects || filteredProspects.length === 0}
                    >
                      {allFilteredSelected ? 'Unselect page' : 'Select all shown'}
                    </button>
                    <span className="text-xs text-slate-500">
                      {selectedLeadIds.size} selected
                      {prospects.length ? ` · ${prospects.length} available` : ''}
                    </span>
                  </div>

                  {loadingProspects ? (
                    <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
                  ) : filteredProspects.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No prospects left to add from the selected lists.
                    </p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          <tr>
                            <th className="w-10 px-3 py-2" />
                            <th className="px-3 py-2">Prospect</th>
                            <th className="px-3 py-2">List</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProspects.map((p) => {
                            const checked = selectedLeadIds.has(p.id);
                            return (
                              <tr
                                key={p.id}
                                className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50/80"
                                onClick={() => toggleProspect(p.id)}
                              >
                                <td className="px-3 py-2.5">
                                  <input
                                    type="checkbox"
                                    className="h-3.5 w-3.5 rounded border-slate-300"
                                    checked={checked}
                                    onChange={() => toggleProspect(p.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="font-medium text-slate-900">{p.name}</div>
                                  <div className="text-xs text-slate-500">
                                    {[p.title, p.company].filter(Boolean).join(' · ') || '—'}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-xs text-slate-500">
                                  {p.listNames.join(', ')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" className={btnOutline} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => void submit()}
            disabled={
              submitting ||
              (mode === 'lists' ? selectedListIds.length === 0 : selectedLeadIds.size === 0)
            }
          >
            <IconUserPlus size={16} />
            {submitting
              ? 'Adding…'
              : mode === 'lists'
                ? selectedListIds.length
                  ? `Add from ${selectedListIds.length} list${selectedListIds.length === 1 ? '' : 's'}`
                  : 'Add from lists'
                : selectedLeadIds.size
                  ? `Add ${selectedLeadIds.size} prospect${selectedLeadIds.size === 1 ? '' : 's'}`
                  : 'Add prospects'}
          </button>
        </div>
      </div>
    </div>
  );
}
