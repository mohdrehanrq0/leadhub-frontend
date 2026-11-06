'use client';

import { useState } from 'react';
import { IconPlus, IconX } from '@tabler/icons-react';
import { btnPrimary, inputClass } from '@/components/ui/styles';
import {
  DEPARTMENT_OPTIONS,
  SENIORITY_OPTIONS,
  type Department,
  type PersonaPreset,
  type PersonaSpec,
  type Seniority,
} from '@/lib/persona-types';
import { cn } from '@/lib/utils';

function ChipEditor({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-zinc-700">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-800"
          >
            {v}
            <button
              type="button"
              className="text-zinc-500 hover:text-zinc-900"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
            >
              <IconX className="h-3 w-3" />
            </button>
          </span>
        ))}
        <form
          className="inline-flex gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const t = draft.trim();
            if (!t || values.includes(t)) return;
            onChange([...values, t]);
            setDraft('');
          }}
        >
          <input
            className={cn(inputClass, 'h-7 w-40 text-xs')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder ?? 'Add…'}
          />
          <button type="submit" className="text-xs text-zinc-600 hover:text-zinc-900">
            <IconPlus className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export function PersonaBuilder({
  persona,
  presets,
  confirmed,
  drafting,
  onChange,
  onConfirm,
  onPickPreset,
  onDraft,
}: {
  persona: PersonaSpec;
  presets: PersonaPreset[];
  confirmed: boolean;
  drafting?: boolean;
  onChange: (next: PersonaSpec) => void;
  onConfirm: () => void;
  onPickPreset: (preset: PersonaPreset) => void;
  onDraft?: () => void;
}) {
  function edit(patch: Partial<PersonaSpec>) {
    onChange({
      ...persona,
      ...patch,
      source: 'user_edited',
      confirmedAt: undefined,
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Who are we looking for?</h3>
          <p className="text-xs text-zinc-500">
            Tell us exactly who you want. We only charge when we find a current employee who matches.
          </p>
        </div>
        {confirmed ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Confirmed
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            Confirm to run
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-zinc-500 self-center">Presets:</span>
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs hover:bg-zinc-50"
            onClick={() => onPickPreset(p)}
          >
            {p.label}
          </button>
        ))}
        {onDraft ? (
          <button
            type="button"
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs hover:bg-zinc-50"
            onClick={onDraft}
            disabled={drafting}
          >
            {drafting ? 'Drafting…' : 'Draft from goal'}
          </button>
        ) : null}
      </div>

      <ChipEditor
        label="Departments"
        values={persona.departments.map(
          (d) => DEPARTMENT_OPTIONS.find((o) => o.value === d)?.label ?? d,
        )}
        onChange={(labels) => {
          const departments = labels
            .map((label) => DEPARTMENT_OPTIONS.find((o) => o.label === label || o.value === label)?.value)
            .filter(Boolean) as Department[];
          edit({ departments: departments.length ? departments : ['custom'] });
        }}
        placeholder="Add department"
      />

      <ChipEditor
        label="Titles to include"
        values={persona.titlesInclude}
        onChange={(titlesInclude) => edit({ titlesInclude })}
        placeholder="e.g. Head of People"
      />

      <ChipEditor
        label="Titles to exclude"
        values={persona.titlesExclude}
        onChange={(titlesExclude) => edit({ titlesExclude })}
        placeholder="e.g. intern"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700">Minimum level</span>
          <select
            className={inputClass}
            value={persona.seniorityMin}
            onChange={(e) => edit({ seniorityMin: e.target.value as Seniority })}
          >
            {SENIORITY_OPTIONS.filter((o) => o.value !== 'any').map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700">Maximum level</span>
          <select
            className={inputClass}
            value={persona.seniorityMax ?? 'any'}
            onChange={(e) =>
              edit({
                seniorityMax:
                  e.target.value === 'any' ? undefined : (e.target.value as Seniority),
              })
            }
          >
            {SENIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-zinc-700">Location</span>
          <input
            className={inputClass}
            value={persona.location?.country ?? ''}
            placeholder="e.g. India"
            onChange={(e) =>
              edit({
                location: {
                  country: e.target.value || undefined,
                  city: persona.location?.city,
                  strict: persona.location?.strict ?? false,
                },
              })
            }
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={persona.location?.strict === true}
          onChange={(e) =>
            edit({
              location: {
                country: persona.location?.country,
                city: persona.location?.city,
                strict: e.target.checked,
              },
            })
          }
        />
        Strict location
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-zinc-700">If not found try (fallback)</div>
          <button
            type="button"
            className="text-xs text-zinc-600 hover:text-zinc-900"
            disabled={(persona.fallbackLadder?.length ?? 0) >= 2}
            onClick={() => {
              const ladder = [...(persona.fallbackLadder ?? [])];
              if (ladder.length >= 2) return;
              ladder.push({
                id: crypto.randomUUID(),
                label: 'Founder',
                departments: ['founder_exec'],
                titlesInclude: ['Founder', 'CEO'],
                titlesExclude: ['advisor'],
                seniorityMin: 'c_level',
                source: 'user_edited',
              });
              edit({ fallbackLadder: ladder });
            }}
          >
            + add fallback
          </button>
        </div>
        {(persona.fallbackLadder ?? []).map((rung, i) => (
          <div
            key={rung.id}
            className="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs"
          >
            <span>
              {i + 1}. {rung.label} · {rung.titlesInclude.slice(0, 2).join(', ')}
            </span>
            <button
              type="button"
              onClick={() =>
                edit({
                  fallbackLadder: (persona.fallbackLadder ?? []).filter((r) => r.id !== rung.id),
                })
              }
            >
              <IconX className="h-3.5 w-3.5 text-zinc-500" />
            </button>
          </div>
        ))}
      </div>

      <button type="button" className={btnPrimary} onClick={onConfirm} disabled={confirmed}>
        {confirmed ? 'Persona confirmed' : 'Confirm persona'}
      </button>
    </div>
  );
}
