'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconLoader2,
  IconMail,
  IconPlus,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import api from '../../../../lib/api';
import {
  SettingsCard,
  SettingsPanel,
  settingsBtnPrimary,
  settingsBtnSecondary,
  settingsInputClass,
} from '@/components/settings/primitives';

type TemplateConfig = {
  name: string;
  objective: string;
  tone: string;
  maxWords: number;
  structure: string[];
  primarySignal: string;
  secondarySignal?: string;
  requiredEvidence: string[];
  preferredEvidence?: string[];
  optionalEvidence: string[];
  missingDataPolicy: string;
  cta: string;
  forbiddenPhrases: string[];
  subjectStrategy: { patterns: string[]; personalize: boolean };
  systemPrompt?: string;
  promptInstructions?: string;
  bodyRecipe?: string;
};

type TemplateRow = {
  id: string;
  name: string;
  description?: string | null;
  objective: string;
  templateType: string;
  isSystem: boolean;
  isActive: boolean;
  latestVersion?: {
    id: string;
    version: number;
    config: TemplateConfig;
  } | null;
};

type TestResult = {
  status: string;
  subject?: string;
  body?: string;
  templateName?: string;
  templateType?: string;
  confidence?: number;
  abstainReason?: string;
  validation?: {
    passed?: boolean;
    unsupportedClaims?: number;
    wordCount?: number;
    issues?: string[];
  };
  scores?: {
    evidenceCoverage?: number;
    personalization?: string;
    rulesPassed?: number;
    rulesTotal?: number;
    qualityScore?: number;
  };
  evidenceUsed?: Array<{
    id?: string;
    type?: string;
    summary?: string;
    confidence?: number;
  }>;
};

const VARIABLE_GROUPS: Array<{ label: string; vars: string[] }> = [
  { label: 'PERSON', vars: ['{{firstName}}', '{{fullName}}', '{{jobTitle}}', '{{department}}'] },
  { label: 'COMPANY', vars: ['{{companyName}}', '{{industry}}', '{{companySize}}'] },
  { label: 'HIRING', vars: ['{{hiringStatus}}', '{{openRoleCount}}', '{{topHiringRole}}'] },
  { label: 'INTENT', vars: ['{{strongestSignal}}', '{{signalDate}}', '{{signalSummary}}'] },
  { label: 'ICP', vars: ['{{icpScore}}', '{{fitReason}}'] },
  { label: 'PAIN', vars: ['{{painPoint1}}', '{{painPoint2}}'] },
  { label: 'SENDER', vars: ['{{senderName}}', '{{senderTitle}}', '{{senderCompany}}'] },
  {
    label: 'AI BLOCKS',
    vars: [
      '{{AI: personalized observation}}',
      '{{AI: business implication}}',
      '{{AI: value proposition}}',
      '{{AI: proof point}}',
      '{{AI: soft CTA}}',
      '{{AI: open question CTA}}',
      '{{AI: resource offer CTA}}',
    ],
  },
];

const SAMPLE_VALUES: Record<string, string> = {
  '{{firstName}}': 'Alex',
  '{{fullName}}': 'Alex Chen',
  '{{jobTitle}}': 'VP of Engineering',
  '{{department}}': 'Engineering',
  '{{companyName}}': 'Acme Corp',
  '{{industry}}': 'B2B SaaS',
  '{{companySize}}': '150 employees',
  '{{hiringStatus}}': 'actively hiring',
  '{{openRoleCount}}': '8',
  '{{topHiringRole}}': 'Senior Backend Engineer',
  '{{strongestSignal}}': 'Series B funding',
  '{{signalDate}}': 'August 2026',
  '{{signalSummary}}': 'Raised $24M Series B led by Sequoia',
  '{{icpScore}}': '87',
  '{{fitReason}}': 'strong fit: B2B SaaS, 100-500 employees, using modern stack',
  '{{painPoint1}}': 'engineering hiring bottleneck',
  '{{painPoint2}}': 'onboarding velocity',
  '{{senderName}}': 'Jordan',
  '{{senderTitle}}': 'Account Executive',
  '{{senderCompany}}': 'LeadHub',
  '{{AI: personalized observation}}': 'Saw Acme Corp just closed a $24M Series B — congrats. With 8 new engineering roles open, it looks like you\'re doubling down on the product.',
  '{{AI: business implication}}': 'Most engineering leaders at this stage tell us the bottleneck shifts from finding candidates to ramping them without slowing the existing team.',
  '{{AI: value proposition}}': 'We helped a similar SaaS team cut ramp time by 40% post-raise without adding headcount to their enablement team.',
  '{{AI: proof point}}': 'DataFlow reduced new-hire time-to-first-commit from 6 weeks to 18 days after their Series A.',
  '{{AI: soft CTA}}': 'Worth a quick look to see if it fits your situation?',
  '{{AI: open question CTA}}': 'Curious how you\'re handling the ramp challenge on your end?',
  '{{AI: resource offer CTA}}': 'Happy to send over a 1-page breakdown of how they structured it — no strings.',
};

