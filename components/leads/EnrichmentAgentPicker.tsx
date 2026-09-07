'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { IconRobot } from '@tabler/icons-react';
import api from '../../lib/api';

export type EnrichmentAgentSummary = {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  config?: {
    people?: {
      targets?: Array<{ objective?: string; roleHint?: string }>;
      maxPeople?: number;
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

function agentOptionLabel(a: EnrichmentAgentSummary) {
  const targets = a.config?.people?.targets ?? [];
  const roles = targets
    .slice(0, 2)
    .map((t) => t.roleHint?.trim() || t.objective?.replace(/_/g, ' ') || 'role')
    .join(', ');
  const more = targets.length > 2 ? ` +${targets.length - 2}` : '';
  const peopleBit = roles ? ` · ${roles}${more}` : '';
  return `${a.name}${a.isDefault ? ' (default)' : ''}${peopleBit}`;
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

  if (hideLabel) {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
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
          title={selectedAgent?.description ?? undefined}
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
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className={showDescription ? 'min-w-0 flex-1' : ''}>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Research agent</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading || agents.length === 0}
          className={`mt-1 block rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 ${
            compact ? 'max-w-[260px]' : 'w-full'
          }`}
          title={selectedAgent?.description ?? undefined}
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
          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">
            {selectedAgent?.description ||
              (loading
                ? 'Loading the agents available to this workspace…'
                : 'Create an enrichment agent to control the data your team researches.')}
          </p>
        )}
      </div>
    </div>
  );
}
