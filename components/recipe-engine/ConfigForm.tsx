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
}: {
  schema: ConfigFieldSchema[];
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  if (!schema.length) return <p className="text-sm text-slate-500">No configuration needed.</p>;
  return (
    <div className="space-y-4">
      {schema.map((field) => {
        const current = value[field.key] ?? field.default ?? '';
        return (
          <label key={field.key} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {field.label}{field.required ? ' *' : ''}
            </span>
            {field.type === 'textarea' || field.type === 'string_list' || field.type === 'url_list' ? (
              <textarea
                className={cn(settingsInputClass, 'h-auto min-h-20 py-2')}
                value={field.type === 'textarea' ? String(current ?? '') : listText(current)}
                placeholder={field.placeholder}
                onChange={(e) =>
                  onChange({ ...value, [field.key]: field.type === 'textarea' ? e.target.value : parseList(e.target.value) })
                }
              />
            ) : field.type === 'boolean' ? (
              <input
                type="checkbox"
                className="h-4 w-4 accent-blue-600"
                checked={Boolean(current)}
                onChange={(e) => onChange({ ...value, [field.key]: e.target.checked })}
              />
            ) : field.type === 'select' ? (
              <select
                className={settingsInputClass}
                value={String(current ?? '')}
                onChange={(e) => onChange({ ...value, [field.key]: e.target.value })}
              >
                {(field.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : (
              <input
                className={settingsInputClass}
                type={field.type === 'number' ? 'number' : 'text'}
                value={String(current ?? '')}
                placeholder={field.placeholder}
                onChange={(e) =>
                  onChange({ ...value, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })
                }
              />
            )}
            {field.help ? <span className="mt-1 block text-xs text-slate-400">{field.help}</span> : null}
          </label>
        );
      })}
    </div>
  );
}
