'use client';

import React, { useMemo } from 'react';
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react';
import {
  SYSTEM_FIELDS,
  TIER_LABEL,
  type DetectedMapping,
  type FieldMapping,
  type MappedLeadInput,
  type SystemFieldKey,
  assessEnrichmentReadiness,
  mappingHasAnchor,
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
  contact: 'Contact',
  company: 'Company',
  other: 'Other',
} as const;

function confidenceBadge(level?: 'high' | 'medium' | 'low') {
  if (!level) return null;
  const styles =
    level === 'high'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : level === 'medium'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-50 text-slate-500 border-slate-200';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles}`}>
      {level === 'high' ? 'Matched' : level === 'medium' ? 'Likely' : 'Guess'}
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

  const hasAnchor = mappingHasAnchor(mapping);

  return (
    <div className="space-y-4">
      {!hasAnchor && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-black text-rose-900">
              Map a company column before importing
            </p>
            <p className="mt-1 text-xs leading-5 text-rose-700">
              Pick a column for the company website, company name, or company LinkedIn URL.
              Without one there is no way to tell which company a row belongs to, and none of
              these rows could ever be enriched.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-950">Match your columns</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              We mapped {sourceLabel} columns automatically. Fix anything that looks off.
              The company website is what makes enrichment reliable — map it if you have it.
            </p>
          </div>
          {readiness && (
            <div className="flex flex-wrap gap-2 text-xs">
              {readiness.ready > 0 && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                  {readiness.ready} ready
                </span>
              )}
              {readiness.needsDiscovery > 0 && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-bold text-amber-700">
                  {readiness.needsDiscovery} need discovery
                </span>
              )}
              {readiness.rejected > 0 && (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-bold text-rose-700">
                  {readiness.rejected} unusable
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {(['contact', 'company', 'other'] as const).map((group) => (
        <section key={group} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              {GROUP_LABELS[group]}
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {groupedFields[group].map((field) => (
              <div
                key={field.key}
                className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] md:items-center"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{field.label}</p>
                  {field.requiredForEnrichment && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                      Required
                    </span>
                  )}
                  {field.recommendedForEnrichment && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      Recommended
                    </span>
                  )}
                </div>

                <select
                  value={mapping[field.key] ?? ''}
                  onChange={(event) => updateMapping(field.key, event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300"
                >
                  <option value="">Skip</option>
                  {sourceFields.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>

                <div className="flex justify-start md:justify-end">
                  {confidenceBadge(confidence?.[field.key])}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {previewRows.length > 0 && mappedPreviewRows && mappedPreviewRows.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-black text-slate-950">Preview</h3>
            <p className="text-xs text-slate-500">
              First {Math.min(sampleSize, mappedPreviewRows.length)} mapped rows
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="p-3 font-bold">Contact</th>
                  <th className="p-3 font-bold">Email</th>
                  <th className="p-3 font-bold">Company</th>
                  <th className="p-3 font-bold">Domain</th>
                  <th className="p-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mappedPreviewRows.slice(0, sampleSize).map((row, index) => {
                  const status = assessEnrichmentReadiness(row);
                  return (
                    <tr key={index} className="hover:bg-slate-50/60">
                      <td className="p-3 font-bold text-slate-800">
                        {[row.contact.firstName, row.contact.lastName].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="p-3 text-slate-600">{row.contact.email || '—'}</td>
                      <td className="p-3 text-slate-600">{row.company.name || '—'}</td>
                      <td className="p-3 text-slate-600">{row.company.domain || '—'}</td>
                      <td className="p-3">
                        {status.enrichable ? (
                          <span
                            title={status.reason}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
                          >
                            <IconCheck size={12} /> {TIER_LABEL[status.tier]}
                          </span>
                        ) : status.tier === 'discovery' ? (
                          <span
                            title={status.reason}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700"
                          >
                            <IconAlertTriangle size={12} /> Needs website
                          </span>
                        ) : (
                          <span
                            title={status.reason}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700"
                          >
                            <IconAlertTriangle size={12} /> No company
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
