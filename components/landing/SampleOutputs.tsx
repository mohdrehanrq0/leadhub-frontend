'use client';

import { useState, type ReactNode } from 'react';
import { StatusPill } from '../research/StatusPill';
import prospectBrief from '../../lib/sample-outputs/prospect-brief.sample.json';
import cleanList from '../../lib/sample-outputs/clean-list.sample.json';

type SampleTab = 'prospect' | 'clean';

export function SampleOutputs() {
  const [tab, setTab] = useState<SampleTab>('prospect');

  return (
    <section id="samples" className="border-t border-slate-200/80 bg-white/70 py-16">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Sample recipe outputs
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Static, scrubbed examples from real runs — no live enrichment on this page.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('prospect')}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tab === 'prospect'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            Prospect brief
          </button>
          <button
            type="button"
            onClick={() => setTab('clean')}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tab === 'clean'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            Clean list
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)]">
          {tab === 'prospect' ? <SampleBrief /> : <SampleCleanList />}
        </div>
      </div>
    </section>
  );
}

function SampleBrief() {
  const brief = prospectBrief;
  return (
    <div className="p-6 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Prospect brief · read-only sample
      </p>
      <h3 className="mt-2 text-xl font-semibold text-slate-900">{brief.person.name.value}</h3>
      <p className="text-sm text-slate-600">
        {brief.person.title.value} · {brief.company.name.value}
      </p>

      <div className="mt-5 space-y-4 border-t border-slate-100 pt-5 text-sm">
        <SampleField label="Company overview" status="found">
          {brief.company.description.value}
        </SampleField>
        <SampleField label="Recent development" status="found">
          {brief.developments[0]?.summary}
        </SampleField>
        <SampleField label="Draft opener" status="found">
          {brief.opener.opener.value}
        </SampleField>
        <SampleField label="Email" status="not_requested">
          Optional — company research can still be complete.
        </SampleField>
      </div>
    </div>
  );
}

function SampleCleanList() {
  return (
    <div className="p-6 sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Clean list · read-only sample
      </p>
      <p className="mt-2 text-sm text-slate-600">
        {cleanList.summary.kept} kept · {cleanList.summary.dropped} dropped ·{' '}
        {cleanList.summary.enriched} enriched from {cleanList.summary.inputRows} input rows
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4 font-semibold">Name</th>
              <th className="py-2 pr-4 font-semibold">Title</th>
              <th className="py-2 pr-4 font-semibold">Company</th>
              <th className="py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {cleanList.rows.map((row) => (
              <tr key={row.fullName} className="border-b border-slate-100 text-slate-800">
                <td className="py-2.5 pr-4 font-medium">{row.fullName}</td>
                <td className="py-2.5 pr-4">{row.title}</td>
                <td className="py-2.5 pr-4">{row.companyName}</td>
                <td className="py-2.5">
                  <StatusPill status={row.status === 'ready' ? 'found' : 'uncertain'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SampleField({
  label,
  status,
  children,
}: {
  label: string;
  status: 'found' | 'not_requested' | 'uncertain';
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-medium uppercase text-slate-500">{label}</span>
        <StatusPill status={status} />
      </div>
      <p className="text-slate-800">{children}</p>
    </div>
  );
}
