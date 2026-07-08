'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  IconActivity,
  IconArrowLeft,
  IconBrain,
  IconBuilding,
  IconCheck,
  IconCpu,
  IconExternalLink,
  IconList,
  IconLoader2,
  IconMail,
  IconNotes,
  IconPhone,
  IconSparkles,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import {
  apolloCategoryLabel,
  AiIntelligenceData,
  ENRICHMENT_STEP_ICONS,
  ENRICHMENT_STEP_LABELS,
  EnrichmentLog,
  enrichmentStatusMeta,
  LeadCategory,
  LeadList,
  LeadRow,
  PIPELINE_STAGES,
  PRIORITIES,
  priorityTone,
  stageMeta,
} from '../../../../components/leads/types';

// ─── Types ────────────────────────────────────────────────────────

type LeadDetail = LeadRow & {
  rawData?: Record<string, unknown>;
  lists?: LeadList[];
  activities?: Array<{
    id: string;
    type: string;
    title: string;
    body?: string | null;
    createdAt: string;
  }>;
};

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

type Tab = 'verified' | 'ai' | 'mydata';

// ─── Confidence badge ─────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  const tone =
    value >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    value >= 60 ? 'bg-amber-100 text-amber-800 border-amber-200' :
    'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      {value}% confidence
    </span>
  );
}

// ─── Step status icon ─────────────────────────────────────────────

function StepStatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white text-[10px]"><IconCheck size={10} /></span>;
  if (status === 'failed') return <span className="grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white text-[10px]"><IconX size={10} /></span>;
  if (status === 'in_progress') return <IconLoader2 size={18} className="animate-spin text-blue-500" />;
  if (status === 'skipped') return <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-300 text-white text-[10px]">—</span>;
  return <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-slate-300 bg-white text-[10px] text-slate-400">○</span>;
}

// ─── Main Page ────────────────────────────────────────────────────

