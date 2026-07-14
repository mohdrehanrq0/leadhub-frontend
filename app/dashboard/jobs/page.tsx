'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { toast } from 'sonner';
import {
  IconBriefcase,
  IconCheck,
  IconClock,
  IconLoader2,
  IconChevronDown,
  IconChevronUp,
  IconTimeline,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';

interface JobRecord {
  id: string;
  type: string;
  status: 'queued' | 'planning' | 'collecting' | 'merging' | 'enriching' | 'completed' | 'failed';
  progress: number;
  currentStage: string;
  totalLeadsFound?: number;
  error?: string;
  createdAt: string;
  prompt?: string;
  result?: { message?: string; sourcesRun?: string[]; skippedDuplicates?: number };
  payload?: {
    leadIds?: string[];
    sources?: {
      useApollo?: boolean;
      useApify?: boolean;
      apolloCount?: number;
      apifyCount?: number;
    };
  };
}

function typeLabel(type: string) {
  switch (type) {
    case 'lead_search':
      return 'Lead Search';
    case 'leads_finder':
      return 'Lead Search (legacy)';
    case 'lead_enrichment':
      return 'Enrichment';
    case 'provider_sync':
      return 'Provider Sync';
    default:
      return type;
  }
}

function sourcesFromJob(job: JobRecord): string {
  const s = job.payload?.sources;
  if (!s) {
    if (job.result?.sourcesRun?.length) return job.result.sourcesRun.join(' + ');
    return '—';
  }
  const parts: string[] = [];
  if (s.useApollo) parts.push(`Apollo×${s.apolloCount ?? '?'}`);
  if (s.useApify) parts.push(`Apify×${s.apifyCount ?? '?'}`);
  return parts.length ? parts.join(' · ') : '—';
}

export default function JobsPage() {
  const { activeWorkspaceId } = useAuth();
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchJobs();
    }
  }, [activeWorkspaceId]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/jobs?limit=50');
      setJobs(res.data.data ?? []);
    } catch {
      toast.error('Failed to load jobs list.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-text">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-100 flex items-center space-x-2">
            <IconBriefcase className="text-primary" />
            <span>Search Jobs Queue</span>
          </h1>
          <p className="text-text-200 text-sm mt-1">
            Running and completed jobs — type, sources, prompt, and date. For browsing past searches, use{' '}
            <a href="/dashboard/search/history" className="text-primary hover:underline">
              Search History
            </a>
            .
          </p>
        </div>
        <button
          onClick={fetchJobs}
          className="text-xs bg-bg-300 hover:bg-bg-300/80 border border-border text-text-100 px-3 py-1.5 rounded-lg flex items-center space-x-1 cursor-pointer"
        >
          <IconLoader2 size={12} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="space-y-3">
          <div className="h-16 skeleton rounded-xl" />
          <div className="h-16 skeleton rounded-xl" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-card p-12 text-center text-text-300 text-sm border border-border rounded-xl shadow-input">
          No search jobs have been executed yet in this workspace.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Collapsible JobRow Component with Real-Time Tracking ───────
function JobRow({ job: initialJob }: { job: JobRecord }) {
  const [job, setJob] = useState<JobRecord>(initialJob);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setJob(initialJob);
  }, [initialJob]);

  // Connect to SSE stream when expanded and job is active
  useEffect(() => {
    if (!expanded) return;
    if (job.status === 'completed' || job.status === 'failed') return;

    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'}/api/jobs/${job.id}/stream`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.type === 'progress') {
        setJob((prev) => ({ ...prev, ...parsed.data }));
      }
      if (parsed.type === 'done') {
        setJob((prev) => ({ ...prev, ...parsed.data }));
        toast.success(`Search Job ${job.id.slice(0, 8)} completed successfully!`);
        eventSource.close();
      }
      if (parsed.type === 'error') {
        toast.error(parsed.message);
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [expanded, job.id, job.status]);

  const searchStages = [
    { key: 'queued', label: 'Queued' },
    { key: 'planning', label: 'AI Strategy Planning' },
    { key: 'collecting', label: 'Collecting & Saving Apollo Contacts' },
    { key: 'merging', label: 'Merging & Deduplicating' },
    { key: 'completed', label: 'Leads Ready' },
  ];

  const enrichStages = [
    { key: 'enriching', label: '🔎 Identity Resolution' },
    { key: 'enriching', label: '🏢 Company Data Fetch' },
    { key: 'enriching', label: '👤 Contact Enrichment' },
    { key: 'enriching', label: '📧 Email Verification' },
    { key: 'enriching', label: '🤖 AI Research' },
    { key: 'enriching', label: '⭐ AI Scoring' },
    { key: 'completed', label: 'Complete' },
  ];

  // For enrichment jobs, show concise per-lead progress steps
  const enrichSimpleStages = [
    { key: 'enriching', label: 'Enriching Leads' },
    { key: 'completed', label: 'All Leads Enriched' },
  ];

  const stages =
    job.type === 'lead_enrichment'
      ? enrichSimpleStages
      : searchStages;

  const getStageStatus = (stageKey: string) => {
    if (job.status === 'failed') return 'failed';

    const statusOrder = stages.map((s) => s.key);
    const currentIndex = statusOrder.indexOf(job.status);
    const targetIndex = statusOrder.indexOf(stageKey);

    if (job.status === stageKey) return 'active';
    if (currentIndex > targetIndex) return 'completed';
    return 'pending';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border border-success/20';
      case 'failed':
        return 'bg-error/10 text-error border border-error/20';
      default:
        return 'bg-primary/10 text-primary border border-primary/20 animate-pulse';
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl hover:border-primary/30 transition-all shadow-sm overflow-hidden">
      {/* Row Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
      >
        <div className="space-y-1.5 flex-1 pr-4 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-semibold font-mono text-text-300 flex-shrink-0 bg-bg-300 px-1.5 py-0.5 rounded">
              {typeLabel(job.type)}
            </span>
            <span className="text-sm font-bold text-text-100 truncate block">
              {job.type === 'lead_enrichment'
                ? `Enrich ${job.totalLeadsFound ?? ''} selected leads`
                : job.prompt || 'Lead search run'}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-[10px] text-text-300">
            <span className="flex items-center space-x-1">
              <IconClock size={12} />
              <span>{new Date(job.createdAt).toLocaleString()}</span>
            </span>
            {job.type !== 'lead_enrichment' && (
              <span>Sources: <strong className="text-text-200">{sourcesFromJob(job)}</strong></span>
            )}
            {job.totalLeadsFound !== undefined && (
              <span>
                Leads: <strong className="text-text-200">{job.totalLeadsFound}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-6 flex-shrink-0">
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border capitalize ${getStatusBadge(job.status)}`}>
            {job.status === 'completed' ? 'Success' : job.status === 'failed' ? 'Failed' : job.currentStage ?? 'Running'}
          </span>

          <div className="text-right min-w-[70px]">
            <span className="text-xs font-bold text-text-100">{job.progress}%</span>
            <div className="w-16 bg-bg-300 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${job.status === 'completed' ? 'bg-success' : 'bg-primary'}`}
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>

          <div className="text-text-300 hover:text-text-100 transition-colors hidden md:block">
            {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Row Expanded Details */}
      {expanded && (
        <div className="border-t border-border bg-bg-300/20 p-5 space-y-5 animate-fade-in text-xs">
          {/* Query prompt box */}
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-text-300 uppercase tracking-wider">
              {job.type === 'lead_enrichment' ? 'Enrichment Job Details' : 'Search Query Prompt'}
            </h4>
            <div className="bg-bg-300 p-3 rounded-lg border border-border text-text-100 font-medium italic">
              {job.type === 'lead_enrichment'
                ? (job.result?.message ??
                  `AI enrichment of ${job.totalLeadsFound ?? job.payload?.leadIds?.length ?? 0} selected leads — 6-step pipeline: identity resolution → company fetch → contact enrichment → email verification → AI research → AI scoring.`)
                : `"${job.prompt || 'No search query prompt provided.'}"`}
            </div>
            {(job.type === 'lead_search' || job.type === 'leads_finder') && (
              <a
                href={`/dashboard/search?reopen=${job.id}`}
                className="inline-flex mt-2 text-[11px] font-semibold text-primary hover:underline"
              >
                Reopen in Lead Search →
              </a>
            )}
          </div>

          {/* Stepper Pipeline */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-text-300 uppercase tracking-wider">Pipeline Execution Progress</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {stages.map((stage) => {
                const status = getStageStatus(stage.key);
                return (
                  <div
                    key={stage.key}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                      status === 'active'
                        ? 'border-primary/20 bg-primary/5 text-primary font-medium'
                        : status === 'completed'
                        ? 'border-border bg-bg-300/40 text-text-200'
                        : 'border-border/30 bg-bg-300/10 text-text-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] font-bold ${
                          status === 'active'
                            ? 'border-primary bg-primary text-white animate-pulse'
                            : status === 'completed'
                            ? 'border-success/30 bg-success/10 text-success'
                            : 'border-border text-text-300'
                        }`}
                      >
                        {status === 'completed' ? <IconCheck size={10} /> : <IconTimeline size={10} />}
                      </div>
                      <span>{stage.label}</span>
                    </div>

                    {status === 'active' && (
                      <span className="flex items-center space-x-1 text-[10px] text-primary font-medium">
                        <IconLoader2 size={10} className="animate-spin" />
                        <span>Running...</span>
                      </span>
                    )}
                    {status === 'completed' && (
                      <span className="text-[10px] text-success font-medium">✓ Done</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {job.error && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-error uppercase tracking-wider">Failure Error logs</h4>
              <p className="text-[10px] text-error font-mono bg-error/5 p-3 rounded-lg border border-error/20">
                Error: {job.error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
