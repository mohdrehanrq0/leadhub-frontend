'use client';

import React, { useMemo, useState } from 'react';
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
  const [currentAgent, setCurrentAgent] = useState<EnrichmentAgentSummary | null>(null);

  const handleAgentChange = (agent: EnrichmentAgentSummary | null) => {
    setCurrentAgent(agent);
    onSelectedAgentChange(agent);
  };

  const completed = leads.filter((lead) => lead.enrichmentStatus === 'completed' || lead.enrichmentStatus === 'partial').length;
  const researching = leads.filter((lead) => lead.enrichmentStatus === 'in_progress').length;
  const needsResearch = Math.max(0, leads.length - completed - researching);

  const metrics = [
    { label: 'Pipeline records', value: totalCount.toLocaleString(), detail: `${leads.length.toLocaleString()} loaded`, icon: IconUsers, tone: 'text-blue-700 bg-blue-50/70 border-blue-100 hover:border-blue-200' },
    { label: 'Needs research', value: needsResearch.toLocaleString(), detail: 'in current view', icon: IconSparkles, tone: 'text-violet-700 bg-violet-50/70 border-violet-100 hover:border-violet-200' },
    { label: 'Researching now', value: researching.toLocaleString(), detail: 'active jobs', icon: IconClock, tone: 'text-amber-700 bg-amber-50/70 border-amber-100 hover:border-amber-200' },
    { label: 'Intelligence ready', value: completed.toLocaleString(), detail: 'ready for outreach', icon: IconCircleCheck, tone: 'text-emerald-700 bg-emerald-50/70 border-emerald-100 hover:border-emerald-200' },
  ];

  const agentMissionText = useMemo(() => {
    if (!currentAgent) return 'Select an agent to preview research scope.';
    const mission = (currentAgent.mission || currentAgent.config?.mission || currentAgent.description || '').trim();
    return mission || 'Researches company, intent signals, and prepares outreach.';
  }, [currentAgent]);

  const activeModuleLabels = useMemo(() => {
    if (!currentAgent?.config?.modules) return [];
    const mods = currentAgent.config.modules;
    const labels: string[] = [];
    if (mods.company !== false) labels.push('Company');
    if (mods.people !== false) labels.push('People');
    if (mods.hiring !== false) labels.push('Hiring');
    if (mods.signals !== false) labels.push('Signals');
    if (mods.scoring !== false) labels.push('Scoring');
    if (mods.outreach !== false) labels.push('Outreach');
    if (mods.email !== false) labels.push('Email');
    return labels;
  }, [currentAgent]);

  const hasOutreachModule = currentAgent?.config?.modules?.outreach !== false;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      <div className="grid divide-y divide-slate-100 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.9fr)] lg:divide-x lg:divide-y-0">
        {/* Left: Pipeline Cockpit */}
        <div className="flex flex-col justify-between p-3 sm:p-3.5">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Pipeline cockpit</p>
                <h2 className="text-xs font-bold text-slate-900 leading-tight">Move accounts forward</h2>
              </div>
              <button
                type="button"
                onClick={() => onStageChange('all')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-blue-700 transition"
              >
                All stages ({totalCount.toLocaleString()}) <IconArrowRight size={12} />
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-all ${tone}`}
                >
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/90 text-current shadow-2xs">
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0 flex-1 leading-none">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-slate-900">{value}</span>
                      <span className="truncate text-[10px] font-bold text-slate-700">{label}</span>
                    </div>
                    <p className="truncate text-[9px] opacity-60 leading-none mt-0.5">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 thin-scrollbar">
            {PIPELINE_STAGES.map((stage) => {
              const count = leads.filter((lead) => lead.pipelineStage === stage.value).length;
              const active = activeStage === stage.value;
              return (
                <button
                  key={stage.value}
                  type="button"
                  onClick={() => onStageChange(active ? 'all' : stage.value)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200/90 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/60'
                  }`}
                >
                  <span>{stage.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                      active ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Enrichment Workspace */}
        <div className="flex flex-col justify-between bg-gradient-to-br from-violet-50/70 via-white to-blue-50/30 p-3 sm:p-3.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-violet-600 text-white shadow-xs">
                  <IconRobot size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">Enrichment workspace</p>
                  <h2 className="text-xs font-bold text-slate-900 leading-tight">Agent intelligence</h2>
                </div>
              </div>
              <Link
                href="/dashboard/settings/enrichment-agents"
                className="inline-flex items-center gap-0.5 text-[11px] font-bold text-violet-700 hover:text-violet-900 transition"
              >
                Configure <IconArrowRight size={12} />
              </Link>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <EnrichmentAgentPicker
                  value={selectedAgentId}
                  onChange={onAgentChange}
                  onSelectedAgentChange={handleAgentChange}
                  hideLabel
                  className="w-full"
                />
              </div>

              <button
                type="button"
                onClick={onEnrich}
                disabled={selectedCount === 0 || enriching || hasLlmKey === false || !selectedAgentId}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                title={selectedCount === 0 ? 'Select leads in the table or board to start enrichment.' : undefined}
              >
                <IconSparkles size={14} />
                {enriching ? 'Starting…' : selectedCount > 0 ? `Enrich (${selectedCount})` : 'Enrich selected'}
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100/90 pt-1.5 text-[11px]">
            <p
              className="min-w-0 flex-1 truncate text-[11px] text-slate-500"
              title={agentMissionText}
            >
              {agentMissionText}
            </p>
            {activeModuleLabels.length > 0 && (
              <div className="flex shrink-0 items-center gap-1">
                {activeModuleLabels.slice(0, 4).map((label) => (
                  <span
                    key={label}
                    className="rounded-md border border-slate-200/80 bg-white/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600"
                  >
                    {label}
                  </span>
                ))}
                {activeModuleLabels.length > 4 && (
                  <span className="text-[9px] font-bold text-slate-400">
                    +{activeModuleLabels.length - 4}
                  </span>
                )}
                {hasOutreachModule && (
                  <Link
                    href="/dashboard/settings/outreach-templates"
                    className="rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700 hover:bg-violet-100 transition"
                  >
                    Templates →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