export default function LeadDetailPage() {
  const { activeWorkspaceId } = useAuth();
  const { id } = useParams() as { id: string };

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [listToAdd, setListToAdd] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('verified');

  // Enrichment state
  const [enrichmentLogs, setEnrichmentLogs] = useState<EnrichmentLog[]>([]);
  const [aiIntelligence, setAiIntelligence] = useState<AiIntelligenceData | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  // ─── Data loading ───────────────────────────────────────────────

  const loadLead = useCallback(async () => {
    if (!activeWorkspaceId || !id) return;
    try {
      setLoading(true);
      const [leadRes, catRes, listRes] = await Promise.all([
        api.get(`/api/leads/${id}`),
        api.get('/api/categories'),
        api.get('/api/lists'),
      ]);
      const leadData: LeadDetail = leadRes.data.data;
      setLead(leadData);
      setNotes(leadData.notes ?? '');
      setCategories(catRes.data.data ?? []);
      setLists(listRes.data.data ?? []);
    } catch {
      toast.error('Failed to load lead.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, id]);

  const loadEnrichmentData = useCallback(async () => {
    if (!id) return;
    try {
      const [logsRes, aiRes] = await Promise.all([
        api.get(`/api/leads/${id}/enrichment-logs`),
        api.get(`/api/leads/${id}/ai-intelligence`),
      ]);
      setEnrichmentLogs(logsRes.data.data ?? []);
      setAiIntelligence(aiRes.data.data ?? null);
    } catch {
      // Non-blocking
    }
  }, [id]);

  useEffect(() => {
    void loadLead();
    void loadEnrichmentData();
  }, [loadLead, loadEnrichmentData]);

  // ─── SSE: Real-time enrichment updates ─────────────────────────

  useEffect(() => {
    if (!lead || !id) return;
    if (lead.enrichmentStatus !== 'in_progress') return;

    // Connect SSE
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
    const es = new EventSource(`${baseUrl}/api/leads/${id}/enrichment-status`, { withCredentials: true });
    sseRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'step' && payload.step) {
          setEnrichmentLogs((prev) => {
            const idx = prev.findIndex((l) => l.id === payload.step.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = payload.step;
              return next;
            }
            return [...prev, payload.step];
          });
        } else if (payload.type === 'steps' || payload.type === 'snapshot') {
          setEnrichmentLogs(payload.steps ?? []);
        } else if (payload.type === 'done') {
          es.close();
          sseRef.current = null;
          void loadLead();
          void loadEnrichmentData();
        }
      } catch {}
    };

    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [lead?.enrichmentStatus, id, loadLead, loadEnrichmentData]);

  // ─── Mutations ──────────────────────────────────────────────────

  const patch = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.patch(`/api/leads/${id}`, payload);
      await loadLead();
      toast.success('Saved.');
    } catch (err) {
      toast.error(errorMessage(err, 'Save failed.'));
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = () => patch({ notes });

  const addToList = async () => {
    if (!listToAdd) return;
    try {
      await api.post(`/api/leads/${id}/lists`, { listId: listToAdd });
      toast.success('Added to list.');
      await loadLead();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to add to list.'));
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────

  const formatDate = (v?: string | null) =>
    v ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(v)) : '—';

  const scoreBar = (n: number | null | undefined) => (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${(n ?? 0) >= 70 ? 'bg-emerald-500' : (n ?? 0) >= 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
        style={{ width: `${n ?? 0}%` }}
      />
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <IconLoader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-bold text-rose-700">Lead not found.</p>
        <Link href="/dashboard/leads" className="mt-3 inline-block text-sm font-bold text-blue-600 hover:underline">← Back to Leads</Link>
      </div>
    );
  }

  const enrichMeta = enrichmentStatusMeta(lead.enrichmentStatus);
  const contactName = [lead.contact?.firstName, lead.contact?.lastName].filter(Boolean).join(' ') || lead.contact?.email || 'Unnamed';

  return (
    <div className="space-y-6 animate-fade-in text-text">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_30%),linear-gradient(135deg,#ffffff,#f8fafc)] p-6 shadow-sm">
        <Link href="/dashboard/leads" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
          <IconArrowLeft size={14} /> All Leads
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-2xl font-black text-white shadow-lg">
              {contactName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">{contactName}</h1>
              <p className="mt-0.5 text-sm text-slate-600">{lead.contact?.role ?? 'No role'} at {lead.company?.name ?? 'Unknown company'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${stageMeta(lead.pipelineStage).tone}`}>
                  {stageMeta(lead.pipelineStage).label}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${priorityTone(lead.priority)}`}>
                  {lead.priority}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black ${enrichMeta.tone} ${lead.enrichmentStatus === 'in_progress' ? 'animate-pulse' : ''}`}>
                  {enrichMeta.icon} {enrichMeta.label}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 capitalize">{lead.source}</span>
              </div>
            </div>
          </div>

          {/* Quick scores */}
          <div className="flex gap-4 shrink-0">
            {[{ label: 'ICP', val: lead.icpScore }, { label: 'Intent', val: lead.intentScore }, { label: 'Confidence', val: lead.confidence }].map(({ label, val }) => (
              <div key={label} className="w-24 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-black text-slate-950">{val ?? 0}%</p>
                {scoreBar(val)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* ── Main content ────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Tab bar */}
          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            {([
              { id: 'verified', label: 'Verified Facts', icon: <IconBuilding size={14} /> },
              { id: 'ai', label: 'AI Intelligence', icon: <IconBrain size={14} /> },
              { id: 'mydata', label: 'My Data', icon: <IconNotes size={14} /> },
            ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Verified Facts ── */}
          {activeTab === 'verified' && (
            <div className="space-y-4">
              {/* Company */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <IconBuilding size={16} className="text-blue-600" />
                  <h2 className="text-sm font-black text-slate-950">Company Profile</h2>
                  {lead.company?.domain && (
                    <a href={`https://${lead.company.domain}`} target="_blank" rel="noreferrer" className="ml-auto text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                      Visit <IconExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Name', lead.company?.name],
                    ['Domain', lead.company?.domain],
                    ['Industry', lead.company?.industry],
                    ['Size', lead.company?.size],
                    ['Location', [lead.company?.location?.city, lead.company?.location?.country].filter(Boolean).join(', ')],
                    ['LinkedIn', (lead.company?.socialLinks as Record<string, string>)?.linkedin],
                  ].map(([label, val]) => val ? (
                    <div key={label as string} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800 break-words">{val as string}</p>
                    </div>
                  ) : null)}
                </div>
                {lead.company?.description && (
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</p>
                    <p className="mt-0.5 text-sm text-slate-700">{lead.company.description}</p>
                  </div>
                )}
                {(lead.company?.technologies?.length ?? 0) > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tech Stack</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.company!.technologies!.map((t) => (
                        <span key={t} className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <IconUser size={16} className="text-violet-600" />
                  <h2 className="text-sm font-black text-slate-950">Contact Details</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Name', [lead.contact?.firstName, lead.contact?.lastName].filter(Boolean).join(' ')],
                    ['Role', lead.contact?.role],
                    ['Phone', lead.contact?.phone],
                    ['LinkedIn', lead.contact?.linkedinUrl],
                  ].map(([label, val]) => val ? (
                    <div key={label as string} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800 break-words">{val as string}</p>
                    </div>
                  ) : null)}
                </div>
                {lead.contact?.email && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <IconMail size={15} className="text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800">{lead.contact.email}</p>
                    </div>
                    {lead.contact.emailVerificationStatus && (
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold capitalize ${
                        lead.contact.emailVerificationStatus === 'valid' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                        lead.contact.emailVerificationStatus === 'invalid' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                        lead.contact.emailVerificationStatus === 'catch_all' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                        'border-slate-200 bg-slate-50 text-slate-600'
                      }`}>{lead.contact.emailVerificationStatus.replace('_', ' ')}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: AI Intelligence ── */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              {!aiIntelligence ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <IconBrain size={32} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-bold text-slate-700">No AI Intelligence yet</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {lead.enrichmentStatus === 'not_started'
                      ? 'Select this lead and click "Enrich" to generate AI insights.'
                      : lead.enrichmentStatus === 'in_progress'
                      ? 'AI research is running. The panel will update automatically.'
                      : 'Enrichment finished but AI steps may have been skipped. Check the Enrichment Timeline.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Scores */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'ICP Score', val: aiIntelligence.icpScore },
                      { label: 'Intent Score', val: aiIntelligence.intentScore },
                      { label: 'Confidence', val: aiIntelligence.overallConfidence },
                    ].map(({ label, val }) => (
                      <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{val ?? '—'}%</p>
                        {scoreBar(val)}
                      </div>
                    ))}
                  </div>

                  {/* Company Summary */}
                  {aiIntelligence.companySummary && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-800">Company Summary</h3>
                        <ConfidenceBadge value={aiIntelligence.companySummary.confidence} />
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{aiIntelligence.companySummary.value}</p>
                    </div>
                  )}

                  {/* Pain Points + Buying Signals */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {aiIntelligence.painPoints && (
                      <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase tracking-wider text-rose-800">Pain Points</h3>
                          <ConfidenceBadge value={aiIntelligence.painPoints.confidence} />
                        </div>
                        <ul className="space-y-1.5">
                          {aiIntelligence.painPoints.value.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                              <span className="mt-0.5 shrink-0 text-rose-400">•</span>{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiIntelligence.buyingSignals && (
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase tracking-wider text-emerald-800">Buying Signals</h3>
                          <ConfidenceBadge value={aiIntelligence.buyingSignals.confidence} />
                        </div>
                        <ul className="space-y-1.5">
                          {aiIntelligence.buyingSignals.value.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                              <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Outreach Angle + Insights */}
                  {aiIntelligence.recommendedOutreachAngle && (
                    <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-violet-800">Recommended Outreach Angle</h3>
                        <ConfidenceBadge value={aiIntelligence.recommendedOutreachAngle.confidence} />
                      </div>
                      <p className="text-sm text-slate-700">{aiIntelligence.recommendedOutreachAngle.value}</p>
                    </div>
                  )}
                  {aiIntelligence.outreachInsights && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Outreach Insights</h3>
                        <ConfidenceBadge value={aiIntelligence.outreachInsights.confidence} />
                      </div>
                      <ul className="space-y-1.5">
                        {aiIntelligence.outreachInsights.value.map((ins, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                            <span className="mt-0.5 shrink-0 text-blue-500">→</span>{ins}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Email Copy */}
                  {(aiIntelligence.suggestedEmailOpening || aiIntelligence.suggestedCta) && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-800">Suggested Copy</h3>
                      {aiIntelligence.suggestedEmailOpening && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Opening</p>
                          <p className="text-sm text-slate-700 italic">"{aiIntelligence.suggestedEmailOpening.value}"</p>
                        </div>
                      )}
                      {aiIntelligence.suggestedCta && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Call To Action</p>
                          <p className="text-sm text-slate-700 italic">"{aiIntelligence.suggestedCta.value}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Tab: My Data ── */}
          {activeTab === 'mydata' && (
            <div className="space-y-4">
              {/* Pipeline + Priority */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pipeline Stage</label>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                    value={lead.pipelineStage}
                    onChange={(e) => void patch({ pipelineStage: e.target.value })}
                    disabled={saving}
                  >
                    {PIPELINE_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Priority</label>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                    value={lead.priority}
                    onChange={(e) => void patch({ priority: e.target.value })}
                    disabled={saving}
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</label>
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                  value={lead.category?.id ?? ''}
                  onChange={(e) => void patch({ categoryId: e.target.value || null })}
                  disabled={saving}
                >
                  <option value="">No category</option>
                  {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes</label>
                <textarea
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none focus:border-blue-300 focus:bg-white"
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add private notes…"
                />
                <button
                  onClick={saveNotes}
                  disabled={saving}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <IconLoader2 size={13} className="animate-spin" /> : <IconCheck size={13} />}
                  Save notes
                </button>
              </div>

              {/* Lists */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Lists</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(lead.lists ?? []).map((l) => (
                    <span key={l.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">{l.name}</span>
                  ))}
                  {(lead.lists ?? []).length === 0 && <p className="text-xs text-slate-400">Not in any list.</p>}
                </div>
                <div className="flex gap-2">
                  <select value={listToAdd} onChange={(e) => setListToAdd(e.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                    <option value="">Select list…</option>
                    {lists.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                  <button onClick={addToList} disabled={!listToAdd} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40">Add</button>
                </div>
              </div>

              {/* Activity */}
              {(lead.activities ?? []).length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <IconActivity size={14} className="text-slate-500" />
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Activity Log</h3>
                  </div>
                  <ul className="space-y-3">
                    {lead.activities!.map((act) => (
                      <li key={act.id} className="flex items-start gap-3">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{act.type.charAt(0).toUpperCase()}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{act.title}</p>
                          {act.body && <p className="text-[11px] text-slate-500">{act.body}</p>}
                          <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(act.createdAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Enrichment Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconSparkles size={15} className="text-blue-600" />
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Enrichment Timeline</h2>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${enrichMeta.tone}`}>
                {enrichMeta.icon} {enrichMeta.label}
              </span>
            </div>

            {enrichmentLogs.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-4">
                {lead.enrichmentStatus === 'not_started' ? 'Not enriched yet.' : 'No step data available.'}
              </p>
            ) : (
              <ol className="space-y-3">
                {enrichmentLogs.map((log, i) => (
                  <li key={log.id} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <StepStatusIcon status={log.status} />
                      {i < enrichmentLogs.length - 1 && <div className="mt-1 w-px flex-1 bg-slate-200" style={{ minHeight: 16 }} />}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-base">{ENRICHMENT_STEP_ICONS[log.step]}</span>
                        <span className="text-xs font-bold text-slate-800">{ENRICHMENT_STEP_LABELS[log.step]}</span>
                        {log.duration && (
                          <span className="text-[10px] text-slate-400">{(log.duration / 1000).toFixed(1)}s</span>
                        )}
                      </div>
                      {log.message && (
                        <p className="mt-0.5 text-[11px] text-slate-600 leading-relaxed">{log.message}</p>
                      )}
                      {log.error && (
                        <p className="mt-0.5 text-[11px] text-rose-600">{log.error}</p>
                      )}
                      {log.errorCode && (
                        <span className="mt-1 inline-block rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-700">{log.errorCode}</span>
                      )}
                      {Array.isArray(log.dataFound) && (log.dataFound as string[]).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(log.dataFound as string[]).slice(0, 4).map((f) => (
                            <span key={f} className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">✓ {f.replace(/_/g, ' ')}</span>
                          ))}
                          {(log.dataFound as string[]).length > 4 && (
                            <span className="text-[10px] text-slate-400">+{(log.dataFound as string[]).length - 4} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Quick info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Lead Info</h3>
            <dl className="space-y-2 text-xs">
              {[
                ['Source', lead.source],
                ['Status', lead.status],
                ['Apollo', apolloCategoryLabel(lead.apolloCategory) ?? '—'],
                ['Created', formatDate(lead.createdAt)],
                ['Enriched', formatDate(lead.enrichmentCompletedAt)],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between gap-2">
                  <dt className="text-slate-400 capitalize">{k}</dt>
                  <dd className="font-bold text-slate-800 capitalize truncate">{v as string}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
