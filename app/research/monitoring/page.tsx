'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { btnOutline, btnPrimary, inputClass } from '@/components/ui/styles';
import { addMonitoring, listMonitoring, removeMonitoring } from '@/lib/research-api';
import api from '@/lib/api';

export default function ResearchMonitoringPage() {
  const [items, setItems] = useState<
    Array<{
      id: string;
      companyName: string;
      companyUrl?: string | null;
      cadenceDays: number;
      nextRunAt: string;
      lastJobId?: string | null;
    }>
  >([]);
  const [companyName, setCompanyName] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [cadenceDays, setCadenceDays] = useState(7);

  async function load() {
    try {
      setItems(await listMonitoring());
    } catch {
      toast.error('Could not load monitors');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    try {
      await addMonitoring({
        companyName: companyName.trim(),
        companyUrl: companyUrl.trim() || undefined,
        cadenceDays,
      });
      toast.success('Monitoring added');
      setCompanyName('');
      setCompanyUrl('');
      load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not add monitor';
      toast.error(message);
    }
  }

  async function runDue() {
    try {
      await api.post('/api/research/monitoring/run-due');
      toast.success('Due monitors triggered');
      load();
    } catch {
      toast.error('Could not run due monitors');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Release 3 · Monitoring
          </p>
          <h1 className="mt-1 font-semibold tracking-tight text-3xl text-slate-900">Company change monitoring</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track selected companies — not everything. Re-research on a cadence.
          </p>
        </div>
        <button type="button" className={btnOutline} onClick={runDue}>
          Run due now
        </button>
      </div>

      <form onSubmit={onAdd} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <input className={inputClass} placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        <input className={inputClass} placeholder="Company URL (optional)" value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} />
        <label className="block text-sm text-slate-700">
          Cadence (days)
          <input
            type="number"
            min={1}
            max={90}
            className={`${inputClass} mt-1`}
            value={cadenceDays}
            onChange={(e) => setCadenceDays(Number(e.target.value) || 7)}
          />
        </label>
        <button type="submit" className={btnPrimary}>
          Add monitor
        </button>
      </form>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.companyName}</p>
              <p className="text-xs text-slate-500">
                Every {item.cadenceDays} days · next {new Date(item.nextRunAt).toLocaleString()}
              </p>
              {item.lastJobId ? (
                <Link href={`/research/jobs/${item.lastJobId}`} className="text-xs text-brand-main hover:underline">
                  Latest brief
                </Link>
              ) : null}
            </div>
            <button
              type="button"
              className={btnOutline}
              onClick={async () => {
                await removeMonitoring(item.id);
                load();
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
