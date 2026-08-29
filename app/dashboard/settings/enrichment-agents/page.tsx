'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
  IconPlus,
  IconRobot,
  IconStar,
  IconTrash,
} from '@tabler/icons-react';
import api from '../../../../lib/api';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { btnNavy, btnOutline, inputClass } from '../../../../components/ui/styles';

type PersonObjective =
  | 'founder'
  | 'hiring_authority'
  | 'sales_leader'
  | 'marketing_leader'
  | 'technology_decision_maker'
  | 'operations'
  | 'finance'
  | 'procurement'
  | 'custom';

type PersonTier = 'required' | 'preferred' | 'fallback';

type PersonTarget = {
  objective: PersonObjective;
  roleHint?: string;
  required?: boolean;
  priority: number;
  tier?: PersonTier;
};

type Modules = {
  company: boolean;
  people: boolean;
  hiring: boolean;
  signals: boolean;
  scoring: boolean;
  outreach: boolean;
  email: boolean;
};

type Strictness = 'exact' | 'smart' | 'flexible';

type AgentConfig = {
  modules: Modules;
  people: {
    mode: 'auto' | 'single' | 'multi';
    targets: PersonTarget[];
    maxPeople: number;
    allowFallback: boolean;
    strictness: Strictness;
  };
  email: { discover: boolean; verify: boolean };
  signals: { whyNow: boolean; maxAgeDays: number };
  customQuestions: string[];
  hiringKeywords: string[];
};

type Agent = {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  config: AgentConfig;
};

type AgentGoal = 'identity' | 'person' | 'contact' | 'full';

const GOAL_META: Array<{ id: AgentGoal; label: string; help: string }> = [
  { id: 'identity', label: 'Identify the company', help: 'Company, domain, LinkedIn, firmographics' },
  { id: 'person', label: 'Find the right person', help: 'Company identity plus the decision maker' },
  { id: 'contact', label: 'Find the person and their email', help: 'Adds discovery and verification' },
  { id: 'full', label: 'Full intelligence', help: 'Everything, including signals, scoring, outreach' },
];

/**
 * Modules are compiled from the goal. A user thinks "I want the founder", not
 * "people on, signals off, scoring off".
 */
function modulesForGoal(goal: AgentGoal): Modules {
  switch (goal) {
    case 'identity':
      return { company: true, people: false, hiring: false, signals: false, scoring: false, outreach: false, email: false };
    case 'person':
      return { company: true, people: true, hiring: false, signals: false, scoring: false, outreach: false, email: false };
    case 'contact':
      return { company: true, people: true, hiring: false, signals: false, scoring: false, outreach: false, email: true };
    case 'full':
    default:
      return { company: true, people: true, hiring: true, signals: true, scoring: true, outreach: true, email: true };
  }
}

/** Which goal an existing agent's module set corresponds to. */
function goalFromModules(modules: Modules): AgentGoal {
  if (modules.signals || modules.scoring || modules.outreach || modules.hiring) return 'full';
  if (modules.people && modules.email) return 'contact';
  if (modules.people) return 'person';
  return 'identity';
}

const MODULE_META: Array<{ key: keyof Modules; label: string; help: string }> = [
  { key: 'company', label: 'Company detail', help: 'Profile, products, industry, locations' },
  { key: 'people', label: 'People / employment', help: 'Founders, decision makers, roles' },
  { key: 'hiring', label: 'Hiring detail', help: 'Open roles and hiring signals' },
  { key: 'signals', label: 'Intent / why-now signals', help: 'Buying and timing triggers' },
  { key: 'scoring', label: 'ICP · Intent · Confidence', help: 'Numeric scores for ranking' },
  { key: 'outreach', label: 'Outreach copy', help: 'Angle, opener, CTA, pain points' },
  { key: 'email', label: 'Email discovery', help: 'Find and verify contact emails' },
];

