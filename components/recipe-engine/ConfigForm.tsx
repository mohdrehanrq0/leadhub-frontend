'use client';

import type { ConfigFieldSchema } from '@/lib/recipe-engine-api';
import { settingsInputClass } from '@/components/settings/primitives';
import { cn } from '@/lib/utils';

function listText(value: unknown): string {
  if (Array.isArray(value)) return value.join('\n');
  return typeof value === 'string' ? value : '';
}

function parseList(text: string): string[] {
  return text.split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
}

/** Config form generated from a node's configSchema. */
export function ConfigForm({
  schema,
  value,
  onChange,
  compact = false,
}: {
  schema: ConfigFieldSchema[];
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** Denser controls for the flow inspector. */
  compact?: boolean;
}) {
  const inputClass = compact
    ? 'h-8 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-main focus:ring-2 focus:ring-brand-main/20'
    : settingsInputClass;
  const labelClass = compact
    ? 'mb-1 block text-[11px] font-medium text-slate-700'
    : 'mb-1 block text-sm font-medium text-slate-700';
  const helpClass = compact ? 'mt-1 block text-[10px] text-slate-400' : 'mt-1 block text-xs text-slate-400';

  if (!schema.length) {
    return <p className="text-xs text-slate-500">No configuration needed.</p>;
  }
  return (
    <div className={cn(compact ? 'space-y-3' : 'space-y-4')}>
      {schema.map((field) => {
        const current = value[field.key] ?? field.default ?? '';
        return (
          <label key={field.key} className="block">
            <span className={labelClass}>
              {field.label}{field.required ? ' *' : ''}
            </span>
            {field.type === 'textarea' || field.type === 'string_list' || field.type === 'url_list' ? (
              <textarea
                className={cn(inputClass, compact ? 'h-auto min-h-16 py-1.5' : 'h-auto min-h-20 py-2')}
                value={field.type === 'textarea' ? String(current ?? '') : listText(current)}
                placeholder={field.placeholder}
                onChange={(e) =>
                  onChange({ ...value, [field.key]: field.type === 'textarea' ? e.target.value : parseList(e.target.value) })
                }
              />
            ) : field.type === 'boolean' ? (
              <input
                type="checkbox"
                className="h-3.5 w-3.5 accent-brand-main"
                checked={Boolean(current)}
                onChange={(e) => onChange({ ...value, [field.key]: e.target.checked })}
              />
            ) : field.type === 'select' ? (
              <select
                className={inputClass}
                value={String(current ?? '')}
                onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
              >
                {(field.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : (
              <input
                className={inputClass}
                type={field.type === 'number' ? 'number' : 'text'}
                value={String(current ?? '')}
                placeholder={field.placeholder}
                onChange={(e) =>
                  onChange({ ...value, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })
                }
              />
            )}
            {field.help ? <span className={helpClass}>{field.help}</span> : null}
          </label>
        );
      })}
    </div>
  );
}
