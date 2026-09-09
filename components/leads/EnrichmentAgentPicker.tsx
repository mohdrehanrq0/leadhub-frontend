'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconRobot } from '@tabler/icons-react';
import api from '../../lib/api';

export type EnrichmentAgentSummary = {
  id: string;
  name: string;
  description?: string | null;
  mission?: string | null;
  isDefault: boolean;
  config?: {
    mission?: string;
    modules?: {
      company?: boolean;
      people?: boolean;
      hiring?: boolean;
      signals?: boolean;
      scoring?: boolean;
      outreach?: boolean;
      email?: boolean;
    };
    people?: {
      targets?: Array<{ objective?: string; roleHint?: string }>;
      maxPeople?: number;
    };
    outreachPolicy?: {
      objective?: string;
      style?: string;
      ctaType?: string;
    };
  };
};

type Props = {
  value: string;
  onChange: (agentId: string) => void;
  onSelectedAgentChange?: (agent: EnrichmentAgentSummary | null) => void;
  className?: string;
  compact?: boolean;
  hideLabel?: boolean;
  showDescription?: boolean;
};

const MODULE_LABELS: Array<{ key: string; label: string }> = [
  { key: 'company', label: 'Company' },
  { key: 'people', label: 'People' },
  { key: 'hiring', label: 'Hiring' },
  { key: 'signals', label: 'Signals' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'outreach', label: 'Outreach intel' },
  { key: 'email', label: 'Email' },
];

function agentOptionLabel(a: EnrichmentAgentSummary) {
  const targets = a.config?.people?.targets ?? [];
  const roles = targets
    .slice(0, 2)
    .map((t) => t.roleHint?.trim() || t.objective?.replace(/_/g, ' ') || 'role')
    .join(', ');
  const more = targets.length > 2 ? ` +${targets.length - 2}` : '';
  const peopleBit = roles ? ` · ${roles}${more}` : '';
  const outreachOn = a.config?.modules?.outreach !== false;
  return `${a.name}${a.isDefault ? ' (default)' : ''}${peopleBit}${outreachOn ? ' · +email' : ''}`;
}

function agentBlurb(agent: EnrichmentAgentSummary | null, loading: boolean): string {
  if (loading) return 'Loading the agents available to this workspace…';
  if (!agent) return 'Create an enrichment agent to control who to find, what to research, and how outreach is prepared.';

  const mission = (agent.mission || agent.config?.mission || '').trim();
  if (mission) return mission;

  if (agent.description?.trim()) return agent.description.trim();

  const modules = agent.config?.modules ?? {};
  const on = MODULE_LABELS.filter((m) => {
    const flag = modules[m.key as keyof typeof modules];
    return flag !== false;
  }).map((m) => m.label);
  const objective = agent.config?.outreachPolicy?.objective?.replace(/_/g, ' ');
  const parts = [
    on.length ? `Researches: ${on.join(', ')}.` : null,
    modules.outreach !== false
      ? `Then the Outreach Engine writes a personalized email using a signal-specific template${objective ? ` (objective: ${objective})` : ''}.`
      : 'Outreach email generation is off for this agent.',
  ].filter(Boolean);
  return parts.join(' ') || 'Controls enrichment research for this lead.';
}

export function EnrichmentAgentPicker({
  value,
  onChange,
  onSelectedAgentChange,
  className = '',
  compact = false,
  hideLabel = false,
  showDescription = false,
}: Props) {
  const [agents, setAgents] = useState<EnrichmentAgentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/enrichment-agents');
        const rows: EnrichmentAgentSummary[] = res.data.data ?? [];
        if (cancelled) return;
        setAgents(rows);
        if (!value && rows.length) {
          const def = rows.find((a) => a.isDefault) ?? rows[0];
          onChange(def.id);
        }
      } catch {
        if (!cancelled) setAgents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === value) ?? null,
    [agents, value],
  );

  useEffect(() => {
    onSelectedAgentChange?.(selectedAgent);
  }, [onSelectedAgentChange, selectedAgent]);

  const blurb = agentBlurb(selectedAgent, loading);
  const modules = selectedAgent?.config?.modules ?? {};
  const activeModules = MODULE_LABELS.filter((m) => {
    const flag = modules[m.key as keyof NonNullable<EnrichmentAgentSummary['config']>['modules']];
    return flag !== false;
  });

  if (hideLabel) {
    return (
      <div className={`relative inline-flex flex-col items-stretch ${className}`}>
        <div className="relative inline-flex items-center">
          <div className="pointer-events-none absolute left-3 flex items-center text-slate-400">
            <IconRobot size={14} />
          </div>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={loading || agents.length === 0}
            className={`h-10 min-w-[210px] max-w-[320px] rounded-xl border border-slate-200 bg-white/90 pl-8 pr-7 text-xs font-semibold text-slate-700 shadow-xs outline-none transition hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 ${
              compact ? 'max-w-[280px]' : 'w-full'
            }`}
            title={blurb}
          >
            {agents.length === 0 ? (
              <option value="">{loading ? 'Loading agents…' : 'No agents configured'}</option>
            ) : (
              agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {agentOptionLabel(a)}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-start gap-2 ${className}`}>
      <div className={showDescription ? 'min-w-0 flex-1' : ''}>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Research agent
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading || agents.length === 0}
          className={`mt-1 block rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 ${
            compact ? 'max-w-[260px]' : 'w-full'
          }`}
          title={blurb}
        >
          {agents.length === 0 ? (
            <option value="">{loading ? 'Loading agents…' : 'No agents configured'}</option>
          ) : (
            agents.map((a) => (
              <option key={a.id} value={a.id}>
                {agentOptionLabel(a)}
              </option>
            ))
          )}
        </select>
        {showDescription && (
          <div className="mt-2 space-y-2">
            <p className="text-xs leading-5 text-slate-600">{blurb}</p>
            {activeModules.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {activeModules.map((m) => (
                  <span
                    key={m.key}
                    className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600"
                  >
                    {m.label}
                  </span>
                ))}
                {modules.outreach !== false ? (
                  <Link
                    href="/dashboard/settings/outreach-templates"
                    className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 hover:bg-violet-100"
                  >
                    Email templates →
                  </Link>
                ) : null}
              </div>
            ) : null}
            <p className="text-[11px] leading-4 text-slate-500">
              Enrichment finds facts. The Outreach Engine turns them into a full email using a
              hiring / funding / growth template — not a one-line opener.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