const OBJECTIVES: Array<{ id: PersonObjective; label: string; hint: string }> = [
  { id: 'founder', label: 'Founder / CEO', hint: 'Owner, co-founder, CEO' },
  { id: 'hiring_authority', label: 'Hiring authority', hint: 'Head of Talent, HRBP, Recruiting lead' },
  { id: 'sales_leader', label: 'Sales leader', hint: 'VP Sales, CRO, Head of Revenue' },
  { id: 'marketing_leader', label: 'Marketing leader', hint: 'CMO, VP Marketing, Growth' },
  { id: 'technology_decision_maker', label: 'Technical leader', hint: 'CTO, VP Eng, Head of Product' },
  { id: 'operations', label: 'Operations', hint: 'COO, VP Ops, Head of Ops' },
  { id: 'finance', label: 'Finance', hint: 'CFO, Controller, Head of Finance' },
  { id: 'procurement', label: 'Procurement', hint: 'Buyer, Head of Procurement' },
  { id: 'custom', label: 'Custom role', hint: 'Describe the role — equivalent titles are searched too' },
];

function isStrictness(value: unknown): value is Strictness {
  return value === 'exact' || value === 'smart' || value === 'flexible';
}

/**
 * Who counts as the right person, phrased as a definition rather than a
 * matching mode. Users were being asked to pick "Smart" or "Flexible" without
 * knowing what either did; what they actually know is how tightly they mean the
 * role. Strictness is derived from this and still saved, so existing agents and
 * the backend contract are unchanged.
 */
const DEFINITION_OPTIONS: Array<{
  id: Strictness;
  label: string;
  help: string;
}> = [
  {
    id: 'exact',
    label: 'Only this exact title',
    help: 'Returns nothing rather than a near match. Use when the title is the point.',
  },
  {
    id: 'smart',
    label: 'Whoever owns this responsibility',
    help: 'Accepts equivalent titles, and where a company has no such function, the leader who actually owns the work — with the organizational evidence to justify it.',
  },
  {
    id: 'flexible',
    label: 'Any executive involved in it',
    help: 'Widest reach. Accepts adjacent leadership on weaker organizational evidence.',
  },
];

const TIER_OPTIONS: Array<{ id: PersonTier; label: string; help: string }> = [
  { id: 'required', label: 'Required', help: 'Must find before finishing' },
  { id: 'preferred', label: 'Preferred', help: 'Find if possible' },
  { id: 'fallback', label: 'Fallback', help: 'Only if required are missing' },
];

function defaultTarget(priority = 1): PersonTarget {
  return {
    objective: 'founder',
    required: true,
    priority,
    tier: 'required',
    roleHint: '',
  };
}

function defaultConfig(): AgentConfig {
  return {
    modules: {
      company: true,
      people: true,
      hiring: true,
      signals: true,
      scoring: true,
      outreach: true,
      email: true,
    },
    people: {
      mode: 'multi',
      targets: [defaultTarget(1)],
      maxPeople: 3,
      allowFallback: true,
      strictness: 'smart',
    },
    email: { discover: true, verify: true },
    signals: { whyNow: true, maxAgeDays: 90 },
    customQuestions: [],
    hiringKeywords: [],
  };
}

function normalizeTargets(raw: unknown): PersonTarget[] {
  if (!Array.isArray(raw) || raw.length === 0) return [defaultTarget(1)];
  return raw
    .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === 'object')
    .slice(0, 10)
    .map((t, i) => {
      const objective = (OBJECTIVES.some((o) => o.id === t.objective)
        ? t.objective
        : 'custom') as PersonObjective;
      const tier = (['required', 'preferred', 'fallback'].includes(String(t.tier))
        ? t.tier
        : t.required
          ? 'required'
          : 'preferred') as PersonTier;
      return {
        objective,
        roleHint: typeof t.roleHint === 'string' ? t.roleHint : '',
        required: tier === 'required',
        priority: typeof t.priority === 'number' ? t.priority : i + 1,
        tier,
      };
    });
}

