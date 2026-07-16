'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../../../context/AuthContext';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconHistory,
  IconKey,
  IconLoader2,
  IconPlayerPlay,
  IconRefresh,
  IconSearch,
  IconSparkles,
  IconTimeline,
  IconUsers,
} from '@tabler/icons-react';

// ─── Types ───────────────────────────────────────────────────────

interface ClarifyingQuestion {
  id: string;
  question: string;
  options?: string[];
}

interface SourceRecommendation {
  useApollo: boolean;
  useApify: boolean;
  useMicroworlds: boolean;
  apolloCount: number;
  apifyCount: number;
  microworldsCount: number;
  reason: string;
}

interface LeadsFinderInput {
  company_industry: string[];
  company_keywords: string[];
  contact_job_title: string[];
  contact_location: string[];
  email_status: string[];
  fetch_count: number;
  size: string[];
}

interface MicroworldsLeadsFinderInput {
  company_industry: string[];
  company_not_locations: string[];
  contact_job_titles: string[];
  contact_location: string[];
  email_status: string[];
  contact_email_exclude_catch_all_domains: boolean;
  company_num_employees_range: string[];
  max_result: number;
}

interface ApolloSearchFilters {
  titles: string[];
  locations: string[];
  keywords: string[];
  organizationLocations: string[];
  personSeniorities: string[];
  estimatedCount: number;
}

interface CostEstimate {
  apollo: {
    enabled: boolean;
    leadCount: number;
    estimatedCreditCostUsd: number;
    note: string;
  };
  apify: {
    enabled: boolean;
    leadCount: number;
    estimatedUsd: number;
    usdPerLead: number;
    note: string;
  };
  microworlds?: {
    enabled: boolean;
    leadCount: number;
    estimatedUsd: number;
    usdPerLead: number;
    note: string;
  };
  totalEstimatedUsd: number;
}

interface LeadsFinderJob {
  jobId: string;
  type: string;
  status: string;
  prompt?: string;
  ready: boolean;
  clarifyingQuestions: ClarifyingQuestion[];
  actorInput: Partial<LeadsFinderInput>;
  microworldsInput?: Partial<MicroworldsLeadsFinderInput>;
  apolloFilters: Partial<ApolloSearchFilters>;
  sources: SourceRecommendation;
  costEstimate?: CostEstimate;
  rationale?: string;
  missingFields?: string[];
  progress: number;
  currentStage?: string;
  totalLeadsFound?: number;
  result?: { leadIds?: string[]; skippedDuplicates?: number; message?: string };
  error?: string;
  streamUrl?: string;
}

interface ApolloCreditsInfo {
  connected: boolean;
  valid: boolean;
  fetchCreditCostUsd: number;
  note: string;
  leadCreditsRemaining?: number | null;
  leadCreditsAllowance?: number | null;
  leadCreditsUsed?: number | null;
  peopleSearchDayLeft: number | null;
  peopleSearchDayLimit: number | null;
  error?: string;
}

interface ApifyCreditsInfo {
  connected: boolean;
  valid: boolean;
  remainingUsd: number | null;
  monthlyUsageUsd: number | null;
  maxMonthlyUsageUsd: number | null;
  error?: string;
}

interface ProviderCredits {
  apollo: ApolloCreditsInfo;
  apify: ApifyCreditsInfo;
  pricing: {
    apifyLeadsFinderUsdPerLead: number;
    microworldsLeadsFinderUsdPerLead?: number;
    apolloFetchCreditCostUsd: number;
  };
}

type Phase = 'prompt' | 'clarify' | 'review' | 'running' | 'completed' | 'failed';

// ─── Constants ───────────────────────────────────────────────────

const SAMPLE_PROMPTS = [
  'Find VP Sales at Series B SaaS companies in California with 50–200 employees and validated emails.',
  'Marketing directors at fintech startups in London and Berlin, mid-market companies.',
  'CTOs and engineering leaders at healthcare companies in Texas using Apollo and Apify.',
  'HR directors at retail brands in New York with 500+ employees.',
];

const SEARCH_STAGES = [
  { key: 'queued', label: 'Queued' },
  { key: 'planning', label: 'Planning' },
  { key: 'collecting', label: 'Collecting leads' },
  { key: 'merging', label: 'Merging & deduplicating' },
  { key: 'completed', label: 'Leads ready' },
];

const COMPANY_SIZE_OPTIONS = [
  '1-10', '11-20', '21-50', '51-100', '101-200', '201-500', '501-1000',
  '1001-2000', '2001-5000', '5001-10000', '10001-20000', '20001-50000', '50000+',
];

const EMAIL_STATUS_OPTIONS = ['validated', 'not_validated', 'unknown'];

// ─── Helpers ─────────────────────────────────────────────────────

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

function toCsv(values?: string[]) {
  return (values ?? []).join(', ');
}

