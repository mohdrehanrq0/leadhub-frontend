'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { inputClass } from '@/components/ui/styles';

const VARIABLES = [
  { key: 'firstName', label: 'First name', insert: '{{firstName|there}}' },
  { key: 'lastName', label: 'Last name', insert: '{{lastName}}' },
  { key: 'fullName', label: 'Full name', insert: '{{fullName}}' },
  { key: 'companyName', label: 'Company', insert: '{{companyName}}' },
  { key: 'title', label: 'Title', insert: '{{title}}' },
  { key: 'location', label: 'Location', insert: '{{location}}' },
] as const;

type MessageTemplateEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function MessageTemplateEditor({ value, onChange, disabled }: MessageTemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState('');
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (!value.trim()) {
        setPreview('');
        return;
      }
      setPreviewing(true);
      try {
        const res = await api.post('/api/campaigns/preview-message', {
          template: value,
          seed: 'editor-preview',
        });
        if (!cancelled) setPreview(res.data.data?.rendered ?? '');
      } catch {
        if (!cancelled) setPreview('');
      } finally {
        if (!cancelled) setPreviewing(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  function insertAtCursor(snippet: string) {
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {VARIABLES.map((v) => (
          <button
            key={v.key}
            type="button"
            disabled={disabled}
            onClick={() => insertAtCursor(v.insert)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-main/40 hover:text-brand-main disabled:opacity-50"
          >
            {v.label}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => insertAtCursor('{Hi|Hey|Hello}')}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-main/40 hover:text-brand-main disabled:opacity-50"
        >
          Spintax
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder="{Hi|Hey} {{firstName|there}}, saw your work at {{companyName}}…"
        className={`${inputClass} h-auto min-h-[160px] resize-y py-3 font-mono text-[13px] leading-relaxed`}
      />
      <p className="text-xs text-slate-500">
        Use {'{{firstName|there}}'} for fallbacks and {'{Hi|Hey}'} for spin text. Connection requests are sent without a
        note; this message goes out after they accept (or immediately if already connected).
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Preview {previewing ? '…' : ''}
        </div>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{preview || '—'}</p>
      </div>
    </div>
  );
}
