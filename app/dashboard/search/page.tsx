'use client';

import React, { useState } from 'react';
import api from '../../../lib/api';
import { toast } from 'sonner';
import {
  IconSearch,
  IconSparkles,
  IconLoader2,
  IconTimeline,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconExternalLink,
} from '@tabler/icons-react';

interface TaskPlan {
  source: string;
  searchType: string;
  filters: Record<string, any>;
  estimatedCount: number;
  rationale: string;
}

interface JobProgress {
  id: string;
  status: 'queued' | 'planning' | 'collecting' | 'merging' | 'enriching' | 'verifying' | 'researching' | 'scoring' | 'completed' | 'failed';
  progress: number;
  currentStage: string;
  totalLeadsFound?: number;
  error?: string;
}

export default function SearchPage() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [plan, setPlan] = useState<{ tasks: TaskPlan[]; totalEstimatedLeads: number; reasoning: string } | null>(null);

  const samplePrompts = [
    'Find founders of Series A developer tool companies in San Francisco',
    'Look for growth marketing directors at Shopify e-commerce brands in London',
    'Search for heads of product at AI logistics startups in New York',
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setJob(null);
    setProgress(null);
    setPlan(null);

    try {
      const res = await api.post('/api/search', { prompt });
      const jobData = res.data.data;
      setJob(jobData);
      toast.success('Lead generation plan initiated!');
      startSSEStream(jobData.jobId);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to start search.');
      setLoading(false);
    }
  };

  const startSSEStream = (jobId: string) => {
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'}/api/jobs/${jobId}/stream`,
      { withCredentials: true }
    );

    eventSource.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      if (parsed.type === 'progress') {
        setProgress(parsed.data);
      }
      if (parsed.type === 'done') {
        setProgress(parsed.data);
        toast.success('Lead search completed! Inspect scored leads in Leads list.');
        eventSource.close();
        setLoading(false);
      }
      if (parsed.type === 'error') {
        toast.error(parsed.message);
        eventSource.close();
        setLoading(false);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setLoading(false);
    };
  };

  const stages = [
    { key: 'queued', label: 'Queued' },
    { key: 'planning', label: 'AI Strategy Planning' },
    { key: 'collecting', label: 'Collecting Raw Leads' },
    { key: 'merging', label: 'Merging & Deduplicating' },
    { key: 'enriching', label: 'TinyFish Data Enrichment' },
    { key: 'verifying', label: 'Reoon Verification' },
    { key: 'researching', label: 'AI Deep Research' },
    { key: 'scoring', label: 'ICP Scoring Model' },
    { key: 'completed', label: 'Complete' },
  ];

  const getStageStatus = (stageKey: string) => {
    if (!progress) return 'pending';
    if (progress.status === 'failed') return 'failed';

    const statusOrder = stages.map((s) => s.key);
    const currentIndex = statusOrder.indexOf(progress.status);
    const targetIndex = statusOrder.indexOf(stageKey);

    if (progress.status === stageKey) return 'active';
    if (currentIndex > targetIndex) return 'completed';
    return 'pending';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-text">
      <div>
        <h1 className="text-2xl font-bold text-text-100 flex items-center space-x-2">
          <IconSearch className="text-primary" />
          <span>Lead Search Agent</span>
        </h1>
        <p className="text-text-200 text-sm mt-1">
          Tell the AI agent what leads to find. The agent will formulate a plan, query providers, enrich, verify and score matching leads.
        </p>
      </div>

      {/* Glow Search Box */}
      <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Find CTOs of seed-stage healthcare companies in Boston with 11-50 employees..."
              className="w-full bg-bg-200 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary h-24 text-text-100 placeholder-text-300"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="absolute bottom-3 right-3 bg-primary hover:bg-primary-200 text-white font-medium py-1.5 px-4 rounded-lg text-xs shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
            >
              {loading ? (
                <>
                  <IconLoader2 size={14} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <IconSparkles size={14} />
                  <span>Launch Agent</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Suggestion Helpers */}
        {!loading && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-text-300 uppercase tracking-wider">Example queries</p>
            <div className="flex flex-col space-y-1.5">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(p)}
                  className="text-left text-xs text-text-200 hover:text-primary transition-colors flex items-center space-x-1.5 hover:underline bg-transparent border-none cursor-pointer"
                >
                  <IconChevronRight size={12} />
                  <span>{p}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SSE Realtime progress board */}
      {loading && progress && (
        <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-text-100">Live Agent Pipeline Tracker</span>
            <div className="flex items-center space-x-1.5 bg-primary/10 border border-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>{progress.progress}%</span>
            </div>
          </div>

          <div className="w-full bg-bg-300 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress.progress}%` }}
            />
          </div>

          {/* Stepper Pipeline */}
          <div className="space-y-3">
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
                      <span>Processing...</span>
                    </span>
                  )}
                  {status === 'completed' && (
                    <span className="text-[10px] text-success">✓ Done</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Inline helper component
function IconChevronRight({ size }: { size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-300"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
