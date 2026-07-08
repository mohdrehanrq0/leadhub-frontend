'use client';

import React, { startTransition, useDeferredValue, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import { toast } from 'sonner';
import {
  IconUsers,
  IconBuilding,
  IconEye,
  IconSparkles,
  IconLoader2,
  IconLayoutKanban,
  IconTable,
  IconUpload,
  IconRefresh,
  IconListDetails,
  IconSearch,
  IconAlertTriangle,
  IconKey,
  IconCopyOff,
  IconX,
} from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';
import {
  apolloCategoryLabel,
  enrichmentStatusMeta,
  leadName,
  LeadCategory,
  LeadList,
  LeadRow,
  PIPELINE_STAGES,
  PipelineStage,
  priorityTone,
  stageMeta,
} from '../../../components/leads/types';

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function LeadsPage() {
  const { activeWorkspaceId } = useAuth();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [hasOpenAiKey, setHasOpenAiKey] = useState<boolean | null>(null);
  const [view, setView] = useState<'table' | 'kanban'>('kanban');
  const [stage, setStage] = useState<'all' | PipelineStage>('all');
  const [priority, setPriority] = useState<'all' | 'hot' | 'warm' | 'cold' | 'unknown'>('all');
  const [source, setSource] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [listId, setListId] = useState('all');
  const [enrichmentStatus, setEnrichmentStatus] = useState('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState<PipelineStage>('contacted');
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkListId, setBulkListId] = useState('');

  // Deduplication Modal States
  const [showDeduplicateModal, setShowDeduplicateModal] = useState(false);
  const [matchOn, setMatchOn] = useState<'email' | 'domain' | 'linkedinUrl' | 'company_contact'>('email');
  const [keepStrategy, setKeepStrategy] = useState<'oldest' | 'newest'>('oldest');
  const [dupListId, setDupListId] = useState('all');
  const [dupCategoryId, setDupCategoryId] = useState('all');
  const [dupSource, setDupSource] = useState('all');
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [purging, setPurging] = useState(false);

  async function fetchLeads() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '500' });
      if (stage !== 'all') params.set('pipelineStage', stage);
      if (priority !== 'all') params.set('priority', priority);
      if (source !== 'all') params.set('source', source);
      if (categoryId !== 'all') params.set('categoryId', categoryId);
      if (listId !== 'all') params.set('listId', listId);
      if (enrichmentStatus !== 'all') params.set('enrichmentStatus', enrichmentStatus);
      if (deferredQuery.trim()) params.set('q', deferredQuery.trim());
      const filteredUrl = `/api/leads?${params.toString()}`;
      const filteredRes = await api.get(filteredUrl);
      setLeads(filteredRes.data.data ?? []);
      setSelected(new Set());
    } catch {
      toast.error('Failed to load leads.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMeta() {
    try {
      const [categoryRes, listRes] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/lists'),
      ]);
      setCategories(categoryRes.data.data ?? []);
      setLists(listRes.data.data ?? []);
    } catch {
      // Metadata is non-blocking for the hub.
    }
  }

  useEffect(() => {
    if (activeWorkspaceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchLeads();
      void fetchMeta();
      void fetchApiKeyStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId, stage, priority, source, categoryId, listId, enrichmentStatus, deferredQuery]);

  const refreshLeads = async () => {
    await fetchLeads();
    await fetchMeta();
  };

  async function fetchApiKeyStatus() {
    try {
      const res = await api.get('/api/api-keys');
      const keys: Array<{ provider: string }> = res.data.data ?? [];
      setHasOpenAiKey(keys.some((k) => k.provider === 'openai'));
    } catch {
      setHasOpenAiKey(false);
    }
  }

  const handleAnalyze = async () => {
    try {
      setLoadingPreview(true);
      const res = await api.post('/api/leads/duplicates/preview', {
        matchOn,
        keepStrategy,
        listId: dupListId === 'all' ? undefined : dupListId,
        categoryId: dupCategoryId === 'all' ? undefined : dupCategoryId,
        source: dupSource === 'all' ? undefined : dupSource,
      });
      setPreviewData(res.data.data);
      toast.success('Duplicate scan complete!');
    } catch (err) {
      toast.error(errorMessage(err, 'Duplicate scan failed.'));
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePurge = async () => {
    if (!previewData || previewData.totalDuplicates === 0) return;
    const ok = window.confirm(`Are you sure you want to permanently delete all ${previewData.totalDuplicates} duplicate leads? This action is irreversible.`);
    if (!ok) return;

    try {
      setPurging(true);
      const res = await api.post('/api/leads/duplicates/purge', {
        matchOn,
        keepStrategy,
        listId: dupListId === 'all' ? undefined : dupListId,
        categoryId: dupCategoryId === 'all' ? undefined : dupCategoryId,
        source: dupSource === 'all' ? undefined : dupSource,
      });
      toast.success(`Successfully deleted ${res.data.data?.deletedCount ?? previewData.totalDuplicates} duplicate leads!`);
      setShowDeduplicateModal(false);
      await refreshLeads();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to purge duplicates.'));
    } finally {
      setPurging(false);
    }
  };

  const filteredLeads = leads;
  const selectedLeads = filteredLeads.filter((lead) => selected.has(lead.id));
  const rawSelectedIds = selectedLeads.filter((lead) => lead.status === 'raw').map((lead) => lead.id);
  const allSelected = filteredLeads.length > 0 && filteredLeads.every((lead) => selected.has(lead.id));

  const toggleLead = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      filteredLeads.forEach((lead) => next.add(lead.id));
      return next;
    });
  };

  const handleEnrich = async () => {
    if (rawSelectedIds.length === 0) {
      toast.error('Select at least one raw lead to enrich.');
      return;
    }
    if (hasOpenAiKey === false) {
      toast.error(
        'OpenAI API key required. Add it in Settings › API Keys to use AI enrichment.',
        { duration: 6000, icon: <IconKey size={16} /> },
      );
      return;
    }

    try {
      setEnriching(true);
      const res = await api.post('/api/leads/enrich', { leadIds: rawSelectedIds });
      toast.success(
        `Enrichment started for ${res.data.data?.leadCount ?? rawSelectedIds.length} leads. Each lead will be processed individually.`,
      );
      setSelected(new Set());
      await refreshLeads();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to start enrichment.'));
    } finally {
      setEnriching(false);
    }
  };

  const patchLead = async (leadId: string, payload: Record<string, unknown>) => {
    await api.patch(`/api/leads/${leadId}`, payload);
    await refreshLeads();
  };

  const applyBulk = async (payload: Record<string, unknown>) => {
    const leadIds = Array.from(selected);
    if (leadIds.length === 0) {
      toast.error('Select at least one lead.');
      return;
    }

    try {
      await api.patch('/api/leads/bulk', { leadIds, ...payload });
      toast.success('Bulk update applied.');
      setSelected(new Set());
      await refreshLeads();
    } catch (err) {
      toast.error(errorMessage(err, 'Bulk update failed.'));
    }
  };

  const createCategory = async () => {
    const name = window.prompt('Category name');
    if (!name?.trim()) return;
    try {
      await api.post('/api/categories', { name: name.trim(), color: '#3b82f6' });
      toast.success('Category created.');
      await fetchMeta();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create category.'));
    }
  };

  const onDropLead = async (leadId: string, nextStage: PipelineStage) => {
    try {
      await patchLead(leadId, { pipelineStage: nextStage });
      toast.success(`Moved to ${stageMeta(nextStage).label}.`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not move lead.'));
    }
  };

  const sourceOptions = ['all', 'apollo', 'apify', 'google_maps', 'csv', 'manual'];
  const totalScore = (lead: LeadRow) =>
    Math.round(((lead.icpScore ?? 0) + (lead.intentScore ?? 0) + (lead.confidence ?? 0)) / 3);
  const formatDate = (value?: string) =>
    value
      ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
      : '-';
  const verificationTone = (status?: string | null) => {
    if (status === 'valid') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (status === 'invalid' || status === 'disposable') return 'border-rose-200 bg-rose-50 text-rose-700';
    if (status === 'catch_all') return 'border-amber-200 bg-amber-50 text-amber-700';
    return 'border-slate-200 bg-slate-50 text-slate-600';
  };

  return (
    <div className="space-y-6 animate-fade-in text-text">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32%),linear-gradient(135deg,#ffffff,#f8fafc)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
              <IconUsers size={14} />
              Lead CRM
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Manage every lead from capture to close.
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Import, sync, qualify, enrich, and move leads through a CRM pipeline with table and Kanban views.
            </p>
          </div>          <div className="flex flex-wrap gap-2">
            {hasOpenAiKey === false && (
              <Link
                href="/dashboard/settings/api-keys"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 shadow-sm hover:bg-amber-100"
              >
                <IconAlertTriangle size={15} /> Add OpenAI key to enable AI enrichment
              </Link>
            )}
            <button
              onClick={() => {
                setDupListId(listId);
                setDupCategoryId(categoryId);
                setDupSource(source);
                setPreviewData(null);
                setShowDeduplicateModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
            >
              <IconCopyOff size={15} /> Clean Duplicates
            </button>
            <Link href="/dashboard/leads/import" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
              <IconUpload size={15} /> Import CSV
            </Link>
            <Link href="/dashboard/leads/sync" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
              <IconRefresh size={15} /> Apollo / Apify Sync
            </Link>
            <Link href="/dashboard/leads/lists" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
              <IconListDetails size={15} /> Lists
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(6,minmax(120px,1fr))_auto]">
          <label className="relative">
            <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => startTransition(() => setQuery(event.target.value))}
              placeholder="Search contact, company, email, domain"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-blue-300 focus:bg-white"
            />
          </label>

          <select value={stage} onChange={(event) => setStage(event.target.value as 'all' | PipelineStage)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none">
            <option value="all">All stages</option>
            {PIPELINE_STAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={priority} onChange={(event) => setPriority(event.target.value as 'all' | 'hot' | 'warm' | 'cold' | 'unknown')} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none">
            <option value="all">All priority</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
            <option value="unknown">Unknown</option>
          </select>
          <select value={source} onChange={(event) => setSource(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none">
            {sourceOptions.map((item) => <option key={item} value={item}>{item === 'all' ? 'All sources' : item}</option>)}
          </select>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none">
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select value={listId} onChange={(event) => setListId(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none">
            <option value="all">All lists</option>
            {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select>
          <select value={enrichmentStatus} onChange={(event) => setEnrichmentStatus(event.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none">
            <option value="all">All Enrichment</option>
            <option value="not_started">Not Enriched</option>
            <option value="in_progress">Enriching...</option>
            <option value="completed">Completed</option>
            <option value="partial">Partial</option>
            <option value="failed">Failed</option>
          </select>

          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button onClick={() => setView('kanban')} className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold ${view === 'kanban' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
              <IconLayoutKanban size={14} /> Board
            </button>
            <button onClick={() => setView('table')} className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-bold ${view === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
              <IconTable size={14} /> Table
            </button>
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-950">
          <span className="font-black">{selected.size} selected</span>
          <button onClick={handleEnrich} disabled={enriching || rawSelectedIds.length === 0} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 font-bold text-white disabled:opacity-40">
            {enriching ? <IconLoader2 size={14} className="animate-spin" /> : <IconSparkles size={14} />}
            Enrich raw ({rawSelectedIds.length})
          </button>
          <select value={bulkStage} onChange={(event) => setBulkStage(event.target.value as PipelineStage)} className="h-9 rounded-lg border border-blue-200 bg-white px-2 font-semibold">
            {PIPELINE_STAGES.map((item) => <option key={item.value} value={item.value}>Move to {item.label}</option>)}
          </select>
          <button onClick={() => applyBulk({ pipelineStage: bulkStage })} className="rounded-lg border border-blue-200 bg-white px-3 py-2 font-bold text-blue-700">Apply stage</button>
          <select value={bulkCategoryId} onChange={(event) => setBulkCategoryId(event.target.value)} className="h-9 rounded-lg border border-blue-200 bg-white px-2 font-semibold">
            <option value="">Set category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <button onClick={() => bulkCategoryId ? applyBulk({ categoryId: bulkCategoryId }) : createCategory()} className="rounded-lg border border-blue-200 bg-white px-3 py-2 font-bold text-blue-700">
            {bulkCategoryId ? 'Apply category' : 'New category'}
          </button>
          <select value={bulkListId} onChange={(event) => setBulkListId(event.target.value)} className="h-9 rounded-lg border border-blue-200 bg-white px-2 font-semibold">
            <option value="">Add to list</option>
            {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select>
          <button onClick={() => bulkListId && applyBulk({ listId: bulkListId })} className="rounded-lg border border-blue-200 bg-white px-3 py-2 font-bold text-blue-700">Add</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="h-48 skeleton" />
          <div className="h-48 skeleton" />
          <div className="h-48 skeleton" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-bold text-slate-700">No leads match this view.</p>
          <p className="mt-1 text-xs text-slate-500">Import CSV leads, run provider sync, or adjust your filters.</p>
        </div>
      ) : view === 'kanban' ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-black text-slate-950">Pipeline Board</h2>
              <p className="text-xs text-slate-500">Drag cards between stages. Scroll horizontally to view every lane.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
              {filteredLeads.length} leads
            </span>
          </div>
          <div className="flex snap-x gap-4 overflow-x-auto overflow-y-hidden pb-4 thin-scrollbar">
          {PIPELINE_STAGES.map((column) => {
            const columnLeads = filteredLeads.filter((lead) => lead.pipelineStage === column.value);
            return (
              <section
                key={column.value}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const leadId = event.dataTransfer.getData('lead-id');
                  if (leadId) void onDropLead(leadId, column.value);
                }}
                className="flex h-[620px] w-[320px] shrink-0 snap-start flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
              >
                <div className="mb-3 flex items-center justify-between rounded-xl border border-white/70 bg-white/80 p-2 shadow-sm">
                  <div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${column.tone}`}>{column.label}</span>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Sales stage</p>
                  </div>
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">{columnLeads.length}</span>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 thin-scrollbar">
                  {columnLeads.map((lead) => (
                    <article
                      key={lead.id}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData('lead-id', lead.id)}
                      className={`group cursor-grab rounded-2xl border bg-white p-3 shadow-sm transition active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md ${selected.has(lead.id) ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}
                    >
                      <div className="flex items-start gap-2">
                        <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleLead(lead.id)} className="mt-1" />
                        <div className="min-w-0 flex-1">
                          <Link href={`/dashboard/leads/${lead.id}`} className="block truncate text-sm font-black text-slate-950 group-hover:text-blue-700">
                            {leadName(lead)}
                          </Link>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{lead.contact?.role || 'No role'} at {lead.company?.name || 'Unknown company'}</p>
                        </div>
                      </div>
                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-2">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span>Score</span>
                          <span className="text-slate-700">{totalScore(lead)}%</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-blue-600" style={{ width: `${totalScore(lead)}%` }} />
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${priorityTone(lead.priority)}`}>{lead.priority}</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">{lead.status}</span>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold capitalize text-slate-600">{lead.source}</span>
                        {lead.apolloCategory && <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">{apolloCategoryLabel(lead.apolloCategory)}</span>}
                        {(() => { const em = enrichmentStatusMeta(lead.enrichmentStatus); return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${em.tone}`}>{em.icon} {em.label}</span>; })()}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="truncate">{lead.company?.domain || lead.contact?.email || 'No domain'}</span>
                        <Link href={`/dashboard/leads/${lead.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white shadow-sm transition hover:bg-blue-700">
                          Case <IconEye size={11} />
                        </Link>
                      </div>
                    </article>
                  ))}
                  {columnLeads.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-center text-xs font-bold text-slate-400">
                      Drop leads here
                    </div>
                  )}
                </div>
              </section>
            );
          })}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <div>
              <h2 className="text-sm font-black text-slate-950">Lead Data Grid</h2>
              <p className="text-xs text-slate-500">Complete CRM data with horizontal scroll for all fields.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
              {filteredLeads.length} records
            </span>
          </div>
          <div className="max-h-[680px] overflow-auto thin-scrollbar">
            <table className="w-full min-w-[1680px] border-separate border-spacing-0 text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-[10px] uppercase tracking-[0.12em] text-slate-500 backdrop-blur">
                <tr>
                  <th className="sticky left-0 z-20 border-b border-slate-200 bg-slate-50 p-4"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                  <th className="sticky left-[48px] z-20 min-w-[220px] border-b border-slate-200 bg-slate-50 p-4">Lead</th>
                  <th className="min-w-[180px] border-b border-slate-200 p-4">Email</th>
                  <th className="min-w-[170px] border-b border-slate-200 p-4">Role</th>
                  <th className="min-w-[190px] border-b border-slate-200 p-4">Company</th>
                  <th className="min-w-[170px] border-b border-slate-200 p-4">Domain</th>
                  <th className="min-w-[140px] border-b border-slate-200 p-4">Industry</th>
                  <th className="min-w-[110px] border-b border-slate-200 p-4">Size</th>
                  <th className="min-w-[155px] border-b border-slate-200 p-4">Stage</th>
                  <th className="min-w-[110px] border-b border-slate-200 p-4">Status</th>
                  <th className="min-w-[130px] border-b border-slate-200 p-4">Enrichment</th>
                  <th className="min-w-[120px] border-b border-slate-200 p-4">Source</th>
                  <th className="min-w-[130px] border-b border-slate-200 p-4">Category</th>
                  <th className="min-w-[110px] border-b border-slate-200 p-4">Verify</th>
                  <th className="min-w-[90px] border-b border-slate-200 p-4">ICP</th>
                  <th className="min-w-[90px] border-b border-slate-200 p-4">Intent</th>
                  <th className="min-w-[110px] border-b border-slate-200 p-4">Confidence</th>
                  <th className="min-w-[115px] border-b border-slate-200 p-4">Priority</th>
                  <th className="min-w-[130px] border-b border-slate-200 p-4">Created</th>
                  <th className="min-w-[260px] border-b border-slate-200 p-4">Notes</th>
                  <th className="sticky right-0 z-20 min-w-[120px] border-b border-slate-200 bg-slate-50 p-4 text-right">Case</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="group hover:bg-blue-50/35">
                    <td className="sticky left-0 z-10 border-b border-slate-100 bg-white p-4 group-hover:bg-blue-50"><input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleLead(lead.id)} /></td>
                    <td className="sticky left-[48px] z-10 border-b border-slate-100 bg-white p-4 group-hover:bg-blue-50">
                      <div className="font-black text-slate-950">{leadName(lead)}</div>
                      <div className="text-slate-500">{lead.contact?.phone || lead.contact?.linkedinUrl || 'No phone/linkedin'}</div>
                    </td>
                    <td className="border-b border-slate-100 p-4 font-mono text-[11px] text-slate-700">{lead.contact?.email || '-'}</td>
                    <td className="border-b border-slate-100 p-4 text-slate-700">{lead.contact?.role || '-'}</td>
                    <td className="border-b border-slate-100 p-4">
                      <div className="flex items-center gap-1 font-bold text-slate-800"><IconBuilding size={13} /> {lead.company?.name || 'Unknown'}</div>
                    </td>
                    <td className="border-b border-slate-100 p-4 font-mono text-[11px] text-slate-600">{lead.company?.domain || '-'}</td>
                    <td className="border-b border-slate-100 p-4 text-slate-600">{lead.company?.industry || '-'}</td>
                    <td className="border-b border-slate-100 p-4 text-slate-600">{lead.company?.size || '-'}</td>
                    <td className="border-b border-slate-100 p-4">
                      <select value={lead.pipelineStage} onChange={(event) => void patchLead(lead.id, { pipelineStage: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-700 shadow-sm outline-none focus:border-blue-300">
                        {PIPELINE_STAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </td>
                    <td className="border-b border-slate-100 p-4"><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-bold capitalize text-slate-600">{lead.status}</span></td>
                    <td className="border-b border-slate-100 p-4">
                      {(() => {
                        const em = enrichmentStatusMeta(lead.enrichmentStatus);
                        return (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-bold text-[10px] ${em.tone} ${lead.enrichmentStatus === 'in_progress' ? 'animate-pulse' : ''}`}
                            title={lead.enrichmentError ?? undefined}
                          >
                            {em.icon} {em.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="border-b border-slate-100 p-4 capitalize">{apolloCategoryLabel(lead.apolloCategory) || lead.source}</td>
                    <td className="border-b border-slate-100 p-4">
                      {lead.category ? (
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 font-bold text-slate-700">{lead.category.name}</span>
                      ) : '-'}
                    </td>
                    <td className="border-b border-slate-100 p-4"><span className={`rounded-full border px-2 py-1 font-bold capitalize ${verificationTone(lead.contact?.emailVerificationStatus)}`}>{lead.contact?.emailVerificationStatus || 'unknown'}</span></td>
                    <td className="border-b border-slate-100 p-4 font-black text-slate-800">{lead.icpScore ?? 0}%</td>
                    <td className="border-b border-slate-100 p-4 font-black text-slate-800">{lead.intentScore ?? 0}%</td>
                    <td className="border-b border-slate-100 p-4 font-black text-slate-800">{lead.confidence ?? 0}%</td>
                    <td className="border-b border-slate-100 p-4"><span className={`rounded-full border px-2 py-1 font-bold capitalize ${priorityTone(lead.priority)}`}>{lead.priority}</span></td>
                    <td className="border-b border-slate-100 p-4 text-slate-600">{formatDate(lead.createdAt)}</td>
                    <td className="max-w-[260px] border-b border-slate-100 p-4 text-slate-600">
                      <span className="line-clamp-2">{lead.notes || '-'}</span>
                    </td>
                    <td className="sticky right-0 z-10 border-b border-slate-100 bg-white p-4 text-right group-hover:bg-blue-50">
                      <Link href={`/dashboard/leads/${lead.id}`} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300">
                        <IconEye size={14} /> Case
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deduplication Modal */}
      {showDeduplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-[540px] max-w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
                  <IconCopyOff className="text-rose-600" size={18} /> Find & Remove Duplicates
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Locate and purge duplicate lead records in your CRM based on flexible matching rules.
                </p>
              </div>
              <button
                onClick={() => setShowDeduplicateModal(false)}
                className="text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 thin-scrollbar">
              {/* Match Criteria */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Match leads on</label>
                <select
                  value={matchOn}
                  onChange={(e: any) => { setMatchOn(e.target.value); setPreviewData(null); }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="email">Exact Email Address</option>
                  <option value="domain">Company Website Domain</option>
                  <option value="linkedinUrl">Contact LinkedIn URL</option>
                  <option value="company_contact">Same Company & Contact Name</option>
                </select>
              </div>

              {/* Strategy */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Deduplication Strategy</label>
                <select
                  value={keepStrategy}
                  onChange={(e: any) => { setKeepStrategy(e.target.value); setPreviewData(null); }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="oldest">Keep Oldest Record first (Preserve original imports)</option>
                  <option value="newest">Keep Newest Record first (Preserve latest overrides)</option>
                </select>
              </div>

              {/* Scope Override */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Scope Filters</label>
                <div className="grid gap-2 grid-cols-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">List</label>
                    <select
                      value={dupListId}
                      onChange={(e) => { setDupListId(e.target.value); setPreviewData(null); }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none"
                    >
                      <option value="all">All lists</option>
                      {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Category</label>
                    <select
                      value={dupCategoryId}
                      onChange={(e) => { setDupCategoryId(e.target.value); setPreviewData(null); }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none"
                    >
                      <option value="all">All categories</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Source</label>
                    <select
                      value={dupSource}
                      onChange={(e) => { setDupSource(e.target.value); setPreviewData(null); }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none"
                    >
                      <option value="all">All sources</option>
                      {sourceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview results */}
              {previewData && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-150">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Analysis Results</p>
                      <p className="text-[11px] text-slate-500">Matches grouped: {previewData.duplicateGroupsCount}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${previewData.totalDuplicates > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {previewData.totalDuplicates} duplicates found
                    </span>
                  </div>

                  {previewData.totalDuplicates > 0 && (
                    <div className="rounded-xl border border-slate-100 max-h-36 overflow-y-auto p-2 bg-slate-50/50 space-y-1.5 thin-scrollbar">
                      {previewData.preview.map((group: any, i: number) => (
                        <div key={i} className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/65 flex justify-between items-center">
                          <span className="font-bold text-slate-800 truncate max-w-[240px]">{group.matchValue}</span>
                          <span className="text-slate-400">Keeping ID: {group.keeper.id.slice(0, 8)} ({group.duplicates.length} to purge)</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 flex gap-3 justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowDeduplicateModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loadingPreview}
                className="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 px-4 py-2.5 text-xs font-bold hover:bg-blue-100 disabled:opacity-40 cursor-pointer"
              >
                {loadingPreview ? <IconLoader2 className="animate-spin inline mr-1" size={13} /> : null}
                Run Duplicate Scan
              </button>
              {previewData && previewData.totalDuplicates > 0 && (
                <button
                  type="button"
                  onClick={handlePurge}
                  disabled={purging}
                  className="rounded-xl bg-rose-600 text-white px-4 py-2.5 text-xs font-bold hover:bg-rose-700 shadow-md shadow-rose-200 disabled:opacity-40 cursor-pointer"
                >
                  {purging ? <IconLoader2 className="animate-spin inline mr-1" size={13} /> : null}
                  Purge {previewData.totalDuplicates} Duplicates
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
