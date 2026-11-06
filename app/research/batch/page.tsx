'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { btnPrimary, inputClass } from '@/components/ui/styles';
import { startBatchResearch } from '@/lib/research-api';

export default function BatchResearchPage() {
  const router = useRouter();
  const [csv, setCsv] = useState('companyName,companyUrl,personProfileUrl\nAcme,https://acme.com,\n');
  const [includeEmail, setIncludeEmail] = useState(false);
  const [includeHiring, setIncludeHiring] = useState(false);
  const [questions, setQuestions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    startedCount: number;
    errorCount: number;
    started: Array<{ jobId: string; index: number }>;
    errors: Array<{ index: number; message: string }>;
  } | null>(null);

  function parseRows() {
    const lines = csv
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idx = {
      companyName: headers.indexOf('companyname'),
      companyUrl: headers.indexOf('companyurl'),
      personProfileUrl: headers.indexOf('personprofileurl'),
    };
    return lines.slice(1, 26).map((line) => {
      const cols = line.split(',').map((c) => c.trim());
      return {
        companyName: idx.companyName >= 0 ? cols[idx.companyName] : undefined,
        companyUrl: idx.companyUrl >= 0 ? cols[idx.companyUrl] : undefined,
        personProfileUrl: idx.personProfileUrl >= 0 ? cols[idx.personProfileUrl] : undefined,
      };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rows = parseRows();
    if (!rows.length) {
      toast.error('Paste a CSV with a header row and up to 25 data rows.');
      return;
    }
    setSubmitting(true);
    try {
      const customQuestions = questions
        .split('\n')
        .map((q) => q.trim())
        .filter(Boolean);
      const data = await startBatchResearch({
        rows,
        includeEmail,
        includeHiring,
        customQuestions: customQuestions.length ? customQuestions : undefined,
      });
      setResult(data);
      toast.success(`Started ${data.startedCount} research jobs`);
      if (data.started[0]) router.push(`/research/jobs/${data.started[0].jobId}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Batch failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Release 2 · Batch
        </p>
        <h1 className="mt-1 font-semibold tracking-tight text-3xl text-slate-900">Limited CSV research</h1>
        <p className="mt-1 text-sm text-slate-600">
          Up to 25 prospects per batch. Progress appears in{' '}
          <Link href="/research/history" className="text-brand-main hover:underline">
            history
          </Link>
          .
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <textarea
          className={`${inputClass} min-h-[180px] font-mono text-xs`}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <textarea
          className={`${inputClass} min-h-[72px]`}
          placeholder="Optional custom questions (one per line)"
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={includeEmail} onChange={(e) => setIncludeEmail(e.target.checked)} />
          Include email discovery
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={includeHiring} onChange={(e) => setIncludeHiring(e.target.checked)} />
          Include hiring signals
        </label>
        <button type="submit" className={btnPrimary} disabled={submitting}>
          {submitting ? 'Starting…' : 'Start batch'}
        </button>
      </form>
      {result ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p>
            Started {result.startedCount}, errors {result.errorCount}
          </p>
          {result.errors.map((e) => (
            <p key={e.index} className="text-rose-700">
              Row {e.index + 1}: {e.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