const DEFAULT_SYSTEM_PROMPT = `You are an expert cold email writer creating personalized outreach for B2B leads.

YOUR GOAL:
Write professional, personalized emails that:
- Feel like genuine 1-on-1 communication
- Reference specific, verified information about the prospect
- Clearly articulate value without being pushy
- Make it easy for the recipient to respond

CORE PRINCIPLES:
1. Personalization First: Always reference specific details about the prospect or their company
2. Evidence-Based: Only use verified information provided in the context
3. Clear Value: Explain why this matters to them specifically
4. Low Friction: Make responding easy with a simple, clear call-to-action
5. Professional Tone: Write like a peer, not a salesperson

WRITING GUIDELINES:
- Keep subject lines short (3-7 words) and specific to the prospect
- Body should be 50-110 words maximum
- Start with something about them, not about you
- One clear idea per email
- Use simple, conversational language
- Include only verified facts from the evidence

WHAT TO AVOID:
- Generic greetings like "Hope you're doing well"
- Obvious sales language
- Unverified claims or assumptions
- Multiple value propositions in one email
- Pressure tactics or urgency manipulation`;

function defaultCustomConfig(): TemplateConfig {
  return {
    name: 'Custom Template',
    objective: 'start_conversation',
    tone: 'consultative',
    maxWords: 100,
    structure: ['personalized_observation', 'value_proposition', 'soft_cta'],
    primarySignal: 'hiring',
    requiredEvidence: ['person_name', 'company_name'],
    preferredEvidence: ['active_hiring'],
    optionalEvidence: ['pain_point', 'recent_news'],
    missingDataPolicy: 'use_fallback',
    cta: 'soft_interest',
    forbiddenPhrases: [
      "hope you're doing well",
      'i came across your profile',
      'reaching out because',
      'quick 15 minute call',
      'touch base',
    ],
    subjectStrategy: { patterns: ['{{companyName}}'], personalize: true },
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    promptInstructions: 'Use verified evidence only. Mention only one primary trigger.',
    bodyRecipe: `Hi {{firstName}},

{{companyName}} stood out — {{fitReason}}.

{{AI: personalized observation}}

{{AI: value proposition}}

{{AI: soft CTA}}

Best,
{{senderName}}
{{senderCompany}}`,
  };
}

function withBodyFallback(config?: TemplateConfig | null): TemplateConfig {
  const base = config ?? defaultCustomConfig();
  if (base.bodyRecipe?.trim()) return base;
  return { ...base, bodyRecipe: defaultCustomConfig().bodyRecipe };
}

function renderPreview(text: string): string {
  let result = text;
  for (const [k, v] of Object.entries(SAMPLE_VALUES)) {
    result = result.replaceAll(k, v);
  }
  return result;
}

