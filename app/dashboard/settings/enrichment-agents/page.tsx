'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconBriefcase,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCompass,
  IconFlame,
  IconHelp,
  IconLoader2,
  IconPlus,
  IconRobot,
  IconSend,
  IconStar,
  IconTarget,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import api from '../../../../lib/api';
import {
  SettingsCard,
  SettingsPanel,
  settingsBtnDanger,
  settingsBtnPrimary,
  settingsBtnSecondary,
  settingsInputClass,
} from '@/components/settings/primitives';

export type PersonObjective =
  | 'founder'
  | 'hiring_authority'
  | 'sales_leader'
  | 'marketing_leader'
  | 'technology_decision_maker'
  | 'operations'
  | 'finance'
  | 'procurement'
  | 'custom';

export type PersonTier = 'required' | 'preferred' | 'fallback';

export type PersonTarget = {
  objective: PersonObjective;
  roleHint?: string;
  required?: boolean;
  priority: number;
  tier?: PersonTier;
};

export type Modules = {
  company: boolean;
  people: boolean;
  hiring: boolean;
  signals: boolean;
  scoring: boolean;
  outreach: boolean;
  email: boolean;
};

export type Strictness = 'exact' | 'smart' | 'flexible';

export type DepartmentImportance = 'required' | 'relevant' | 'ignore';

export interface DepartmentRule {
  department: string;
  importance: DepartmentImportance;
}

export interface HiringPolicy {
  maxAgeDays: number;
  requireLiveUrl: boolean;
  departmentRules?: DepartmentRule[];
  keywords?: string[];
}

export type IcpCriterionType =
  | 'industry'
  | 'employee_count'
  | 'revenue'
  | 'geography'
  | 'business_model'
  | 'tech_stack'
  | 'custom';

export interface IcpCriterion {
  id: string;
  label: string;
  type: IcpCriterionType;
  expectedValue: string;
  weight: number;
  isDisqualifier?: boolean;
}

export interface IcpPolicy {
  enabled: boolean;
  minScoreToPass?: number;
  criteria: IcpCriterion[];
}

export interface IntentSignalConfig {
  type: string;
  enabled: boolean;
  weight: number;
  minConfidence?: 'low' | 'medium' | 'high';
}

export interface IntentPolicy {
  enabled: boolean;
  maxAgeDays: number;
  allowedSignalTypes: string[];
  signals?: IntentSignalConfig[];
}

export type OutreachObjective =
  | 'book_meeting'
  | 'start_conversation'
  | 'offer_audit'
  | 'partnership'
  | 'custom';

export type OutreachStyle =
  | 'casual'
  | 'consultative'
  | 'direct'
  | 'thought_provoking';

export type OutreachCtaType =
  | 'soft_interest'
  | 'specific_time'
  | 'resource_offer'
  | 'open_question';

export type PersonalizationSource =
  | 'hiring'
  | 'recent_news'
  | 'pain_points'
  | 'tech_stack'
  | 'role_context';

export interface OutreachPolicy {
  objective?: OutreachObjective;
  style?: OutreachStyle;
  ctaType?: OutreachCtaType;
  forbiddenPhrases?: string[];
  personalizationPriority?: PersonalizationSource[];
  whenNoEvidence?: 'skip' | 'generic' | 'pain_point_only';
}

export type AgentConfig = {
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
  hiringPolicy: HiringPolicy;
  icpPolicy: IcpPolicy;
  intentPolicy: IntentPolicy;
  outreachPolicy: OutreachPolicy;
};

export type Agent = {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  config: AgentConfig;
};

export type AgentGoal = 'identity' | 'person' | 'contact' | 'full';

type TabKey = 'goal' | 'people' | 'hiring' | 'icp' | 'intent' | 'outreach' | 'research';

const GOAL_META: Array<{ id: AgentGoal; label: string; help: string }> = [
  { id: 'identity', label: 'Identify the company', help: 'Company, domain, LinkedIn, firmographics' },
  { id: 'person', label: 'Find the right person', help: 'Company identity plus the decision maker' },
  { id: 'contact', label: 'Find the person and their email', help: 'Adds discovery and verification' },
  { id: 'full', label: 'Full intelligence', help: 'Everything, including signals, scoring, outreach' },
];

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

