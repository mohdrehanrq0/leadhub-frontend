'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BriefView } from '@/components/research/BriefView';
import { ProgressSteps } from '@/components/research/ProgressSteps';
import { ResultsTable } from '@/components/recipes/ResultsTable';
import { fetchRun, type RecipeOpener, type RecipeRunBundle } from '@/lib/recipes-api';
import { fetchResearchBrief } from '@/lib/research-api';
import type { ResearchBrief } from '@/lib/research-types';
import { spinnerClass } from '@/components/ui/styles';

export default function ResearchJobPage() {
  const params = useParams();
  const jobId = String(params.id);
  const [run, setRun] = useState<RecipeRunBundle | null>(null);
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [opener, setOpener] = useState<RecipeOpener | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchRun(jobId);
      setRun(data);
      setBrief(data.brief);
      setOpener(data.opener);
      setError(null);
    } catch {
      try {
        const data = await fetchResearchBrief(jobId);
        setBrief(data);
        setOpener(null);
        setRun(null);
        setError(null);
      } catch {
        setError('Run not found.');
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const status = run?.status ?? brief?.status;
    const running =
      status === 'pending' ||
      status === 'in_progress' ||
      status === 'needs_identity_confirmation';
    if (!running) return;
    const timer = setInterval(() => {
      load().catch(() => undefined);
    }, 2500);
    return () => clearInterval(timer);
  }, [brief, run, load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className={spinnerClass} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="text-sm font-semibold text-rose-700">{error}</p>
      </div>
    );
  }

  // Find-contacts results table
  if (run?.recipeId === 'find-contacts') {
    const running = run.status === 'pending' || run.status === 'in_progress';
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/research" className="text-sm text-zinc-600 hover:text-zinc-900">
              ← Recipes
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Find contacts results</h1>
            <p className="text-sm text-zinc-500">Status: {run.status}</p>
          </div>
        </div>
        {running ? (
          <p className="text-sm text-zinc-600">Still running — rows will fill in as companies finish.</p>
        ) : null}
        <ResultsTable run={run} onUpdated={load} />
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="text-sm font-semibold text-rose-700">Not found</p>
      </div>
    );
  }

  const running =
    brief.status === 'pending' ||
    brief.status === 'in_progress' ||
    brief.status === 'needs_identity_confirmation';

  if (running && !brief.person.name.value && !brief.company.description.value) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Run in progress
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Building your brief
          </h1>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ProgressSteps progress={brief.progress} />
        </div>
      </div>
    );
  }

  return <BriefView brief={brief} opener={opener} onRefresh={load} />;
}
