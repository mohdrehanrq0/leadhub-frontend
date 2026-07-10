'use client';

import React, { useMemo } from 'react';
import { IconAlertTriangle, IconCheck, IconSparkles } from '@tabler/icons-react';
import {
  SYSTEM_FIELDS,
  type DetectedMapping,
  type FieldMapping,
  type MappedLeadInput,
  type SystemFieldKey,
  assessEnrichmentReadiness,
  summarizeReadiness,
} from '../../lib/lead-field-mapping';

type FieldMappingPanelProps = {
  sourceLabel: string;
  sourceFields: string[];
  mapping: FieldMapping;
  confidence?: DetectedMapping['confidence'];
  onMappingChange: (mapping: FieldMapping) => void;
  previewRows?: Record<string, unknown>[];
  mappedPreviewRows?: MappedLeadInput[];
  sampleSize?: number;
};

const GROUP_LABELS = {
  contact: 'Contact Fields',
  company: 'Company Fields',
  other: 'Other',
} as const;

function confidenceBadge(level?: 'high' | 'medium' | 'low') {
  if (!level) return null;
  const styles =
    level === 'high'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : level === 'medium'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${styles}`}>
      Auto {level}
    </span>
  );
}

export function FieldMappingPanel({
  sourceLabel,
  sourceFields,
  mapping,
  confidence,
  onMappingChange,
  previewRows = [],
  mappedPreviewRows,
  sampleSize = 3,
}: FieldMappingPanelProps) {
  const groupedFields = useMemo(() => {
    return {
      contact: SYSTEM_FIELDS.filter((field) => field.group === 'contact'),
      company: SYSTEM_FIELDS.filter((field) => field.group === 'company'),
      other: SYSTEM_FIELDS.filter((field) => field.group === 'other'),
    };
  }, []);

  const readiness = useMemo(() => {
    if (!mappedPreviewRows?.length) return null;
    return summarizeReadiness(mappedPreviewRows);
  }, [mappedPreviewRows]);

  const updateMapping = (systemKey: SystemFieldKey, sourceKey: string) => {
    const next = { ...mapping };
    if (!sourceKey) delete next[systemKey];
    else next[systemKey] = sourceKey;
    onMappingChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
            <IconSparkles size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-950">Field mapping for {sourceLabel}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              We auto-detected how your source fields map to LeadHub. Review and adjust any mapping before importing.
              Enrichment requires <span className="font-bold text-slate-800">company name + location</span> only —
              person name is optional (the research agent finds founders / decision-makers).
            </p>
          </div>
        </div>
        {readiness && (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs">
              <p className="font-black text-emerald-700">{readiness.enrichable} ready</p>
              <p className="text-slate-500">Enrichment-ready rows</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs">
              <p className="font-black text-amber-700">{readiness.partial} partial</p>
              <p className="text-slate-500">Missing recommended fields</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs">
              <p className="font-black text-rose-700">{readiness.notReady} not ready</p>
              <p className="text-slate-500">Missing required fields</p>
            </div>
          </div>
        )}
      </div>

      {(['contact', 'company', 'other'] as const).map((group) => (
        <section key={group} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{GROUP_LABELS[group]}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {groupedFields[group].map((field) => (
              <div key={field.key} className="grid gap-3 px-4 py-3 md:grid-cols-[1.1fr_1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-slate-900">{field.label}</p>
                    {field.requiredForEnrichment && (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-700">
                        Required for enrichment
                      </span>
                    )}
                    {field.recommendedForEnrichment && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                        Recommended
                      </span>
                    )}
                    {field.key.startsWith('contact.') &&
                      ['contact.firstName', 'contact.lastName', 'contact.fullName'].includes(field.key) && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">{field.key}</p>
                </div>

                <select
                  value={mapping[field.key] ?? ''}
                  onChange={(event) => updateMapping(field.key, event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-300"
                >
                  <option value="">Do not import</option>
                  {sourceFields.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>

                <div className="flex justify-start md:justify-end">{confidenceBadge(confidence?.[field.key])}</div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {previewRows.length > 0 && mappedPreviewRows && mappedPreviewRows.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-black text-slate-950">Mapped preview</h3>
            <p className="text-xs text-slate-500">First {Math.min(sampleSize, previewRows.length)} rows after mapping.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Domain</th>
                  <th className="p-3">Enrichment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mappedPreviewRows.slice(0, sampleSize).map((row, index) => {
                  const status = assessEnrichmentReadiness(row);
                  return (
                    <tr key={index}>
                      <td className="p-3 font-bold text-slate-800">
                        {[row.contact.firstName, row.contact.lastName].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="p-3 text-slate-600">{row.contact.email || '—'}</td>
                      <td className="p-3 text-slate-600">{row.company.name || '—'}</td>
                      <td className="p-3 text-slate-600">{row.company.domain || '—'}</td>
                      <td className="p-3">
                        {status.enrichable ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                            <IconCheck size={12} /> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700">
                            <IconAlertTriangle size={12} /> {status.missingRequired.join(', ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
