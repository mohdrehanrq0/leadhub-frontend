'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { IconDownload, IconTrash } from '@tabler/icons-react';
import { deleteRun, listRuns, runResultsUrl } from '@/lib/recipes-api';
import type { ResearchJobListItem } from '@/lib/research-types';
import { spinnerClass } from '@/components/ui/styles';

export default function ResearchHistoryPage() {
  const [jobs, setJobs] = useState<ResearchJobListItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setJobs(await listRuns(100));
    } catch {
      toast.error('Could not load runs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(id: string) {
    if (!confirm('Delete this run and associated prospect data?')) return;
    try {
      await deleteRun(id, true);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Delete failed');
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Runs</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Recipe runs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Reopen briefs, export CSV for LeadSnipper, or delete stored run data.
          </p>
        </div>
        <Link
          href="/research"
          className="rounded-xl bg-brand-main px-4 py-2.5 text-sm font-semibold text-white"
        >
          New run
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className={spinnerClass} />
        </div>
      ) : !jobs.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-600">No runs yet.</p>
          <Link href="/research" className="mt-3 inline-block text-sm font-medium text-brand-main">
            Start your first Prospect brief
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Recipe</th>
                <th className="px-4 py-3 font-medium">Input</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr key={job.id} className="align-top">
                  <td className="px-4 py-3">
                    <Link
                      href={`/research/jobs/${job.id}`}
                      className="font-semibold text-slate-900 hover:text-brand-main"
                    >
                      {job.recipeName || 'Prospect brief'}
                    </Link>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">
                    <span className="line-clamp-2">
                      {job.inputSummary || job.prompt || job.id.slice(0, 8)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {job.status}
                    {job.currentStage ? (
                      <span className="mt-0.5 block text-xs text-slate-400">{job.currentStage}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{job.creditsPerLead ?? 1}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {job.createdAt ? new Date(job.createdAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/research/jobs/${job.id}`}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open
                      </Link>
                      <a
                        href={runResultsUrl(job.id, 'csv')}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <IconDownload size={14} /> CSV
                      </a>
                      <button
                        type="button"
                        onClick={() => onDelete(job.id)}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                        aria-label="Delete"
                      >
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
