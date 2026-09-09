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
  IconCopy,
  IconFlame,
  IconHelp,
  IconLoader2,
  IconMail,
  IconPencil,
  IconPlus,
  IconRobot,
  IconSend,
  IconShieldCheck,
  IconSparkles,
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

export interface PersonalizationFallbackConfig {
  sendWhenNoPersonalization: boolean;
  staticFallbackLine: string;
  fallbackStrategy: 'skip_email' | 'send_generic' | 'send_with_static_line';
}

export type OutreachTemplateId = string;

export interface OutreachTemplate {
  id: OutreachTemplateId;
  name: string;
  category: AgentPersonality;
  description: string;
  subject: string;
  body: string;
  style: OutreachStyle;
  ctaType: OutreachCtaType;
  objective: OutreachObjective;
  expectedReplyRate: string;
  expectedOpenRate: string;
  personalizationFields: PersonalizationSource[];
  tags: string[];
  sampleValues: {
    firstName: string;
    companyName: string;
    title: string;
    industry: string;
    signal: string;
    painPoint: string;
    personalization: string;
    proofCompany: string;
    proofMetric: string;
    senderName: string;
    [key: string]: string;
  };
}

export interface OutreachPolicy {
  objective?: OutreachObjective;
  style?: OutreachStyle;
  ctaType?: OutreachCtaType;
  sequenceCount?: number;
  sequenceDays?: number[];
  forbiddenPhrases?: string[];
  personalizationPriority?: PersonalizationSource[];
  whenNoEvidence?: 'skip' | 'generic' | 'pain_point_only';
  selectedTemplateId?: OutreachTemplateId;
  preferredTemplateId?: string;
  customSubject?: string;
  customBody?: string;
  personalizationFallback?: PersonalizationFallbackConfig;
}