function normalizeConfig(raw: unknown): AgentConfig {
  const base = defaultConfig();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Record<string, unknown>;
  const peopleRaw = (obj.people ?? {}) as Record<string, unknown>;
  const targets = normalizeTargets(peopleRaw.targets);
  const maxPeople = Math.min(
    10,
    Math.max(
      targets.length,
      typeof peopleRaw.maxPeople === 'number' ? peopleRaw.maxPeople : base.people.maxPeople,
    ),
  );
  return {
    modules: { ...base.modules, ...((obj.modules as Modules) ?? {}) },
    people: {
      mode: targets.length > 1 ? 'multi' : ((peopleRaw.mode as AgentConfig['people']['mode']) ?? 'single'),
      targets,
      maxPeople,
      allowFallback: peopleRaw.allowFallback !== false,
      // Agents saved before strictness existed only carry allowFallback.
      strictness: isStrictness(peopleRaw.strictness)
        ? peopleRaw.strictness
        : peopleRaw.allowFallback === false
          ? 'exact'
          : 'smart',
    },
    email: { ...base.email, ...((obj.email as AgentConfig['email']) ?? {}) },
    signals: { ...base.signals, ...((obj.signals as AgentConfig['signals']) ?? {}) },
    customQuestions: Array.isArray(obj.customQuestions)
      ? obj.customQuestions.map(String)
      : [],
    hiringKeywords: Array.isArray(obj.hiringKeywords)
      ? obj.hiringKeywords.map(String)
      : [],
  };
}

/** Sanitize for API — drop empty questions, renumber priorities, require custom hints. */
function sanitizeConfigForSave(config: AgentConfig): AgentConfig | { error: string } {
  const targets = config.people.targets
    .map((t, i) => ({
      ...t,
      priority: i + 1,
      required: t.tier === 'required',
      roleHint: t.roleHint?.trim() || undefined,
    }))
    .filter((t) => t.objective !== 'custom' || Boolean(t.roleHint));

  if (config.modules.people && targets.length === 0) {
    return { error: 'Add at least one people target, or turn off the People module.' };
  }

  const missingCustom = config.people.targets.some(
    (t) => t.objective === 'custom' && !t.roleHint?.trim(),
  );
  if (missingCustom) {
    return { error: 'Custom role targets need a title (e.g. Head of Talent).' };
  }

  const customQuestions = config.customQuestions.map((q) => q.trim()).filter(Boolean).slice(0, 20);
  const hiringKeywords = config.modules.hiring
    ? [
        ...new Set(config.hiringKeywords.map((k) => k.trim().toLowerCase()).filter(Boolean)),
      ].slice(0, 20)
    : [];
  const maxPeople = Math.min(10, Math.max(targets.length || 1, config.people.maxPeople || 1));

  return {
    ...config,
    people: {
      ...config.people,
      targets,
      maxPeople,
      mode: targets.length > 1 ? 'multi' : config.people.mode === 'auto' ? 'auto' : 'single',
    },
    email: {
      discover: config.modules.email && config.email.discover,
      verify: config.modules.email && config.email.verify,
    },
    signals: {
      whyNow: config.modules.signals && config.signals.whyNow,
      maxAgeDays: Math.min(365, Math.max(1, config.signals.maxAgeDays || 90)),
    },
    customQuestions,
    hiringKeywords,
  };
}

function objectiveLabel(id: PersonObjective) {
  return OBJECTIVES.find((o) => o.id === id)?.label ?? id;
}