function HighlightedBody({ text, isPreview }: { text: string; isPreview: boolean }) {
  if (isPreview) {
    return <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-800">{renderPreview(text)}</pre>;
  }
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-800">
      {parts.map((part, i) => {
        if (part.startsWith('{{AI:')) {
          return (
            <span key={i} className="rounded bg-violet-100 px-1 py-0.5 font-mono text-[11px] text-violet-800">
              {part}
            </span>
          );
        }
        if (part.startsWith('{{')) {
          return (
            <span key={i} className="rounded bg-sky-100 px-1 py-0.5 font-mono text-[11px] text-sky-800">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </pre>
  );
}

const OBJECTIVE_LABELS: Record<string, string> = {
  start_conversation: 'Start a conversation',
  book_meeting: 'Book a meeting',
  offer_audit: 'Offer audit',
  partnership: 'Partnership',
  custom: 'Custom',
};
const TONE_LABELS: Record<string, string> = {
  consultative: 'Consultative',
  casual: 'Casual',
  direct: 'Direct',
  thought_provoking: 'Thought-provoking',
};
const CTA_LABELS: Record<string, string> = {
  soft_interest: 'Soft interest',
  specific_time: 'Specific time',
  resource_offer: 'Resource offer',
  open_question: 'Open question',
};

export default function OutreachTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testLeadId, setTestLeadId] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftConfig, setDraftConfig] = useState<TemplateConfig>(defaultCustomConfig());
  const [showPreview, setShowPreview] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  /** System templates are editable in the UI; saving creates a workspace custom copy. */
  const isSystemTemplate = Boolean(selected?.isSystem) && !creating;
  const canDelete = Boolean(selectedId && selected && !selected.isSystem && !creating);
  const subjectLine = draftConfig.subjectStrategy?.patterns?.[0] ?? '';
  const bodyText = draftConfig.bodyRecipe ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/outreach/templates');
      const rows = (res.data.data ?? []) as TemplateRow[];
      setTemplates(rows);
      if (!selectedId && rows[0]) {
        setSelectedId(rows[0].id);
        setDraftName(rows[0].name);
        setDraftDescription(rows[0].description ?? '');
        setDraftConfig(withBodyFallback(rows[0].latestVersion?.config));
      }
    } catch {
      toast.error('Failed to load outreach templates.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTemplate = (row: TemplateRow) => {
    setCreating(false);
    setSelectedId(row.id);
    setDraftName(row.name);
    setDraftDescription(row.description ?? '');
    setDraftConfig(withBodyFallback(row.latestVersion?.config));
    setTestResult(null);
    setShowAdvanced(true);
    setShowPreview(false);
  };

  const startCreate = () => {
    setCreating(true);
    setSelectedId(null);
    setDraftName('');
    setDraftDescription('');
    setDraftConfig(defaultCustomConfig());
    setTestResult(null);
    setShowAdvanced(true);
    setShowPreview(false);
  };

  const duplicateAsCustom = () => {
    if (!selected) return;
    setCreating(true);
    setSelectedId(null);
    setDraftName(`${selected.name} (custom)`);
    setDraftDescription(selected.description ?? '');
    setDraftConfig(withBodyFallback(selected.latestVersion?.config));
    setTestResult(null);
    setShowAdvanced(true);
    toast.success('Duplicated — edit and save as a new custom template.');
  };

  const save = async () => {
    if (!draftName.trim()) {
      toast.error('Template name is required.');
      return;
    }
    if (!bodyText.trim()) {
      toast.error('Email body is required.');
      return;
    }
    setSaving(true);
    try {
      const config = { ...draftConfig, name: draftName.trim(), bodyRecipe: bodyText };
      // New custom, or save-as-copy from a system template
      if (creating || !selectedId || selected?.isSystem) {
        const name =
          selected?.isSystem && !creating
            ? draftName.trim().endsWith('(custom)')
              ? draftName.trim()
              : `${draftName.trim()} (custom)`
            : draftName.trim();
        const res = await api.post('/api/outreach/templates', {
          name,
          description: draftDescription.trim() || null,
          objective: config.objective,
          templateType: 'custom',
          config: { ...config, name },
        });
        toast.success(
          selected?.isSystem && !creating
            ? 'Saved as your custom template (system original unchanged).'
            : 'Template created.',
        );
        const createdId = res.data.data?.template?.id as string | undefined;
        await load();
        if (createdId) {
          setSelectedId(createdId);
          setDraftName(name);
        }
        setCreating(false);
      } else {
        await api.put(`/api/outreach/templates/${selectedId}`, {
          name: draftName.trim(),
          description: draftDescription.trim() || null,
          objective: config.objective,
          config,
        });
        toast.success('Template saved.');
        await load();
      }
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message ?? 'Could not save template.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async () => {
    if (!selectedId || selected?.isSystem) return;
    setDeleting(true);
    try {
      await api.delete(`/api/outreach/templates/${selectedId}`);
      toast.success('Template deleted.');
      setSelectedId(null);
      setCreating(false);
      await load();
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message ?? 'Could not delete template.');
    } finally {
      setDeleting(false);
    }
  };

  const runTest = async () => {
    if (!selectedId && !creating) {
      toast.error('Select a template first.');
      return;
    }
    if (!testLeadId.trim()) {
      toast.error('Paste an enriched lead ID to test.');
      return;
    }
    if (creating || !selectedId) {
      toast.error('Save the template before testing.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post(`/api/outreach/templates/${selectedId}/test`, {
        leadId: testLeadId.trim(),
      });
      setTestResult(res.data.data as TestResult);
      toast.success('Test complete.');
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message ?? 'Template test failed.');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <SettingsPanel wide>
        <div className="mb-2">
          <h1 className="text-xl font-bold text-slate-900">Outreach Templates</h1>
          <p className="mt-1 text-sm text-slate-500">
            Signal-specific email recipes for the Outreach Engine.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <IconLoader2 className="h-4 w-4 animate-spin" /> Loading templates…
        </div>
      </SettingsPanel>
    );
  }

  return (
    <SettingsPanel wide>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Outreach Templates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Each template is a signal-specific email recipe. Enrichment discovers facts, then the
          Outreach Engine picks the best-fit template and writes a full personalized email. Create
          custom templates or use the 12 built-in system recipes.
        </p>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 xl:w-72">
          <SettingsCard title="Templates" description="System + workspace custom recipes.">
            <div className="mb-3">
              <button type="button" className={settingsBtnPrimary} onClick={startCreate}>
                <IconPlus className="mr-1.5 h-4 w-4" /> Custom template
              </button>
            </div>
            <div className="max-h-[70vh] space-y-1.5 overflow-y-auto">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTemplate(t)}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                    selectedId === t.id && !creating
                      ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-100'
                      : 'border-slate-200 bg-white hover:border-violet-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-slate-900">{t.name}</span>
                    {t.isSystem ? (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        System
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        Custom
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block text-[11px] capitalize text-slate-500">
                    {t.templateType.replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          </SettingsCard>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-5">
          {/* Template header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {creating ? 'New custom template' : draftName || 'Select a template'}
              </h2>
              {selected && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {selected.templateType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-500">
                    {OBJECTIVE_LABELS[draftConfig.objective] ?? draftConfig.objective} ·{' '}
                    {TONE_LABELS[draftConfig.tone] ?? draftConfig.tone} ·{' '}
                    {CTA_LABELS[draftConfig.cta] ?? draftConfig.cta} ·{' '}
                    max {draftConfig.maxWords} words
                  </span>
                </div>
              )}
              {draftDescription && (
                <p className="mt-1.5 text-xs text-slate-500">{draftDescription}</p>
              )}
            </div>
            <div className="flex gap-2">
              {isSystemTemplate && (
                <button type="button" className={settingsBtnSecondary} onClick={duplicateAsCustom}>
                  <IconCopy className="mr-1.5 h-4 w-4" /> Duplicate as custom
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  disabled={deleting}
                  onClick={() => void deleteTemplate()}
                >
                  <IconTrash className="h-3.5 w-3.5" /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Email preview / editor card */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Email header bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white px-4 py-3">
              <div className="flex items-center gap-2">
                <IconMail className="h-4 w-4 text-violet-700" />
                <span className="text-sm font-bold text-slate-900">Email template</span>
                {isSystemTemplate && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                    System · save creates your copy
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className={`rounded px-2 py-1 transition ${
                    !showPreview ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Template
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className={`rounded px-2 py-1 transition ${
                    showPreview ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Preview with sample data
                </button>
              </div>
            </div>

            {/* Subject line */}
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject</div>
              {showPreview ? (
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {renderPreview(subjectLine || '(no subject pattern)')}
                </p>
              ) : (
                <input
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  value={subjectLine}
                  onChange={(e) =>
                    setDraftConfig((c) => ({
                      ...c,
                      subjectStrategy: {
                        ...c.subjectStrategy,
                        patterns: [e.target.value, ...(c.subjectStrategy.patterns?.slice(1) ?? [])],
                      },
                    }))
                  }
                  placeholder="Email subject line with {{variables}}"
                />
              )}
            </div>

            {/* Body */}
            <div className="px-4 py-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Body</div>
                {!showPreview && (
                  <span className="text-[10px] text-slate-400">
                    Use variables and AI blocks below to build the email skeleton
                  </span>
                )}
              </div>
              {showPreview ? (
                <HighlightedBody text={bodyText || '(no body recipe)'} isPreview />
              ) : (
                <textarea
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-sans text-sm leading-6 text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  style={{ minHeight: 220 }}
                  value={bodyText}
                  onChange={(e) => setDraftConfig((c) => ({ ...c, bodyRecipe: e.target.value }))}
                  placeholder="Hi {{firstName}},\n\n{{AI: personalized observation}}\n\n..."
                />
              )}
            </div>

            {/* Variable insertion toolbar — only when editing */}
            {!showPreview && (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Insert variable or AI block
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {VARIABLE_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        {group.label}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {group.vars.map((v) => (
                          <button
                            key={v}
                            type="button"
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] ring-1 transition ${
                              v.startsWith('{{AI:')
                                ? 'bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100'
                                : 'bg-white text-sky-700 ring-slate-200 hover:bg-sky-50'
                            }`}
                            onClick={() => {
                              setDraftConfig((c) => ({
                                ...c,
                                bodyRecipe: `${c.bodyRecipe ?? ''}${c.bodyRecipe?.endsWith('\n') || !c.bodyRecipe ? '' : '\n\n'}${v}`,
                              }));
                            }}
                          >
                            {v.replace('{{AI: ', '').replace('{{', '').replace('}}', '')}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Name / description / basic fields */}
          {(creating || selectedId) && (
            <SettingsCard title="Template settings" description="Name, description, and identity.">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</span>
                  <input
                    className={settingsInputClass}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</span>
                  <input
                    className={settingsInputClass}
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    placeholder="When should the engine use this template?"
                  />
                </label>
              </div>
            </SettingsCard>
          )}

          {/* Advanced settings (collapsible) */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <div>
                <span className="text-sm font-bold text-slate-900">Advanced settings</span>
                <span className="ml-2 text-xs text-slate-500">
                  Objective, tone, CTA, evidence rules, forbidden phrases
                </span>
              </div>
              {showAdvanced ? (
                <IconChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <IconChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>

            {showAdvanced && (
              <div className="border-t border-slate-100 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Objective</span>
                    <select
                      className={settingsInputClass}
                      value={draftConfig.objective}
                      onChange={(e) => setDraftConfig((c) => ({ ...c, objective: e.target.value }))}
                    >
                      <option value="start_conversation">Start a conversation</option>
                      <option value="book_meeting">Book a meeting</option>
                      <option value="offer_audit">Offer audit</option>
                      <option value="partnership">Partnership</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tone</span>
                    <select
                      className={settingsInputClass}
                      value={draftConfig.tone}
                      onChange={(e) => setDraftConfig((c) => ({ ...c, tone: e.target.value }))}
                    >
                      <option value="consultative">Consultative</option>
                      <option value="casual">Casual</option>
                      <option value="direct">Direct</option>
                      <option value="thought_provoking">Thought-provoking</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">CTA</span>
                    <select
                      className={settingsInputClass}
                      value={draftConfig.cta}
                      onChange={(e) => setDraftConfig((c) => ({ ...c, cta: e.target.value }))}
                    >
                      <option value="soft_interest">Soft interest</option>
                      <option value="specific_time">Specific time</option>
                      <option value="resource_offer">Resource offer</option>
                      <option value="open_question">Open question</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Max words</span>
                    <input
                      type="number"
                      className={settingsInputClass}
                      value={draftConfig.maxWords}
                      onChange={(e) =>
                        setDraftConfig((c) => ({ ...c, maxWords: Number(e.target.value) || 100 }))
                      }
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Primary signal</span>
                    <input
                      className={settingsInputClass}
                      value={draftConfig.primarySignal}
                      onChange={(e) => setDraftConfig((c) => ({ ...c, primarySignal: e.target.value }))}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Missing trigger policy
                    </span>
                    <select
                      className={settingsInputClass}
                      value={draftConfig.missingDataPolicy}
                      onChange={(e) =>
                        setDraftConfig((c) => ({ ...c, missingDataPolicy: e.target.value }))
                      }
                    >
                      <option value="use_fallback">Use company-fit fallback</option>
                      <option value="skip_section">Skip section</option>
                      <option value="abstain">Skip outreach (abstain)</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Required evidence (comma-separated)
                    </span>
                    <input
                      className={settingsInputClass}
                      value={draftConfig.requiredEvidence.join(', ')}
                      onChange={(e) =>
                        setDraftConfig((c) => ({
                          ...c,
                          requiredEvidence: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        }))
                      }
                    />
                  </label>
                  
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      System Prompt
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Guide how the AI generates outreach messages. Customize for your specific use case.
                    </span>
                    <textarea
                      className={`${settingsInputClass} font-mono text-xs`}
                      style={{ minHeight: 160 }}
                      value={draftConfig.systemPrompt ?? ''}
                      onChange={(e) =>
                        setDraftConfig((c) => ({ ...c, systemPrompt: e.target.value }))
                      }
                      placeholder="Enter system prompt..."
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Additional Instructions
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Template-specific instructions (e.g., "Focus on hiring signals", "Emphasize ROI")
                    </span>
                    <textarea
                      className={settingsInputClass}
                      rows={3}
                      value={draftConfig.promptInstructions ?? ''}
                      onChange={(e) =>
                        setDraftConfig((c) => ({ ...c, promptInstructions: e.target.value }))
                      }
                      placeholder="Add specific instructions for this template..."
                    />
                  </label>
                </div>

                {(draftConfig.forbiddenPhrases?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Forbidden phrases
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {draftConfig.forbiddenPhrases.map((p) => (
                        <span
                          key={p}
                          className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700"
                        >
                          &ldquo;{p}&rdquo;
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={settingsBtnPrimary}
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? (
                <IconLoader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <IconCheck className="mr-1.5 h-4 w-4" />
              )}
              {creating
                ? 'Create template'
                : isSystemTemplate
                  ? 'Save as custom template'
                  : 'Save template'}
            </button>
          </div>

          {/* Test section */}
          <SettingsCard
            title="Test template"
            description="Run against one enriched lead. Shows evidence used, generated email, and quality scores."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Enriched lead ID
                </span>
                <input
                  className={settingsInputClass}
                  value={testLeadId}
                  onChange={(e) => setTestLeadId(e.target.value)}
                  placeholder="UUID of an enriched lead"
                />
              </label>
              <button
                type="button"
                className={settingsBtnSecondary}
                disabled={testing || creating}
                onClick={() => void runTest()}
              >
                {testing ? (
                  <IconLoader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <IconSparkles className="mr-1.5 h-4 w-4" />
                )}
                Test template
              </button>
            </div>

            {testResult ? (
              <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                {testResult.status === 'abstained' ? (
                  <p className="text-sm text-amber-700">
                    Abstained: {testResult.abstainReason ?? 'Missing required evidence'}
                  </p>
                ) : null}
                {testResult.evidenceUsed && testResult.evidenceUsed.length > 0 ? (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Verified evidence used
                    </div>
                    <ul className="mt-2 space-y-1">
                      {testResult.evidenceUsed.map((ev) => (
                        <li
                          key={ev.id ?? ev.summary}
                          className="flex items-start gap-2 text-sm text-slate-700"
                        >
                          <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          <span>
                            <span className="font-semibold">{ev.type}</span> — {ev.summary}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {testResult.subject || testResult.body ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white px-4 py-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <IconMail className="h-4 w-4 text-emerald-600" /> Generated email
                        {testResult.confidence != null && (
                          <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            {testResult.confidence}% confidence
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="border-b border-slate-100 px-4 py-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject</div>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">{testResult.subject}</p>
                    </div>
                    <div className="px-4 py-3">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-700">
                        {testResult.body}
                      </pre>
                    </div>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Evidence</div>
                    <div className="font-semibold">{testResult.scores?.evidenceCoverage ?? '—'}%</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Personalization</div>
                    <div className="font-semibold capitalize">
                      {testResult.scores?.personalization ?? '—'}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Unsupported</div>
                    <div className="font-semibold">{testResult.validation?.unsupportedClaims ?? 0}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-[10px] font-bold uppercase text-slate-500">Rules</div>
                    <div className="font-semibold">
                      {testResult.scores?.rulesPassed ?? 0}/{testResult.scores?.rulesTotal ?? 7}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </SettingsCard>
        </div>
      </div>
    </SettingsPanel>
  );
}