export type AgentConfig = {
  mission?: string;
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
  mission?: string | null;
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

type AgentPersonality = 'outbound' | 'signal_scout' | 'talent_spotter' | 'account_strategist' | 'partner_builder';
type ResearchPriority = 'best_fit' | 'hiring' | 'intent' | 'contact';

const AGENT_PERSONALITIES: Array<{
  id: AgentPersonality;
  name: string;
  tagline: string;
  description: string;
  target: PersonObjective;
  goal: AgentGoal;
  hiring: boolean;
  intent: boolean;
  outreach: Pick<OutreachPolicy, 'objective' | 'style' | 'ctaType'>;
}> = [
  {
    id: 'outbound',
    name: 'The Outbound Hunter',
    tagline: 'Find decision makers ready for a relevant conversation',
    description: 'Balances account fit, timing signals, then Outreach Engine writes a meeting-ask email.',
    target: 'sales_leader',
    goal: 'full',
    hiring: false,
    intent: true,
    outreach: { objective: 'book_meeting', style: 'direct', ctaType: 'specific_time' },
  },
  {
    id: 'signal_scout',
    name: 'The Signal Scout',
    tagline: 'Surface accounts with a reason to act now',
    description: 'Prioritizes fresh company changes, momentum, and buying triggers.',
    target: 'marketing_leader',
    goal: 'full',
    hiring: true,
    intent: true,
    outreach: { objective: 'start_conversation', style: 'thought_provoking', ctaType: 'open_question' },
  },
  {
    id: 'talent_spotter',
    name: 'The Talent Spotter',
    tagline: 'Find companies growing their teams and who owns hiring',
    description: 'Watches live roles and routes research to the hiring decision maker.',
    target: 'hiring_authority',
    goal: 'full',
    hiring: true,
    intent: true,
    outreach: { objective: 'offer_audit', style: 'consultative', ctaType: 'resource_offer' },
  },
  {
    id: 'account_strategist',
    name: 'The Account Strategist',
    tagline: 'Build a clear picture before your team reaches out',
    description: 'Maps company fit, stakeholders, pain points, and account context.',
    target: 'founder',
    goal: 'full',
    hiring: false,
    intent: false,
    outreach: { objective: 'start_conversation', style: 'consultative', ctaType: 'soft_interest' },
  },
  {
    id: 'partner_builder',
    name: 'The Partner Builder',
    tagline: 'Discover people who can open strategic partnerships',
    description: 'Looks for complementary companies, partnership owners, and shared opportunities.',
    target: 'operations',
    goal: 'full',
    hiring: false,
    intent: true,
    outreach: { objective: 'partnership', style: 'casual', ctaType: 'open_question' },
  },
];

const RESEARCH_PRIORITIES: Array<{ id: ResearchPriority; label: string; help: string }> = [
  { id: 'best_fit', label: 'Best-fit accounts', help: 'Rank companies against your ICP.' },
  { id: 'hiring', label: 'Hiring momentum', help: 'Spot teams actively growing.' },
  { id: 'intent', label: 'Buying signals', help: 'Prioritize fresh reason-to-act-now triggers.' },
  { id: 'contact', label: 'Reliable contact data', help: 'Find and verify a work email first.' },
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

function personalityFromConfig(config: AgentConfig): AgentPersonality {
  const target = config.people.targets[0]?.objective;
  if (target === 'hiring_authority' && config.modules.hiring) return 'talent_spotter';
  if (config.outreachPolicy.objective === 'partnership') return 'partner_builder';
  if (config.modules.signals && config.outreachPolicy.style === 'thought_provoking') return 'signal_scout';
  if (target === 'sales_leader' && config.outreachPolicy.style === 'direct') return 'outbound';
  return 'account_strategist';
}

function priorityFromConfig(config: AgentConfig): ResearchPriority {
  if (config.modules.hiring && config.hiringPolicy.departmentRules?.some((rule) => rule.importance !== 'ignore')) {
    return 'hiring';
  }
  if (config.modules.signals && config.intentPolicy.enabled) return 'intent';
  if (config.modules.email && config.email.verify) return 'contact';
  return 'best_fit';
}

const MODULE_META: Array<{ key: keyof Modules; label: string; help: string }> = [
  { key: 'company', label: 'Company detail', help: 'Profile, products, industry, locations' },
  { key: 'people', label: 'People / employment', help: 'Founders, decision makers, roles' },
  { key: 'hiring', label: 'Hiring detail', help: 'Open roles and hiring signals' },
  { key: 'signals', label: 'Intent / why-now signals', help: 'Buying and timing triggers' },
  { key: 'scoring', label: 'ICP · Intent · Confidence', help: 'Numeric scores for ranking' },
  { key: 'outreach', label: 'Outreach intelligence', help: 'Recommended angle & triggers for the Outreach Engine' },
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

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  // --- 1. OUTBOUND HUNTER ---
  {
    id: 'outbound_direct_ask',
    name: 'The Direct Meeting Ask',
    category: 'outbound',
    description: 'Straight-to-the-point executive outreach tying a detected pain point directly to an ROI-backed case study.',
    subject: '{{firstName}}, quick question regarding {{companyName}}\'s {{painPoint}}',
    body: `Hey {{firstName}},

{{personalization}}

I noticed {{companyName}} is {{signal}} — most {{industry}} teams dealing with this end up spending 2-3x more time on {{painPoint}} than they should.

We helped {{proofCompany}} cut that by {{proofMetric}}, and I think there's a similar play for your team.

Worth a 15-min call this Thursday to see if it fits?

— {{senderName}}`,
    style: 'direct',
    ctaType: 'specific_time',
    objective: 'book_meeting',
    expectedReplyRate: '21% - 28%',
    expectedOpenRate: '60% - 68%',
    personalizationFields: ['pain_points', 'recent_news', 'role_context'],
    tags: ['High Intent', 'Direct Ask', 'Proof-Driven'],
    sampleValues: {
      firstName: 'Alex',
      companyName: 'HyperScale Corp',
      title: 'VP of Sales',
      industry: 'B2B SaaS',
      signal: 'expanding your enterprise outbound pod this quarter',
      painPoint: 'pipeline leak in SDR ramp-up',
      personalization: 'Saw your recent post discussing how SDR onboarding time doubled as you moved upmarket.',
      proofCompany: 'Datapoint AI',
      proofMetric: '42% faster rep ramp time',
      senderName: 'Jordan',
    },
  },
  {
    id: 'outbound_trigger_sniper',
    name: 'The Trigger-Based Opener',
    category: 'outbound',
    description: 'Low-friction conversation starter highlighting a specific business friction point observed in their workflow.',
    subject: '{{companyName}} + {{painPoint}}?',
    body: `Hi {{firstName}},

{{personalization}}

Typically when {{title}}s in {{industry}} tackle this, the biggest hurdle is {{painPoint}}.

Curious if this is already on your radar for this quarter, or if you've found a clean workaround?

Best,
{{senderName}}`,
    style: 'consultative',
    ctaType: 'open_question',
    objective: 'start_conversation',
    expectedReplyRate: '24% - 32%',
    expectedOpenRate: '64% - 74%',
    personalizationFields: ['pain_points', 'role_context'],
    tags: ['Low Friction', 'Question CTA', 'Problem Focus'],
    sampleValues: {
      firstName: 'Sarah',
      companyName: 'Nexus Commerce',
      title: 'Head of Growth',
      industry: 'E-Commerce Tech',
      signal: 'migrating to modern headless commerce tooling',
      painPoint: 'cross-channel attribution gaps',
      personalization: 'Noticed Nexus recently introduced multi-currency checkouts across EMEA.',
      proofCompany: 'ShopScale',
      proofMetric: '31% recovery on abandoned checkouts',
      senderName: 'Jordan',
    },
  },
  {
    id: 'outbound_value_teardown',
    name: 'The 2-Minute Teardown Offer',
    category: 'outbound',
    description: 'Offers a zero-obligation diagnostic tear-down of their current tech stack / process.',
    subject: 'mini breakdown on {{companyName}}\'s {{painPoint}}',
    body: `Hey {{firstName}},

{{personalization}}

We put together a 3-point teardown showing where {{industry}} companies at your stage usually leak efficiency in {{painPoint}}.

Mind if I send the 2-minute Loom/PDF over? No pitch, just actionable ideas you can hand to your team.

Cheers,
{{senderName}}`,
    style: 'thought_provoking',
    ctaType: 'resource_offer',
    objective: 'offer_audit',
    expectedReplyRate: '22% - 29%',
    expectedOpenRate: '62% - 70%',
    personalizationFields: ['tech_stack', 'pain_points'],
    tags: ['High Value', 'No-Pressure', 'Audit Offer'],
    sampleValues: {
      firstName: 'David',
      companyName: 'CloudPulse',
      title: 'CTO',
      industry: 'DevOps & Cloud',
      signal: 'scaling microservices architecture',
      painPoint: 'cloud infrastructure visibility',
      personalization: 'Saw your GitHub engineering blog piece on migrating from monolith to Kubernetes.',
      proofCompany: 'InfraFast',
      proofMetric: '35% reduction in compute spend',
      senderName: 'Jordan',
    },
  },

  // --- 2. SIGNAL SCOUT ---
  {
    id: 'signal_momentum_observer',
    name: 'The Momentum Capitalizer',
    category: 'signal_scout',
    description: 'Capitalizes on high-intent funding, product expansion, or market milestone signals.',
    subject: 'Congrats on {{signal}} — question on {{companyName}}\'s next phase',
    body: `Hi {{firstName}},

{{personalization}}

Big congrats on the milestone. As {{companyName}} accelerates into this next phase, maintaining velocity while managing {{painPoint}} is usually where things get bottlenecked.

We helped {{proofCompany}} maintain a {{proofMetric}} during their post-round push.

Open to seeing a 1-page playbook on how they structured it?

Best,
{{senderName}}`,
    style: 'thought_provoking',
    ctaType: 'resource_offer',
    objective: 'start_conversation',
    expectedReplyRate: '26% - 35%',
    expectedOpenRate: '68% - 78%',
    personalizationFields: ['recent_news', 'pain_points'],
    tags: ['Funding & Growth', 'High Open Rate', 'Milestone'],
    sampleValues: {
      firstName: 'Elena',
      companyName: 'FinMatrix',
      title: 'CEO',
      industry: 'Fintech',
      signal: 'closing your $18M Series A funding round',
      painPoint: 'scaling compliance operations alongside product growth',
      personalization: 'Saw the TechCrunch announcement regarding your Series A round led by Accel.',
      proofCompany: 'PayFlow',
      proofMetric: '70% reduction in AML review times',
      senderName: 'Jordan',
    },
  },
  {
    id: 'signal_tech_modernizer',
    name: 'The Tech Stack Transition',
    category: 'signal_scout',
    description: 'Triggered when prospect adopts or changes an integrated technology stack or tool.',
    subject: '{{companyName}}\'s shift to new tooling',
    body: `Hey {{firstName}},

{{personalization}}

Noticed {{companyName}} recently transitioned your stack around {{signal}}. Typically, {{industry}} teams running into {{painPoint}} during this phase lose 3-4 weeks on configuration.

Are you handling the data unification in-house, or looking at automated pipelines?

— {{senderName}}`,
    style: 'consultative',
    ctaType: 'open_question',
    objective: 'start_conversation',
    expectedReplyRate: '23% - 30%',
    expectedOpenRate: '63% - 72%',
    personalizationFields: ['tech_stack', 'role_context'],
    tags: ['Tech Shift', 'Consultative', 'Engineering/Ops'],
    sampleValues: {
      firstName: 'Marcus',
      companyName: 'RevPlatform',
      title: 'VP of Engineering',
      industry: 'Enterprise Software',
      signal: 'deploying Snowflake alongside dbt',
      painPoint: 'data sync latency across production systems',
      personalization: 'Noticed the job descriptions your engineering team published looking for dbt Core and Snowflake specialists.',
      proofCompany: 'DataLoop',
      proofMetric: 'sub-minute warehouse sync',
      senderName: 'Jordan',
    },
  },
  {
    id: 'signal_change_agent',
    name: 'The Leadership Transition',
    category: 'signal_scout',
    description: 'Reaches out when a new executive joins, offering an early win for their 90-day plan.',
    subject: '{{firstName}}, ideas for your first 90 days at {{companyName}}',
    body: `Hi {{firstName}},

{{personalization}}

Congrats on the new role at {{companyName}}!

Stepping in as {{title}} usually means evaluating existing systems to quickly eliminate {{painPoint}}. We partnered with {{proofCompany}} to give their new leadership {{proofMetric}} within the first 60 days.

Worth a brief chat to see if this aligns with your early priorities?

Best,
{{senderName}}`,
    style: 'casual',
    ctaType: 'soft_interest',
    objective: 'book_meeting',
    expectedReplyRate: '27% - 36%',
    expectedOpenRate: '70% - 80%',
    personalizationFields: ['recent_news', 'role_context'],
    tags: ['New Exec', 'High Authority', '90-Day Win'],
    sampleValues: {
      firstName: 'Rachel',
      companyName: 'OmniLogistics',
      title: 'COO',
      industry: 'Logistics Tech',
      signal: 'taking over operations leadership at OmniLogistics',
      painPoint: 'warehouse dispatcher turnover',
      personalization: 'Saw you recently stepped in as COO at OmniLogistics after an incredible run at Flexport.',
      proofCompany: 'DeliverFast',
      proofMetric: '28% boost in route throughput',
      senderName: 'Jordan',
    },
  },

  // --- 3. TALENT SPOTTER ---
  {
    id: 'talent_growth_pulse',
    name: 'The Hiring Surge Insight',
    category: 'talent_spotter',
    description: 'Directly addresses the operational strain that open job reqs and rapid headcount growth create.',
    subject: '{{companyName}}\'s hiring push for {{signal}}',
    body: `Hey {{firstName}},

{{personalization}}

Saw you're actively expanding the team with {{signal}}. Usually when {{industry}} leaders ramp up hiring this aggressively, {{painPoint}} becomes the primary bottleneck before new team members produce results.

We helped {{proofCompany}} achieve {{proofMetric}} while onboarding 20+ people simultaneously.

Would it be helpful to see how they prevented burnout during that ramp?

Best,
{{senderName}}`,
    style: 'consultative',
    ctaType: 'soft_interest',
    objective: 'start_conversation',
    expectedReplyRate: '25% - 34%',
    expectedOpenRate: '66% - 76%',
    personalizationFields: ['hiring', 'role_context'],
    tags: ['Hiring Signals', 'Scaling Pain', 'Operational'],
    sampleValues: {
      firstName: 'Liam',
      companyName: 'HealthBridge',
      title: 'Head of People & Talent',
      industry: 'Digital Health',
      signal: 'multiple senior engineering and clinical ops roles',
      painPoint: 'slow engineering time-to-first-commit',
      personalization: 'Saw 6 new postings for Senior Full-Stack Engineers and Clinical Leads over the last 2 weeks.',
      proofCompany: 'CarePulse',
      proofMetric: '50% reduction in onboarding overhead',
      senderName: 'Jordan',
    },
  },
  {
    id: 'talent_headcount_audit',
    name: 'The Scaling Playbook Teardown',
    category: 'talent_spotter',
    description: 'Provides departmental benchmarks to hiring managers expanding specialized functions.',
    subject: 'playbook for scaling {{companyName}}\'s team',
    body: `Hi {{firstName}},

{{personalization}}

Given the active openings at {{companyName}}, I put together a concise breakdown of how peer {{industry}} organizations structure {{signal}} to bypass {{painPoint}}.

Happy to forward the PDF over if you're exploring ways to speed up execution.

Worth a look?

— {{senderName}}`,
    style: 'direct',
    ctaType: 'resource_offer',
    objective: 'offer_audit',
    expectedReplyRate: '21% - 29%',
    expectedOpenRate: '61% - 70%',
    personalizationFields: ['hiring', 'pain_points'],
    tags: ['Benchmark', 'Resource Hook', 'Hiring Intel'],
    sampleValues: {
      firstName: 'Jessica',
      companyName: 'SecureNet',
      title: 'VP of Security Operations',
      industry: 'Cybersecurity',
      signal: 'your tier-2 SOC analyst department',
      painPoint: 'alert fatigue and missed triage SLAs',
      personalization: 'Noticed multiple open listings for SOC Tier 2 Analysts on your careers page.',
      proofCompany: 'ShieldCyber',
      proofMetric: '4x increase in ticket resolution rate',
      senderName: 'Jordan',
    },
  },
  {
    id: 'talent_leadership_reach',
    name: 'The Department Mandate',
    category: 'talent_spotter',
    description: 'Validates the manager\'s strategic vision based on the caliber of talent they are sourcing.',
    subject: '{{firstName}}, quick observation on {{companyName}}\'s team expansion',
    body: `Hey {{firstName}},

{{personalization}}

The profile of talent you're recruiting suggests you're solving {{painPoint}} at scale this year.

How are you balancing candidate ramp speed with existing team delivery right now?

Curious to hear your take,
{{senderName}}`,
    style: 'thought_provoking',
    ctaType: 'open_question',
    objective: 'start_conversation',
    expectedReplyRate: '20% - 27%',
    expectedOpenRate: '59% - 68%',
    personalizationFields: ['hiring', 'role_context'],
    tags: ['Peer Question', 'Strategic Mandate', 'Thought Provoking'],
    sampleValues: {
      firstName: 'Brian',
      companyName: 'Starlight Media',
      title: 'Director of Product',
      industry: 'Streaming Media',
      signal: 'strategic hiring for AI recommendations',
      painPoint: 'content recommendation latency',
      personalization: 'Came across your job spec for a Principal ML Engineer focused on real-time ranking.',
      proofCompany: 'CastHub',
      proofMetric: '18% bump in user watch sessions',
      senderName: 'Jordan',
    },
  },

  // --- 4. ACCOUNT STRATEGIST ---
  {
    id: 'account_research_first',
    name: 'The Deep Research Debrief',
    category: 'account_strategist',
    description: 'Demonstrates meticulous homework on their account model, positioning, and strategic priorities.',
    subject: 'Thought regarding {{companyName}}\'s positioning in {{industry}}',
    body: `Hi {{firstName}},

{{personalization}}

Looking at {{companyName}}'s customer footprint and recent market moves around {{signal}}, it feels like the key strategic challenge is {{painPoint}}.

We recently partnered with {{proofCompany}} on a very similar dynamic, helping them unlock {{proofMetric}}.

Would you be open to exchanging notes on what's working across the sector?

Best regards,
{{senderName}}`,
    style: 'consultative',
    ctaType: 'soft_interest',
    objective: 'start_conversation',
    expectedReplyRate: '27% - 37%',
    expectedOpenRate: '69% - 79%',
    personalizationFields: ['recent_news', 'pain_points', 'role_context'],
    tags: ['Enterprise Grade', 'High Research', 'Consultative'],
    sampleValues: {
      firstName: 'Victoria',
      companyName: 'Apex Financial',
      title: 'Chief Strategy Officer',
      industry: 'Wealth Management',
      signal: 'expanding digital wealth advisory for high-net-worth clients',
      painPoint: 'manual portfolio rebalancing friction',
      personalization: 'Listened to your interview on the WealthTech Leaders podcast regarding automated tax-loss harvesting.',
      proofCompany: 'Beacon Wealth',
      proofMetric: '$450M automated assets in 90 days',
      senderName: 'Jordan',
    },
  },
  {
    id: 'account_strategic_fit',
    name: 'The Peer-to-Peer Alignment',
    category: 'account_strategist',
    description: 'Senior-level strategic inquiry exploring whether solving a high-impact inefficiency is mutually worthwhile.',
    subject: '{{firstName}} — strategic perspective for {{companyName}}',
    body: `Hey {{firstName}},

{{personalization}}

When we analyze tier-1 accounts in {{industry}}, those dealing with {{signal}} typically face a trade-off with {{painPoint}}.

We developed a framework that helped {{proofCompany}} eliminate that trade-off, generating {{proofMetric}}.

Are you open to a 15-minute executive briefing sometime next week?

Sincerely,
{{senderName}}`,
    style: 'thought_provoking',
    ctaType: 'specific_time',
    objective: 'book_meeting',
    expectedReplyRate: '23% - 31%',
    expectedOpenRate: '64% - 73%',
    personalizationFields: ['role_context', 'pain_points'],
    tags: ['Executive Briefing', 'Strategic Fit', 'C-Level'],
    sampleValues: {
      firstName: 'Jonathan',
      companyName: 'Kinetics Group',
      title: 'Managing Director',
      industry: 'Supply Chain Consulting',
      signal: 'cross-border supply chain digitization initiatives',
      painPoint: 'freight audit inaccuracies',
      personalization: 'Noticed Kinetics Group was recognized in Gartner\'s latest Market Guide for Digital Freight.',
      proofCompany: 'LogisForward',
      proofMetric: '2.3% net margin improvement',
      senderName: 'Jordan',
    },
  },
  {
    id: 'account_benchmark_offer',
    name: 'The Peer Benchmark Report',
    category: 'account_strategist',
    description: 'Offers proprietary anonymized industry benchmark metrics comparing their business against top quartile performers.',
    subject: '{{industry}} benchmark report for {{companyName}}',
    body: `Hi {{firstName}},

{{personalization}}

We just concluded an analysis of 80+ companies across {{industry}} tracking how leaders address {{painPoint}}.

{{companyName}} matches the profile of the top quartile, but there are 2 specific blindspots around {{signal}} that most teams miss.

Can I email you the 2-page benchmark matrix? Zero sales pitch — just high-signal data.

Best,
{{senderName}}`,
    style: 'direct',
    ctaType: 'resource_offer',
    objective: 'offer_audit',
    expectedReplyRate: '25% - 33%',
    expectedOpenRate: '67% - 77%',
    personalizationFields: ['recent_news', 'tech_stack'],
    tags: ['Exclusive Data', 'Benchmark', 'High Authority'],
    sampleValues: {
      firstName: 'Daniel',
      companyName: 'Acuity Systems',
      title: 'SVP Operations',
      industry: 'Industrial IoT',
      signal: 'predictive maintenance deployments on edge devices',
      painPoint: 'unplanned device downtime and false-positive alarms',
      personalization: 'Read your patent filing on low-power sensor telemetry published last month.',
      proofCompany: 'EdgeMetrics',
      proofMetric: '64% fewer nuisance alerts',
      senderName: 'Jordan',
    },
  },

  // --- 5. PARTNER BUILDER ---
  {
    id: 'partner_audience_overlap',
    name: 'The Shared Audience Synergy',
    category: 'partner_builder',
    description: 'Proposes co-marketing and reciprocal customer introductions based on non-competing customer overlap.',
    subject: 'partnership idea for {{companyName}} + our audience',
    body: `Hi {{firstName}},

{{personalization}}

Both our products serve {{industry}} teams struggling with {{painPoint}}, but from completely complementary angles.

We recently did a joint initiative with {{proofCompany}} that drove {{proofMetric}} without cold outbound.

Would you be open to exploring a co-marketing or ecosystem partnership between {{companyName}} and our team?

Cheers,
{{senderName}}`,
    style: 'casual',
    ctaType: 'soft_interest',
    objective: 'partnership',
    expectedReplyRate: '29% - 39%',
    expectedOpenRate: '72% - 82%',
    personalizationFields: ['role_context', 'tech_stack'],
    tags: ['Ecosystem Play', 'Win-Win', 'Highest Reply'],
    sampleValues: {
      firstName: 'Maya',
      companyName: 'SyncHub',
      title: 'Head of Partnerships',
      industry: 'Integration Software',
      signal: 'launching your app marketplace 2.0',
      painPoint: 'ecosystem partner activation',
      personalization: 'Saw you just announced 15 new native connectors in your marketplace.',
      proofCompany: 'BridgeAPI',
      proofMetric: '140+ qualified partner leads in 30 days',
      senderName: 'Jordan',
    },
  },
  {
    id: 'partner_ecosystem_fit',
    name: 'The Technical Integration Hook',
    category: 'partner_builder',
    description: 'Suggests a bilateral software integration that creates joint stickiness and retention.',
    subject: 'Native integration between {{companyName}} and our platform?',
    body: `Hey {{firstName}},

{{personalization}}

A number of our mutual customers in {{industry}} have asked if we can connect {{companyName}}'s functionality around {{signal}} with our platform to eliminate {{painPoint}}.

We built a draft integration blueprint that would give your users {{proofMetric}}.

Who on your partnerships or product team is the right person to review a 5-minute sandbox demo?

Best,
{{senderName}}`,
    style: 'consultative',
    ctaType: 'open_question',
    objective: 'partnership',
    expectedReplyRate: '26% - 35%',
    expectedOpenRate: '66% - 76%',
    personalizationFields: ['tech_stack', 'role_context'],
    tags: ['Integration', 'Mutual Users', 'Product Synergy'],
    sampleValues: {
      firstName: 'Kevin',
      companyName: 'FormFlow',
      title: 'VP Product Partnerships',
      industry: 'Workflow Automation',
      signal: 'releasing your public GraphQL webhook API',
      painPoint: 'customer data synchronization between CRM and forms',
      personalization: 'Checked out your newly launched developer portal and webhook documentation.',
      proofCompany: 'RouteAutomate',
      proofMetric: '40% faster time-to-integration',
      senderName: 'Jordan',
    },
  },
  {
    id: 'partner_cocreate_proposal',
    name: 'The Co-Branded Masterclass',
    category: 'partner_builder',
    description: 'Offers to co-create a high-value industry masterclass, benchmark study, or co-branded guide.',
    subject: 'Co-branded {{industry}} research with {{companyName}}',
    body: `Hi {{firstName}},

{{personalization}}

We're putting together a deep-dive research piece on {{signal}} and how forward-thinking leaders are tackling {{painPoint}}.

{{companyName}} is doing standout work here, and we'd love to feature your insights alongside {{proofCompany}} (which generated {{proofMetric}} for their brand).

Would you be open to a 10-minute chat to see if this makes sense for your Q3 brand goals?

Warmly,
{{senderName}}`,
    style: 'direct',
    ctaType: 'resource_offer',
    objective: 'partnership',
    expectedReplyRate: '24% - 33%',
    expectedOpenRate: '65% - 75%',
    personalizationFields: ['recent_news', 'role_context'],
    tags: ['Thought Leadership', 'Co-Marketing', 'Zero Cost'],
    sampleValues: {
      firstName: 'Chloe',
      companyName: 'TalentHive',
      title: 'VP Brand & Growth',
      industry: 'Recruiting Automation',
      signal: 'advocating for transparent candidate salary insights',
      painPoint: 'inbound organic brand awareness in enterprise',
      personalization: 'Loved the LinkedIn thought piece you wrote on transparent candidate salary bands.',
      proofCompany: 'WorkWave',
      proofMetric: '1,200+ webinar registrations and 45 MQLs',
      senderName: 'Jordan',
    },
  },
];

function defaultPersonalizationFallback(): PersonalizationFallbackConfig {
  return {
    sendWhenNoPersonalization: true,
    staticFallbackLine: "I've been following {{companyName}}'s growth in {{industry}} and wanted to share a quick observation.",
    fallbackStrategy: 'send_with_static_line',
  };
}

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
    sequenceCount: 1,
    sequenceDays: [0, 3, 7, 14, 21],
    forbiddenPhrases: [
      "hope you're doing well",
      'i came across your profile',
      'reaching out because',
      'quick 15 minute call',
      'touch base',
    ],
    personalizationPriority: ['hiring', 'recent_news', 'pain_points', 'role_context'],
    whenNoEvidence: 'pain_point_only',
    selectedTemplateId: 'outbound_direct_ask',
    personalizationFallback: defaultPersonalizationFallback(),
  };
}