export default function EnrichmentAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [config, setConfig] = useState<AgentConfig>(defaultConfig());
  const [showAdvancedModules, setShowAdvancedModules] = useState(false);

  const load = useCallback(async (preferId?: string | null) => {
    setLoading(true);
    try {
      const res = await api.get('/api/enrichment-agents');
      const rows = (res.data.data ?? []).map((a: Agent) => ({
        ...a,
        config: normalizeConfig(a.config),
      })) as Agent[];
      setAgents(rows);

      const pickId = preferId && preferId !== 'new' ? preferId : null;
      const pick =
        (pickId ? rows.find((a) => a.id === pickId) : null) ??
        rows.find((a) => a.isDefault) ??
        rows[0] ??
        null;

      if (pick) {
        setSelectedId(pick.id);
        setName(pick.name);
        setDescription(pick.description ?? '');
        setIsDefault(pick.isDefault);
        setConfig(normalizeConfig(pick.config));
      } else {
        setSelectedId('new');
        setName('');
        setDescription('');
        setIsDefault(true);
        setConfig(defaultConfig());
      }
    } catch {
      toast.error('Failed to load enrichment agents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectAgent = (agent: Agent) => {
    setSelectedId(agent.id);
    setName(agent.name);
    setDescription(agent.description ?? '');
    setIsDefault(agent.isDefault);
    setConfig(normalizeConfig(agent.config));
  };

  const startNew = () => {
    setSelectedId('new');
    setName('');
    setDescription('');
    setIsDefault(false);
    setConfig(defaultConfig());
  };

  const goal = goalFromModules(config.modules);

  const applyGoal = (next: AgentGoal) => {
    setConfig((prev) => {
      const modules = modulesForGoal(next);
      return {
        ...prev,
        modules,
        email: {
          discover: modules.email ? prev.email.discover !== false : false,
          verify: modules.email ? prev.email.verify !== false : false,
        },
        signals: { ...prev.signals, whyNow: modules.signals ? prev.signals.whyNow !== false : false },
      };
    });
  };

  const toggleModule = (key: keyof Modules) => {
    setConfig((prev) => {
      const modules = { ...prev.modules, [key]: !prev.modules[key] };
      return {
        ...prev,
        modules,
        email: {
          discover: modules.email ? prev.email.discover !== false : false,
          verify: modules.email ? prev.email.verify !== false : false,
        },
        signals: {
          ...prev.signals,
          whyNow: modules.signals,
        },
        people:
          modules.people && prev.people.targets.length === 0
            ? { ...prev.people, targets: [defaultTarget(1)] }
            : prev.people,
      };
    });
  };

  const updateTarget = (index: number, patch: Partial<PersonTarget>) => {
    setConfig((prev) => {
      const targets = prev.people.targets.map((t, i) => {
        if (i !== index) return t;
        const next = { ...t, ...patch };
        if (patch.tier) next.required = patch.tier === 'required';
        if (patch.objective && patch.objective !== 'custom') {
          // Keep roleHint as optional search hint for non-custom
        }
        return next;
      });
      return {
        ...prev,
        people: {
          ...prev.people,
          targets,
          mode: targets.length > 1 ? 'multi' : prev.people.mode,
          maxPeople: Math.max(targets.length, prev.people.maxPeople),
        },
      };
    });
  };

  const addTarget = () => {
    setConfig((prev) => {
      if (prev.people.targets.length >= 10) {
        toast.error('Maximum 10 people targets.');
        return prev;
      }
      const targets = [
        ...prev.people.targets,
        {
          objective: 'custom' as const,
          roleHint: '',
          required: true,
          priority: prev.people.targets.length + 1,
          tier: 'required' as const,
        },
      ];
      return {
        ...prev,
        people: {
          ...prev.people,
          targets,
          mode: 'multi',
          maxPeople: Math.max(targets.length, prev.people.maxPeople),
        },
      };
    });
  };

  const removeTarget = (index: number) => {
    setConfig((prev) => {
      const targets = prev.people.targets.filter((_, i) => i !== index);
      const next = targets.length ? targets : [defaultTarget(1)];
      return {
        ...prev,
        people: {
          ...prev.people,
          targets: next.map((t, i) => ({ ...t, priority: i + 1 })),
          mode: next.length > 1 ? 'multi' : 'single',
        },
      };
    });
  };

  const moveTarget = (index: number, dir: -1 | 1) => {
    setConfig((prev) => {
      const next = [...prev.people.targets];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return {
        ...prev,
        people: {
          ...prev.people,
          targets: next.map((t, i) => ({ ...t, priority: i + 1 })),
        },
      };
    });
  };

  const peopleSummary = useMemo(() => {
    if (!config.modules.people) return 'People module off — no contact search.';
    const labels = config.people.targets.map((t) => {
      const base = objectiveLabel(t.objective);
      return t.roleHint?.trim() ? `${base} (“${t.roleHint.trim()}”)` : base;
    });
    return `Will search up to ${config.people.maxPeople} people: ${labels.join(' → ')}`;
  }, [config.modules.people, config.people.maxPeople, config.people.targets]);

  const save = async () => {
    if (!name.trim()) {
      toast.error('Name is required.');
      return;
    }
    const sanitized = sanitizeConfigForSave(config);
    if ('error' in sanitized) {
      toast.error(sanitized.error);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        isDefault,
        config: sanitized,
      };
      if (selectedId === 'new' || selectedId === null) {
        const res = await api.post('/api/enrichment-agents', payload);
        toast.success('Agent created.');
        const created = res.data.data as Agent;
        await load(created.id);
      } else {
        await api.patch(`/api/enrichment-agents/${selectedId}`, payload);
        toast.success('Agent saved.');
        await load(selectedId);
      }
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string; errors?: unknown } } }).response?.data
              ?.message
          : undefined;
      toast.error(message ?? 'Could not save agent.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selectedId || selectedId === 'new') return;
    if (!confirm('Delete this enrichment agent?')) return;
    try {
      await api.delete(`/api/enrichment-agents/${selectedId}`);
      toast.success('Agent deleted.');
      await load(null);
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message ?? 'Could not delete agent.');
    }
  };

  const setDefault = async () => {
    if (!selectedId || selectedId === 'new') return;
    try {
      await api.post(`/api/enrichment-agents/${selectedId}/set-default`);
      toast.success('Default agent updated.');
      setIsDefault(true);
      await load(selectedId);
    } catch {
      toast.error('Could not set default.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-4 text-text">
      <PageHeader
        eyebrow="Settings"
        title="Enrichment Agents"
        description="Build reusable enrichment recipes — pick modules, who to find, and free-text research questions."
        actions={
          <button type="button" onClick={startNew} className={btnNavy}>
            <IconPlus size={16} /> New agent
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <IconLoader2 className="animate-spin" size={16} /> Loading agents…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm h-fit">
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => selectAgent(agent)}
                className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  selectedId === agent.id
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <IconRobot size={16} className="mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block font-semibold truncate">{agent.name}</span>
                  {agent.isDefault ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                      Default
                    </span>
                  ) : null}
                  <span
                    className={`mt-0.5 block text-[10px] truncate ${
                      selectedId === agent.id ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {(agent.config.people?.targets ?? [])
                      .map((t) => objectiveLabel(t.objective))
                      .slice(0, 3)
                      .join(', ') || 'No people'}
                  </span>
                </span>
              </button>
            ))}
            <Link
              href="/dashboard/leads"
              className="mt-3 block text-center text-[11px] font-semibold text-slate-500 hover:text-slate-800"
            >
              ← Back to Leads
            </Link>
          </aside>

          <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Founder + Hiring authority"
                />
              </label>
              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Description
                </span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inputClass}
                  placeholder="When should your team use this agent?"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                Use as workspace default when enriching
              </label>
            </div>

            {/* Goal */}
            <section className="space-y-3 border-t border-slate-100 pt-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Goal
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  What should this agent find? Everything else is planned from here — the agent only
                  runs the research your goal needs.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {GOAL_META.map((g) => (
                  <label
                    key={g.id}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${
                      goal === g.id ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="agent-goal"
                      checked={goal === g.id}
                      onChange={() => applyGoal(g.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-bold text-slate-900">{g.label}</span>
                      <span className="text-[11px] text-slate-500">{g.help}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* Modules */}
            <section className="space-y-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowAdvancedModules((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <span>
                  <span className="block text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Advanced modules
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Compiled from the goal. Override only if you need something unusual.
                  </span>
                </span>
                <span className="text-xs font-bold text-blue-600">
                  {showAdvancedModules ? 'Hide' : 'Show'}
                </span>
              </button>
              <div className={showAdvancedModules ? 'grid gap-2 sm:grid-cols-2' : 'hidden'}>
                {MODULE_META.map((m) => (
                  <label
                    key={m.key}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${
                      config.modules[m.key]
                        ? 'border-blue-200 bg-blue-50/50'
                        : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={config.modules[m.key]}
                      onChange={() => toggleModule(m.key)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-sm font-bold text-slate-900">{m.label}</span>
                      <span className="text-[11px] text-slate-500">{m.help}</span>
                    </span>
                  </label>
                ))}
              </div>

              {config.modules.email ? (
                <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.email.discover}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          email: { ...prev.email, discover: e.target.checked },
                        }))
                      }
                    />
                    Discover emails
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.email.verify}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          email: { ...prev.email, verify: e.target.checked },
                        }))
                      }
                    />
                    Verify emails
                  </label>
                </div>
              ) : null}

              {config.modules.signals ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={config.signals.whyNow}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          signals: { ...prev.signals, whyNow: e.target.checked },
                        }))
                      }
                    />
                    Why-now triggers
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    Max signal age (days)
                    <input
                      type="number"
                      min={7}
                      max={365}
                      value={config.signals.maxAgeDays}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          signals: {
                            ...prev.signals,
                            maxAgeDays: Math.min(365, Math.max(7, Number(e.target.value) || 90)),
                          },
                        }))
                      }
                      className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                    />
                  </label>
                </div>
              ) : null}
            </section>

            {/* People targets — detailed rows */}
            {config.modules.people ? (
              <section className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      People to find
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Add each role as its own row. Order = search priority. Use Custom role for a
                      title that isn&apos;t listed.
                    </p>
                  </div>
                  <button type="button" className={btnOutline} onClick={addTarget}>
                    <IconPlus size={14} /> Add person
                  </button>
                </div>

                <div className="space-y-2">
                  {config.people.targets.map((target, index) => {
                    const meta = OBJECTIVES.find((o) => o.id === target.objective);
                    return (
                      <div
                        key={`target-${index}`}
                        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                      >
                        <div className="flex flex-wrap items-start gap-2">
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              className="rounded border border-slate-200 p-1 text-slate-400 hover:bg-slate-50 disabled:opacity-30"
                              disabled={index === 0}
                              onClick={() => moveTarget(index, -1)}
                              title="Higher priority"
                            >
                              <IconChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              className="rounded border border-slate-200 p-1 text-slate-400 hover:bg-slate-50 disabled:opacity-30"
                              disabled={index === config.people.targets.length - 1}
                              onClick={() => moveTarget(index, 1)}
                              title="Lower priority"
                            >
                              <IconChevronDown size={14} />
                            </button>
                          </div>

                          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
                            <label className="block space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Role #{index + 1}
                              </span>
                              <select
                                value={target.objective}
                                onChange={(e) =>
                                  updateTarget(index, {
                                    objective: e.target.value as PersonObjective,
                                  })
                                }
                                className={inputClass}
                              >
                                {OBJECTIVES.map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="block space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Priority
                              </span>
                              <select
                                value={target.tier ?? 'required'}
                                onChange={(e) =>
                                  updateTarget(index, { tier: e.target.value as PersonTier })
                                }
                                className={inputClass}
                              >
                                {TIER_OPTIONS.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="block space-y-1 sm:col-span-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {target.objective === 'custom' ? 'Role to find *' : 'Title hint (optional)'}
                              </span>
                              <input
                                value={target.roleHint ?? ''}
                                onChange={(e) => updateTarget(index, { roleHint: e.target.value })}
                                className={inputClass}
                                placeholder={meta?.hint ?? 'e.g. Head of Talent'}
                              />
                            </label>
                          </div>

                          <button
                            type="button"
                            className={`${btnOutline} mt-5 shrink-0 px-2`}
                            onClick={() => removeTarget(index)}
                            title="Remove"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-400">
                          {TIER_OPTIONS.find((t) => t.id === (target.tier ?? 'required'))?.help}
                          {meta ? ` · ${meta.hint}` : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Max people to return
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={config.people.maxPeople}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          people: {
                            ...prev.people,
                            maxPeople: Math.min(
                              10,
                              Math.max(prev.people.targets.length || 1, Number(e.target.value) || 1),
                            ),
                          },
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Who counts as the right person
                    </span>
                    <select
                      value={config.people.strictness}
                      onChange={(e) =>
                        setConfig((prev) => {
                          const strictness = e.target.value as Strictness;
                          return {
                            ...prev,
                            people: {
                              ...prev.people,
                              strictness,
                              allowFallback: strictness !== 'exact',
                            },
                          };
                        })
                      }
                      className={inputClass}
                    >
                      {DEFINITION_OPTIONS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <span className="block text-[11px] text-slate-400">
                      {DEFINITION_OPTIONS.find((s) => s.id === config.people.strictness)?.help}
                    </span>
                  </label>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    How the agent decides
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    {config.people.strictness === 'exact'
                      ? 'The agent searches only the titles you named. If nobody holds that title, it reports not found and tells you where it looked.'
                      : 'The agent first works out how the company is organised. Where a dedicated function exists, it returns that specialist. Where none exists, it may return the leader who owns the work instead — and every substitution is shown on the lead with the evidence behind it.'}
                  </p>
                </div>

                <p className="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs font-medium text-blue-900">
                  {peopleSummary}
                </p>
              </section>
            ) : null}

            {/* Hiring keywords */}
            {config.modules.hiring ? (
              <section className="space-y-3 border-t border-slate-100 pt-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Hiring keywords
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Matched against the roles the company is actually advertising. Answered from
                    the careers page and job boards already read, so these cost no extra searches.
                  </p>
                </div>
                {config.hiringKeywords.map((k, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={k}
                      onChange={(e) =>
                        setConfig((prev) => {
                          const next = [...prev.hiringKeywords];
                          next[i] = e.target.value;
                          return { ...prev, hiringKeywords: next };
                        })
                      }
                      className={inputClass}
                      placeholder="e.g. sustainability"
                    />
                    <button
                      type="button"
                      className={btnOutline}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          hiringKeywords: prev.hiringKeywords.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={btnOutline}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      hiringKeywords: [...prev.hiringKeywords, ''].slice(0, 20),
                    }))
                  }
                >
                  <IconPlus size={14} /> Add keyword
                </button>
              </section>
            ) : null}

            {/* Custom questions */}
            <section className="space-y-3 border-t border-slate-100 pt-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Custom research questions
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Free-text asks the research engine will try to answer from the web (e.g. banking
                  partner, tech stack, recent funding).
                </p>
              </div>
              {config.customQuestions.map((q, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={q}
                    onChange={(e) =>
                      setConfig((prev) => {
                        const next = [...prev.customQuestions];
                        next[i] = e.target.value;
                        return { ...prev, customQuestions: next };
                      })
                    }
                    className={inputClass}
                    placeholder="e.g. Who is their banking partner?"
                  />
                  <button
                    type="button"
                    className={btnOutline}
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        customQuestions: prev.customQuestions.filter((_, j) => j !== i),
                      }))
                    }
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={btnOutline}
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    customQuestions: [...prev.customQuestions, ''].slice(0, 20),
                  }))
                }
              >
                <IconPlus size={14} /> Add question
              </button>
            </section>

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => void save()} className={btnNavy} disabled={saving}>
                {saving ? <IconLoader2 className="animate-spin" size={16} /> : null}
                {selectedId === 'new' || !selectedId ? 'Create agent' : 'Save changes'}
              </button>
              {selectedId && selectedId !== 'new' && !isDefault ? (
                <button type="button" onClick={() => void setDefault()} className={btnOutline}>
                  <IconStar size={14} /> Set as default
                </button>
              ) : null}
              {selectedId && selectedId !== 'new' ? (
                <button type="button" onClick={() => void remove()} className={btnOutline}>
                  <IconTrash size={14} /> Delete
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
