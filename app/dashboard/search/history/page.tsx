'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import {
  IconHistory,
  IconLoader2,
  IconRefresh,
  IconRocket,
  IconSearch,
} from '@tabler/icons-react';

interface HistoryRow {
  jobId: string;
  type: string;
  status: string;
  prompt?: string;
  sources?: {
    useApollo?: boolean;
    useApify?: boolean;
    apolloCount?: number;
    apifyCount?: number;
  };
  costEstimate?: { totalEstimatedUsd?: number };
  totalLeadsFound?: number;
  createdAt: string;
  completedAt?: string;
}

export default function SearchHistoryPage() {
  const router = useRouter();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (q.trim()) params.set('q', q.trim());
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to + 'T23:59:59').toISOString());
      const res = await api.get(`/api/leads-finder/history?${params.toString()}`);
      setRows(res.data.data ?? []);
    } catch {
      toast.error('Failed to load search history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sourcesLabel = (row: HistoryRow) => {
    const parts: string[] = [];
    if (row.sources?.useApollo) parts.push(`Apollo (${row.sources.apolloCount ?? '?'})`);
    if (row.sources?.useApify) parts.push(`Apify (${row.sources.apifyCount ?? '?'})`);
    return parts.length ? parts.join(' + ') : '—';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-text pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-100 flex items-center gap-2">
            <IconHistory className="text-primary" />
            Search history
          </h1>
          <p className="text-text-200 text-sm mt-1">
            Past Lead Search prompts, sources, and results. Reopen to edit and re-run.
          </p>
        </div>
        <Link
          href="/dashboard/search"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-white text-xs font-semibold"
        >
          <IconSearch size={14} />
          New search
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-2 items-end">
        <div className="flex-1 w-full space-y-1">
          <label className="text-[11px] font-semibold text-text-200">Search prompts</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. founders SaaS"
            className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-text-200">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-text-200">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => void fetchHistory()}
          className="h-10 px-4 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <IconRefresh size={14} />
          Filter
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <IconLoader2 className="animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-sm text-text-300">
          No searches yet. Run a Lead Search to see history here.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.jobId}
              className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold text-text-100 truncate">
                  {row.prompt || 'Untitled search'}
                </p>
                <div className="flex flex-wrap gap-3 text-[11px] text-text-300">
                  <span>{new Date(row.createdAt).toLocaleString()}</span>
                  <span className="capitalize">{row.status}</span>
                  <span>{sourcesLabel(row)}</span>
                  <span>Leads: {row.totalLeadsFound ?? 0}</span>
                  {row.costEstimate?.totalEstimatedUsd != null && (
                    <span>~${row.costEstimate.totalEstimatedUsd}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/search?reopen=${row.jobId}`)}
                  className="h-9 px-3 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1"
                >
                  <IconRocket size={14} />
                  Reopen / re-run
                </button>
                <Link
                  href="/dashboard/jobs"
                  className="h-9 px-3 rounded-lg border border-border text-xs font-semibold inline-flex items-center"
                >
                  Jobs
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