function defaultConfig(): AgentConfig {
  return {
    mission: '',
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
  const rawFallback = (rawOutreach.personalizationFallback ?? {}) as Record<string, unknown>;
  const baseFallback = base.outreachPolicy.personalizationFallback ?? defaultPersonalizationFallback();
  const personalizationFallback: PersonalizationFallbackConfig = {
    sendWhenNoPersonalization:
      typeof rawFallback.sendWhenNoPersonalization === 'boolean'
        ? rawFallback.sendWhenNoPersonalization
        : baseFallback.sendWhenNoPersonalization,
    staticFallbackLine:
      typeof rawFallback.staticFallbackLine === 'string'
        ? rawFallback.staticFallbackLine
        : baseFallback.staticFallbackLine,
    fallbackStrategy: (['skip_email', 'send_generic', 'send_with_static_line'].includes(String(rawFallback.fallbackStrategy))
      ? rawFallback.fallbackStrategy
      : baseFallback.fallbackStrategy) as PersonalizationFallbackConfig['fallbackStrategy'],
  };

  const outreachPolicy: OutreachPolicy = {
    objective: (rawOutreach.objective || base.outreachPolicy.objective) as OutreachObjective,
    style: (rawOutreach.style || base.outreachPolicy.style) as OutreachStyle,
    ctaType: (rawOutreach.ctaType || base.outreachPolicy.ctaType) as OutreachCtaType,
    sequenceCount:
      typeof rawOutreach.sequenceCount === 'number'
        ? Math.max(1, Math.min(5, Number(rawOutreach.sequenceCount)))
        : base.outreachPolicy.sequenceCount ?? 1,
    sequenceDays: Array.isArray(rawOutreach.sequenceDays)
      ? rawOutreach.sequenceDays.map(Number).filter((n) => !isNaN(n))
      : base.outreachPolicy.sequenceDays ?? [0, 3, 7, 14, 21],
    forbiddenPhrases: Array.isArray(rawOutreach.forbiddenPhrases)
      ? rawOutreach.forbiddenPhrases.map(String)
      : base.outreachPolicy.forbiddenPhrases,
    personalizationPriority: Array.isArray(rawOutreach.personalizationPriority)
      ? (rawOutreach.personalizationPriority as PersonalizationSource[])
      : base.outreachPolicy.personalizationPriority,
    whenNoEvidence: (rawOutreach.whenNoEvidence || base.outreachPolicy.whenNoEvidence) as OutreachPolicy['whenNoEvidence'],
    selectedTemplateId:
      typeof rawOutreach.selectedTemplateId === 'string'
        ? rawOutreach.selectedTemplateId
        : base.outreachPolicy.selectedTemplateId,
    preferredTemplateId:
      typeof rawOutreach.preferredTemplateId === 'string' && rawOutreach.preferredTemplateId
        ? rawOutreach.preferredTemplateId
        : undefined,
    customSubject: typeof rawOutreach.customSubject === 'string' ? rawOutreach.customSubject : undefined,
    customBody: typeof rawOutreach.customBody === 'string' ? rawOutreach.customBody : undefined,
    personalizationFallback,
  };

  return {
    mission: typeof obj.mission === 'string' ? obj.mission : base.mission ?? '',
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
    outreachPolicy: {
      ...config.outreachPolicy,
      customSubject: config.outreachPolicy.customSubject?.trim() || undefined,
      customBody: config.outreachPolicy.customBody?.trim() || undefined,
      personalizationFallback: config.outreachPolicy.personalizationFallback
        ? {
            ...config.outreachPolicy.personalizationFallback,
            staticFallbackLine: config.outreachPolicy.personalizationFallback.staticFallbackLine?.trim() || '',
          }
        : undefined,
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [personality, setPersonality] = useState<AgentPersonality>('outbound');
  const [researchPriority, setResearchPriority] = useState<ResearchPriority>('intent');
  const [newForbiddenInput, setNewForbiddenInput] = useState('');
  const [customDeptInput, setCustomDeptInput] = useState('');

  // DB outreach templates for agent preference picker
  type DbTemplate = { id: string; name: string; templateType: string; isSystem: boolean; latestVersion?: { config?: { bodyRecipe?: string } } | null };
  const [dbTemplates, setDbTemplates] = useState<DbTemplate[]>([]);
  useEffect(() => {
    api.get('/api/outreach/templates')
      .then((res) => setDbTemplates((res.data.data ?? []) as DbTemplate[]))
      .catch(() => {});
  }, []);

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
        const normalized = normalizeConfig({
          ...(pick.config as Record<string, unknown>),
          mission: pick.mission ?? (pick.config as AgentConfig)?.mission ?? '',
        });
        setConfig(normalized);
        setPersonality(personalityFromConfig(normalized));
        setResearchPriority(priorityFromConfig(normalized));
      } else {
        setSelectedId('new');
        setName('');
        setDescription('');
        setIsDefault(true);
        setConfig(defaultConfig());
        setPersonality('outbound');
        setResearchPriority('intent');
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
    const normalized = normalizeConfig({
      ...(agent.config as Record<string, unknown>),
      mission: agent.mission ?? agent.config?.mission ?? '',
    });
    setConfig(normalized);
    setPersonality(personalityFromConfig(normalized));
    setResearchPriority(priorityFromConfig(normalized));
    setShowAdvanced(false);
  };

  const startNew = () => {
    setSelectedId('new');
    setName('');
    setDescription('');
    setIsDefault(false);
    setConfig(defaultConfig());
    setPersonality('outbound');
    setResearchPriority('intent');
    setShowAdvanced(false);
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

  const setPrimaryTarget = (objective: PersonObjective) => {
    setConfig((prev) => {
      const current = prev.people.targets[0] ?? defaultTarget(1);
      return {
        ...prev,
        modules: { ...prev.modules, people: true },
        people: {
          ...prev.people,
          mode: 'single',
          maxPeople: 1,
          targets: [
            {
              ...current,
              objective,
              roleHint: objective === 'custom' ? current.roleHint ?? '' : undefined,
              priority: 1,
              required: true,
              tier: 'required',
            },
          ],
        },
      };
    });
  };

  const applyPersonality = (nextPersonality: AgentPersonality) => {
    const profile = AGENT_PERSONALITIES.find((item) => item.id === nextPersonality)!;
    setPersonality(nextPersonality);
    setConfig((prev) => {
      const modules = {
        ...modulesForGoal(profile.goal),
        hiring: profile.hiring,
        signals: profile.intent,
      };
      return {
        ...prev,
        modules,
        people: {
          ...prev.people,
          mode: 'single',
          maxPeople: 1,
          strictness: 'smart',
          targets: [{ objective: profile.target, priority: 1, required: true, tier: 'required' }],
        },
        email: { discover: modules.email, verify: modules.email },
        signals: { ...prev.signals, whyNow: profile.intent, maxAgeDays: 90 },
        hiringPolicy: { ...prev.hiringPolicy, maxAgeDays: 45, requireLiveUrl: true },
        icpPolicy: { ...prev.icpPolicy, enabled: modules.scoring },
        intentPolicy: { ...prev.intentPolicy, enabled: profile.intent, maxAgeDays: 90 },
        outreachPolicy: {
          ...prev.outreachPolicy,
          ...profile.outreach,
          customSubject: undefined,
          customBody: undefined,
          personalizationPriority: profile.hiring
            ? ['hiring', 'role_context', 'pain_points']
            : ['recent_news', 'pain_points', 'role_context'],
        },
      };
    });
  };

  const applyResearchPriority = (nextPriority: ResearchPriority) => {
    setResearchPriority(nextPriority);
    setConfig((prev) => {
      const hiring = nextPriority === 'hiring';
      const intent = nextPriority === 'intent' || hiring;
      const contact = nextPriority === 'contact';
      return {
        ...prev,
        modules: {
          ...prev.modules,
          people: true,
          hiring,
          signals: intent,
          scoring: nextPriority === 'best_fit' || prev.modules.scoring,
          email: contact || prev.modules.email,
          outreach: true,
        },
        email: {
          discover: contact || prev.email.discover,
          verify: contact || prev.email.verify,
        },
        signals: { ...prev.signals, whyNow: intent },
        hiringPolicy: { ...prev.hiringPolicy, maxAgeDays: hiring ? 45 : prev.hiringPolicy.maxAgeDays, requireLiveUrl: hiring || prev.hiringPolicy.requireLiveUrl },
        icpPolicy: { ...prev.icpPolicy, enabled: nextPriority === 'best_fit' || prev.icpPolicy.enabled },
        intentPolicy: {
          ...prev.intentPolicy,
          enabled: intent,
          allowedSignalTypes: hiring ? ['hiring'] : prev.intentPolicy.allowedSignalTypes,
        },
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
        mission: (sanitized.mission ?? '').trim() || null,
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
      label: 'Outreach Strategy',
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
                        {(agent.mission || agent.config?.mission || agent.description || '').trim() ||
                          (agent.config.people?.targets ?? [])
                            .map((t) => objectiveLabel(t.objective))
                            .slice(0, 2)
                            .join(', ') ||
                          'No people'}
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

              <label className="block space-y-1 sm:col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Agent Mission
                </span>
                <textarea
                  value={config.mission ?? ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, mission: e.target.value }))}
                  className={`${settingsInputClass} min-h-[88px] resize-y`}
                  placeholder="Find companies actively hiring engineering talent and identify the person responsible for hiring so we can start a relevant conversation about reducing recruiting workload."
                />
                <span className="block text-[11px] leading-4 text-slate-500">
                  North-star for research priorities and outreach objective — not the final email wording. Manage email recipes in{' '}
                  <a href="/dashboard/settings/outreach-templates" className="font-semibold text-violet-700 underline">
                    Outreach Templates
                  </a>
                  .
                </span>
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

            {/* A few familiar choices configure the full research policy beneath the surface. */}
            {!showAdvanced && (
              <section className="space-y-6 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-blue-50/60 p-4 sm:p-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-600">Agent blueprint</p>
                  <h2 className="mt-1 text-lg font-bold text-slate-950">Pick the personality that fits your motion</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Answer a few natural questions. We will translate them into research depth, lead scoring, live signals, and outreach rules.</p>
                </div>

                <fieldset>
                  <legend className="text-sm font-bold text-slate-900">1. How should this agent think about leads?</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {AGENT_PERSONALITIES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => applyPersonality(item.id)}
                        className={`rounded-xl border p-3 text-left transition ${
                          personality === item.id
                            ? 'border-violet-400 bg-white shadow-sm ring-2 ring-violet-100'
                            : 'border-slate-200 bg-white/70 hover:border-violet-200 hover:bg-white'
                        }`}
                      >
                        <span className="block text-sm font-bold text-slate-900">{item.name}</span>
                        <span className="mt-1 block text-[11px] font-semibold leading-4 text-violet-700">{item.tagline}</span>
                        <span className="mt-1.5 block text-[11px] leading-4 text-slate-500">{item.description}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="grid gap-5 border-t border-violet-100 pt-5 lg:grid-cols-2">
                  <fieldset>
                    <legend className="text-sm font-bold text-slate-900">2. Who should it try to reach?</legend>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">The personality suggests a role; change it whenever your motion needs someone else.</p>
                    <select
                      value={config.people.targets[0]?.objective ?? 'founder'}
                      onChange={(event) => setPrimaryTarget(event.target.value as PersonObjective)}
                      className={`${settingsInputClass} mt-3`}
                    >
                      {OBJECTIVES.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                    {config.people.targets[0]?.objective === 'custom' && (
                      <input
                        value={config.people.targets[0]?.roleHint ?? ''}
                        onChange={(event) => updateTarget(0, { roleHint: event.target.value })}
                        className={`${settingsInputClass} mt-2`}
                        placeholder="Describe the role, e.g. Head of Partnerships"
                      />
                    )}
                  </fieldset>

                  <fieldset>
                    <legend className="text-sm font-bold text-slate-900">3. What should make a lead stand out?</legend>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">This decides how the agent prioritizes ICP fit, hiring, intent, and contact verification.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {RESEARCH_PRIORITIES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => applyResearchPriority(item.id)}
                          className={`rounded-lg border px-3 py-2 text-left transition ${
                            researchPriority === item.id
                              ? 'border-violet-400 bg-white shadow-sm ring-2 ring-violet-100'
                              : 'border-slate-200 bg-white/70 hover:border-violet-200 hover:bg-white'
                          }`}
                        >
                          <span className="block text-xs font-bold text-slate-900">{item.label}</span>
                          <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">{item.help}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>

                {/* 4. Outreach Engine strategy (by agent personality) */}
                {(() => {
                  const engineTypesByPersonality: Record<
                    AgentPersonality,
                    Array<{ type: string; label: string; when: string }>
                  > = {
                    outbound: [
                      { type: 'operational_pain', label: 'Operational pain', when: 'Clear pain + proof angle' },
                      { type: 'role_specific', label: 'Role-specific', when: 'Strong buyer role match' },
                      { type: 'general_high_fit', label: 'High-fit account', when: 'ICP fit without a dated trigger' },
                    ],
                    signal_scout: [
                      { type: 'funding', label: 'Funding', when: 'Recent raise / investment' },
                      { type: 'product_launch', label: 'Product launch', when: 'Launch / release signal' },
                      { type: 'rapid_growth', label: 'Rapid growth', when: 'Headcount / market momentum' },
                      { type: 'leadership_change', label: 'Leadership change', when: 'New exec / VP hire' },
                    ],
                    talent_spotter: [
                      { type: 'active_hiring', label: 'Active hiring', when: 'Open roles matching your ICP' },
                      { type: 'hiring_pain', label: 'Hiring pain', when: 'Recruiting / ramp friction' },
                      { type: 'role_specific', label: 'Role-specific', when: 'Hiring manager / TA lead' },
                    ],
                    account_strategist: [
                      { type: 'technology_change', label: 'Tech change', when: 'Stack / tooling shift' },
                      { type: 'market_expansion', label: 'Market expansion', when: 'New geo / segment' },
                      { type: 'operational_pain', label: 'Operational pain', when: 'Process / efficiency gap' },
                    ],
                    partner_builder: [
                      { type: 'partnership', label: 'Partnership', when: 'Integration / ecosystem fit' },
                      { type: 'product_launch', label: 'Product launch', when: 'Partner-ready launch' },
                      { type: 'general_high_fit', label: 'High-fit account', when: 'Strategic account fit' },
                    ],
                  };
                  const preferredTypes = engineTypesByPersonality[personality] ?? engineTypesByPersonality.outbound;
                  const currentFallback =
                    config.outreachPolicy.personalizationFallback ?? defaultPersonalizationFallback();
                  const fallbackSummary =
                    !currentFallback.sendWhenNoPersonalization || currentFallback.fallbackStrategy === 'skip_email'
                      ? 'Skip lead if no evidence'
                      : currentFallback.fallbackStrategy === 'send_with_static_line'
                        ? 'Static fallback line'
                        : 'Generic role & company fit';

                  return (
                    <div className="space-y-5 border-t border-violet-100 pt-5">
                      <div>
                        <legend className="text-sm font-bold text-slate-900">4. How Outreach Engine works for this agent</legend>
                        <p className="mt-1 text-[11px] leading-4 text-slate-500">
                          Enrichment discovers facts and outreach intelligence. A separate Outreach Engine then
                          picks a structured template from evidence (hiring, funding, pain, role fit, etc.) and
                          writes a full subject + body — not a one-line opener from synthesis.
                        </p>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Enrichment finds</p>
                          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                            <li>Company identity, people, and verified emails</li>
                            <li>Signals, ICP/intent scores, and why-now triggers</li>
                            <li>Outreach intelligence (angle, evidence ladder, template hints)</li>
                          </ul>
                        </div>
                        <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3.5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Outreach Engine writes</p>
                          <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                            <li>Selects a system template type from evidence strength</li>
                            <li>Generates full email subject + body with claim→evidence checks</li>
                            <li>Abstains when required evidence is missing (protects deliverability)</li>
                          </ul>
                          <a
                            href="/dashboard/settings/outreach-templates"
                            className="mt-3 inline-flex text-[11px] font-bold text-violet-700 underline"
                          >
                            Manage Outreach Templates →
                          </a>
                        </div>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900">
                            Preferred email types for{' '}
                            {AGENT_PERSONALITIES.find((p) => p.id === personality)?.name ?? personality}
                          </p>
                          <span className="rounded-full bg-violet-100/70 px-2.5 py-1 text-[10px] font-bold tracking-wide text-violet-700">
                            Dynamic · evidence selects the final type
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {preferredTypes.map((t) => (
                            <div
                              key={t.type}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                            >
                              <p className="text-xs font-bold text-slate-900">{t.label}</p>
                              <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{t.when}</p>
                              <p className="mt-1 font-mono text-[9px] text-slate-400">{t.type}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Preferred template picker */}
                      {dbTemplates.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                          <label className="block space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Preferred outreach template (optional)
                            </span>
                            <p className="text-[11px] leading-4 text-slate-500">
                              Override auto-selection — the Outreach Engine will use this template when writing emails for leads
                              enriched by this agent. Leave on &ldquo;Auto&rdquo; to let the engine pick the best match from evidence.
                            </p>
                            <select
                              value={config.outreachPolicy.preferredTemplateId ?? ''}
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  outreachPolicy: {
                                    ...prev.outreachPolicy,
                                    preferredTemplateId: e.target.value || undefined,
                                  },
                                }))
                              }
                              className={settingsInputClass}
                            >
                              <option value="">Auto — engine picks best fit from evidence</option>
                              {dbTemplates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}{t.isSystem ? '' : ' (custom)'} — {t.templateType.replace(/_/g, ' ')}
                                </option>
                              ))}
                            </select>
                          </label>
                          {config.outreachPolicy.preferredTemplateId && (() => {
                            const chosen = dbTemplates.find((t) => t.id === config.outreachPolicy.preferredTemplateId);
                            const recipe = chosen?.latestVersion?.config?.bodyRecipe;
                            if (!recipe) return null;
                            return (
                              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                  Body preview
                                </div>
                                <pre className="whitespace-pre-wrap font-sans text-[11px] leading-5 text-slate-600">
                                  {recipe.length > 300 ? recipe.slice(0, 300) + '…' : recipe}
                                </pre>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="block space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Objective</span>
                          <select
                            value={config.outreachPolicy.objective ?? 'start_conversation'}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                modules: { ...prev.modules, outreach: true },
                                outreachPolicy: {
                                  ...prev.outreachPolicy,
                                  objective: e.target.value as OutreachObjective,
                                },
                              }))
                            }
                            className={settingsInputClass}
                          >
                            <option value="start_conversation">Start a conversation</option>
                            <option value="book_meeting">Book a meeting</option>
                            <option value="offer_audit">Offer audit / teardown</option>
                            <option value="partnership">Partnership inquiry</option>
                            <option value="custom">Custom angle</option>
                          </select>
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Style</span>
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
                            <option value="consultative">Consultative</option>
                            <option value="casual">Casual</option>
                            <option value="direct">Direct</option>
                            <option value="thought_provoking">Thought provoking</option>
                          </select>
                        </label>
                        <label className="block space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CTA</span>
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
                            <option value="soft_interest">Soft interest</option>
                            <option value="resource_offer">Resource offer</option>
                            <option value="open_question">Open question</option>
                            <option value="specific_time">Specific time</option>
                          </select>
                        </label>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white/75 p-3.5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">What LeadHub will configure for you</p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-700">
                          <span className="rounded-full bg-slate-100 px-2 py-1">Goal: {GOAL_META.find((item) => item.id === goal)?.label}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">Person: {objectiveLabel(config.people.targets[0]?.objective ?? 'founder')}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">{config.modules.hiring ? 'Hiring signals on' : 'Hiring signals off'}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">{config.icpPolicy.enabled ? 'ICP scoring on' : 'ICP scoring off'}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">{config.intentPolicy.enabled ? 'Intent triggers on' : 'Intent triggers off'}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">{config.modules.email && config.email.verify ? 'Email verification on' : 'No email verification'}</span>
                          <span className="rounded-full border border-violet-200 bg-violet-100 px-2 py-1 text-violet-800">
                            Outreach Engine · {preferredTypes.map((t) => t.label).slice(0, 2).join(', ')}
                            {preferredTypes.length > 2 ? '…' : ''}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1">Fallback: {fallbackSummary}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-violet-100 pt-4">
                  <p className="text-xs text-slate-600">Want to change the individual rules? They are still available whenever you need them.</p>
                  <button type="button" onClick={() => setShowAdvanced(true)} className={settingsBtnSecondary}>
                    Customize research
                  </button>
                </div>
              </section>
            )}

            {/* Tab Navigation Pill Bar */}
            {showAdvanced && <div className="border-b border-slate-100 pb-2">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-800">Advanced research settings</p>
                  <p className="text-[11px] text-slate-500">Fine-tune modules, targeting, policies, and custom research questions.</p>
                </div>
                <button type="button" onClick={() => setShowAdvanced(false)} className={settingsBtnSecondary}>
                  Simple view
                </button>
              </div>
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
            </div>}

            {/* TAB 1: GOAL & SCOPE */}
            {showAdvanced && activeTab === 'goal' && (
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
            {showAdvanced && activeTab === 'people' && (
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
            {showAdvanced && activeTab === 'hiring' && (
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
            {showAdvanced && activeTab === 'icp' && (
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
            {showAdvanced && activeTab === 'intent' && (
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

            {/* TAB 6: OUTREACH STRATEGY */}
            {showAdvanced && activeTab === 'outreach' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/80 via-white to-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-700">
                    Enrichment ≠ email copy
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-slate-950">Outreach Engine strategy</h3>
                  <p className="mt-1.5 text-xs leading-5 text-slate-600">
                    This tab sets objective, tone, CTA, and fallback rules that guide the Outreach Engine.
                    After enrichment finishes, the engine selects a structured template type from evidence
                    (hiring, funding, pain, role fit, etc.) and generates a full subject + body with
                    claim→evidence validation. Edit recipes in{' '}
                    <a href="/dashboard/settings/outreach-templates" className="font-semibold text-violet-700 underline">
                      Outreach Templates
                    </a>
                    .
                  </p>
                  {(config.mission || '').trim() ? (
                    <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      <span className="font-bold text-slate-900">Mission: </span>
                      {config.mission}
                    </p>
                  ) : null}
                </div>

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

                {/* Multi-Step Email Sequence */}
                <section className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Multi-Step Email Sequence
                      </span>
                      <p className="text-xs text-slate-500">
                        Generate follow-up emails automatically as part of enrichment.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              outreachPolicy: {
                                ...prev.outreachPolicy,
                                sequenceCount: n,
                              },
                            }))
                          }
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                            (config.outreachPolicy.sequenceCount ?? 1) === n
                              ? 'bg-violet-600 text-white shadow-xs'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Step Cards */}
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { step: 1, day: 0, title: 'Email 1: Initial outreach', desc: 'Personalized research & value proposition' },
                      { step: 2, day: 3, title: 'Email 2: Value-add follow-up', desc: 'Share insight or case study without repitching' },
                      { step: 3, day: 7, title: 'Email 3: Breakup / last touch', desc: 'Graceful exit, zero pressure' },
                      { step: 4, day: 14, title: 'Email 4: New angle', desc: 'Alternative perspective or trigger' },
                      { step: 5, day: 21, title: 'Email 5: Final touch', desc: 'Brief sign-off' },
                    ]
                      .slice(0, config.outreachPolicy.sequenceCount ?? 1)
                      .map((s) => (
                        <div
                          key={s.step}
                          className="rounded-xl border border-violet-100 bg-violet-50/40 p-3"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-violet-900">
                            <span>Step {s.step}</span>
                            <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-200">
                              {s.day === 0 ? 'Day 0' : `Day ${s.day}`}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-800">{s.title}</p>
                          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{s.desc}</p>
                        </div>
                      ))}
                  </div>
                </section>

                {/* When No Evidence Behavior */}
                <section className="space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Behavior When No Strong Dated Evidence Exists
                  </span>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { id: 'pain_point_only', label: 'Pain-Point Only', desc: 'Focus purely on operational pain point' },
                      { id: 'generic', label: 'Company Fit', desc: 'Lean on high-level company and role fit' },
                      { id: 'skip', label: 'Skip / abstain', desc: 'Abstain from email when evidence is weak' },
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
                      Passed to the Outreach Engine so generated emails stay on-brand and spam-safe.
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
                      Guides which evidence ladder the Outreach Engine prefers when picking a template and angle.
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
            {showAdvanced && activeTab === 'research' && (
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
            {showAdvanced && <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2">
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
            </div>}

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
