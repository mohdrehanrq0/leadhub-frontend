'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { inputClass } from '@/components/ui/styles';
import {
  availableVariablesForLeads,
  computeTokenCoverage,
  getCoverageStatus,
  renderMessageTemplate,
  type TemplateLead,
  type TokenCoverage,
} from '@/lib/message-template';

type MessageTemplateEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  leads?: TemplateLead[];
  /** Called when the user needs to enroll leads before using variables. */
  onNeedLeads?: () => void;
};

function coverageChipClass(status: ReturnType<typeof getCoverageStatus>) {
  if (status === 'missing') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'warning') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-white text-slate-700 hover:border-brand-main/40 hover:text-brand-main';
}

function CoveragePanel({
  label,
  token,
  coverage,
  sample,
}: {
  label: string;
  token: string;
  coverage: TokenCoverage;
  sample: string | null;
}) {
  const status = getCoverageStatus(coverage);
  const barClass =
    status === 'missing' ? 'bg-rose-500' : status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          <div className="font-mono text-[11px] text-slate-500">{`{{${token}}}`}</div>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            status === 'missing'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : status === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {status === 'missing' ? 'Missing' : status === 'warning' ? 'Low coverage' : 'Ready'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-2.5 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-emerald-700/80">Have value</div>
          <div className="text-lg font-bold tabular-nums text-emerald-800">{coverage.withValue}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Missing</div>
          <div className="text-lg font-bold tabular-nums text-slate-700">{coverage.withoutValue}</div>
        </div>
      </div>
      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {coverage.withValue} of {coverage.total} leads
          </span>
          <span className="font-semibold tabular-nums text-slate-700">{coverage.coveragePct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${coverage.coveragePct}%` }} />
        </div>
      </div>
      {sample ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Sample from a lead</div>
          <div className="mt-0.5 text-sm text-slate-700">{sample}</div>
        </div>
      ) : null}
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        {status === 'missing'
          ? 'None of your selected leads have this value. The message will leave it blank unless you add a fallback.'
          : status === 'warning'
            ? 'Some selected leads are missing this value. Sending is still allowed — use a fallback like {{firstName|there}}.'
            : 'All selected leads have a value for this field.'}
      </p>
    </div>
  );
}

export function MessageTemplateEditor({
  value,
  onChange,
  disabled,
  leads = [],
  onNeedLeads,
}: MessageTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [selectedVar, setSelectedVar] = useState<string | null>(null);

  const hasLeads = leads.length > 0;
  const variables = useMemo(() => availableVariablesForLeads(leads), [leads]);

  useEffect(() => {
    if (previewIndex >= leads.length) setPreviewIndex(0);
  }, [leads.length, previewIndex]);

  useEffect(() => {
    if (selectedVar && !variables.some((v) => v.key === selectedVar)) {
      setSelectedVar(null);
    }
  }, [selectedVar, variables]);

  const previewLead = hasLeads ? leads[Math.min(previewIndex, leads.length - 1)] : null;
  const preview = useMemo(() => {
    if (!previewLead || !value.trim()) return '';
    return renderMessageTemplate(value, previewLead.vars, { seed: previewLead.id });
  }, [previewLead, value]);

  const selectedCoverage = selectedVar ? computeTokenCoverage(leads, selectedVar) : null;
  const selectedMeta = variables.find((v) => v.key === selectedVar);
  const selectedSample =
    selectedVar && previewLead
      ? (leads.find((lead) => typeof lead.vars[selectedVar] === 'string' && lead.vars[selectedVar]?.trim())
          ?.vars[selectedVar] ?? null)
      : null;

  function insertAtCursor(snippet: string) {
    if (!hasLeads || disabled) return;
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}${snippet}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="space-y-4">
      {!hasLeads ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Please select a lead to add a message template to use the variable.{' '}
          {onNeedLeads ? (
            <button
              type="button"
              onClick={onNeedLeads}
              className="font-semibold underline underline-offset-2"
            >
              Add leads first
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Variables from your {leads.length} selected lead{leads.length === 1 ? '' : 's'}
          </div>
          <div className="flex flex-wrap gap-2">
            {variables.length === 0 ? (
              <p className="text-sm text-slate-500">
                Selected leads don’t have personalization fields yet (name, company, title, location).
              </p>
            ) : (
              variables.map((variable) => {
                const coverage = computeTokenCoverage(leads, variable.key);
                const status = getCoverageStatus(coverage);
                const active = selectedVar === variable.key;
                return (
                  <button
                    key={variable.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelectedVar(variable.key);
                      insertAtCursor(variable.insert);
                    }}
                    className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition disabled:opacity-50 ${coverageChipClass(
                      status,
                    )} ${active ? 'ring-2 ring-brand-main/30' : ''}`}
                  >
                    <div>{variable.label}</div>
                    <div className="mt-0.5 tabular-nums opacity-80">
                      {coverage.withValue}/{coverage.total} leads
                      {status === 'missing' ? ' · missing' : status === 'warning' ? ' · low coverage' : ''}
                    </div>
                  </button>
                );
              })
            )}
            <button
              type="button"
              disabled={disabled || !hasLeads}
              onClick={() => insertAtCursor('{Hi|Hey|Hello}')}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-main/40 hover:text-brand-main disabled:opacity-50"
            >
              Spintax
            </button>
          </div>
          {selectedMeta && selectedCoverage ? (
            <CoveragePanel
              label={selectedMeta.label}
              token={selectedMeta.key}
              coverage={selectedCoverage}
              sample={typeof selectedSample === 'string' ? selectedSample : null}
            />
          ) : null}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        disabled={disabled || !hasLeads}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder={
          hasLeads
            ? '{Hi|Hey} {{firstName|there}}, saw your work at {{companyName}}…'
            : 'Select leads before writing a message template…'
        }
        className={`${inputClass} h-auto min-h-[160px] resize-y py-3 font-mono text-[13px] leading-relaxed disabled:bg-slate-50`}
      />

      <p className="text-xs text-slate-500">
        Use {'{{firstName|there}}'} for fallbacks and {'{Hi|Hey}'} for spin text. Connection requests are sent without a
        note; this message goes out after they accept (or immediately if already connected).
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Live preview</div>
          {hasLeads ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                disabled={leads.length <= 1}
                onClick={() => setPreviewIndex((i) => (i - 1 + leads.length) % leads.length)}
                aria-label="Previous lead"
              >
                <IconChevronLeft size={16} />
              </button>
              <select
                className="h-9 max-w-[220px] rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                value={String(Math.min(previewIndex, Math.max(leads.length - 1, 0)))}
                onChange={(e) => setPreviewIndex(Number(e.target.value))}
              >
                {leads.map((lead, index) => (
                  <option key={lead.id} value={String(index)}>
                    {lead.name}
                    {lead.vars.companyName ? ` · ${lead.vars.companyName}` : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                disabled={leads.length <= 1}
                onClick={() => setPreviewIndex((i) => (i + 1) % leads.length)}
                aria-label="Next lead"
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          ) : null}
        </div>
        {!hasLeads ? (
          <p className="text-sm text-slate-500">
            Please select a lead to add a message template to use the variable. Preview uses your real campaign leads —
            never sample text.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-slate-500">
              Showing rendered message for <span className="font-medium text-slate-700">{previewLead?.name}</span>
            </div>
            <p className="whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-800">
              {preview || '—'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
