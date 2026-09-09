'use client';

import Link from 'next/link';
import { IconArrowRight, IconCircleCheck, IconClock, IconRobot, IconSparkles, IconUsers } from '@tabler/icons-react';
import { EnrichmentAgentPicker, type EnrichmentAgentSummary } from './EnrichmentAgentPicker';
import { PIPELINE_STAGES, type LeadRow, type PipelineStage } from './types';

type Props = {
  leads: LeadRow[];
  totalCount: number;
  selectedCount: number;
  selectedAgentId: string;
  onAgentChange: (id: string) => void;
  onSelectedAgentChange: (agent: EnrichmentAgentSummary | null) => void;
  onEnrich: () => void;
  enriching: boolean;
  hasLlmKey: boolean | null;
  activeStage: 'all' | PipelineStage;
  onStageChange: (stage: 'all' | PipelineStage) => void;
};

export function CrmCommandCenter({
  leads,
  totalCount,
  selectedCount,
  selectedAgentId,
  onAgentChange,
  onSelectedAgentChange,
  onEnrich,
  enriching,
  hasLlmKey,
  activeStage,
  onStageChange,
}: Props) {
  const completed = leads.filter((lead) => lead.enrichmentStatus === 'completed' || lead.enrichmentStatus === 'partial').length;
  const researching = leads.filter((lead) => lead.enrichmentStatus === 'in_progress').length;
  const needsResearch = Math.max(0, leads.length - completed - researching);

  const metrics = [
    { label: 'Pipeline records', value: totalCount.toLocaleString(), detail: `${leads.length.toLocaleString()} loaded`, icon: IconUsers, tone: 'text-blue-700 bg-blue-50 border-blue-100' },
    { label: 'Needs research', value: needsResearch.toLocaleString(), detail: 'in current view', icon: IconSparkles, tone: 'text-violet-700 bg-violet-50 border-violet-100' },
    { label: 'Researching now', value: researching.toLocaleString(), detail: 'active jobs', icon: IconClock, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
    { label: 'Intelligence ready', value: completed.toLocaleString(), detail: 'ready for outreach', icon: IconCircleCheck, tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid divide-y divide-slate-100 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)] lg:divide-x lg:divide-y-0">
        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Pipeline cockpit</p>
              <h2 className="mt-1 text-base font-bold text-slate-950">Move the right accounts forward</h2>
            </div>
            <button
              type="button"
              onClick={() => onStageChange('all')}
              className="text-xs font-semibold text-slate-500 hover:text-blue-700"
            >
              All stages <IconArrowRight className="ml-0.5 inline" size={13} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
              <div key={label} className={`rounded-xl border p-3 ${tone}`}>
                <Icon size={16} className="mb-3" />
                <p className="text-lg font-black leading-none">{value}</p>
                <p className="mt-1 text-[11px] font-bold">{label}</p>
                <p className="mt-0.5 text-[10px] opacity-70">{detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-0.5 thin-scrollbar">
            {PIPELINE_STAGES.map((stage) => {
              const count = leads.filter((lead) => lead.pipelineStage === stage.value).length;
              const active = activeStage === stage.value;
              return (
                <button
                  key={stage.value}
                  type="button"
                  onClick={() => onStageChange(active ? 'all' : stage.value)}
                  className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                    active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  {stage.label} <span className="ml-1 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-50 via-white to-blue-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow-sm">
              <IconRobot size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">Enrichment workspace</p>
              <h2 className="mt-1 text-base font-bold text-slate-950">Choose what your agent researches</h2>
            </div>
          </div>

          <EnrichmentAgentPicker
            value={selectedAgentId}
            onChange={onAgentChange}
            onSelectedAgentChange={onSelectedAgentChange}
            showDescription
            className="mt-4"
          />

          <div className="mt-4 flex items-center justify-between gap-3">
            <Link href="/dashboard/settings/enrichment-agents" className="text-xs font-bold text-violet-700 hover:text-violet-900">
              Configure agents <IconArrowRight className="ml-0.5 inline" size={13} />
            </Link>
            <button
              type="button"
              onClick={onEnrich}
              disabled={selectedCount === 0 || enriching || hasLlmKey === false || !selectedAgentId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
              title={selectedCount === 0 ? 'Select leads in the table or board to start enrichment.' : undefined}
            >
              <IconSparkles size={14} />
              {enriching ? 'Starting…' : `Enrich ${selectedCount || ''} selected`}
            </button>
          </div>
          <p className="mt-3 text-[10px] leading-4 text-slate-500">
            The selected agent controls research modules, personas, and scoring. After enrichment, Outreach Engine
            writes the full personalized email from evidence — not a one-line opener.
          </p>
        </div>
      </div>
    </section>
  );
}
