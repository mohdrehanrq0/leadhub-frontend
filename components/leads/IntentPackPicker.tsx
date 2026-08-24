'use client';

export type IntentPackId =
  | 'decision_maker'
  | 'founder'
  | 'hiring_authority'
  | 'sales_leader'
  | 'marketing_leader'
  | 'technology_decision_maker'
  | 'operations'
  | 'finance'
  | 'multiple_stakeholders'
  | 'custom';

export const INTENT_PACK_OPTIONS: Array<{ id: IntentPackId; label: string }> = [
  { id: 'decision_maker', label: 'Decision maker' },
  { id: 'founder', label: 'Founder' },
  { id: 'hiring_authority', label: 'Hiring authority' },
  { id: 'sales_leader', label: 'Sales leader' },
  { id: 'marketing_leader', label: 'Marketing leader' },
  { id: 'technology_decision_maker', label: 'Technical leader' },
  { id: 'operations', label: 'Operations' },
  { id: 'finance', label: 'Finance' },
  { id: 'multiple_stakeholders', label: 'Multiple stakeholders' },
  { id: 'custom', label: 'Custom role' },
];

type Props = {
  value: IntentPackId;
  onChange: (pack: IntentPackId) => void;
  roleHint?: string;
  onRoleHintChange?: (hint: string) => void;
  className?: string;
  compact?: boolean;
};

export function IntentPackPicker({
  value,
  onChange,
  roleHint = '',
  onRoleHintChange,
  className = '',
  compact = false,
}: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Find
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as IntentPackId)}
        className={`rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 ${
          compact ? 'max-w-[160px]' : ''
        }`}
      >
        {INTENT_PACK_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {value === 'custom' && onRoleHintChange ? (
        <input
          type="text"
          value={roleHint}
          onChange={(e) => onRoleHintChange(e.target.value)}
          placeholder="e.g. Head of Talent"
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 min-w-[140px]"
        />
      ) : null}
    </div>
  );
}
