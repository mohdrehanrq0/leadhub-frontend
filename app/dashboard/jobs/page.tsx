'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { IconBriefcase, IconCheck, IconX, IconLoader2, IconClock } from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';

interface JobRecord {
  id: string;
  type: string;
  status: 'queued' | 'planning' | 'collecting' | 'merging' | 'enriching' | 'verifying' | 'researching' | 'scoring' | 'completed' | 'failed';
  progress: number;
  currentStage: string;
  totalLeadsFound?: number;
  error?: string;
  createdAt: string;
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
      const res = await api.get('/api/jobs');
      setJobs(res.data.data ?? []);
    } catch {
      toast.error('Failed to load jobs list.');
    } finally {
      setLoading(false);
    }
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-text">
      <div>
        <h1 className="text-2xl font-bold text-text-100 flex items-center space-x-2">
          <IconBriefcase className="text-primary" />
          <span>Search Jobs Queue</span>
        </h1>
        <p className="text-text-200 text-sm mt-1">
          Inspect running and completed lead intelligence runs in this workspace.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 skeleton" />
          <div className="h-16 skeleton" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-card p-12 text-center text-text-300 text-sm border border-border rounded-xl shadow-input">
          No search jobs have been executed yet in this workspace.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-card p-4 border border-border rounded-xl flex items-center justify-between hover:border-primary/50 transition-all shadow-sm"
            >
              <div className="space-y-1.5 flex-1 pr-4">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-semibold font-mono text-text-300">ID: {job.id.slice(0, 8)}</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border capitalize ${getStatusBadge(job.status)}`}>
                    {job.status === 'completed' ? 'Success' : job.status === 'failed' ? 'Failed' : job.currentStage ?? 'Running'}
                  </span>
                </div>
                <div className="flex items-center space-x-6 text-[10px] text-text-300">
                  <span className="flex items-center space-x-1">
                    <IconClock size={12} />
                    <span>{new Date(job.createdAt).toLocaleString()}</span>
                  </span>
                  {job.totalLeadsFound !== undefined && (
                    <span>Leads Found: <strong className="text-text-200">{job.totalLeadsFound}</strong></span>
                  )}
                </div>
                {job.error && (
                  <p className="text-[10px] text-error font-mono mt-1 bg-error/5 p-2 rounded border border-error/20">
                    Error: {job.error}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <span className="text-xs font-bold text-text-100">{job.progress}%</span>
                  <div className="w-16 bg-bg-300 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${job.status === 'completed' ? 'bg-success' : 'bg-primary'}`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
