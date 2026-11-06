'use client';

import { cn } from '@/lib/utils';
import { inputClass } from '@/components/ui/styles';

export const TARGET_ROLE_PRESETS = [
  { id: 'founder', label: 'Founder / CEO / Owner' },
  { id: 'cto', label: 'CTO / Head of Engineering' },
  { id: 'sales', label: 'Head of Sales' },
  { id: 'marketing', label: 'Head of Marketing' },
  { id: 'hr', label: 'HR / People' },
] as const;

export function RoleListInput({
  value,
  onChange,
  required,
  description,
}: {
  /** Comma-separated role ids / custom titles */
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
  description?: string;
}) {
  const selected = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const customParts = selected.filter(
    (s) => !TARGET_ROLE_PRESETS.some((p) => p.id === s),
  );
  const customRole = customParts.join(', ');

  function toggle(id: string) {
    const set = new Set(selected);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    // keep custom text after presets
    const presets = TARGET_ROLE_PRESETS.map((p) => p.id).filter((id) => set.has(id));
    const customs = [...set].filter((s) => !TARGET_ROLE_PRESETS.some((p) => p.id === s));
    onChange([...presets, ...customs].join(','));
  }

  function setCustom(text: string) {
    const presets = selected.filter((s) => TARGET_ROLE_PRESETS.some((p) => p.id === s));
    const customs = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onChange([...presets, ...customs].join(','));
  }

  return (
    <div className="space-y-3">
      {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      <div className="flex flex-wrap gap-2">
        {TARGET_ROLE_PRESETS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => toggle(r.id)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              selected.includes(r.id)
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Custom title / position
          {required && selected.length === 0 ? (
            <span className="text-red-500"> *</span>
          ) : null}
        </label>
        <input
          className={inputClass}
          type="text"
          placeholder="e.g. VP Customer Success"
          value={customRole}
          onChange={(e) => setCustom(e.target.value)}
        />
      </div>
      {required && selected.length === 0 ? (
        <p className="text-xs text-rose-600">Pick at least one target position or role.</p>
      ) : null}
    </div>
  );
}