function fromCsv(value: string) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function phaseFromJob(job: LeadsFinderJob): Phase {
  if (job.status === 'completed') return 'completed';
  if (job.status === 'failed') return 'failed';
  if (['collecting', 'merging', 'enriching'].includes(job.status)) return 'running';
  if (!job.ready && job.clarifyingQuestions.length > 0) return 'clarify';
  if (job.ready || job.currentStage === 'review') return 'review';
  if (job.clarifyingQuestions.length > 0) return 'clarify';
  return 'prompt';
}

function defaultActorInput(partial?: Partial<LeadsFinderInput>): LeadsFinderInput {
  return {
    company_industry: partial?.company_industry ?? [],
    company_keywords: partial?.company_keywords ?? [],
    contact_job_title: partial?.contact_job_title ?? [],
    contact_location: partial?.contact_location ?? [],
    email_status: partial?.email_status?.length ? partial.email_status : ['validated'],
    fetch_count: partial?.fetch_count ?? 50,
    size: partial?.size ?? [],
  };
}

function defaultMicroworldsInput(
  partial?: Partial<MicroworldsLeadsFinderInput>,
): MicroworldsLeadsFinderInput {
  return {
    company_industry: partial?.company_industry ?? [],
    company_not_locations: partial?.company_not_locations ?? [],
    contact_job_titles: partial?.contact_job_titles ?? [],
    contact_location: partial?.contact_location ?? [],
    email_status: ['verified'],
    contact_email_exclude_catch_all_domains:
      partial?.contact_email_exclude_catch_all_domains !== false,
    company_num_employees_range: partial?.company_num_employees_range ?? [],
    max_result: partial?.max_result ?? 50,
  };
}

function defaultApolloFilters(partial?: Partial<ApolloSearchFilters>): ApolloSearchFilters {
  return {
    titles: partial?.titles ?? [],
    locations: partial?.locations ?? [],
    keywords: partial?.keywords ?? [],
    organizationLocations: partial?.organizationLocations ?? [],
    personSeniorities: partial?.personSeniorities ?? [],
    estimatedCount: partial?.estimatedCount ?? 50,
  };
}

function normalizeUiSources(partial?: Partial<SourceRecommendation>): SourceRecommendation {
  return {
    useApollo: partial?.useApollo ?? true,
    useApify: partial?.useApify ?? true,
    useMicroworlds: partial?.useMicroworlds ?? false,
    apolloCount: partial?.apolloCount ?? 50,
    apifyCount: partial?.apifyCount ?? 50,
    microworldsCount: partial?.microworldsCount ?? 0,
    reason: partial?.reason ?? '',
  };
}

function formatUsd(n: number | null | undefined) {
  if (n == null) return '—';
  return `$${n.toFixed(n >= 1 ? 2 : 4)}`;
}

// ─── Main Component ──────────────────────────────────────────────

