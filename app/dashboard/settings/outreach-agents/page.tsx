'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import {
  SettingsCard,
  SettingsPanel,
  settingsBtnDanger,
  settingsBtnPrimary,
  settingsBtnSecondary,
  settingsInputClass,
} from '@/components/settings/primitives';

type CaseStudy = {
  title?: string;
  who?: string;
  summary?: string;
  url?: string;
};

type Offer = {
  solutions?: string;
  howWeDeliver?: string;
  whoWeHelp?: string;
  whoWeWorkWith?: string;
  caseStudies?: CaseStudy[];
};

type OutreachAgent = {
  id: string;
  name: string;
  description?: string | null;
  instruction: string;
  offer: Offer;
  sequenceCount: number;
  sequenceDays: number[];
  humanize: boolean;
  punchyConfidence: number;
  isDefault: boolean;
};

const EMPTY: Omit<OutreachAgent, 'id'> = {
  name: '',
  description: '',
  instruction: '',
  offer: { caseStudies: [] },
  sequenceCount: 4,
  sequenceDays: [0, 3, 7, 14],
  humanize: true,
  punchyConfidence: 95,
  isDefault: false,
};

export default function OutreachAgentsPage() {
  const [agents, setAgents] = useState<OutreachAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new'>('new');
  const [draft, setDraft] = useState<Omit<OutreachAgent, 'id'>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [deleteUsage, setDeleteUsage] = useState<{
    enrichmentAgents: number;
    replacements: Array<{ id: string; name: string; isDefault: boolean }>;
    replacementId: string;
  } | null>(null);

  const apply = (agent: OutreachAgent | null) => {
    if (!agent) {
      setSelectedId('new');
      setDraft(EMPTY);
      return;
    }
    setSelectedId(agent.id);
    setDraft({
      name: agent.name,
      description: agent.description ?? '',
      instruction: agent.instruction ?? '',
      offer: {
        solutions: agent.offer?.solutions ?? '',
        howWeDeliver: agent.offer?.howWeDeliver ?? '',
        whoWeHelp: agent.offer?.whoWeHelp ?? '',
        whoWeWorkWith: agent.offer?.whoWeWorkWith ?? '',
        caseStudies: agent.offer?.caseStudies ?? [],
      },
      sequenceCount: agent.sequenceCount || 4,
      sequenceDays: agent.sequenceDays?.length ? agent.sequenceDays : [0, 3, 7, 14],
      humanize: agent.humanize !== false,
      punchyConfidence: agent.punchyConfidence || 95,
      isDefault: agent.isDefault,
    });
  };

  const load = useCallback(async (preferId?: string) => {
    setLoading(true);
    try {
      const res = await api.get('/api/outreach-agents');
      const rows = (res.data.data ?? []) as OutreachAgent[];
      setAgents(rows);
      const pick = rows.find((row) => row.id === preferId) ?? rows.find((row) => row.isDefault) ?? rows[0];
      apply(pick ?? null);
    } catch {
      toast.error('Could not load outreach agents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setOffer = (patch: Partial<Offer>) => {
    setDraft((prev) => ({ ...prev, offer: { ...prev.offer, ...patch } }));
  };

  const prefill = async () => {
    setSaving(true);
    try {
      const res = await api.post('/api/outreach-agents/prefill');
      const data = res.data.data as Omit<OutreachAgent, 'id' | 'humanize' | 'punchyConfidence' | 'isDefault'>;
      setSelectedId('new');
      setDraft({
        ...EMPTY,
        ...data,
        offer: { caseStudies: [], ...(data.offer ?? {}) },
        humanize: true,
        punchyConfidence: 95,
        isDefault: agents.length === 0,
      });
      toast.success('Filled from your company profile. Edit anything before saving.');
    } catch {
      toast.error('Could not prefill from the company profile.');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!draft.name.trim()) {
      toast.error('Name the outreach agent.');
      return;
    }
    const payload = {
      ...draft,
      name: draft.name.trim(),
      offer: {
        ...draft.offer,
        caseStudies: (draft.offer.caseStudies ?? []).filter((row) => row.summary?.trim() || row.title?.trim()),
      },
    };
    setSaving(true);
    try {
      if (selectedId === 'new') {
        const res = await api.post('/api/outreach-agents', payload);
        toast.success('Outreach agent created.');
        await load(res.data.data.id);
      } else {
        await api.patch(`/api/outreach-agents/${selectedId}`, payload);
        toast.success('Outreach agent saved.');
        await load(selectedId);
      }
    } catch {
      toast.error('Could not save the outreach agent.');
    } finally {
      setSaving(false);
    }
  };

  const exportAgent = () => {
    if (!draft.name.trim() || selectedId === 'new') {
      toast.error('Save this outreach agent before exporting it.');
      return;
    }
    const payload = {
      kind: 'outreach-agent',
      version: 1,
      agent: {
        name: draft.name.trim(),
        description: draft.description ?? null,
        instruction: draft.instruction,
        offer: draft.offer,
        sequenceCount: draft.sequenceCount,
        sequenceDays: draft.sequenceDays,
        humanize: draft.humanize,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${draft.name.trim().replace(/\s+/g, '-').toLowerCase()}-outreach-agent.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importAgentFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as {
        kind?: string;
        agent?: Omit<OutreachAgent, 'id' | 'punchyConfidence' | 'isDefault'>;
      };
      if (parsed.kind !== 'outreach-agent' || !parsed.agent?.name) {
        toast.error('That file is not an outreach agent.');
        return;
      }
      const taken = new Set(agents.map((agent) => agent.name.toLowerCase()));
      let nextName = parsed.agent.name.trim();
      if (taken.has(nextName.toLowerCase())) {
        let n = 2;
        while (taken.has(`${parsed.agent.name.trim()} (${n})`.toLowerCase())) n += 1;
        nextName = `${parsed.agent.name.trim()} (${n})`.slice(0, 120);
      }
      const res = await api.post('/api/outreach-agents', {
        ...parsed.agent,
        name: nextName,
        isDefault: false,
      });
      toast.success(`Imported ${nextName}.`);
      await load(res.data.data.id);
    } catch {
      toast.error('Could not import that outreach agent.');
    }
  };

  const remove = async () => {
    if (selectedId === 'new') return;
    try {
      const res = await api.get(`/api/outreach-agents/${selectedId}/usage`);
      const data = res.data.data as {
        enrichmentAgents: number;
        replacements: Array<{ id: string; name: string; isDefault: boolean }>;
      };
      setDeleteUsage({
        ...data,
        replacementId: data.replacements.find((agent) => agent.isDefault)?.id ?? data.replacements[0]?.id ?? '',
      });
    } catch {
      toast.error('Could not check where this writer is used.');
    }
  };

  const confirmRemove = async () => {
    if (selectedId === 'new' || !deleteUsage) return;
    try {
      await api.delete(`/api/outreach-agents/${selectedId}`, {
        data: { replacementId: deleteUsage.replacementId || null },
      });
      toast.success('Outreach agent deleted. Enrichment agents that used it were moved.');
      setDeleteUsage(null);
      await load(deleteUsage.replacementId || undefined);
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message ?? 'Could not delete the outreach agent.');
    }
  };

  const draftSample = async () => {
    setPreviewing(true);
    try {
      const res = await api.post('/api/outreach-agents/preview', {
        instruction: draft.instruction,
        offer: draft.offer,
        humanize: draft.humanize,
      });
      setPreview(res.data.data);
    } catch {
      toast.error('Could not draft a sample email.');
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <SettingsPanel wide>
      <SettingsCard
        title="Outreach agents"
        description="The name is only a label for picking this writer on an enrichment agent. It is not the email. The agent stores what you sell, how you deliver it, who you help, who you work with, and any case studies. Enrichment finds the problem for each lead, and the writer drafts a different email every time."
      >
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2">
            {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => {
                  setPreview(null);
                  apply(agent);
                }}
                className={`block w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  selectedId === agent.id
                    ? 'border-violet-300 bg-violet-50 font-semibold text-violet-950'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                {agent.name}
                {agent.isDefault ? <span className="mt-0.5 block text-[11px] font-medium text-slate-500">Default</span> : null}
              </button>
            ))}
            <button
              type="button"
              className={settingsBtnSecondary + ' w-full'}
              onClick={() => {
                setPreview(null);
                setSelectedId('new');
                setDraft({ ...EMPTY, isDefault: agents.length === 0 });
              }}
            >
              New agent
            </button>
            <div className="flex gap-3 text-xs font-semibold text-slate-600">
              <button type="button" className="underline" onClick={exportAgent}>
                Export this agent
              </button>
              <button type="button" className="underline" onClick={() => importRef.current?.click()}>
                Import an agent
              </button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void importAgentFile(file);
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={settingsBtnSecondary} disabled={saving} onClick={() => void prefill()}>
                Prefill from company
              </button>
              <button type="button" className={settingsBtnSecondary} disabled={previewing} onClick={() => void draftSample()}>
                {previewing ? 'Drafting…' : 'Draft sample email'}
              </button>
            </div>

            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Name</span>
              <input
                className={settingsInputClass}
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="For example, Founder outbound"
              />
              <p className="text-xs leading-5 text-slate-500">
                A label so you can attach this writer to an enrichment agent. It never appears in the email.
              </p>
            </label>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Emails per lead</span>
                <span className="text-[11px] text-slate-500">4 is the recommended minimum</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, sequenceCount: n }))}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                      draft.sequenceCount === n ? 'bg-violet-600 text-white' : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs leading-5 text-slate-500">
              The lead’s problem is not stored here. Enrichment finds it for that person and company, and the email is written from that discovery.
            </p>

            {(
              [
                ['solutions', 'Solutions we provide', 'Paste from your docs. What you actually sell.'],
                ['howWeDeliver', 'How we provide the solution', 'The delivery: product, service, process, timeline.'],
                ['whoWeHelp', 'Who we help', 'The kinds of companies and roles this is for.'],
                ['whoWeWorkWith', 'Who we work with', 'Customers or segments you can name. Leave blank if you would rather not.'],
              ] as const
            ).map(([key, label, help]) => (
              <label key={key} className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
                <textarea
                  className={settingsInputClass + ' h-24 py-2'}
                  value={draft.offer[key] ?? ''}
                  onChange={(e) => setOffer({ [key]: e.target.value })}
                />
                <p className="text-[11px] leading-4 text-slate-500">{help}</p>
              </label>
            ))}

            <div className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Case studies</p>
                  <p className="text-[11px] leading-4 text-slate-500">
                    Optional. For each lead, the writer may use one example that matches that company. If none match, it cites none.
                  </p>
                </div>
                <button
                  type="button"
                  className={settingsBtnSecondary}
                  onClick={() =>
                    setOffer({
                      caseStudies: [...(draft.offer.caseStudies ?? []), { title: '', who: '', summary: '', url: '' }],
                    })
                  }
                >
                  Add
                </button>
              </div>
              {(draft.offer.caseStudies ?? []).map((study, index) => (
                <div key={index} className="space-y-2 rounded-lg border border-slate-100 p-2">
                  <input
                    className={settingsInputClass}
                    placeholder="Title"
                    value={study.title ?? ''}
                    onChange={(e) => {
                      const caseStudies = [...(draft.offer.caseStudies ?? [])];
                      caseStudies[index] = { ...study, title: e.target.value };
                      setOffer({ caseStudies });
                    }}
                  />
                  <input
                    className={settingsInputClass}
                    placeholder="Who it was for"
                    value={study.who ?? ''}
                    onChange={(e) => {
                      const caseStudies = [...(draft.offer.caseStudies ?? [])];
                      caseStudies[index] = { ...study, who: e.target.value };
                      setOffer({ caseStudies });
                    }}
                  />
                  <textarea
                    className={settingsInputClass + ' h-20 py-2'}
                    placeholder="What happened and the result"
                    value={study.summary ?? ''}
                    onChange={(e) => {
                      const caseStudies = [...(draft.offer.caseStudies ?? [])];
                      caseStudies[index] = { ...study, summary: e.target.value };
                      setOffer({ caseStudies });
                    }}
                  />
                  <div className="flex gap-2">
                    <input
                      className={settingsInputClass}
                      placeholder="Link"
                      value={study.url ?? ''}
                      onChange={(e) => {
                        const caseStudies = [...(draft.offer.caseStudies ?? [])];
                        caseStudies[index] = { ...study, url: e.target.value };
                        setOffer({ caseStudies });
                      }}
                    />
                    <button
                      type="button"
                      className={settingsBtnSecondary}
                      onClick={() =>
                        setOffer({
                          caseStudies: (draft.offer.caseStudies ?? []).filter((_, i) => i !== index),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.humanize}
                onChange={(e) => setDraft((prev) => ({ ...prev, humanize: e.target.checked }))}
              />
              Humanize the copy, and punch it up only when the evidence is 95% confident
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Anything else the writer should follow</span>
              <textarea
                className={settingsInputClass + ' h-48 py-2'}
                value={draft.instruction}
                onChange={(e) => setDraft((prev) => ({ ...prev, instruction: e.target.value }))}
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.isDefault}
                onChange={(e) => setDraft((prev) => ({ ...prev, isDefault: e.target.checked }))}
              />
              Default writer for enrichment agents that do not pick one
            </label>

            {preview ? (
              <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">Sample draft</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{preview.subject}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview.body}</p>
              </div>
            ) : null}

            <div className="flex gap-2">
              <button type="button" className={settingsBtnPrimary} disabled={saving} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save outreach agent'}
              </button>
              {selectedId !== 'new' ? (
                <button type="button" className={settingsBtnSecondary} onClick={() => void remove()}>
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </SettingsCard>
      {deleteUsage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-950">Delete this outreach agent?</h3>
            <p className="mt-2 text-sm leading-5 text-slate-600">
              {deleteUsage.enrichmentAgents} enrichment agent{deleteUsage.enrichmentAgents === 1 ? '' : 's'} use this writer.
              They move to the writer you pick, and capture lists follow that enrichment agent.
            </p>
            {deleteUsage.replacements.length > 0 ? (
              <label className="mt-3 block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Move them to</span>
                <select
                  className={settingsInputClass}
                  value={deleteUsage.replacementId}
                  onChange={(e) => setDeleteUsage({ ...deleteUsage, replacementId: e.target.value })}
                >
                  {deleteUsage.replacements.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                This is the only outreach agent. Enrichment agents are unlinked. A fresh default writer appears the next time this page loads.
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={settingsBtnSecondary} onClick={() => setDeleteUsage(null)}>
                Cancel
              </button>
              <button type="button" className={settingsBtnDanger} onClick={() => void confirmRemove()}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SettingsPanel>
  );
}
