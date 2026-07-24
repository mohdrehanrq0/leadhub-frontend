'use client';

import { useState } from 'react';
import { IconFilter, IconPlus, IconX } from '@tabler/icons-react';
import {
  EXTRA_FILTER_OPTIONS,
  type ExtraFilterChip,
  type ExtraFilterField,
} from './filterTypes';

type Props = {
  chips: ExtraFilterChip[];
  onChange: (chips: ExtraFilterChip[]) => void;
};

function defaultValueForField(field: ExtraFilterField): string {
  if (field === 'hasEmail' || field === 'hasWebsite') return 'true';
  if (field === 'priority') return 'warm';
  if (field === 'enrichmentStatus') return 'completed';
  if (field === 'emailVerificationStatus') return 'valid';
  return '';
}

function chipLabel(chip: ExtraFilterChip): string {
  const meta = EXTRA_FILTER_OPTIONS.find((o) => o.field === chip.field);
  const base = meta?.label ?? chip.field;
  if (chip.field === 'hasEmail' || chip.field === 'hasWebsite') {
    return `${base}: ${chip.value === 'true' ? 'Yes' : 'No'}`;
  }
  if (
    chip.field === 'priority' ||
    chip.field === 'enrichmentStatus' ||
    chip.field === 'emailVerificationStatus'
  ) {
    const pretty = chip.value.replace(/_/g, ' ');
    return `${base}: ${pretty}`;
  }
  return `${base}: ${chip.value || '…'}`;
}

export function LeadFilterChips({ chips, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draftField, setDraftField] = useState<ExtraFilterField>('hasEmail');
  const [draftValue, setDraftValue] = useState('true');

  const addChip = () => {
    const value =
      draftField === 'location' || draftField === 'role'
        ? draftValue.trim()
        : draftValue || defaultValueForField(draftField);
    if ((draftField === 'location' || draftField === 'role') && !value) return;

    // Replace existing chip for same boolean/enum field so we don't conflicting AND
    const withoutDup =
      draftField === 'hasEmail' ||
      draftField === 'hasWebsite' ||
      draftField === 'priority' ||
      draftField === 'enrichmentStatus' ||
      draftField === 'emailVerificationStatus'
        ? chips.filter((c) => c.field !== draftField)
        : chips;

    onChange([
      ...withoutDup,
      {
        id: `${draftField}-${Date.now()}`,
        field: draftField,
        value,
      },
    ]);
    setOpen(false);
    setDraftField('hasEmail');
    setDraftValue('true');
  };

  const removeChip = (id: string) => onChange(chips.filter((c) => c.id !== id));

  const onFieldChange = (field: ExtraFilterField) => {
    setDraftField(field);
    setDraftValue(defaultValueForField(field));
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <IconFilter size={14} />
          Add Filter
          <IconPlus size={12} className="text-slate-400" />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Field</label>
            <select
              value={draftField}
              onChange={(e) => onFieldChange(e.target.value as ExtraFilterField)}
              className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none"
            >
              {EXTRA_FILTER_OPTIONS.map((opt) => (
                <option key={opt.field} value={opt.field}>
                  {opt.label}
                </option>
              ))}
            </select>

            {(draftField === 'hasEmail' || draftField === 'hasWebsite') && (
              <select
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            )}

            {(draftField === 'location' || draftField === 'role') && (
              <input
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                placeholder={draftField === 'location' ? 'City or country' : 'e.g. Founder'}
                className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none"
              />
            )}

            {draftField === 'priority' && (
              <select
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                <option value="unknown">Unknown</option>
              </select>
            )}

            {draftField === 'enrichmentStatus' && (
              <select
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="completed">Fully enriched</option>
                <option value="partial">Partial</option>
                <option value="in_progress">Enriching...</option>
                <option value="failed">Failed</option>
                <option value="not_started">Not Enriched</option>
              </select>
            )}

            {draftField === 'emailVerificationStatus' && (
              <select
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="valid">Valid email</option>
                <option value="invalid">Invalid</option>
                <option value="catch_all">Catch-all</option>
                <option value="disposable">Disposable</option>
                <option value="unknown">Unknown / unverified</option>
              </select>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addChip}
                className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-800"
        >
          {chipLabel(chip)}
          <button
            type="button"
            onClick={() => removeChip(chip.id)}
            className="rounded-full p-0.5 text-violet-500 hover:bg-violet-100 hover:text-violet-900"
            aria-label="Remove filter"
          >
            <IconX size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}