const DEFINITION_OPTIONS: Array<{ id: Strictness; label: string; help: string }> = [
  {
    id: 'exact',
    label: 'Only this exact title',
    help: 'Returns nothing rather than a near match. Use when the title is the point.',
  },
  {
    id: 'smart',
    label: 'Whoever owns this responsibility',
    help: 'Accepts equivalent titles, and where a company has no such function, the leader who actually owns the work.',
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

const STANDARD_DEPARTMENTS = [
  'sales',
  'engineering',
  'marketing',
  'operations',
  'leadership',
  'finance',
  'product',
  'customer success',
];

const ICP_CRITERIA_TYPES: Array<{ id: IcpCriterionType; label: string }> = [
  { id: 'industry', label: 'Industry' },
  { id: 'employee_count', label: 'Company Size' },
  { id: 'business_model', label: 'Business Model' },
  { id: 'tech_stack', label: 'Tech Stack / Tooling' },
  { id: 'geography', label: 'Location / Geography' },
  { id: 'revenue', label: 'Revenue / Funding' },
  { id: 'custom', label: 'Custom Criterion' },
];

const INTENT_SIGNAL_TYPES: Array<{ id: string; label: string; defaultWeight: number; desc: string }> = [
  { id: 'hiring', label: 'Hiring & Headcount Expansion', defaultWeight: 30, desc: 'Active job postings on careers page or job boards' },
  { id: 'funding', label: 'Funding & Investment Round', defaultWeight: 30, desc: 'Seed, Series A-D, or venture capital raises' },
  { id: 'expansion', label: 'Geographic & Market Expansion', defaultWeight: 20, desc: 'New office openings, new regional markets' },
  { id: 'product_launch', label: 'Product & Feature Launch', defaultWeight: 20, desc: 'New version releases, product announcements' },
  { id: 'leadership_change', label: 'Leadership & Executive Hires', defaultWeight: 15, desc: 'New VP, CXO, or Director appointments' },
  { id: 'partnership', label: 'Partnerships & Integrations', defaultWeight: 15, desc: 'Ecosystem announcements, strategic alliances' },
  { id: 'technology_adoption', label: 'Tech Stack Modernization', defaultWeight: 10, desc: 'Cloud migration, CRM adoption, tooling shifts' },
];

const PERSONALIZATION_SOURCES: Array<{ id: PersonalizationSource; label: string }> = [
  { id: 'hiring', label: 'Active Hiring / Role Openings' },
  { id: 'recent_news', label: 'Recent News & Announcements' },
  { id: 'pain_points', label: 'Identified Business Pain Points' },
  { id: 'tech_stack', label: 'Installed Tech Stack' },
  { id: 'role_context', label: 'Prospect Role & Seniority Context' },
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

function defaultHiringPolicy(): HiringPolicy {
  return {
    maxAgeDays: 60,
    requireLiveUrl: true,
    departmentRules: [
      { department: 'sales', importance: 'required' },
      { department: 'engineering', importance: 'relevant' },
      { department: 'marketing', importance: 'relevant' },
      { department: 'operations', importance: 'relevant' },
      { department: 'leadership', importance: 'relevant' },
      { department: 'finance', importance: 'relevant' },
      { department: 'product', importance: 'relevant' },
      { department: 'customer success', importance: 'relevant' },
    ],
    keywords: [],
  };
}

function defaultIcpPolicy(): IcpPolicy {
  return {
    enabled: true,
    minScoreToPass: 60,
    criteria: [
      {
        id: 'crit-b2b',
        label: 'B2B Business Model',
        type: 'business_model',
        expectedValue: 'B2B / SaaS / Enterprise',
        weight: 25,
        isDisqualifier: false,
      },
      {
        id: 'crit-size',
        label: 'Target Company Size (50-500)',
        type: 'employee_count',
        expectedValue: '50-500',
        weight: 25,
        isDisqualifier: false,
      },
      {
        id: 'crit-decision',
        label: 'Decision Maker Reachable',
        type: 'custom',
        expectedValue: 'Founder / C-Level / VP found',
        weight: 25,
        isDisqualifier: false,
      },
      {
        id: 'crit-tech',
        label: 'Modern Tech Stack / Sales Tools',
        type: 'tech_stack',
        expectedValue: 'Salesforce, HubSpot, Apollo, or Cloud infrastructure',
        weight: 25,
        isDisqualifier: false,
      },
    ],
  };
}

function defaultIntentPolicy(): IntentPolicy {
  return {
    enabled: true,
    maxAgeDays: 90,
    allowedSignalTypes: [
      'hiring',
      'funding',
      'expansion',
      'product_launch',
      'partnership',
      'leadership_change',
      'technology_adoption',
    ],
    signals: INTENT_SIGNAL_TYPES.map((s) => ({
      type: s.id,
      enabled: true,
      weight: s.defaultWeight,
      minConfidence: 'medium',
    })),
  };
}

function defaultOutreachPolicy(): OutreachPolicy {
  return {
    objective: 'start_conversation',
    style: 'consultative',
    ctaType: 'soft_interest',
    forbiddenPhrases: [
      "hope you're doing well",
      'i came across your profile',
      'reaching out because',
      'quick 15 minute call',
      'touch base',
    ],
    personalizationPriority: ['hiring', 'recent_news', 'pain_points', 'role_context'],
    whenNoEvidence: 'pain_point_only',
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
    hiringPolicy: defaultHiringPolicy(),
    icpPolicy: defaultIcpPolicy(),
    intentPolicy: defaultIntentPolicy(),
    outreachPolicy: defaultOutreachPolicy(),
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

  const rawHiring = (obj.hiringPolicy ?? {}) as Record<string, unknown>;
  const hiringPolicy: HiringPolicy = {
    maxAgeDays: typeof rawHiring.maxAgeDays === 'number' ? rawHiring.maxAgeDays : base.hiringPolicy.maxAgeDays,
    requireLiveUrl: typeof rawHiring.requireLiveUrl === 'boolean' ? rawHiring.requireLiveUrl : base.hiringPolicy.requireLiveUrl,
    departmentRules: Array.isArray(rawHiring.departmentRules)
      ? rawHiring.departmentRules.map((r) => ({
          department: String(r.department || '').toLowerCase(),
          importance: (['required', 'relevant', 'ignore'].includes(String(r.importance))
            ? r.importance
            : 'relevant') as DepartmentImportance,
        }))
      : base.hiringPolicy.departmentRules,
    keywords: Array.isArray(rawHiring.keywords) ? rawHiring.keywords.map(String) : base.hiringPolicy.keywords,
  };

  const rawIcp = (obj.icpPolicy ?? {}) as Record<string, unknown>;
  const icpPolicy: IcpPolicy = {
    enabled: rawIcp.enabled !== false,
    minScoreToPass: typeof rawIcp.minScoreToPass === 'number' ? rawIcp.minScoreToPass : base.icpPolicy.minScoreToPass,
    criteria: Array.isArray(rawIcp.criteria)
      ? rawIcp.criteria.map((c, i) => ({
          id: String(c.id || `crit-${i + 1}`),
          label: String(c.label || ''),
          type: (c.type || 'custom') as IcpCriterionType,
          expectedValue: String(c.expectedValue || ''),
          weight: typeof c.weight === 'number' ? c.weight : 20,
          isDisqualifier: Boolean(c.isDisqualifier),
        }))
      : base.icpPolicy.criteria,
  };

  const rawIntent = (obj.intentPolicy ?? {}) as Record<string, unknown>;
  const intentPolicy: IntentPolicy = {
    enabled: rawIntent.enabled !== false,
    maxAgeDays: typeof rawIntent.maxAgeDays === 'number' ? rawIntent.maxAgeDays : base.intentPolicy.maxAgeDays,
    allowedSignalTypes: Array.isArray(rawIntent.allowedSignalTypes)
      ? rawIntent.allowedSignalTypes.map(String)
      : base.intentPolicy.allowedSignalTypes,
    signals: Array.isArray(rawIntent.signals)
      ? rawIntent.signals.map((s) => ({
          type: String(s.type || ''),
          enabled: s.enabled !== false,
          weight: typeof s.weight === 'number' ? s.weight : 20,
          minConfidence: (['low', 'medium', 'high'].includes(String(s.minConfidence))
            ? s.minConfidence
            : 'medium') as 'low' | 'medium' | 'high',
        }))
      : base.intentPolicy.signals,
  };

  const rawOutreach = (obj.outreachPolicy ?? {}) as Record<string, unknown>;
  const outreachPolicy: OutreachPolicy = {
    objective: (rawOutreach.objective || base.outreachPolicy.objective) as OutreachObjective,
    style: (rawOutreach.style || base.outreachPolicy.style) as OutreachStyle,
    ctaType: (rawOutreach.ctaType || base.outreachPolicy.ctaType) as OutreachCtaType,
    forbiddenPhrases: Array.isArray(rawOutreach.forbiddenPhrases)
      ? rawOutreach.forbiddenPhrases.map(String)
      : base.outreachPolicy.forbiddenPhrases,
    personalizationPriority: Array.isArray(rawOutreach.personalizationPriority)
      ? (rawOutreach.personalizationPriority as PersonalizationSource[])
      : base.outreachPolicy.personalizationPriority,
    whenNoEvidence: (rawOutreach.whenNoEvidence || base.outreachPolicy.whenNoEvidence) as OutreachPolicy['whenNoEvidence'],
  };

  return {
    modules: { ...base.modules, ...((obj.modules as Modules) ?? {}) },
    people: {
      mode: targets.length > 1 ? 'multi' : ((peopleRaw.mode as AgentConfig['people']['mode']) ?? 'single'),
      targets,
      maxPeople,
      allowFallback: peopleRaw.allowFallback !== false,
      strictness:
        peopleRaw.strictness === 'exact' || peopleRaw.strictness === 'smart' || peopleRaw.strictness === 'flexible'
          ? peopleRaw.strictness
          : peopleRaw.allowFallback === false
            ? 'exact'
            : 'smart',
    },
    email: { ...base.email, ...((obj.email as AgentConfig['email']) ?? {}) },
    signals: { ...base.signals, ...((obj.signals as AgentConfig['signals']) ?? {}) },
    customQuestions: Array.isArray(obj.customQuestions) ? obj.customQuestions.map(String) : [],
    hiringKeywords: Array.isArray(obj.hiringKeywords) ? obj.hiringKeywords.map(String) : [],
    hiringPolicy,
    icpPolicy,
    intentPolicy,
    outreachPolicy,
  };
}

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
    ? [...new Set(config.hiringKeywords.map((k) => k.trim().toLowerCase()).filter(Boolean))].slice(0, 20)
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
    hiringPolicy: {
      ...config.hiringPolicy,
      departmentRules: config.hiringPolicy.departmentRules?.filter((r) => r.department.trim()),
    },
    icpPolicy: {
      ...config.icpPolicy,
      criteria: config.icpPolicy.criteria.filter((c) => c.label.trim()),
    },
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
  const [activeTab, setActiveTab] = useState<TabKey>('goal');
  const [newForbiddenInput, setNewForbiddenInput] = useState('');
  const [customDeptInput, setCustomDeptInput] = useState('');

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
        signals: { ...prev.signals, whyNow: modules.signals },
        people:
          modules.people && prev.people.targets.length === 0
            ? { ...prev.people, targets: [defaultTarget(1)] }
            : prev.people,
      };
    });
  };

  // People target actions
  const updateTarget = (index: number, patch: Partial<PersonTarget>) => {
    setConfig((prev) => {
      const targets = prev.people.targets.map((t, i) => {
        if (i !== index) return t;
        const next = { ...t, ...patch };
        if (patch.tier) next.required = patch.tier === 'required';
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

  const moveTarget = (index: number, delta: number) => {
    const nextIdx = index + delta;
    if (nextIdx < 0 || nextIdx >= config.people.targets.length) return;
    setConfig((prev) => {
      const targets = [...prev.people.targets];
      const [moved] = targets.splice(index, 1);
      targets.splice(nextIdx, 0, moved);
      return {
        ...prev,
        people: {
          ...prev.people,
          targets: targets.map((t, i) => ({ ...t, priority: i + 1 })),
        },
      };
    });
  };

  // Department rules
  const updateDepartmentRule = (department: string, importance: DepartmentImportance) => {
    setConfig((prev) => {
      const current = prev.hiringPolicy.departmentRules ?? [];
      const exists = current.find((r) => r.department.toLowerCase() === department.toLowerCase());
      let nextRules: DepartmentRule[];
      if (exists) {
        nextRules = current.map((r) =>
          r.department.toLowerCase() === department.toLowerCase() ? { ...r, importance } : r,
        );
      } else {
        nextRules = [...current, { department: department.toLowerCase(), importance }];
      }
      return {
        ...prev,
        hiringPolicy: {
          ...prev.hiringPolicy,
          departmentRules: nextRules,
        },
      };
    });
  };

  const addCustomDepartment = () => {
    const d = customDeptInput.trim().toLowerCase();
    if (!d) return;
    updateDepartmentRule(d, 'relevant');
    setCustomDeptInput('');
  };

  // ICP criteria
  const addIcpCriterion = () => {
    setConfig((prev) => ({
      ...prev,
      icpPolicy: {
        ...prev.icpPolicy,
        criteria: [
          ...prev.icpPolicy.criteria,
          {
            id: `crit-${Date.now()}`,
            label: 'New Target Criterion',
            type: 'custom',
            expectedValue: '',
            weight: 20,
            isDisqualifier: false,
          },
        ],
      },
    }));
  };

  const updateIcpCriterion = (id: string, patch: Partial<IcpCriterion>) => {
    setConfig((prev) => ({
      ...prev,
      icpPolicy: {
        ...prev.icpPolicy,
        criteria: prev.icpPolicy.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    }));
  };

  const removeIcpCriterion = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      icpPolicy: {
        ...prev.icpPolicy,
        criteria: prev.icpPolicy.criteria.filter((c) => c.id !== id),
      },
    }));
  };

  // Intent signals
  const updateIntentSignal = (type: string, patch: Partial<IntentSignalConfig>) => {
    setConfig((prev) => {
      const current = prev.intentPolicy.signals ?? [];
      const exists = current.find((s) => s.type === type);
      let nextSignals: IntentSignalConfig[];
      if (exists) {
        nextSignals = current.map((s) => (s.type === type ? { ...s, ...patch } : s));
      } else {
        nextSignals = [...current, { type, enabled: true, weight: 20, ...patch }];
      }
      return {
        ...prev,
        intentPolicy: {
          ...prev.intentPolicy,
          signals: nextSignals,
        },
      };
    });
  };

  // Forbidden phrases
  const addForbiddenPhrase = () => {
    const p = newForbiddenInput.trim().toLowerCase();
    if (!p) return;
    if (config.outreachPolicy.forbiddenPhrases?.includes(p)) return;
    setConfig((prev) => ({
      ...prev,
      outreachPolicy: {
        ...prev.outreachPolicy,
        forbiddenPhrases: [...(prev.outreachPolicy.forbiddenPhrases ?? []), p],
      },
    }));
    setNewForbiddenInput('');
  };

  const removeForbiddenPhrase = (phrase: string) => {
    setConfig((prev) => ({
      ...prev,
      outreachPolicy: {
        ...prev.outreachPolicy,
        forbiddenPhrases: (prev.outreachPolicy.forbiddenPhrases ?? []).filter((p) => p !== phrase),
      },
    }));
  };

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
        description: description.trim() || undefined,
        isDefault,
        config: sanitized,
      };

      if (selectedId === 'new' || !selectedId) {
        const res = await api.post('/api/enrichment-agents', payload);
        const created = res.data.data as Agent;
        toast.success('Agent created.');
        await load(created.id);
      } else {
        await api.patch(`/api/enrichment-agents/${selectedId}`, payload);
        toast.success('Agent saved.');
        await load(selectedId);
      }
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
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

  const TABS: Array<{
    id: TabKey;
    label: string;
    icon: typeof IconCompass;
    badge?: string | number;
    enabled?: boolean;
  }> = [
    { id: 'goal', label: 'Goal & Scope', icon: IconCompass },
    {
      id: 'people',
      label: 'People',
      icon: IconUsers,
      badge: config.people.targets.length,
      enabled: config.modules.people,
    },
    {
      id: 'hiring',
      label: 'Hiring Signals',
      icon: IconBriefcase,
      enabled: config.modules.hiring,
    },
    {
      id: 'icp',
      label: 'ICP Policy',
      icon: IconTarget,
      badge: config.icpPolicy?.criteria?.length ?? 0,
      enabled: config.modules.scoring && config.icpPolicy.enabled,
    },
    {
      id: 'intent',
      label: 'Intent Triggers',
      icon: IconFlame,
      enabled: config.modules.signals && config.intentPolicy.enabled,
    },
    {
      id: 'outreach',
      label: 'Outreach Policy',
      icon: IconSend,
      enabled: config.modules.outreach,
    },
    {
      id: 'research',
      label: 'Research Asks',
      icon: IconHelp,
      badge: config.customQuestions.length || undefined,
    },
  ];

  return (
    <SettingsPanel wide>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <IconLoader2 className="animate-spin" size={16} /> Loading agents…
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-start">
          {/* Left Sidebar: Agents list */}
          <aside className="min-w-0 xl:w-64 xl:shrink-0">
            <SettingsCard
              icon={IconRobot}
              title="Agents"
              actions={
                <button type="button" onClick={startNew} className={settingsBtnPrimary}>
                  <IconPlus size={16} /> New
                </button>
              }
              padded={false}
            >
              <div className="no-scrollbar flex gap-2 overflow-x-auto p-3 xl:block xl:space-y-1 xl:overflow-visible">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => selectAgent(agent)}
                    className={`flex min-w-44 items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition xl:min-w-0 xl:w-full ${
                      selectedId === agent.id
                        ? 'bg-settings-accent text-white shadow-sm'
                        : 'bg-settings-canvas text-settings-ink hover:bg-settings-mid/60 xl:bg-transparent'
                    }`}
                  >
                    <IconRobot size={16} className="mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{agent.name}</span>
                      {agent.isDefault ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Default</span>
                      ) : null}
                      <span
                        className={`mt-0.5 block truncate text-[10px] ${
                          selectedId === agent.id ? 'text-slate-200' : 'text-slate-400'
                        }`}
                      >
                        {(agent.config.people?.targets ?? [])
                          .map((t) => objectiveLabel(t.objective))
                          .slice(0, 2)
                          .join(', ') || 'No people'}
                      </span>
                    </span>
                  </button>
                ))}
                {selectedId === 'new' ? (
                  <div className="min-w-44 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-500 xl:min-w-0">
                    New agent
                  </div>
                ) : null}
              </div>
            </SettingsCard>
          </aside>

          {/* Right Main Form Container */}
          <div className="min-w-0 flex-1 space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {/* Top Identity Row */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Agent Name *
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={settingsInputClass}
                  placeholder="e.g. Sales Outbound Specialist"
                />
              </label>

              <label className="block space-y-1 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Description
                </span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={settingsInputClass}
                  placeholder="When should your team use this agent?"
                />
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                Use as workspace default agent when enriching leads
              </label>
            </div>

            {/* Tab Navigation Pill Bar */}
            <div className="border-b border-slate-100 pb-2">
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                      }`}
                    >
                      <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span>{tab.label}</span>
                      {tab.badge !== undefined ? (
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                            isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {tab.badge}
                        </span>
                      ) : null}
                      {tab.enabled === false ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Module inactive" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TAB 1: GOAL & SCOPE */}
            {activeTab === 'goal' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <section className="space-y-3">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Preset Research Goal
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Pick the primary outcome. Modules are automatically configured from this goal.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {GOAL_META.map((g) => (
                      <label
                        key={g.id}
                        className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                          goal === g.id
                            ? 'border-settings-accent/40 bg-settings-soft/50 shadow-sm'
                            : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="agent-goal"
                          checked={goal === g.id}
                          onChange={() => applyGoal(g.id)}
                          className="mt-0.5 text-settings-accent"
                        />
                        <span>
                          <span className="block text-sm font-bold text-slate-900">{g.label}</span>
                          <span className="text-[11px] text-slate-500">{g.help}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>

                {/* Modules breakdown */}
                <section className="space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Active Intelligence Modules
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Toggle modules on or off to adjust research depth and speed.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {MODULE_META.map((m) => (
                      <label
                        key={m.key}
                        className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                          config.modules[m.key]
                            ? 'border-settings-accent/30 bg-settings-soft'
                            : 'border-slate-200/60 bg-slate-50/30 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={config.modules[m.key]}
                          onChange={() => toggleModule(m.key)}
                          className="mt-0.5 text-settings-accent"
                        />
                        <span>
                          <span className="block text-sm font-bold text-slate-900">{m.label}</span>
                          <span className="text-[11px] text-slate-500">{m.help}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  {config.modules.email && (
                    <div className="flex flex-wrap gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
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
                        Discover Emails
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
                        Verify Deliverability
                      </label>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* TAB 2: PEOPLE TARGETS */}
            {activeTab === 'people' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {!config.modules.people && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <IconAlertCircle size={16} className="shrink-0 text-amber-600" />
                    <span>The People module is currently turned off. Turn it on in the Goal tab to search for these roles.</span>
                  </div>
                )}
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Target Decision Makers
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      The agent discovers and verifies candidates in priority order (top to bottom).
                    </p>
                  </div>
                  <button type="button" className={settingsBtnSecondary} onClick={addTarget}>
                    <IconPlus size={14} /> Add Role
                  </button>
                </div>

                <div className="space-y-2">
                  {config.people.targets.map((target, index) => {
                    const meta = OBJECTIVES.find((o) => o.id === target.objective);
                    return (
                      <div
                        key={`target-${index}`}
                        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300"
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

                          <div className="grid min-w-0 flex-1 gap-2 lg:grid-cols-3">
                            <label className="block space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Priority #{index + 1}
                              </span>
                              <select
                                value={target.objective}
                                onChange={(e) =>
                                  updateTarget(index, { objective: e.target.value as PersonObjective })
                                }
                                className={settingsInputClass}
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
                                Tier
                              </span>
                              <select
                                value={target.tier ?? 'required'}
                                onChange={(e) => updateTarget(index, { tier: e.target.value as PersonTier })}
                                className={settingsInputClass}
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
                                {target.objective === 'custom' ? 'Custom Title *' : 'Title Hint (optional)'}
                              </span>
                              <input
                                value={target.roleHint ?? ''}
                                onChange={(e) => updateTarget(index, { roleHint: e.target.value })}
                                className={settingsInputClass}
                                placeholder={meta?.hint ?? 'e.g. Head of Talent'}
                              />
                            </label>
                          </div>

                          <button
                            type="button"
                            className={`${settingsBtnDanger} mt-5`}
                            onClick={() => removeTarget(index)}
                            title="Remove"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
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
                            maxPeople: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                          },
                        }))
                      }
                      className={settingsInputClass}
                    />
                  </label>

                  <label className="block space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Strictness / Matching Logic
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
                      className={settingsInputClass}
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
              </div>
            )}

            {/* TAB 3: HIRING SIGNALS */}
            {activeTab === 'hiring' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                {!config.modules.hiring && (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <IconAlertCircle size={16} className="shrink-0 text-amber-600" />
                    <span>Hiring intelligence module is inactive. Turn it on in Goal tab to collect open roles.</span>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Posting Freshness</span>
                      <span className="text-xs font-bold text-settings-accent">
                        ≤ {config.hiringPolicy.maxAgeDays} days
                      </span>
                    </div>
                    <input
                      type="range"
                      min={14}
                      max={180}
                      step={7}
                      value={config.hiringPolicy.maxAgeDays}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hiringPolicy: {
                            ...prev.hiringPolicy,
                            maxAgeDays: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-settings-accent"
                    />
                    <p className="text-[11px] text-slate-500">
                      Roles older than {config.hiringPolicy.maxAgeDays} days are discarded as stale.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.hiringPolicy.requireLiveUrl}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            hiringPolicy: {
                              ...prev.hiringPolicy,
                              requireLiveUrl: e.target.checked,
                            },
                          }))
                        }
                        className="mt-0.5"
                      />
                      <div>
                        <span className="block text-xs font-bold text-slate-700">Require Live Job URL</span>
                        <span className="block text-[11px] text-slate-500">
                          Enforce that every role has a verified careers URL or job posting link from the pages read.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Per-Department Hiring Importance Table */}
                <section className="space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Department Hiring Importance
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Configure which department roles matter most. Roles matching &quot;Required&quot; departments are prioritized first.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Department</th>
                          <th className="px-4 py-2.5">Evaluation Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {STANDARD_DEPARTMENTS.map((dept) => {
                          const rule = (config.hiringPolicy.departmentRules ?? []).find(
                            (r) => r.department.toLowerCase() === dept,
                          );
                          const importance = rule?.importance ?? 'relevant';
                          return (
                            <tr key={dept} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2 font-medium capitalize text-slate-800">{dept}</td>
                              <td className="px-4 py-2">
                                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px]">
                                  <button
                                    type="button"
                                    onClick={() => updateDepartmentRule(dept, 'required')}
                                    className={`rounded-md px-2 py-1 font-semibold transition ${
                                      importance === 'required'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    Required
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateDepartmentRule(dept, 'relevant')}
                                    className={`rounded-md px-2 py-1 font-semibold transition ${
                                      importance === 'relevant'
                                        ? 'bg-slate-800 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    Relevant
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateDepartmentRule(dept, 'ignore')}
                                    className={`rounded-md px-2 py-1 font-semibold transition ${
                                      importance === 'ignore'
                                        ? 'bg-rose-500 text-white shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                  >
                                    Ignore
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <input
                      value={customDeptInput}
                      onChange={(e) => setCustomDeptInput(e.target.value)}
                      placeholder="Add another department (e.g. data science)..."
                      className={settingsInputClass}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomDepartment();
                        }
                      }}
                    />
                    <button type="button" onClick={addCustomDepartment} className={settingsBtnSecondary}>
                      Add Dept
                    </button>
                  </div>
                </section>

                {/* Role Keywords */}
                <section className="space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Specific Role Keywords
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Match specific technologies or disciplines (e.g. &quot;Kubernetes&quot;, &quot;Cold Outreach&quot;, &quot;SOC2&quot;).
                    </p>
                  </div>
                  <div className="space-y-2">
                    {config.hiringKeywords.map((kw, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={kw}
                          onChange={(e) => {
                            const next = [...config.hiringKeywords];
                            next[i] = e.target.value;
                            setConfig((prev) => ({ ...prev, hiringKeywords: next }));
                          }}
                          className={settingsInputClass}
                          placeholder="e.g. inbound marketing"
                        />
                        <button
                          type="button"
                          className={settingsBtnSecondary}
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
                      className={settingsBtnSecondary}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          hiringKeywords: [...prev.hiringKeywords, ''],
                        }))
                      }
                    >
                      <IconPlus size={14} /> Add Keyword
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* TAB 4: ICP POLICY */}
            {activeTab === 'icp' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Policy-Driven ICP Evaluation</h3>
                    <p className="text-xs text-slate-500">
                      Score every company against your custom weighted criteria with transparent evidence breakdowns.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                    <input
                      type="checkbox"
                      checked={config.icpPolicy.enabled}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          icpPolicy: { ...prev.icpPolicy, enabled: e.target.checked },
                        }))
                      }
                    />
                    Enable ICP Scoring
                  </label>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Minimum Score to Pass</span>
                    <span className="text-xs font-bold text-settings-accent">
                      {config.icpPolicy.minScoreToPass ?? 60} / 100
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={config.icpPolicy.minScoreToPass ?? 60}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        icpPolicy: {
                          ...prev.icpPolicy,
                          minScoreToPass: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-settings-accent"
                  />
                  <p className="text-[11px] text-slate-500">
                    Leads below this threshold will be flagged as low-fit or missing key requirements.
                  </p>
                </div>

                <section className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        ICP Criteria Builder
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Each criterion receives points when verified against the company profile or leadership.
                      </p>
                    </div>
                    <button type="button" onClick={addIcpCriterion} className={settingsBtnSecondary}>
                      <IconPlus size={14} /> Add Criterion
                    </button>
                  </div>

                  <div className="space-y-3">
                    {config.icpPolicy.criteria.map((crit, idx) => (
                      <div
                        key={crit.id}
                        className={`rounded-xl border p-3.5 space-y-3 transition ${
                          crit.isDisqualifier
                            ? 'border-rose-200 bg-rose-50/20'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-4">
                            <div className="sm:col-span-1">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Type
                              </label>
                              <select
                                value={crit.type}
                                onChange={(e) =>
                                  updateIcpCriterion(crit.id, {
                                    type: e.target.value as IcpCriterionType,
                                  })
                                }
                                className={settingsInputClass}
                              >
                                {ICP_CRITERIA_TYPES.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Criterion Label
                              </label>
                              <input
                                value={crit.label}
                                onChange={(e) => updateIcpCriterion(crit.id, { label: e.target.value })}
                                placeholder="e.g. B2B SaaS Business Model"
                                className={settingsInputClass}
                              />
                            </div>

                            <div className="sm:col-span-1">
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Points ({crit.weight} pts)
                              </label>
                              <input
                                type="number"
                                min={5}
                                max={100}
                                value={crit.weight}
                                onChange={(e) =>
                                  updateIcpCriterion(crit.id, {
                                    weight: Math.max(1, Number(e.target.value) || 10),
                                  })
                                }
                                className={settingsInputClass}
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeIcpCriterion(crit.id)}
                            className={`${settingsBtnDanger} mt-4`}
                            title="Delete Criterion"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3 items-center">
                          <div className="sm:col-span-2">
                            <input
                              value={crit.expectedValue}
                              onChange={(e) =>
                                updateIcpCriterion(crit.id, { expectedValue: e.target.value })
                              }
                              placeholder="Expected value/keywords (e.g. 50-500, SaaS, US/UK)..."
                              className={settingsInputClass}
                            />
                          </div>

                          <label className="flex items-center gap-2 text-xs font-semibold text-rose-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={crit.isDisqualifier ?? false}
                              onChange={(e) =>
                                updateIcpCriterion(crit.id, { isDisqualifier: e.target.checked })
                              }
                            />
                            <span>Disqualify lead if failed</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* TAB 5: INTENT POLICY */}
            {activeTab === 'intent' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Evidence-Required Intent Scoring</h3>
                    <p className="text-xs text-slate-500">
                      Calculate a calibrated 0–100 score based on dated, verifiable trigger events.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800">
                    <input
                      type="checkbox"
                      checked={config.intentPolicy.enabled}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          intentPolicy: { ...prev.intentPolicy, enabled: e.target.checked },
                        }))
                      }
                    />
                    Enable Intent Scoring
                  </label>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Max Signal Lookback</span>
                    <span className="text-xs font-bold text-settings-accent">
                      ≤ {config.intentPolicy.maxAgeDays} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={180}
                    step={7}
                    value={config.intentPolicy.maxAgeDays}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        intentPolicy: {
                          ...prev.intentPolicy,
                          maxAgeDays: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-settings-accent"
                  />
                  <p className="text-[11px] text-slate-500">
                    Signals older than {config.intentPolicy.maxAgeDays} days will be filtered out.
                  </p>
                </div>

                {/* Signal categories table */}
                <section className="space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Signal Weights &amp; Confidence Filters
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Configure how much each verified signal contributes to the buying intent score.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {INTENT_SIGNAL_TYPES.map((st) => {
                      const cfg = (config.intentPolicy.signals ?? []).find((s) => s.type === st.id);
                      const isEnabled = cfg ? cfg.enabled : true;
                      const weight = cfg ? cfg.weight : st.defaultWeight;
                      const minConf = cfg?.minConfidence ?? 'medium';

                      return (
                        <div
                          key={st.id}
                          className={`rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3 transition ${
                            isEnabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/50 opacity-60'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => updateIntentSignal(st.id, { enabled: e.target.checked })}
                              className="mt-1"
                            />
                            <div>
                              <span className="block text-xs font-bold text-slate-900">{st.label}</span>
                              <span className="block text-[11px] text-slate-500">{st.desc}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <span>Weight:</span>
                              <input
                                type="number"
                                min={5}
                                max={50}
                                value={weight}
                                onChange={(e) =>
                                  updateIntentSignal(st.id, { weight: Number(e.target.value) || 10 })
                                }
                                disabled={!isEnabled}
                                className="h-8 w-16 rounded-lg border border-slate-200 px-2 text-center text-sm font-bold text-slate-800"
                              />
                            </div>

                            <select
                              value={minConf}
                              onChange={(e) =>
                                updateIntentSignal(st.id, {
                                  minConfidence: e.target.value as 'low' | 'medium' | 'high',
                                })
                              }
                              disabled={!isEnabled}
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
                            >
                              <option value="low">Min: Low Conf</option>
                              <option value="medium">Min: Medium Conf</option>
                              <option value="high">Min: High Conf</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* TAB 6: OUTREACH POLICY */}
            {activeTab === 'outreach' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Outreach Objective
                    </span>
                    <select
                      value={config.outreachPolicy.objective ?? 'start_conversation'}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          outreachPolicy: {
                            ...prev.outreachPolicy,
                            objective: e.target.value as OutreachObjective,
                          },
                        }))
                      }
                      className={settingsInputClass}
                    >
                      <option value="start_conversation">Start a conversation (low friction)</option>
                      <option value="book_meeting">Book a meeting</option>
                      <option value="offer_audit">Offer audit / teardown</option>
                      <option value="partnership">Partnership inquiry</option>
                      <option value="custom">Custom angle</option>
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Copy Style
                    </span>
                    <select
                      value={config.outreachPolicy.style ?? 'consultative'}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          outreachPolicy: {
                            ...prev.outreachPolicy,
                            style: e.target.value as OutreachStyle,
                          },
                        }))
                      }
                      className={settingsInputClass}
                    >
                      <option value="consultative">Consultative &amp; Observational</option>
                      <option value="casual">Casual &amp; Natural</option>
                      <option value="direct">Direct &amp; Punchy</option>
                      <option value="thought_provoking">Thought Provoking</option>
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Call to Action (CTA)
                    </span>
                    <select
                      value={config.outreachPolicy.ctaType ?? 'soft_interest'}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          outreachPolicy: {
                            ...prev.outreachPolicy,
                            ctaType: e.target.value as OutreachCtaType,
                          },
                        }))
                      }
                      className={settingsInputClass}
                    >
                      <option value="soft_interest">Soft Interest (&quot;Worth exploring?&quot;)</option>
                      <option value="resource_offer">Resource Offer (&quot;Open to a 1-page breakdown?&quot;)</option>
                      <option value="open_question">Open Question (&quot;How do you approach X today?&quot;)</option>
                      <option value="specific_time">Specific Time (&quot;15 mins next Tuesday?&quot;)</option>
                    </select>
                  </label>
                </div>

                {/* When No Evidence Behavior */}
                <section className="space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Behavior When No Strong Dated Evidence Exists
                  </span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { id: 'pain_point_only', label: 'Pain-Point Only', desc: 'Focus purely on operational pain point' },
                      { id: 'generic', label: 'Company Fit', desc: 'Lean on high-level company and role fit' },
                      { id: 'skip', label: 'Skip Opener', desc: 'Leave emailOpener empty (abstain)' },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer gap-2 rounded-xl border p-3 ${
                          config.outreachPolicy.whenNoEvidence === opt.id
                            ? 'border-settings-accent/40 bg-settings-soft/50 shadow-xs'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="whenNoEvidence"
                          checked={config.outreachPolicy.whenNoEvidence === opt.id}
                          onChange={() =>
                            setConfig((prev) => ({
                              ...prev,
                              outreachPolicy: {
                                ...prev.outreachPolicy,
                                whenNoEvidence: opt.id as OutreachPolicy['whenNoEvidence'],
                              },
                            }))
                          }
                          className="mt-0.5"
                        />
                        <div>
                          <span className="block text-xs font-bold text-slate-900">{opt.label}</span>
                          <span className="block text-[11px] text-slate-500">{opt.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                {/* Forbidden Phrases */}
                <section className="space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Forbidden Phrases &amp; Clichés
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      The AI synthesizer is strictly blocked from generating copy containing any of these phrases.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(config.outreachPolicy.forbiddenPhrases ?? []).map((phrase) => (
                      <span
                        key={phrase}
                        className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-800"
                      >
                        &quot;{phrase}&quot;
                        <button
                          type="button"
                          onClick={() => removeForbiddenPhrase(phrase)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <IconTrash size={12} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={newForbiddenInput}
                      onChange={(e) => setNewForbiddenInput(e.target.value)}
                      placeholder="Add banned phrase (e.g. quick synergy chat)..."
                      className={settingsInputClass}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addForbiddenPhrase();
                        }
                      }}
                    />
                    <button type="button" onClick={addForbiddenPhrase} className={settingsBtnSecondary}>
                      Add
                    </button>
                  </div>
                </section>

                {/* Personalization Priority */}
                <section className="space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      Personalization Priority Order
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      When synthesizing the personalized opening line, the agent checks sources in this priority order.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {(config.outreachPolicy.personalizationPriority ?? []).map((source, index) => {
                      const item = PERSONALIZATION_SOURCES.find((s) => s.id === source);
                      return (
                        <div
                          key={source}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        >
                          <span className="font-semibold text-slate-800">
                            #{index + 1} {item?.label ?? source}
                          </span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => {
                                const list = [...(config.outreachPolicy.personalizationPriority ?? [])];
                                const [m] = list.splice(index, 1);
                                list.splice(index - 1, 0, m);
                                setConfig((prev) => ({
                                  ...prev,
                                  outreachPolicy: { ...prev.outreachPolicy, personalizationPriority: list },
                                }));
                              }}
                              className="rounded border border-slate-200 p-0.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                            >
                              <IconChevronUp size={12} />
                            </button>
                            <button
                              type="button"
                              disabled={
                                index === (config.outreachPolicy.personalizationPriority ?? []).length - 1
                              }
                              onClick={() => {
                                const list = [...(config.outreachPolicy.personalizationPriority ?? [])];
                                const [m] = list.splice(index, 1);
                                list.splice(index + 1, 0, m);
                                setConfig((prev) => ({
                                  ...prev,
                                  outreachPolicy: { ...prev.outreachPolicy, personalizationPriority: list },
                                }));
                              }}
                              className="rounded border border-slate-200 p-0.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                            >
                              <IconChevronDown size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* TAB 7: RESEARCH QUESTIONS */}
            {activeTab === 'research' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                    Custom Research Asks
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Free-text questions the AI search engine will explicitly research during the scrape/extract phase.
                  </p>
                </div>

                <div className="space-y-2">
                  {config.customQuestions.map((q, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={q}
                        onChange={(e) => {
                          const next = [...config.customQuestions];
                          next[i] = e.target.value;
                          setConfig((prev) => ({ ...prev, customQuestions: next }));
                        }}
                        className={settingsInputClass}
                        placeholder="e.g. What CRM does their sales team use?"
                      />
                      <button
                        type="button"
                        className={settingsBtnSecondary}
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
                </div>

                <button
                  type="button"
                  className={settingsBtnSecondary}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      customQuestions: [...prev.customQuestions, ''],
                    }))
                  }
                >
                  <IconPlus size={14} /> Add Research Question
                </button>
              </div>
            )}

            {/* Agent Live Preview Summary Strip */}
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Live Agent Summary
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  {config.modules.scoring && config.icpPolicy.enabled ? 'Scoring Active' : 'Basic Mode'}
                </span>
              </div>
              <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                <div>
                  <span className="font-bold text-slate-800">Goal: </span>
                  {GOAL_META.find((g) => g.id === goal)?.label}
                </div>
                <div>
                  <span className="font-bold text-slate-800">People: </span>
                  {config.modules.people
                    ? `${config.people.targets.length} targets (${config.people.strictness})`
                    : 'Disabled'}
                </div>
                <div>
                  <span className="font-bold text-slate-800">Hiring: </span>
                  {config.modules.hiring
                    ? `≤${config.hiringPolicy.maxAgeDays}d (${config.hiringPolicy.requireLiveUrl ? 'URL Req' : 'Any'})`
                    : 'Disabled'}
                </div>
                <div>
                  <span className="font-bold text-slate-800">ICP Policy: </span>
                  {config.modules.scoring && config.icpPolicy.enabled
                    ? `${config.icpPolicy.criteria.length} criteria (min ${config.icpPolicy.minScoreToPass ?? 60}%)`
                    : 'Default'}
                </div>
                <div>
                  <span className="font-bold text-slate-800">Intent: </span>
                  {config.modules.signals && config.intentPolicy.enabled
                    ? `≤${config.intentPolicy.maxAgeDays}d lookback`
                    : 'Default'}
                </div>
                <div>
                  <span className="font-bold text-slate-800">Outreach: </span>
                  {config.modules.outreach
                    ? `${config.outreachPolicy.style} · ${config.outreachPolicy.ctaType}`
                    : 'Disabled'}
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => void save()} className={settingsBtnPrimary} disabled={saving}>
                  {saving ? <IconLoader2 className="animate-spin" size={16} /> : null}
                  {selectedId === 'new' || !selectedId ? 'Create Agent' : 'Save Changes'}
                </button>
                {selectedId && selectedId !== 'new' && !isDefault && (
                  <button type="button" onClick={() => void setDefault()} className={settingsBtnSecondary}>
                    <IconStar size={14} /> Set as Default
                  </button>
                )}
              </div>

              {selectedId && selectedId !== 'new' && (
                <button type="button" onClick={() => void remove()} className={settingsBtnDanger}>
                  <IconTrash size={14} /> Delete Agent
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </SettingsPanel>
  );
}