export default function SearchPageInner() {
  const { activeWorkspaceId } = useAuth();
  const searchParams = useSearchParams();
  const reopenId = searchParams.get('reopen');

  const [credits, setCredits] = useState<ProviderCredits | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);

  const [prompt, setPrompt] = useState('');
  const [job, setJob] = useState<LeadsFinderJob | null>(null);
  const [phase, setPhase] = useState<Phase>('prompt');

  const [sources, setSources] = useState<SourceRecommendation>({
    useApollo: true,
    useApify: true,
    useMicroworlds: false,
    apolloCount: 50,
    apifyCount: 50,
    microworldsCount: 0,
    reason: '',
  });
  const [actorInput, setActorInput] = useState<LeadsFinderInput>(defaultActorInput());
  const [microworldsInput, setMicroworldsInput] = useState<MicroworldsLeadsFinderInput>(
    defaultMicroworldsInput(),
  );
  const [apolloFilters, setApolloFilters] = useState<ApolloSearchFilters>(defaultApolloFilters());
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);

  const [clarifyAnswers, setClarifyAnswers] = useState<Record<string, string>>({});
  const [planning, setPlanning] = useState(false);
  const [clarifying, setClarifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [reopenLoading, setReopenLoading] = useState(false);

  const [liveJob, setLiveJob] = useState<LeadsFinderJob | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const providerReady = Boolean(credits?.apollo.valid || credits?.apify.valid);

  const applyJob = useCallback((data: LeadsFinderJob) => {
    setJob(data);
    setLiveJob(data);
    setPhase(phaseFromJob(data));
    setPrompt(data.prompt ?? '');
    setSources(normalizeUiSources(data.sources));
    setActorInput(defaultActorInput(data.actorInput));
    setMicroworldsInput(defaultMicroworldsInput(data.microworldsInput));
    setApolloFilters(defaultApolloFilters(data.apolloFilters));
    if (data.costEstimate) setCostEstimate(data.costEstimate);
    if (data.clarifyingQuestions.length) {
      const initial: Record<string, string> = {};
      for (const q of data.clarifyingQuestions) initial[q.id] = '';
      setClarifyAnswers(initial);
    }
  }, []);

  const fetchCredits = useCallback(async () => {
    try {
      setCreditsLoading(true);
      const res = await api.get('/api/api-keys/credits');
      setCredits(res.data.data);
    } catch {
      toast.error('Failed to load provider credits.');
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  const fetchCostEstimate = useCallback(async (src: SourceRecommendation) => {
    try {
      const res = await api.post('/api/api-keys/credits/estimate', {
        useApollo: src.useApollo,
        useApify: src.useApify,
        useMicroworlds: src.useMicroworlds,
        apolloCount: src.apolloCount,
        apifyCount: src.apifyCount,
        microworldsCount: src.microworldsCount,
      });
      setCostEstimate(res.data.data);
    } catch {
      /* keep prior estimate */
    }
  }, []);

  useEffect(() => {
    if (activeWorkspaceId) void fetchCredits();
  }, [activeWorkspaceId, fetchCredits]);

  useEffect(() => {
    if (!reopenId || !activeWorkspaceId) return;
    void (async () => {
      try {
        setReopenLoading(true);
        const res = await api.get(`/api/leads-finder/${reopenId}`);
        applyJob(res.data.data);
      } catch {
        toast.error('Could not reopen that search job.');
      } finally {
        setReopenLoading(false);
      }
    })();
  }, [reopenId, activeWorkspaceId, applyJob]);

  useEffect(() => {
    if (phase !== 'review') return;
    const timer = setTimeout(() => void fetchCostEstimate(sources), 300);
    return () => clearTimeout(timer);
  }, [phase, sources, fetchCostEstimate]);

  // SSE progress while running
  useEffect(() => {
    if (phase !== 'running' || !job?.jobId) return;

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'}/api/jobs/${job.jobId}/stream`,
      { withCredentials: true },
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.type === 'progress' && parsed.data) {
        setLiveJob((prev) => ({
          ...(prev ?? job),
          ...parsed.data,
          jobId: parsed.data.id ?? job.jobId,
          result: parsed.data.result ?? prev?.result,
        }));
      }
      if (parsed.type === 'done' && parsed.data) {
        const done = parsed.data;
        setLiveJob((prev) => ({
          ...(prev ?? job),
          ...done,
          jobId: done.id ?? job.jobId,
          status: done.status,
          result: done.result,
          totalLeadsFound: done.totalLeadsFound,
        }));
        if (done.status === 'completed') {
          setPhase('completed');
          toast.success(`Search complete — ${done.totalLeadsFound ?? 0} leads saved.`);
        } else if (done.status === 'failed') {
          setPhase('failed');
          toast.error(done.error ?? 'Search failed.');
        }
        eventSource.close();
      }
      if (parsed.type === 'error') {
        toast.error(parsed.message ?? 'Stream error.');
        eventSource.close();
      }
    };

    eventSource.onerror = () => eventSource.close();

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [phase, job]);

  const displayJob = liveJob ?? job;
  const leadIds = useMemo(() => {
    const ids = displayJob?.result?.leadIds;
    return Array.isArray(ids) ? ids : [];
  }, [displayJob?.result?.leadIds]);

  async function handlePlan(e?: React.FormEvent) {
    e?.preventDefault();
    if (!prompt.trim() || prompt.trim().length < 10) {
      toast.error('Describe your ideal leads in at least 10 characters.');
      return;
    }
    if (!providerReady) {
      toast.error('Connect a valid Apollo or Apify API key first.');
      return;
    }
    setPlanning(true);
    try {
      const res = await api.post('/api/leads-finder/plan', { prompt: prompt.trim() });
      applyJob(res.data.data);
      toast.success('Search plan created.');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create search plan.'));
    } finally {
      setPlanning(false);
    }
  }

  async function handleClarify(e: React.FormEvent) {
    e.preventDefault();
    if (!job?.jobId) return;
    const unanswered = job.clarifyingQuestions.filter((q) => !clarifyAnswers[q.id]?.trim());
    if (unanswered.length) {
      toast.error('Please answer all clarifying questions.');
      return;
    }
    setClarifying(true);
    try {
      const res = await api.post(`/api/leads-finder/${job.jobId}/clarify`, { answers: clarifyAnswers });
      applyJob(res.data.data);
      toast.success('Answers submitted.');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to submit clarifications.'));
    } finally {
      setClarifying(false);
    }
  }

  async function handleSavePlan() {
    if (!job?.jobId) return;
    setSaving(true);
    try {
      const res = await api.patch(`/api/leads-finder/${job.jobId}/input`, {
        sources,
        actorInput,
        microworldsInput,
        apolloFilters,
      });
      applyJob(res.data.data);
      if (res.data.fingerprintCollision || res.data.microworldsFingerprintCollision) {
        toast.warning('An Apify input matches a previous run. Adjust filters to get fresh leads.');
      } else {
        toast.success('Plan saved.');
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save plan.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    if (!job?.jobId) return;
    setRunning(true);
    try {
      const res = await api.post(`/api/leads-finder/${job.jobId}/run`, {
        sources,
        actorInput,
        microworldsInput,
        apolloFilters,
      });
      applyJob(res.data.data);
      setPhase('running');
      toast.success('Lead search started.');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to start search.'));
    } finally {
      setRunning(false);
    }
  }

  async function handleEnrich() {
    if (!leadIds.length) {
      toast.error('No leads available to enrich yet.');
      return;
    }
    setEnriching(true);
    try {
      const res = await api.post('/api/leads/enrich', { leadIds });
      toast.success(res.data.data?.message ?? 'Enrichment started.');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to start enrichment.'));
    } finally {
      setEnriching(false);
    }
  }

  function resetSearch() {
    setJob(null);
    setLiveJob(null);
    setPhase('prompt');
    setPrompt('');
    setClarifyAnswers({});
    setCostEstimate(null);
  }

  function updateSources(patch: Partial<SourceRecommendation>) {
    setSources((prev) => {
      const next = { ...prev, ...patch };
      if (!credits?.apollo.valid) {
        next.useApollo = false;
        next.apolloCount = 0;
      }
      if (!credits?.apify.valid) {
        next.useApify = false;
        next.apifyCount = 0;
        next.useMicroworlds = false;
        next.microworldsCount = 0;
      }
      if (next.useApollo && next.apolloCount === 0) next.apolloCount = 50;
      if (next.useApify && next.apifyCount === 0) next.apifyCount = 50;
      if (next.useMicroworlds && next.microworldsCount === 0) next.microworldsCount = 50;
      if (next.useApify) {
        setActorInput((a) => ({ ...a, fetch_count: next.apifyCount }));
      }
      if (next.useMicroworlds) {
        setMicroworldsInput((a) => ({ ...a, max_result: next.microworldsCount }));
      }
      if (next.useApollo) {
        setApolloFilters((f) => ({ ...f, estimatedCount: next.apolloCount }));
      }
      return next;
    });
  }

  const getStageStatus = (stageKey: string) => {
    const status = displayJob?.status ?? 'queued';
    if (status === 'failed') return 'failed';
    const order = SEARCH_STAGES.map((s) => s.key);
    const current = status === 'merging' ? 'merging' : status;
    const currentIndex = order.indexOf(current);
    const targetIndex = order.indexOf(stageKey);
    if (current === stageKey) return 'active';
    if (currentIndex > targetIndex) return 'completed';
    return 'pending';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-text pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-100 flex items-center gap-2">
            <IconSearch className="text-primary" />
            Lead Search
          </h1>
          <p className="text-text-200 text-sm mt-1">
            Describe who you want to reach. AI plans Apollo + Apify sources, you review filters, then fetch leads.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/dashboard/search/history"
            className="text-xs bg-bg-300 hover:bg-bg-300/80 border border-border text-text-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            <IconHistory size={14} />
            History
          </Link>
          <button
            type="button"
            onClick={() => void fetchCredits()}
            className="text-xs bg-bg-300 hover:bg-bg-300/80 border border-border text-text-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <IconRefresh size={14} className={creditsLoading ? 'animate-spin' : ''} />
            Refresh credits
          </button>
        </div>
      </div>

      {/* Credits bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-input">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-text-300 uppercase tracking-wider">Provider credits</span>
          {creditsLoading && <IconLoader2 size={14} className="animate-spin text-text-300" />}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`rounded-lg border p-3 ${credits?.apollo.valid ? 'border-success/30 bg-success/5' : 'border-border bg-bg-300/30'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-100">Apollo</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${credits?.apollo.valid ? 'bg-success/10 text-success' : 'bg-bg-300 text-text-300'}`}>
                {credits?.apollo.valid ? 'Connected' : credits?.apollo.connected ? 'Invalid key' : 'Not connected'}
              </span>
            </div>
            <p className="text-xs text-text-200 mt-2">
              Lead credits left:{' '}
              <strong className="text-text-100">
                {credits?.apollo.leadCreditsRemaining != null
                  ? credits.apollo.leadCreditsRemaining.toLocaleString()
                  : '—'}
              </strong>
              {credits?.apollo.leadCreditsAllowance != null && (
                <span className="text-text-300">
                  {' '}
                  / {credits.apollo.leadCreditsAllowance.toLocaleString()} allowance
                </span>
              )}
            </p>
            <p className="text-xs text-text-300 mt-1">
              Day search left:{' '}
              {credits?.apollo.peopleSearchDayLeft != null
                ? `${credits.apollo.peopleSearchDayLeft}${credits.apollo.peopleSearchDayLimit != null ? ` / ${credits.apollo.peopleSearchDayLimit}` : ''}`
                : '—'}
            </p>
            {credits?.apollo.note && (
              <p className="text-[10px] text-text-300 mt-1">{credits.apollo.note}</p>
            )}
            {credits?.apollo.error && (
              <p className="text-[10px] text-text-300 mt-1 italic">{credits.apollo.error}</p>
            )}
          </div>

          <div className={`rounded-lg border p-3 ${credits?.apify.valid ? 'border-success/30 bg-success/5' : 'border-border bg-bg-300/30'}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-100">Apify</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${credits?.apify.valid ? 'bg-success/10 text-success' : 'bg-bg-300 text-text-300'}`}>
                {credits?.apify.valid ? 'Connected' : credits?.apify.connected ? 'Invalid key' : 'Not connected'}
              </span>
            </div>
            <p className="text-xs text-text-200 mt-2">
              Remaining: <strong className="text-text-100">{formatUsd(credits?.apify.remainingUsd)}</strong>
              {credits?.apify.maxMonthlyUsageUsd != null && (
                <span className="text-text-300"> / {formatUsd(credits.apify.maxMonthlyUsageUsd)} monthly cap</span>
              )}
            </p>
            <p className="text-xs text-text-300 mt-1">
              code_crafter ≈ $
              {((credits?.pricing.apifyLeadsFinderUsdPerLead ?? 0.0015) * 1000).toFixed(2)}
              /1k · microworlds ≈ $
              {((credits?.pricing.microworldsLeadsFinderUsdPerLead ?? 0.001) * 1000).toFixed(2)}
              /1k
            </p>
            {credits?.apify.error && (
              <p className="text-[10px] text-text-300 mt-1 italic">{credits.apify.error}</p>
            )}
          </div>
        </div>
      </div>

      {/* Gate banner */}
      {!creditsLoading && !providerReady && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex gap-3">
          <IconAlertTriangle className="text-warning flex-shrink-0 mt-0.5" size={20} />
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-text-100">Connect Apollo or Apify to search</p>
            <p className="text-text-200">
              Lead Search needs at least one valid provider key. Add and test your keys, or follow the Apify setup guide.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href="/dashboard/settings/api-keys?provider=apollo"
                className="inline-flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:opacity-90"
              >
                <IconKey size={14} />
                API Keys
              </Link>
              <Link
                href="/dashboard/integrations/apify"
                className="inline-flex items-center gap-1.5 text-xs bg-bg-300 border border-border text-text-100 px-3 py-1.5 rounded-lg hover:bg-bg-300/80"
              >
                Apify guide
              </Link>
            </div>
          </div>
        </div>
      )}

      {reopenLoading && (
        <div className="flex items-center justify-center py-8 text-text-300 text-sm gap-2">
          <IconLoader2 className="animate-spin" size={18} />
          Loading saved search…
        </div>
      )}

      {/* Prompt phase */}
      {phase === 'prompt' && !reopenLoading && (
        <form onSubmit={handlePlan} className="bg-card border border-border rounded-xl p-6 shadow-input space-y-5">
          <div className="flex items-center gap-2 text-primary">
            <IconSparkles size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">Describe your ideal leads</span>
          </div>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            disabled={!providerReady || planning}
            placeholder="e.g. VP Sales at B2B SaaS companies in California, 50–200 employees, validated emails…"
            className="w-full bg-bg-300 border border-border rounded-lg px-4 py-3 text-sm text-text-100 placeholder:text-text-300 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y min-h-[120px] disabled:opacity-60"
          />

          <div className="space-y-2">
            <p className="text-[10px] font-bold text-text-300 uppercase tracking-wider">Sample prompts</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  disabled={!providerReady}
                  onClick={() => setPrompt(sample)}
                  className="text-left text-xs bg-bg-300 hover:bg-bg-300/80 border border-border text-text-200 px-3 py-2 rounded-lg max-w-full disabled:opacity-50 cursor-pointer"
                >
                  {sample.length > 72 ? `${sample.slice(0, 72)}…` : sample}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!providerReady || planning || prompt.trim().length < 10}
            className="inline-flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {planning ? <IconLoader2 size={16} className="animate-spin" /> : <IconSparkles size={16} />}
            Plan search
          </button>
        </form>
      )}

      {/* Clarify phase */}
      {phase === 'clarify' && job && (
        <form onSubmit={handleClarify} className="bg-card border border-border rounded-xl p-6 shadow-input space-y-5">
          <div>
            <h2 className="text-lg font-bold text-text-100">A few quick questions</h2>
            {job.rationale && <p className="text-sm text-text-200 mt-1">{job.rationale}</p>}
          </div>

          {job.clarifyingQuestions.map((q) => (
            <div key={q.id} className="space-y-2">
              <label className="text-sm font-medium text-text-100">{q.question}</label>
              {q.options?.length ? (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setClarifyAnswers((a) => ({ ...a, [q.id]: opt }))}
                      className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer ${
                        clarifyAnswers[q.id] === opt
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border bg-bg-300 text-text-200 hover:border-primary/30'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={clarifyAnswers[q.id] ?? ''}
                  onChange={(e) => setClarifyAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  className="w-full bg-bg-300 border border-border rounded-lg px-3 py-2 text-sm text-text-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={clarifying}
              className="inline-flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {clarifying ? <IconLoader2 size={16} className="animate-spin" /> : <IconArrowRight size={16} />}
              Continue
            </button>
            <button
              type="button"
              onClick={resetSearch}
              className="text-sm text-text-300 hover:text-text-100 px-4 py-2 cursor-pointer"
            >
              Start over
            </button>
          </div>
        </form>
      )}

      {/* Review phase */}
      {phase === 'review' && job && (
        <div className="space-y-4">
          {job.rationale && (
            <div className="bg-card border border-border rounded-xl p-4 text-sm text-text-200 italic">
              {job.rationale}
            </div>
          )}

          {/* Sources + cost */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-input space-y-5">
            <h2 className="text-lg font-bold text-text-100">Review sources & cost</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${sources.useApollo ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                <input
                  type="checkbox"
                  checked={sources.useApollo}
                  disabled={!credits?.apollo.valid}
                  onChange={(e) => updateSources({ useApollo: e.target.checked })}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <span className="text-sm font-semibold text-text-100">Apollo</span>
                  {sources.useApollo && (
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={sources.apolloCount}
                      onChange={(e) => updateSources({ apolloCount: Number(e.target.value) || 0 })}
                      className="w-full bg-bg-300 border border-border rounded px-2 py-1 text-xs text-text-100"
                    />
                  )}
                  <p className="text-[10px] text-text-300">$0 Apollo wallet credits for people search</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${sources.useApify ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                <input
                  type="checkbox"
                  checked={sources.useApify}
                  disabled={!credits?.apify.valid}
                  onChange={(e) => updateSources({ useApify: e.target.checked })}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <span className="text-sm font-semibold text-text-100">Apify · code_crafter</span>
                  {sources.useApify && (
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={sources.apifyCount}
                      onChange={(e) => updateSources({ apifyCount: Number(e.target.value) || 0 })}
                      className="w-full bg-bg-300 border border-border rounded px-2 py-1 text-xs text-text-100"
                    />
                  )}
                  <p className="text-[10px] text-text-300">≈ $1.50 / 1,000 leads</p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${sources.useMicroworlds ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                <input
                  type="checkbox"
                  checked={sources.useMicroworlds}
                  disabled={!credits?.apify.valid}
                  onChange={(e) => updateSources({ useMicroworlds: e.target.checked })}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <span className="text-sm font-semibold text-text-100">Apify · microworlds</span>
                  {sources.useMicroworlds && (
                    <input
                      type="number"
                      min={1}
                      max={50000}
                      value={sources.microworldsCount}
                      onChange={(e) =>
                        updateSources({ microworldsCount: Number(e.target.value) || 0 })
                      }
                      className="w-full bg-bg-300 border border-border rounded px-2 py-1 text-xs text-text-100"
                    />
                  )}
                  <p className="text-[10px] text-text-300">≈ $1.00 / 1,000 leads · verified emails</p>
                </div>
              </label>
            </div>

            {sources.reason && <p className="text-xs text-text-300">{sources.reason}</p>}

            {costEstimate && (
              <div className="rounded-lg border border-border bg-bg-300/30 p-4 space-y-2">
                <p className="text-[10px] font-bold text-text-300 uppercase tracking-wider">Estimated cost</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  {costEstimate.apollo.enabled && (
                    <span className="text-text-200">
                      Apollo: {costEstimate.apollo.leadCount} leads · {formatUsd(costEstimate.apollo.estimatedCreditCostUsd)}
                    </span>
                  )}
                  {costEstimate.apify.enabled && (
                    <span className="text-text-200">
                      code_crafter: {costEstimate.apify.leadCount} leads · {formatUsd(costEstimate.apify.estimatedUsd)}
                    </span>
                  )}
                  {costEstimate.microworlds?.enabled && (
                    <span className="text-text-200">
                      microworlds: {costEstimate.microworlds.leadCount} leads ·{' '}
                      {formatUsd(costEstimate.microworlds.estimatedUsd)}
                    </span>
                  )}
                  <span className="font-semibold text-text-100">
                    Total: {formatUsd(costEstimate.totalEstimatedUsd)}
                  </span>
                </div>
              </div>
            )}

            {job.missingFields && job.missingFields.length > 0 && (
              <div className="text-xs text-warning flex items-start gap-2">
                <IconAlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>Missing: {job.missingFields.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Apollo filters */}
          {sources.useApollo && (
            <FilterSection title="Apollo filters">
              <FilterField
                label="Job titles (comma-separated)"
                value={toCsv(apolloFilters.titles)}
                onChange={(v) => setApolloFilters((f) => ({ ...f, titles: fromCsv(v) }))}
              />
              <FilterField
                label="Person locations"
                value={toCsv(apolloFilters.locations)}
                onChange={(v) => setApolloFilters((f) => ({ ...f, locations: fromCsv(v) }))}
              />
              <FilterField
                label="Keywords"
                value={toCsv(apolloFilters.keywords)}
                onChange={(v) => setApolloFilters((f) => ({ ...f, keywords: fromCsv(v) }))}
              />
              <FilterField
                label="Organization locations"
                value={toCsv(apolloFilters.organizationLocations)}
                onChange={(v) => setApolloFilters((f) => ({ ...f, organizationLocations: fromCsv(v) }))}
              />
              <FilterField
                label="Seniorities"
                value={toCsv(apolloFilters.personSeniorities)}
                onChange={(v) => setApolloFilters((f) => ({ ...f, personSeniorities: fromCsv(v) }))}
              />
            </FilterSection>
          )}

          {/* Apify filters */}
          {sources.useApify && (
            <FilterSection title="Apify filters (code_crafter/leads-finder)">
              <FilterField
                label="Contact job titles"
                value={toCsv(actorInput.contact_job_title)}
                onChange={(v) => setActorInput((a) => ({ ...a, contact_job_title: fromCsv(v) }))}
              />
              <FilterField
                label="Contact locations"
                value={toCsv(actorInput.contact_location)}
                onChange={(v) => setActorInput((a) => ({ ...a, contact_location: fromCsv(v) }))}
              />
              <FilterField
                label="Company keywords"
                value={toCsv(actorInput.company_keywords)}
                onChange={(v) => setActorInput((a) => ({ ...a, company_keywords: fromCsv(v) }))}
              />
              <FilterField
                label="Company industries"
                value={toCsv(actorInput.company_industry)}
                onChange={(v) => setActorInput((a) => ({ ...a, company_industry: fromCsv(v) }))}
              />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-300 uppercase tracking-wider">Company size</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMPANY_SIZE_OPTIONS.map((size) => {
                    const selected = actorInput.size.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          setActorInput((a) => ({
                            ...a,
                            size: selected ? a.size.filter((s) => s !== size) : [...a.size, size],
                          }))
                        }
                        className={`text-[10px] px-2 py-1 rounded border cursor-pointer ${
                          selected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-300'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-300 uppercase tracking-wider">Email status</label>
                <div className="flex flex-wrap gap-2">
                  {EMAIL_STATUS_OPTIONS.map((status) => {
                    const selected = actorInput.email_status.includes(status);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          setActorInput((a) => ({
                            ...a,
                            email_status: selected
                              ? a.email_status.filter((s) => s !== status)
                              : [...a.email_status, status],
                          }))
                        }
                        className={`text-xs px-2.5 py-1 rounded-lg border cursor-pointer ${
                          selected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-300'
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>
            </FilterSection>
          )}

          {/* Microworlds filters */}
          {sources.useMicroworlds && (
            <FilterSection title="Apify filters (microworlds/leads-finder)">
              <FilterField
                label="Contact job titles"
                value={toCsv(microworldsInput.contact_job_titles)}
                onChange={(v) =>
                  setMicroworldsInput((a) => ({ ...a, contact_job_titles: fromCsv(v) }))
                }
              />
              <FilterField
                label="Contact locations"
                value={toCsv(microworldsInput.contact_location)}
                onChange={(v) =>
                  setMicroworldsInput((a) => ({ ...a, contact_location: fromCsv(v) }))
                }
              />
              <FilterField
                label="Company industries"
                value={toCsv(microworldsInput.company_industry)}
                onChange={(v) =>
                  setMicroworldsInput((a) => ({ ...a, company_industry: fromCsv(v) }))
                }
              />
              <FilterField
                label="Company not locations (exclude HQ)"
                value={toCsv(microworldsInput.company_not_locations)}
                onChange={(v) =>
                  setMicroworldsInput((a) => ({ ...a, company_not_locations: fromCsv(v) }))
                }
              />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-300 uppercase tracking-wider">
                  Company size
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMPANY_SIZE_OPTIONS.map((size) => {
                    const selected = microworldsInput.company_num_employees_range.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          setMicroworldsInput((a) => ({
                            ...a,
                            company_num_employees_range: selected
                              ? a.company_num_employees_range.filter((s) => s !== size)
                              : [...a.company_num_employees_range, size],
                          }))
                        }
                        className={`text-[10px] px-2 py-1 rounded border cursor-pointer ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-text-300'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-text-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={microworldsInput.contact_email_exclude_catch_all_domains}
                  onChange={(e) =>
                    setMicroworldsInput((a) => ({
                      ...a,
                      contact_email_exclude_catch_all_domains: e.target.checked,
                    }))
                  }
                />
                Exclude catch-all email domains
              </label>
              <p className="text-[10px] text-text-300">Email status fixed to verified for this actor.</p>
            </FilterSection>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSavePlan()}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-bg-300 border border-border text-text-100 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-bg-300/80 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <IconLoader2 size={16} className="animate-spin" /> : <IconCheck size={16} />}
              Save plan
            </button>
            <button
              type="button"
              onClick={() => void handleRun()}
              disabled={
                running ||
                (!sources.useApollo && !sources.useApify && !sources.useMicroworlds)
              }
              className="inline-flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {running ? <IconLoader2 size={16} className="animate-spin" /> : <IconPlayerPlay size={16} />}
              Confirm & run search
            </button>
            <button type="button" onClick={resetSearch} className="text-sm text-text-300 hover:text-text-100 px-4 py-2 cursor-pointer">
              Start over
            </button>
          </div>
        </div>
      )}

      {/* Running phase */}
      {phase === 'running' && displayJob && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-input space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-100 flex items-center gap-2">
              <IconLoader2 className="animate-spin text-primary" size={20} />
              Search in progress
            </h2>
            <span className="text-sm font-bold text-text-100">{displayJob.progress ?? 0}%</span>
          </div>

          {displayJob.prompt && (
            <p className="text-sm text-text-200 italic border-l-2 border-primary/30 pl-3">&ldquo;{displayJob.prompt}&rdquo;</p>
          )}

          <div className="w-full bg-bg-300 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${displayJob.progress ?? 0}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SEARCH_STAGES.map((stage) => {
              const status = getStageStatus(stage.key);
              return (
                <div
                  key={stage.key}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs ${
                    status === 'active'
                      ? 'border-primary/20 bg-primary/5 text-primary'
                      : status === 'completed'
                      ? 'border-border bg-bg-300/40 text-text-200'
                      : 'border-border/30 text-text-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${
                      status === 'active'
                        ? 'border-primary bg-primary text-white'
                        : status === 'completed'
                        ? 'border-success/30 bg-success/10 text-success'
                        : 'border-border'
                    }`}
                  >
                    {status === 'completed' ? <IconCheck size={10} /> : <IconTimeline size={10} />}
                  </div>
                  <span>{stage.label}</span>
                  {status === 'active' && displayJob.currentStage && (
                    <span className="ml-auto text-[10px] capitalize">{displayJob.currentStage}</span>
                  )}
                </div>
              );
            })}
          </div>

          {displayJob.totalLeadsFound != null && displayJob.totalLeadsFound > 0 && (
            <p className="text-sm text-text-200 flex items-center gap-1.5">
              <IconUsers size={16} className="text-primary" />
              {displayJob.totalLeadsFound} leads found so far
            </p>
          )}
        </div>
      )}

      {/* Completed / failed */}
      {(phase === 'completed' || phase === 'failed') && displayJob && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-input space-y-5">
          <div className="flex items-center gap-3">
            {phase === 'completed' ? (
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <IconCheck className="text-success" size={22} />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                <IconAlertTriangle className="text-error" size={22} />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-text-100">
                {phase === 'completed' ? 'Search complete' : 'Search failed'}
              </h2>
              <p className="text-sm text-text-200">
                {phase === 'completed'
                  ? `${displayJob.totalLeadsFound ?? leadIds.length ?? 0} leads saved to your workspace.`
                  : displayJob.error ?? 'Something went wrong during collection.'}
              </p>
            </div>
          </div>

          {phase === 'completed' && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleEnrich()}
                disabled={enriching || leadIds.length === 0}
                className="inline-flex items-center gap-2 bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {enriching ? <IconLoader2 size={16} className="animate-spin" /> : <IconSparkles size={16} />}
                Enrich {leadIds.length > 0 ? `${leadIds.length} leads` : 'leads'}
              </button>
              <Link
                href="/dashboard/leads"
                className="inline-flex items-center gap-2 bg-bg-300 border border-border text-text-100 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-bg-300/80"
              >
                <IconUsers size={16} />
                View leads
              </Link>
              <Link
                href="/dashboard/jobs"
                className="inline-flex items-center gap-2 text-sm text-text-300 hover:text-text-100 px-4 py-2.5"
              >
                <IconClock size={16} />
                Jobs queue
              </Link>
            </div>
          )}

          <button type="button" onClick={resetSearch} className="text-sm text-primary hover:underline cursor-pointer">
            Start a new search
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-input space-y-4">
      <h3 className="text-sm font-bold text-text-100">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function FilterField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1 sm:col-span-1">
      <label className="text-[10px] font-bold text-text-300 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-300 border border-border rounded-lg px-3 py-2 text-sm text-text-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}
