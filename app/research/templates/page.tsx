'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { btnOutline, btnPrimary, inputClass } from '@/components/ui/styles';
import { createTemplate, deleteTemplate, listTemplates } from '@/lib/research-api';

export default function ResearchTemplatesPage() {
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description: string | null }>>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mission, setMission] = useState('');
  const [questions, setQuestions] = useState('');
  const [includeEmail, setIncludeEmail] = useState(false);
  const [includeHiring, setIncludeHiring] = useState(false);

  async function load() {
    try {
      setTemplates(await listTemplates());
    } catch {
      toast.error('Could not load templates');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        mission: mission.trim() || undefined,
        includeEmail,
        includeHiring,
        customQuestions: questions
          .split('\n')
          .map((q) => q.trim())
          .filter(Boolean),
      });
      toast.success('Template saved');
      setName('');
      setDescription('');
      setMission('');
      setQuestions('');
      load();
    } catch {
      toast.error('Could not save template');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Release 3 · Templates
        </p>
        <h1 className="mt-1 font-semibold tracking-tight text-3xl text-slate-900">Research templates</h1>
        <p className="mt-1 text-sm text-slate-600">
          Save campaign-specific research settings for agency client work.
        </p>
      </div>

      <form onSubmit={onCreate} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <input className={inputClass} placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputClass} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <textarea className={`${inputClass} min-h-[72px]`} placeholder="Mission" value={mission} onChange={(e) => setMission(e.target.value)} />
        <textarea
          className={`${inputClass} min-h-[72px]`}
          placeholder="Custom questions (one per line)"
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeEmail} onChange={(e) => setIncludeEmail(e.target.checked)} />
          Email discovery
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeHiring} onChange={(e) => setIncludeHiring(e.target.checked)} />
          Hiring research
        </label>
        <button type="submit" className={btnPrimary}>
          Save template
        </button>
      </form>

      <ul className="space-y-2">
        {templates.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{t.name}</p>
              {t.description ? <p className="text-xs text-slate-500">{t.description}</p> : null}
            </div>
            <button
              type="button"
              className={btnOutline}
              onClick={async () => {
                await deleteTemplate(t.id);
                load();
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
