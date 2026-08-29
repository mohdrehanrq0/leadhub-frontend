'use client';

import React, { useEffect, useState } from 'react';
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
  className?: string;
  compact?: boolean;
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

export function EnrichmentAgentPicker({ value, onChange, className = '', compact = false }: Props) {
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

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Agent</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || agents.length === 0}
        className={`rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 ${
          compact ? 'max-w-[260px]' : ''
        }`}
        title={agents.find((a) => a.id === value)?.description ?? undefined}
      >
        {agents.length === 0 ? (
          <option value="">No agents</option>
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
