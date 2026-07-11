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
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
  IconLoader2,
  IconMail,
  IconNotes,
  IconSparkles,
  IconUser,
  IconX,
  IconRefresh,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import {
  apolloCategoryLabel,
  AiIntelligenceData,
  canEnrichLead,
  canReEnrichLead,
  CanonicalLeadProfile,
  ENRICHMENT_STEP_ICONS,
  ENRICHMENT_STEP_LABELS,
  EnrichmentLog,
  EnrichmentStep,
  enrichmentStatusMeta,
  enrichmentBlockReason,
  LeadCategory,
  LeadList,
  LeadRow,
  PIPELINE_STAGES,
  PRIORITIES,
  priorityTone,
  RESEARCH_PHASE_ICONS,
  RESEARCH_PHASE_LABELS,
  RESEARCH_PHASES,
  ResearchActivity,
  ResearchQuery,
  queryStatusTone,
  stageMeta,
} from '../../../../components/leads/types';

// ─── Types ────────────────────────────────────────────────────────

type LeadDetail = LeadRow & {
  rawData?: Record<string, unknown>;
  researchSuggestions?: {
    suggestions?: string[];
    gapsRemaining?: string[];
    unableToFind?: string[];
    sources?: string[];
    identityValidated?: boolean;
    identityRejected?: boolean;
    companyNotFound?: boolean;
  };
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

// ─── Step details with marketing titles & copy ───────────────────

interface StepMarketingMeta {
  title: string;
  desc: string;
  runningText: string;
  icon: string;
  glowColor: string;
}

const RESEARCH_PHASE_MARKETING: Record<
  (typeof RESEARCH_PHASES)[number],
  { title: string; desc: string; runningText: string; icon: string }
> = {
  intake: {
    title: 'Analyzing Known Data',
    desc: 'Gemini reviews what we have and identifies gaps to research.',
    runningText: 'Analyzing company name, location, and existing fields...',
    icon: '📋',
  },
  query_planning: {
    title: 'Planning Dork Queries',
    desc: 'Generating targeted Google dork searches for each missing data point.',
    runningText: 'Building search queries from intake gaps...',
    icon: '🎯',
  },
  search: {
    title: 'Running Parallel Searches',
    desc: 'Executing dork queries via TinyFish to discover website, LinkedIn, contacts, and news.',
    runningText: 'Running parallel web searches...',
    icon: '🔍',
  },
  scrape_extract: {
    title: 'Scraping & Extracting',
    desc: 'Deep-scraping discovered URLs and extracting verified company/contact facts.',
    runningText: 'Fetching website pages and extracting structured data...',
    icon: '🌐',
  },
  synthesis: {
    title: 'AI Synthesis',
    desc: 'Facts-only Gemini synthesis with ICP scoring and outreach suggestions.',
    runningText: 'Synthesizing verified facts into actionable intelligence...',
    icon: '✨',
  },
};

/** Legacy 6-step marketing — shown for old enrichment runs */
const ENRICHMENT_STEP_MARKETING: Partial<Record<EnrichmentStep, { title: string; desc: string; runningText: string; icon: string }>> = {
  identity_resolution: {
    title: 'Resolving Digital Footprints',
    desc: 'Scanning social media registries, domain records, and public directories to map this contact to their authentic web profile.',
    runningText: 'Cross-referencing domain registers and digital records...',
    icon: '🔎',
  },
  company_fetch: {
    title: 'Extracting Company Firmographics',
    desc: 'Connecting to TinyFish database to pull company location, industry tags, headcount, growth history, and active tech stack.',
    runningText: 'Fetching firmographics, sizing metrics, and technographic stack...',
    icon: '🏢',
  },
  contact_enrichment: {
    title: 'Pinpointing Direct Contact Details',
    desc: 'Locating direct telephone numbers, specific corporate roles, seniority indices, and complete professional backgrounds.',
    runningText: 'Resolving org hierarchy and direct contact lines...',
    icon: '👤',
  },
  email_verification: {
    title: 'Validating Email Deliverability',
    desc: 'Executing triple-pass SMTP handshakes and catch-all validation via Reoon to guarantee inbox deliverability and protect sender reputation.',
    runningText: 'Opening secure MX port handshake and verifying mailbox...',
    icon: '📧',
  },
  ai_research: {
    title: 'Executing Deep AI Web Research',
    desc: 'Deploying custom LLM web scrapers to synthesize company value propositions, active buying signals, and critical pain points.',
    runningText: 'AI agent crawling homepage and recent news press releases...',
    icon: '🤖',
  },
  ai_scoring: {
    title: 'Evaluating ICP Fit & Personalizing Angle',
    desc: 'Correlating profile data points with your workspace scoring model, scoring target fit/intent, and drafting custom opening outreach templates.',
    runningText: 'Writing personalized outreach hooks and CTA suggestions...',
    icon: '⭐',
  },
};

const stepsOrder: EnrichmentStep[] = [...RESEARCH_PHASES];

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

function FieldMetaBadge({ field }: { field?: CanonicalLeadProfile['fields'][string] }) {
  if (!field) return null;
  const tone =
    field.status === 'found' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
    field.status === 'inferred' ? 'border-violet-200 bg-violet-50 text-violet-700' :
    'border-slate-200 bg-slate-50 text-slate-500';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      {field.source} · {field.confidence}% · {field.status.replace('_', ' ')}
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
  const [researchActivities, setResearchActivities] = useState<ResearchActivity[]>([]);
  const [researchQueries, setResearchQueries] = useState<ResearchQuery[]>([]);
  const [aiIntelligence, setAiIntelligence] = useState<AiIntelligenceData | null>(null);
  const [canonicalProfile, setCanonicalProfile] = useState<CanonicalLeadProfile | null>(null);
  const [showJourney, setShowJourney] = useState(true);
  const [researchGoal, setResearchGoal] = useState('general');
  const [reEnriching, setReEnriching] = useState(false);

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
      // If it's not active in_progress, collapse the journey panel by default to keep page clean
      if (leadData.enrichmentStatus !== 'in_progress') {
        setShowJourney(false);
      } else {
        setShowJourney(true);
      }
    } catch {
      toast.error('Failed to load lead.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, id]);

  const loadEnrichmentData = useCallback(async () => {
    if (!id) return;
    try {
      const [logsRes, activitiesRes, queriesRes, aiRes, profileRes] = await Promise.all([
        api.get(`/api/leads/${id}/enrichment-logs`),
        api.get(`/api/leads/${id}/research-activities`),
        api.get(`/api/leads/${id}/research-queries`),
        api.get(`/api/leads/${id}/ai-intelligence`),
        api.get(`/api/leads/${id}/profile`),
      ]);
      setEnrichmentLogs(logsRes.data.data ?? []);
      setResearchActivities(activitiesRes.data.data ?? []);
      setResearchQueries(queriesRes.data.data ?? []);
      setAiIntelligence(aiRes.data.data ?? null);
      setCanonicalProfile(profileRes.data.data ?? null);
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
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001';
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
        } else if (payload.type === 'activity' && payload.activity) {
          setResearchActivities((prev) => {
            if (prev.some((a) => a.id === payload.activity.id)) return prev;
            return [...prev, payload.activity];
          });
        } else if (payload.type === 'query' && payload.query) {
          setResearchQueries((prev) => {
            const idx = prev.findIndex((q) => q.id === payload.query.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = payload.query;
              return next;
            }
            return [...prev, payload.query];
          });
        } else if (payload.type === 'queries' && payload.queries) {
          setResearchQueries(payload.queries);
        } else if (payload.type === 'steps' || payload.type === 'snapshot') {
          setEnrichmentLogs(payload.steps ?? []);
          if (payload.activities) setResearchActivities(payload.activities);
          if (payload.queries) setResearchQueries(payload.queries);
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

  const handleReEnrich = async () => {
    if (!lead || lead.enrichmentStatus === 'in_progress') return;

    const isReEnrich = lead.enrichmentStatus === 'completed';
    if (isReEnrich) {
      const ok = window.confirm(
        'Re-run the full research agent on this lead? Prior dork queries and activities are kept for audit.',
      );
      if (!ok) return;
    }

    try {
      setReEnriching(true);
      await api.post('/api/leads/enrich', {
        leadIds: [lead.id],
        reEnrich: isReEnrich,
        researchGoal: researchGoal || 'general',
      });
      toast.success(isReEnrich ? 'Re-enrichment started.' : 'Enrichment started.');
      setShowJourney(true);
      setResearchActivities([]);
      setResearchQueries([]);
      await loadLead();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to start enrichment.'));
    } finally {
      setReEnriching(false);
    }
  };

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

  // Determine current active step log index for progress calculation
  const completedCount = enrichmentLogs.filter((l) => ['completed', 'skipped'].includes(l.status)).length;
  const totalPhases = enrichmentLogs.some((l) => RESEARCH_PHASES.includes(l.step as any))
    ? RESEARCH_PHASES.length
    : 6;
  const progressPercent = Math.min(100, Math.round((completedCount / totalPhases) * 100));

  const runningStepLog = enrichmentLogs.find((l) => l.status === 'in_progress');
  const isResearchPhase = runningStepLog && RESEARCH_PHASES.includes(runningStepLog.step as any);
  const runningStepMeta = runningStepLog
    ? isResearchPhase
      ? RESEARCH_PHASE_MARKETING[runningStepLog.step as (typeof RESEARCH_PHASES)[number]]
      : ENRICHMENT_STEP_MARKETING[runningStepLog.step]
    : null;
  const profileField = (key: string) => canonicalProfile?.fields?.[key];

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
  const enrichBlock = enrichmentBlockReason(lead);
  const contactName = [lead.contact?.firstName, lead.contact?.lastName].filter(Boolean).join(' ') || lead.contact?.email || 'Unnamed';
  const enrichmentDone =
    lead.enrichmentStatus === 'completed' || lead.enrichmentStatus === 'partial';
  const companyNotFound =
    lead.researchSuggestions?.companyNotFound === true ||
    lead.researchSuggestions?.identityRejected === true ||
    (lead.researchSuggestions?.identityValidated === false &&
      (lead.researchSuggestions?.gapsRemaining ?? lead.researchSuggestions?.unableToFind ?? []).some(
        (g) => g === 'company_not_found' || g === 'missing_valid_company_domain',
      )) ||
    // Legacy runs: no domain/website and identity never locked → treat as company not found
    (enrichmentDone &&
      !lead.company?.domain &&
      !lead.company?.website &&
      lead.researchSuggestions?.identityValidated === false);
  const showCompanyUnableToFind = (label: string, val: unknown) => {
    if (val) return false;
    if (!enrichmentDone) return false;
    if (['Domain', 'Website', 'LinkedIn', 'Industry', 'Size', 'Founded'].includes(label)) return true;
    return false;
  };
  const companyFieldValue = (label: string, val: unknown) => {
    if (companyNotFound && ['Industry', 'Size', 'Founded', 'Domain', 'Website', 'LinkedIn'].includes(label)) {
      return null;
    }
    return val;
  };

  return (
    <div className="space-y-6 animate-fade-in text-text">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_30%),linear-gradient(135deg,#ffffff,#f8fafc)] p-6 shadow-sm">
        <Link href="/dashboard/leads" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
          <IconArrowLeft size={14} /> All Leads
        </Link>

        {enrichBlock && (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            ⚠ {enrichBlock}. Add company name and location before running enrichment — without them research can match the wrong company.
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-blue-500 to-violet-600 text-2xl font-black text-white shadow-lg">
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

          {/* Quick scores + enrich actions */}
          <div className="flex flex-col items-end gap-3 shrink-0">
            {(canEnrichLead(lead) || canReEnrichLead(lead)) && lead.enrichmentStatus !== 'in_progress' && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <select
                  value={researchGoal}
                  onChange={(e) => setResearchGoal(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700"
                  title="Research goal steers which decision-maker roles we search"
                >
                  <option value="general">Goal: General</option>
                  <option value="marketing">Goal: Marketing</option>
                  <option value="sales">Goal: Sales</option>
                  <option value="engineering">Goal: Engineering</option>
                  <option value="AI">Goal: AI</option>
                  <option value="automation">Goal: Automation</option>
                  <option value="security">Goal: Security</option>
                  <option value="finance">Goal: Finance</option>
                  <option value="HR">Goal: HR</option>
                  <option value="operations">Goal: Operations</option>
                </select>
                <button
                  type="button"
                  onClick={() => void handleReEnrich()}
                  disabled={reEnriching}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-800 hover:bg-violet-100 disabled:opacity-50"
                >
                  {reEnriching ? <IconLoader2 size={14} className="animate-spin" /> : <IconRefresh size={14} />}
                  {lead.enrichmentStatus === 'completed' ? 'Re-enrich' : 'Run enrichment'}
                </button>
              </div>
            )}
            <div className="flex gap-4">
            {[{ label: 'ICP', val: companyNotFound ? null : lead.icpScore }, { label: 'Intent', val: companyNotFound ? null : lead.intentScore }, { label: 'Confidence', val: companyNotFound ? null : lead.confidence }].map(({ label, val }) => (
              <div key={label} className="w-24 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-black text-slate-950">{val == null ? '—' : `${val}%`}</p>
                {scoreBar(val)}
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Research Agent Console ───────────────────────────── */}
      {lead.enrichmentStatus !== 'not_started' && (
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-linear-to-b from-slate-900 to-slate-950 p-6 shadow-2xl text-white">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <IconSparkles size={18} className={lead.enrichmentStatus === 'in_progress' ? 'animate-spin' : ''} />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-wider uppercase text-slate-200">
                  Research Agent
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Human-like research: intake → dork queries → parallel search → scrape → synthesis
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowJourney(!showJourney)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/55 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {showJourney ? 'Collapse' : 'Expand'}
              {showJourney ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </button>
          </div>

          {showJourney && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-300">Research Progress</span>
                    <span className="font-mono font-bold text-blue-400">{progressPercent}% · {researchQueries.length} queries</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4 text-xs">
                  {lead.enrichmentStatus === 'in_progress' && runningStepMeta ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-blue-400 flex items-center gap-1.5 animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {runningStepMeta.title}
                      </p>
                      <p className="text-slate-300 text-[11px] mt-1 font-mono italic truncate">
                        {runningStepLog?.message || runningStepMeta.runningText}
                      </p>
                    </div>
                  ) : lead.enrichmentStatus === 'completed' ? (
                    <div className="text-emerald-400 font-bold flex items-center gap-2">
                      <IconCheck size={14} /> Research complete
                    </div>
                  ) : lead.enrichmentStatus === 'failed' ? (
                    <div className="text-rose-400 font-bold truncate">{lead.enrichmentError || 'Research failed'}</div>
                  ) : (
                    <div className="text-amber-400 font-bold">Partial — some phases failed</div>
                  )}
                </div>
              </div>

              {/* Live research feed */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <IconActivity size={14} /> Research Feed
                </h3>
                <div className="max-h-56 overflow-y-auto space-y-2 font-mono text-[11px]">
                  {researchActivities.length === 0 ? (
                    <p className="text-slate-500 italic">Waiting for research activities...</p>
                  ) : (
                    researchActivities.map((act) => (
                      <div key={act.id} className="flex gap-2 text-slate-300 border-b border-slate-800/50 pb-2">
                        <span className="text-slate-500 shrink-0">
                          {new Date(act.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <div>
                          <p className="text-slate-200">{act.title}</p>
                          {act.body && <p className="text-slate-500 line-clamp-2 mt-0.5">{act.body}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Dork queries panel */}
              {researchQueries.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Dork Queries</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {researchQueries.map((q) => (
                      <div key={q.id} className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-[11px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-400 uppercase text-[9px]">[{q.category}] wave {q.wave}</span>
                          <span className={`font-bold uppercase text-[9px] ${queryStatusTone(q.status)}`}>{q.status}</span>
                        </div>
                        <p className="text-slate-200 mt-1 font-mono line-clamp-2">{q.query}</p>
                        {q.selectedUrl && (
                          <a href={q.selectedUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline mt-1 inline-flex items-center gap-1">
                            <IconExternalLink size={10} /> {q.selectedUrl}
                          </a>
                        )}
                        {(q.resultUrls?.length ?? 0) > 0 && !q.selectedUrl && (
                          <p className="text-slate-500 mt-1">{q.resultUrls?.length} results</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phase grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {(enrichmentLogs.some((l) => RESEARCH_PHASES.includes(l.step as any))
                  ? RESEARCH_PHASES
                  : stepsOrder
                ).map((step, idx) => {
                  const log = enrichmentLogs.find((l) => l.step === step);
                  const marketing =
                    RESEARCH_PHASES.includes(step as any)
                      ? RESEARCH_PHASE_MARKETING[step as (typeof RESEARCH_PHASES)[number]]
                      : ENRICHMENT_STEP_MARKETING[step] ?? {
                          title: ENRICHMENT_STEP_LABELS[step] ?? step,
                          desc: '',
                          runningText: '',
                          icon: ENRICHMENT_STEP_ICONS[step] ?? '○',
                        };

                  return (
                    <div
                      key={step}
                      className={`rounded-xl border p-3 text-xs ${
                        log?.status === 'in_progress' ? 'border-blue-500/40 bg-blue-950/20' : 'border-slate-800 bg-slate-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <StepStatusIcon status={log?.status ?? 'pending'} />
                        <span>{marketing.icon}</span>
                        <span className="font-bold text-slate-200 truncate">{marketing.title}</span>
                      </div>
                      {log?.message && <p className="text-slate-500 line-clamp-2 text-[10px]">{log.message}</p>}
                      {Array.isArray(log?.dataNotFound) && (log.dataNotFound as string[]).length > 0 && (
                        <p className="text-amber-500/80 text-[9px] mt-1">Missing: {(log.dataNotFound as string[]).slice(0, 3).join(', ')}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

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
                {((lead.researchSuggestions?.unableToFind?.length ?? 0) > 0 ||
                  (lead.researchSuggestions?.gapsRemaining?.length ?? 0) > 0 ||
                  companyNotFound) &&
                  enrichmentDone && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Unable to find</p>
                    <p className="mt-0.5 text-xs text-amber-900">
                      {companyNotFound
                        ? 'Company — no reliable public match for this name/location'
                        : (lead.researchSuggestions?.unableToFind ?? lead.researchSuggestions?.gapsRemaining ?? []).join(' · ')}
                    </p>
                    <p className="mt-1 text-[10px] text-amber-700/80">
                      {companyNotFound
                        ? 'Correct the company name or location, then re-enrich.'
                        : 'Retried with discovered website/domain anchors; still no reliable public match.'}
                    </p>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['Name', lead.company?.name, 'company.identity.companyName'],
                    ['Domain', companyFieldValue('Domain', lead.company?.domain), 'company.identity.website'],
                    ['Website', companyFieldValue('Website', lead.company?.website), 'company.identity.website'],
                    ['Industry', companyFieldValue('Industry', lead.company?.industry), 'company.profile.industry'],
                    ['Size', companyFieldValue('Size', lead.company?.size), 'company.profile.companySize'],
                    ['Founded', companyFieldValue('Founded', lead.company?.foundedYear?.toString()), 'company.profile.foundedYear'],
                    ['Location', [lead.company?.location?.city, lead.company?.location?.country].filter(Boolean).join(', '), 'company.profile.headquarters'],
                    ['LinkedIn', companyFieldValue('LinkedIn', (lead.company?.socialLinks as Record<string, string>)?.linkedin), 'company.social.linkedin'],
                  ].map(([label, val, fieldKey]) =>
                    val ? (
                    <div key={label as string} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800 wrap-break-word">{val as string}</p>
                      <div className="mt-2"><FieldMetaBadge field={profileField(fieldKey as string)} /></div>
                    </div>
                    ) : showCompanyUnableToFind(label as string, val) ? (
                    <div key={label as string} className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="mt-0.5 text-sm font-medium text-slate-400">Unable to find</p>
                    </div>
                    ) : null,
                  )}
                </div>
                {!companyNotFound && lead.company?.description && (
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</p>
                    <p className="mt-0.5 text-sm text-slate-700">{lead.company.description}</p>
                  </div>
                )}
                {companyNotFound && enrichmentDone && (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-400">Unable to find</p>
                  </div>
                )}
                {!companyNotFound && (lead.company?.technologies?.length ?? 0) > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tech Stack</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.company!.technologies!.map((t) => (
                        <span key={t} className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">{t}</span>
                      ))}
                    </div>
                    <div className="mt-2"><FieldMetaBadge field={profileField('company.technology.techStack')} /></div>
                  </div>
                )}
                {(['products', 'services'] as const).map((key) => {
                  if (companyNotFound) return null;
                  const values = lead.company?.[key] ?? [];
                  if (!values.length) return null;
                  const fieldKey = key === 'products' ? 'company.products.products' : 'company.products.services';
                  return (
                    <div key={key} className="mt-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{key}</p>
                        <FieldMetaBadge field={profileField(fieldKey)} />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {values.map((value) => (
                          <span key={value} className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">{value}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {(lead.company?.sourceHistory?.length ?? 0) > 0 && (
                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Source History</p>
                    <ul className="mt-2 space-y-1">
                      {lead.company!.sourceHistory!.slice(-3).map((entry, index) => (
                        <li key={`${entry.source}-${entry.at}-${index}`} className="text-[11px] text-slate-600">
                          <span className="font-bold">{entry.source}</span> found {entry.fields.join(', ') || 'no fields'} on {formatDate(entry.at)}.
                        </li>
                      ))}
                    </ul>
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
                    [
                      'Name',
                      [lead.contact?.firstName, lead.contact?.lastName]
                        .filter((p) => p && p !== 'Unknown' && p !== 'Unnamed')
                        .join(' '),
                      'contact.profile.fullName',
                    ],
                    ['Role', lead.contact?.role, 'contact.profile.jobTitle'],
                    ['Phone', lead.contact?.phone, 'contact.profile.phone'],
                    ['LinkedIn', lead.contact?.linkedinUrl, 'contact.profile.linkedinProfile'],
                  ].map(([label, val, fieldKey]) =>
                    val ? (
                    <div key={label as string} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800 wrap-break-word">{val as string}</p>
                      <div className="mt-2"><FieldMetaBadge field={profileField(fieldKey as string)} /></div>
                    </div>
                    ) : (lead.enrichmentStatus === 'completed' || lead.enrichmentStatus === 'partial') &&
                      ['Name', 'LinkedIn'].includes(label as string) ? (
                    <div key={label as string} className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="mt-0.5 text-sm font-medium text-slate-400">Unable to find</p>
                    </div>
                    ) : null,
                  )}
                </div>
                {lead.contact?.email ? (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <IconMail size={15} className="text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Primary email</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-800">{lead.contact.email}</p>
                      <div className="mt-2"><FieldMetaBadge field={profileField('contact.profile.email')} /></div>
                      {Array.isArray((lead.contact as { otherEmails?: string[] }).otherEmails) &&
                        ((lead.contact as { otherEmails?: string[] }).otherEmails?.length ?? 0) > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Other valid emails</p>
                          <ul className="mt-1 space-y-0.5">
                            {(lead.contact as { otherEmails: string[] }).otherEmails.map((e) => (
                              <li key={e} className="text-xs text-slate-600">{e}</li>
                            ))}
                          </ul>
                        </div>
                      )}
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
                ) : (lead.enrichmentStatus === 'completed' || lead.enrichmentStatus === 'partial') ? (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-400">Unable to find</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* ── Tab: AI Intelligence ── */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              {companyNotFound && enrichmentDone ? (
                <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-10 text-center">
                  <IconBrain size={32} className="mx-auto mb-3 text-amber-400" />
                  <p className="font-bold text-slate-700">Unable to find company</p>
                  <p className="mt-1 text-xs text-slate-500">
                    No reliable company identity was found, so AI summaries and scores were not generated.
                    Correct the company name or location, then re-enrich.
                  </p>
                </div>
              ) : !aiIntelligence ? (
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
                  {aiIntelligence.companySummary?.value && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-800">Company Summary</h3>
                        <ConfidenceBadge value={aiIntelligence.companySummary.confidence} />
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{aiIntelligence.companySummary.value}</p>
                    </div>
                  )}
                  {aiIntelligence.personSummary?.value && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Person Summary</h3>
                        <ConfidenceBadge value={aiIntelligence.personSummary.confidence} />
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{aiIntelligence.personSummary.value}</p>
                    </div>
                  )}

                  {(aiIntelligence.buyingIntent?.value || aiIntelligence.productFit?.value) && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {aiIntelligence.buyingIntent?.value && (
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-wider text-amber-800">Buying Intent</h3>
                            <ConfidenceBadge value={aiIntelligence.buyingIntent.confidence} />
                          </div>
                          <p className="text-2xl font-black text-amber-900">{aiIntelligence.buyingIntent.score}%</p>
                          <p className="mt-1 text-xs text-slate-700">{aiIntelligence.buyingIntent.value}</p>
                        </div>
                      )}
                      {aiIntelligence.productFit?.value && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-wider text-blue-800">Product Fit</h3>
                            <ConfidenceBadge value={aiIntelligence.productFit.confidence} />
                          </div>
                          <p className="text-2xl font-black text-blue-900">{aiIntelligence.productFit.score}%</p>
                          <p className="mt-1 text-xs text-slate-700">{aiIntelligence.productFit.value}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pain Points + Buying Signals */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {aiIntelligence.painPoints?.value?.length ? (
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
                    ) : null}
                    {aiIntelligence.buyingSignals?.value?.length ? (
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
                    ) : null}
                  </div>

                  {(aiIntelligence.likelyChallenges?.value?.length ||
                    aiIntelligence.growthOpportunities?.value?.length ||
                    aiIntelligence.recentActivity?.value?.length) ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      {[
                        { title: 'Likely Challenges', field: aiIntelligence.likelyChallenges, tone: 'border-rose-100 bg-rose-50/40 text-rose-800' },
                        { title: 'Growth Opportunities', field: aiIntelligence.growthOpportunities, tone: 'border-emerald-100 bg-emerald-50/40 text-emerald-800' },
                        { title: 'Recent Activity', field: aiIntelligence.recentActivity, tone: 'border-sky-100 bg-sky-50/40 text-sky-800' },
                      ].map(({ title, field, tone }) => field?.value?.length ? (
                        <div key={title} className={`rounded-2xl border p-4 ${tone}`}>
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-wider">{title}</h3>
                            <ConfidenceBadge value={field.confidence} />
                          </div>
                          <ul className="space-y-1.5">
                            {field.value.map((item, i) => (
                              <li key={i} className="text-xs text-slate-700">{item}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null)}
                    </div>
                  ) : null}

                  {/* Outreach Angle + Insights */}
                  {aiIntelligence.recommendedOutreachAngle?.value && (
                    <div className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-violet-800">Recommended Outreach Angle</h3>
                        <ConfidenceBadge value={aiIntelligence.recommendedOutreachAngle.confidence} />
                      </div>
                      <p className="text-sm text-slate-700">{aiIntelligence.recommendedOutreachAngle.value}</p>
                    </div>
                  )}
                  {aiIntelligence.outreachInsights?.value?.length ? (
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
                  ) : null}

                  {aiIntelligence.personaAnalysis?.value && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Persona Analysis</h3>
                        <ConfidenceBadge value={aiIntelligence.personaAnalysis.confidence} />
                      </div>
                      <dl className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(aiIntelligence.personaAnalysis.value).map(([key, value]) => (
                          <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{key}</dt>
                            <dd className="mt-1 text-xs text-slate-700">
                              {Array.isArray(value) ? value.join(', ') : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  {/* Email Copy */}
                  {(aiIntelligence.suggestedEmailOpening?.value || aiIntelligence.suggestedCta?.value) && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-800">Suggested Copy</h3>
                      {aiIntelligence.suggestedEmailOpening?.value && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Opening</p>
                          <p className="text-sm text-slate-700 italic">{aiIntelligence.suggestedEmailOpening.value}</p>
                        </div>
                      )}
                      {aiIntelligence.suggestedCta?.value && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Call To Action</p>
                          <p className="text-sm text-slate-700 italic">{aiIntelligence.suggestedCta.value}</p>
                        </div>
                      )}
                      {aiIntelligence.personalizationNotes?.value?.length ? (
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Personalization Notes</p>
                            <ConfidenceBadge value={aiIntelligence.personalizationNotes.confidence} />
                          </div>
                          <ul className="space-y-1">
                            {aiIntelligence.personalizationNotes.value.map((note, i) => (
                              <li key={i} className="text-xs text-slate-700">{note}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
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
