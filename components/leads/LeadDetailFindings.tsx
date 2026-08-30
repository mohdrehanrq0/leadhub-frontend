'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IdentityNoteBanner } from './IdentityNoteBanner';
import { AffiliationBadge } from './AffiliationBadge';
import type { IdentityNote } from '../../lib/identity-reasons';
import { displayEmailStatus, isShowableEmailStatus } from '../../lib/email-display';
import {
  IconBuilding,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
  IconLoader2,
  IconMail,
  IconNotes,
  IconRobot,
  IconSparkles,
  IconUser,
} from '@tabler/icons-react';
import { LinkedInLink, pickLinkedInUrl } from './LinkedInLink';
import { PersonLinkedInPanel } from '../enrichment/PersonLinkedInPanel';
import { CompanyLinkedInPanel, CompanyProfilePanel } from '../enrichment/CompanyPanels';
import { ContactPanel } from '../enrichment/ContactPanel';
import { HiringPanel, SignalsPanel } from '../enrichment/HiringPanel';
import { EvidencePanel } from '../enrichment/EvidencePanel';
import {
  fieldValue,
  isObjectArray,
  isStringArray,
  type BuyingSignalDetail,
  type CanonicalFieldTree,
  type EnrichmentFact,
  type LinkedInSnapshot,
  type OpenRole,
} from '../enrichment/types';
import {
  AiIntelligenceData,
  EnrichmentProfile,
  EnrichmentSnapshot,
  LeadCategory,
  LeadList,
  PIPELINE_STAGES,
  PRIORITIES,
} from './types';

/**
 * Outcome of a research step. `outcome` is what keeps "we searched and found
 * nothing" separate from "we could not search at all".
 */
type ResearchDecision = {
  code: string;
  outcome: 'found' | 'not_found' | 'unconfirmed' | 'blocked' | 'provider_error' | 'not_applicable';
  humanReason: string;
  recommendedAction?: string;
  attempts?: number;
  sourcesChecked?: string[];
};

const SOURCE_LABELS: Record<string, string> = {
  linkedin_company_employees: 'LinkedIn company employees',
  serp_authority_search: 'Search engine authority queries',
  company_website: 'Company website',
};

/** How the agent read the company's structure, and what that unlocked. */
type OrganizationModel = {
  founderLedScore: number;
  model: 'founder_led' | 'owner_operated' | 'functional' | 'unknown';
  observedTitles?: string[];
  signals?: Array<{ key: string; weight: number; detail: string }>;
  confidence: number;
  source: 'rules' | 'llm';
};

type FallbackDecisionView = {
  objective?: string;
  responsibility?: string;
  allowed: boolean;
  reason: string;
  tiersUnlocked: string[];
  explanation: string;
};

const ORG_MODEL_LABEL: Record<OrganizationModel['model'], string> = {
  founder_led: 'Founder-led',
  owner_operated: 'Owner-operated',
  functional: 'Functional teams',
  unknown: 'Structure unclear',
};

/**
 * Explains *why* a substituted person is the right contact. Without this, an
 * Owner returned for a hiring request looks like the agent ignored the request.
 */
function OrganizationCard({
  org,
  fallbacks,
}: {
  org: OrganizationModel;
  fallbacks?: FallbackDecisionView[];
}) {
  const substitution = fallbacks?.find((f) => f.tiersUnlocked.some((t) => t !== 'dedicated'));
  const refusal = fallbacks?.find((f) => !f.allowed);
  const explanation = substitution?.explanation ?? refusal?.explanation;

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
          How this company is organised
        </p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
          {ORG_MODEL_LABEL[org.model]} · {org.founderLedScore}/100
        </span>
        {org.source === 'llm' ? (
          <span className="text-[10px] text-indigo-500">AI-classified</span>
        ) : null}
      </div>

      {explanation ? <p className="mt-1.5 text-[12px] text-slate-700">{explanation}</p> : null}

      {org.signals?.length ? (
        <ul className="mt-1.5 space-y-0.5">
          {org.signals.slice(0, 4).map((s) => (
            <li key={s.key} className="text-[11px] text-slate-600">
              {s.weight >= 0 ? '•' : '◦'} {s.detail}
            </li>
          ))}
        </ul>
      ) : null}

      {org.observedTitles?.length ? (
        <p className="mt-1.5 text-[11px] text-slate-500">
          Roster seen: {org.observedTitles.slice(0, 6).join(', ')}
        </p>
      ) : null}
    </div>
  );
}

type HiringSignalView = {
  isHiring: boolean;
  strength: 'none' | 'weak' | 'likely' | 'confirmed';
  confidence: number;
  roles: string[];
  summary: string;
  evidence?: Array<{
    kind: 'job_posting' | 'careers_page' | 'announcement' | 'mention';
    quote: string;
    sourceUrl: string;
    official: boolean;
    role?: string;
    observedAt?: string;
  }>;
};

const HIRING_STRENGTH_TONE: Record<HiringSignalView['strength'], string> = {
  confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  likely: 'border-amber-200 bg-amber-50 text-amber-800',
  weak: 'border-slate-200 bg-slate-50 text-slate-600',
  none: 'border-slate-200 bg-slate-50 text-slate-500',
};

const HIRING_EVIDENCE_LABEL: Record<string, string> = {
  job_posting: 'Open posting',
  careers_page: 'Careers page',
  announcement: 'Announcement',
  mention: 'Mention',
};

/**
 * Whether the company is hiring, kept separate from who owns hiring.
 *
 * These are different claims with different evidence, and merging them is why
 * a careers page used to make every employee look like the hiring manager.
 */
function HiringSignalCard({ signal }: { signal: HiringSignalView }) {
  if (signal.strength === 'none') return null;

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${HIRING_STRENGTH_TONE[signal.strength]}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider">Hiring signal</p>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold capitalize">
          {signal.strength} · {signal.confidence}%
        </span>
      </div>

      <p className="mt-1.5 text-[12px] text-slate-700">{signal.summary}</p>

      {signal.roles.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {signal.roles.slice(0, 6).map((role) => (
            <span
              key={role}
              className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-700"
            >
              {role}
            </span>
          ))}
        </div>
      )}

      {signal.evidence?.length ? (
        <ul className="mt-2 space-y-1">
          {signal.evidence.slice(0, 4).map((item, i) => (
            <li key={`${item.sourceUrl}-${i}`} className="text-[11px] text-slate-600">
              <span className="font-semibold">
                {HIRING_EVIDENCE_LABEL[item.kind] ?? item.kind}
                {item.official ? ' (own site)' : ''}:
              </span>{' '}
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-dotted hover:text-slate-900"
                >
                  {item.quote}
                </a>
              ) : (
                item.quote
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

const RESPONSIBILITY_LABEL: Record<string, string> = {
  company_leadership: 'leads the company',
  hiring: 'owns hiring',
  sales: 'owns sales',
  marketing: 'owns marketing',
  technology_procurement: 'owns tech decisions',
  operations: 'owns operations',
  finance: 'owns finance',
  purchasing: 'owns purchasing',
  partnerships: 'owns partnerships',
};

/**
 * Identity and responsibility are separate claims, so they are shown as two
 * independent numbers. "Works here" is verifiable; "owns hiring" is an
 * inference, and collapsing them into one score hides which part is uncertain.
 */
function ConfidencePair({
  identity,
  responsibility,
  responsibilityKey,
}: {
  identity?: number;
  responsibility?: number;
  responsibilityKey?: string | null;
}) {
  if (identity == null && responsibility == null) return null;
  const ownsLabel =
    (responsibilityKey ? RESPONSIBILITY_LABEL[responsibilityKey] : undefined) ?? 'owns this';
  return (
    <div className="mt-1.5 flex flex-wrap gap-3">
      {identity != null ? (
        <span className="text-[11px] text-slate-600">
          <span className="font-semibold text-slate-800">{identity}%</span> works here
        </span>
      ) : null}
      {responsibility != null ? (
        <span className="text-[11px] text-slate-600">
          <span className="font-semibold text-slate-800">{responsibility}%</span> {ownsLabel}
        </span>
      ) : null}
    </div>
  );
}

function DecisionCard({
  decision,
  rejected,
}: {
  decision: ResearchDecision;
  rejected?: Array<{ name?: string; role?: string; reason: string }>;
}) {
  const providerError = decision.outcome === 'provider_error';
  const tone = providerError
    ? 'border-amber-200 bg-amber-50 text-amber-900'
    : decision.outcome === 'unconfirmed'
      ? 'border-slate-200 bg-slate-50 text-slate-700'
      : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className={`space-y-3 rounded-xl border px-3 py-3 text-sm ${tone}`}>
      <p className="font-semibold">
        {providerError ? 'Search could not run' : 'No confirmed match'}
      </p>
      <p>{decision.humanReason}</p>

      {decision.sourcesChecked?.length ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">What we checked</p>
          <ul className="mt-1 space-y-0.5">
            {decision.sourcesChecked.map((s) => (
              <li key={s}>· {SOURCE_LABELS[s] ?? s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {rejected?.length ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
            Rejected candidates ({rejected.length})
          </p>
          <ul className="mt-1 space-y-0.5">
            {rejected.slice(0, 5).map((r, i) => (
              <li key={i}>
                · {r.name ?? 'Unnamed'}
                {r.role ? ` — ${r.role}` : ''}: {r.reason.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {decision.recommendedAction ? (
        <p className="text-xs font-medium opacity-80">Try: {decision.recommendedAction}</p>
      ) : null}
    </div>
  );
}

type LeadLike = {
  id: string;
  enrichmentStatus?: string | null;
  enrichmentError?: string | null;
  enrichmentAgentId?: string | null;
  enrichmentPolicy?: Record<string, unknown> | null;
  enrichmentProfile?: EnrichmentProfile | null;
  enrichmentAgent?: { id: string; name: string; description?: string | null } | null;
  icpScore?: number | null;
  intentScore?: number | null;
  confidence?: number | null;
  pipelineStage: string;
  priority: string;
  notes?: string | null;
  category?: { id: string; name: string } | null;
  company?: {
    name?: string | null;
    domain?: string | null;
    website?: string | null;
    industry?: string | null;
    size?: string | null;
    city?: string | null;
    country?: string | null;
    description?: string | null;
    foundedYear?: number | null;
    products?: string[] | null;
    services?: string[] | null;
    technologies?: string[] | null;
    socialLinks?: Record<string, string> | null;
    location?: unknown;
  } | null;
  contact?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    role?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
    emailVerificationStatus?: string | null;
    otherEmails?: string[] | null;
    location?: string | null;
    emailVerifiedAt?: string | null;
    isCatchAll?: boolean | null;
    isDisposable?: boolean | null;
  } | null;
  researchSuggestions?: {
    suggestions?: string[];
    gapsRemaining?: string[];
    unableToFind?: string[];
    sources?: string[];
    customAnswers?: Array<{
      question: string;
      answer: string;
      confidence?: number;
      sources?: string[];
      status?: 'answered' | 'unknown' | 'not_searched';
      searchesPerformed?: number;
      candidatesConsidered?: number;
      requiredEvidence?: string[];
      rejected?: Array<{ url: string; reason: string }>;
      evidence?: Array<{ url: string; title: string; quote: string; official?: boolean }>;
    }>;
    personDecision?: ResearchDecision | null;
    personSearchBlocked?: ResearchDecision | null;
    rejectedCandidates?: Array<{ name?: string; role?: string; reason: string }>;
    organizationModel?: OrganizationModel | null;
    fallbackDecisions?: FallbackDecisionView[];
    hiringSignal?: HiringSignalView | null;
    enrichmentModules?: Record<string, boolean>;
    fetchStats?: {
      urlsAttempted: number;
      urlsRead: number;
      tinyfishOk: number;
      botBlocked: number;
      dropped: number;
    };
  } | null;
  lists?: LeadList[];
  activities?: Array<{
    id: string;
    type: string;
    title: string;
    body?: string | null;
    createdAt: string;
  }>;
  rawData?: Record<string, unknown>;
};

type EmailEntry = { email: string; status: string | null; isPrimary: boolean };

function verificationTone(status?: string | null) {
  if (status === 'valid') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'invalid' || status === 'disposable') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'catch_all') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function moduleFlags(lead: LeadLike): Record<string, boolean> {
  const fromPolicy = (lead.enrichmentPolicy as { modules?: Record<string, boolean> } | null)?.modules;
  const fromSuggestions = lead.researchSuggestions?.enrichmentModules;
  return { ...(fromSuggestions ?? {}), ...(fromPolicy ?? {}) };
}

function SectionCard({
  id,
  title,
  subtitle,
  icon,
  children,
  actions,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-black tracking-tight text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FactRow({
  label,
  confidence,
  children,
}: {
  label: string;
  /** 0–1. Set only for values that did not clear the promotion threshold. */
  confidence?: number;
  children: React.ReactNode;
}) {
  if (children == null || children === '' || children === false) return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-3">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">
        {children}
        {confidence != null ? <ConfidenceBadge confidence={confidence} /> : null}
      </dd>
    </div>
  );
}

/**
 * A weak description is more useful than a blank field, provided the reader can
 * see it is weak.
 */
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  return (
    <span
      title="Below the confidence threshold — treat as a lead, not a fact."
      className="ml-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 align-middle text-[10px] font-bold text-amber-700"
    >
      {pct}% confidence
    </span>
  );
}

function EnrichmentJson({ data, emptyLabel }: { data: unknown; emptyLabel: string }) {
  if (data == null) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="text-sm font-bold text-slate-600">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <pre className="max-h-[50vh] overflow-auto p-4 text-[11px] leading-relaxed text-emerald-300 font-mono whitespace-pre-wrap wrap-break-word">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export function EnrichmentAgentBadge({
  agent,
  agentId,
}: {
  agent?: LeadLike['enrichmentAgent'];
  agentId?: string | null;
}) {
  if (!agent && !agentId) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
        <IconRobot size={13} />
        No agent recorded
      </span>
    );
  }
  return (
    <Link
      href="/dashboard/settings/enrichment-agents"
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:border-slate-400 hover:bg-slate-50"
      title={agent?.description ?? 'Open enrichment agents'}
    >
      <IconRobot size={13} className="text-slate-600" />
      <span className="text-slate-500 font-semibold">Agent</span>
      <span>{agent?.name ?? 'Custom agent'}</span>
      <IconExternalLink size={11} className="text-slate-400" />
    </Link>
  );
}

type FindingsNavItem = { id: string; label: string };

export function LeadDetailFindings({
  lead,
  enrichment,
  allEmails,
  enrichProfileJson,
  aiIntelligence,
  identityNote,
  outreachPanel,
  linkedinSnapshot,
  facts,
  canonicalFields,
  categories,
  lists,
  notes,
  setNotes,
  saving,
  listToAdd,
  setListToAdd,
  onPatch,
  onSaveNotes,
  onAddToList,
  formatDate,
}: {
  lead: LeadLike;
  enrichment: EnrichmentSnapshot | null;
  allEmails: EmailEntry[];
  enrichProfileJson: unknown;
  aiIntelligence: AiIntelligenceData | null;
  identityNote?: IdentityNote | null;
  outreachPanel: React.ReactNode;
  /** Cached LinkedIn detail for the person and their employer. */
  linkedinSnapshot?: LinkedInSnapshot | null;
  /** Evidence-first facts with their source urls. */
  facts?: EnrichmentFact[] | null;
  /** Canonical enrichment field tree, source of hiring and signal detail. */
  canonicalFields?: CanonicalFieldTree | null;
  categories: LeadCategory[];
  lists: LeadList[];
  notes: string;
  setNotes: (v: string) => void;
  saving: boolean;
  listToAdd: string;
  setListToAdd: (v: string) => void;
  onPatch: (payload: Record<string, unknown>) => void;
  onSaveNotes: () => void;
  onAddToList: () => void;
  formatDate: (iso?: string | null) => string;
}) {
  const modules = moduleFlags(lead);
  const enrichmentDone =
    lead.enrichmentStatus === 'completed' || lead.enrichmentStatus === 'partial';
  const profile = lead.enrichmentProfile ?? aiIntelligence?.enrichmentProfile ?? null;
  const lowConfidence: Record<string, number | undefined> =
    profile?.quality?.lowConfidenceFields ?? {};
  const people = enrichment?.people ?? profile?.people ?? [];
  const customAnswers = lead.researchSuggestions?.customAnswers ?? [];
  // A provider that never ran must outrank "nothing found" in the explanation.
  const personDecision =
    lead.researchSuggestions?.personSearchBlocked ??
    lead.researchSuggestions?.personDecision ??
    null;
  const organizationModel = lead.researchSuggestions?.organizationModel ?? null;
  const hiringSignal = lead.researchSuggestions?.hiringSignal ?? null;
  // Every person in a run is judged against the same responsibility, so the
  // run's fallback decision names it once for all of them.
  const targetResponsibility =
    lead.researchSuggestions?.fallbackDecisions?.[0]?.responsibility ?? null;
  const companyLinkedIn = pickLinkedInUrl(
    lead.company?.socialLinks?.linkedin,
    profile?.identity?.linkedin,
  );
  const contactLinkedIn = pickLinkedInUrl(lead.contact?.linkedinUrl, profile?.buyer?.linkedin);
  const showCompany = Boolean(
    lead.company?.name ||
      lead.company?.domain ||
      lead.company?.website ||
      profile?.identity?.companyName ||
      modules.company !== false,
  );
  const showPeople =
    people.length > 0 ||
    allEmails.length > 0 ||
    Boolean(contactLinkedIn) ||
    modules.people !== false ||
    modules.email !== false;
  const signals =
    profile?.signals ??
    [];
  const hiring = aiIntelligence?.hiringIntelligence;
  const showSignals =
    signals.length > 0 || Boolean(hiring?.isHiring || (hiring?.roles?.length ?? 0) > 0);
  const hasOutreachContent = Boolean(
    aiIntelligence ||
      profile?.salesIntelligence?.emailOpener ||
      profile?.salesIntelligence?.outreachAngle ||
      (profile?.salesIntelligence?.painPoints?.length ?? 0) > 0,
  );
  const showOutreach = hasOutreachContent || (enrichmentDone && modules.outreach !== false);
  const showCustom = customAnswers.length > 0;
  const showVerifiedEmpty =
    enrichmentDone && people.length === 0 && allEmails.length === 0 && !lead.company?.domain;

  const findings = useMemo(() => {
    const chips: Array<{ label: string; ok: boolean }> = [];
    if (lead.company?.name || profile?.identity?.companyName) {
      chips.push({ label: 'Company', ok: Boolean(lead.company?.domain || profile?.identity?.domain) });
    }
    if (people.length > 0) chips.push({ label: `${people.length} people`, ok: true });
    if (allEmails.length > 0) chips.push({ label: `${allEmails.length} email${allEmails.length > 1 ? 's' : ''}`, ok: true });
    if (signals.length > 0) chips.push({ label: `${signals.length} signals`, ok: true });
    if (hiring?.isHiring || (hiring?.roles?.length ?? 0) > 0) chips.push({ label: 'Hiring', ok: true });
    if (hasOutreachContent) chips.push({ label: 'Outreach', ok: true });
    if (customAnswers.length > 0) chips.push({ label: 'Custom answers', ok: true });
    if (lead.icpScore != null || lead.intentScore != null) chips.push({ label: 'Scores', ok: true });
    return chips;
  }, [
    allEmails.length,
    customAnswers.length,
    hasOutreachContent,
    hiring,
    lead.company?.domain,
    lead.company?.name,
    lead.icpScore,
    lead.intentScore,
    people.length,
    profile?.identity?.companyName,
    profile?.identity?.domain,
    signals.length,
  ]);

  // Hiring roles and buying signals are stored as canonical fields, which keep
  // the structure (role list, per-signal weight and source) that the AI
  // summaries flatten into prose.
  const openRoles = fieldValue(canonicalFields, 'company.hiring.openRoles', isObjectArray) as
    | OpenRole[]
    | undefined;
  const hiringSources = fieldValue(canonicalFields, 'company.hiring.sources', isStringArray);
  const detailedSignals = fieldValue(canonicalFields, 'lead.intent.buyingSignals', isObjectArray) as
    | BuyingSignalDetail[]
    | undefined;

  const hasLinkedInPerson = Boolean(linkedinSnapshot?.person);
  const hasLinkedInCompany = Boolean(
    linkedinSnapshot?.company || linkedinSnapshot?.colleagues?.length,
  );
  const hasFacts = Boolean(facts?.length);

  const navItems: FindingsNavItem[] = [
    ...(showCompany || showPeople ? [{ id: 'verified', label: 'Verified' }] : []),
    ...(hasLinkedInPerson ? [{ id: 'person-linkedin', label: 'Profile' }] : []),
    { id: 'company-profile', label: 'Company' },
    ...(openRoles?.length ? [{ id: 'hiring', label: 'Hiring' }] : []),
    ...(showSignals ? [{ id: 'signals', label: 'Signals' }] : []),
    ...(showOutreach ? [{ id: 'outreach', label: 'Outreach' }] : []),
    ...(hasFacts ? [{ id: 'evidence', label: 'Evidence' }] : []),
    ...(showCustom ? [{ id: 'custom', label: 'Custom' }] : []),
    { id: 'my-data', label: 'My Data' },
  ];

  const [activeSection, setActiveSection] = useState(navItems[0]?.id ?? 'my-data');
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const ids = navItems.map((n) => n.id);
    const observers: IntersectionObserver[] = [];
    ids.forEach((sectionId) => {
      const el = document.getElementById(sectionId);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) setActiveSection(sectionId);
        },
        { rootMargin: '-20% 0px -65% 0px', threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nav derived from findings
  }, [lead.id, findings.length, showOutreach, showSignals, showCustom]);

  const companyLoc =
    [lead.company?.city, lead.company?.country].filter(Boolean).join(', ') ||
    profile?.identity?.location ||
    '';

  return (
    <div className="space-y-5">
      {/* Sticky section nav */}
      <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setActiveSection(item.id);
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeSection === item.id
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {/* Findings strip */}
      {(enrichmentDone || lead.enrichmentStatus === 'in_progress') && (
        <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Based on findings
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {lead.enrichmentStatus === 'in_progress'
                  ? 'Enrichment running — sections fill as facts land.'
                  : findings.length > 0
                    ? 'Showing only sections with verified or researched data.'
                    : 'Enrichment finished with limited retained facts.'}
              </p>
            </div>
            <EnrichmentAgentBadge agent={lead.enrichmentAgent} agentId={lead.enrichmentAgentId} />
          </div>
          {findings.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {findings.map((f) => (
                <span
                  key={f.label}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${
                    f.ok
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {f.ok ? <IconCheck size={12} /> : null}
                  {f.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {identityNote && <IdentityNoteBanner note={identityNote} />}

      {(showCompany || showPeople) && (
        <SectionCard
          id="verified"
          title="Verified facts"
          subtitle="Company, people, and emails retained from enrichment"
          icon={<IconBuilding size={16} />}
        >
          {showVerifiedEmpty &&
            (personDecision ? (
              <div className="mb-4">
                <DecisionCard
                  decision={personDecision}
                  rejected={lead.researchSuggestions?.rejectedCandidates}
                />
              </div>
            ) : (
              <p className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Enrichment finished but no people/emails were retained. Re-enrich to refresh.
              </p>
            ))}

          <div className="grid gap-5 lg:grid-cols-2">
            {showCompany && (
              <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <IconBuilding size={13} /> Company
                </div>
                <dl className="space-y-2.5">
                  <FactRow label="Name">
                    <span className="font-semibold">
                      {lead.company?.name || profile?.identity?.companyName || '—'}
                    </span>
                  </FactRow>
                  <FactRow label="Domain">
                    {lead.company?.domain || profile?.identity?.domain ? (
                      <a
                        href={`https://${lead.company?.domain || profile?.identity?.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-blue-700 hover:underline"
                      >
                        {lead.company?.domain || profile?.identity?.domain}
                      </a>
                    ) : null}
                  </FactRow>
                  <FactRow label="Website">
                    {lead.company?.website ? (
                      <a
                        href={lead.company.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 hover:underline break-all"
                      >
                        {lead.company.website}
                      </a>
                    ) : null}
                  </FactRow>
                  <FactRow label="LinkedIn">
                    {companyLinkedIn ? <LinkedInLink url={companyLinkedIn} kind="company" /> : null}
                  </FactRow>
                  <FactRow label="Location">{companyLoc || null}</FactRow>
                  <FactRow label="Industry" confidence={lowConfidence.industry}>
                    {lead.company?.industry || profile?.qualification?.industry || null}
                  </FactRow>
                  <FactRow label="Business model" confidence={lowConfidence.businessModel}>
                    {profile?.qualification?.businessModel || null}
                  </FactRow>
                  <FactRow label="Size" confidence={lowConfidence.sizeBucket}>
                    {lead.company?.size || profile?.qualification?.sizeBucket || null}
                  </FactRow>
                  <FactRow label="What they sell" confidence={lowConfidence.whatTheySell}>
                    {profile?.qualification?.whatTheySell || null}
                  </FactRow>
                  <FactRow label="Who they serve" confidence={lowConfidence.whoTheySellTo}>
                    {profile?.qualification?.whoTheySellTo || null}
                  </FactRow>
                  <FactRow label="Description">
                    {lead.company?.description ? (
                      <span className="leading-relaxed">{lead.company.description}</span>
                    ) : null}
                  </FactRow>
                </dl>
              </div>
            )}

            <div className="space-y-4">
              {showPeople && (
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <IconUser size={13} /> People
                  </div>
                  {organizationModel ? (
                    <OrganizationCard
                      org={organizationModel}
                      fallbacks={lead.researchSuggestions?.fallbackDecisions}
                    />
                  ) : null}
                  {hiringSignal ? <HiringSignalCard signal={hiringSignal} /> : null}
                  {people.length === 0 && !lead.contact?.email ? (
                    personDecision ? (
                      <DecisionCard
                        decision={personDecision}
                        rejected={lead.researchSuggestions?.rejectedCandidates}
                      />
                    ) : (
                      <p className="text-sm text-slate-500">No people retained yet.</p>
                    )
                  ) : (
                    <ul className="space-y-3">
                      {people.length > 0
                        ? people.map((p, idx) => {
                            const snap = p as {
                              name?: string;
                              fullName?: string | null;
                              firstName?: string | null;
                              lastName?: string | null;
                              title?: string;
                              role?: string | null;
                              email?: string | null;
                              linkedinUrl?: string | null;
                              linkedin?: string | null;
                              roleType?: string;
                              fitScore?: number;
                              rankReasons?: string[];
                              identityConfidence?: number;
                              responsibilityConfidence?: number;
                              suitability?: number;
                              matchedTier?: string | null;
                              whySelected?: string[];
                            };
                            const name =
                              snap.name ||
                              snap.fullName ||
                              [snap.firstName, snap.lastName].filter(Boolean).join(' ') ||
                              'Unknown';
                            const title = snap.title || snap.role || '';
                            const email = snap.email ?? undefined;
                            const emailEntry = email
                              ? allEmails.find((e) => e.email === email.toLowerCase())
                              : undefined;
                            const matchedContact = enrichment?.contacts?.find(
                              (c) =>
                                c.displayName &&
                                name &&
                                c.displayName.toLowerCase() === name.toLowerCase(),
                            );
                            const personLinkedIn = pickLinkedInUrl(
                              snap.linkedinUrl,
                              snap.linkedin,
                              idx === 0 ? lead.contact?.linkedinUrl : null,
                              idx === 0 ? profile?.buyer?.linkedin : null,
                              matchedContact?.linkedinUrl,
                            );
                            const roleType = snap.roleType;
                            const fitScore = snap.fitScore;
                            // The ranker's own justification is the most specific,
                            // so it leads; affiliation signals only fill the gaps.
                            const whySelected = [
                              ...(snap.whySelected ?? []),
                              ...(matchedContact?.affiliationStrength === 'confirmed'
                                ? ['Confirmed current employee']
                                : []),
                              ...(matchedContact?.affiliationSignals ?? []).map((s) =>
                                String(s).replace(/_/g, ' '),
                              ),
                              ...(snap.rankReasons ?? []).map((r) => r.replace(/_/g, ' ')),
                            ]
                              .filter((v, i, arr) => arr.indexOf(v) === i)
                              .slice(0, 5);
                            return (
                              <li
                                key={`${name}-${idx}`}
                                className="rounded-lg border border-white bg-white px-3 py-2.5 shadow-sm"
                              >
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {name}
                                    {title ? <span className="font-normal text-slate-600"> · {title}</span> : null}
                                  </p>
                                  <AffiliationBadge
                                    strength={matchedContact?.affiliationStrength}
                                    signals={matchedContact?.affiliationSignals}
                                  />
                                </div>
                                {roleType ? (
                                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                    {String(roleType).replace(/_/g, ' ')}
                                    {snap.suitability != null
                                      ? ` · ${snap.suitability}% fit`
                                      : fitScore != null
                                        ? ` · ${fitScore}% fit`
                                        : ''}
                                    {snap.matchedTier && snap.matchedTier !== 'dedicated'
                                      ? ` · ${snap.matchedTier} match`
                                      : ''}
                                  </p>
                                ) : null}
                                <ConfidencePair
                                  identity={snap.identityConfidence}
                                  responsibility={snap.responsibilityConfidence}
                                  responsibilityKey={targetResponsibility}
                                />
                                {emailEntry ? (
                                  <a
                                    href={`mailto:${emailEntry.email}`}
                                    className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-blue-700 hover:underline"
                                  >
                                    <IconMail size={12} /> {emailEntry.email}
                                  </a>
                                ) : null}
                                {personLinkedIn ? (
                                  <div className="mt-1.5">
                                    <LinkedInLink url={personLinkedIn} kind="person" compact />
                                  </div>
                                ) : null}
                                {whySelected.length ? (
                                  <div className="mt-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      Why selected
                                    </p>
                                    <ul className="mt-0.5 space-y-0.5">
                                      {whySelected.map((reason) => (
                                        <li key={reason} className="text-[11px] text-slate-600">
                                          ✓ {reason}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}
                              </li>
                            );
                          })
                        : (
                          <li className="rounded-lg border border-white bg-white px-3 py-2.5 shadow-sm">
                            <p className="text-sm font-semibold text-slate-900">
                              {[lead.contact?.firstName, lead.contact?.lastName].filter(Boolean).join(' ') ||
                                'Primary contact'}
                              {lead.contact?.role ? (
                                <span className="font-normal text-slate-600"> · {lead.contact.role}</span>
                              ) : null}
                            </p>
                            {contactLinkedIn ? (
                              <div className="mt-1.5">
                                <LinkedInLink url={contactLinkedIn} kind="person" compact />
                              </div>
                            ) : null}
                          </li>
                        )}
                    </ul>
                  )}
                </div>
              )}

              {allEmails.length > 0 && (
                <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <IconMail size={13} /> Emails
                  </div>
                  <ul className="space-y-2">
                    {allEmails.map((entry) => (
                      <li key={entry.email} className="flex flex-wrap items-center gap-2">
                        <a
                          href={`mailto:${entry.email}`}
                          className={`inline-flex items-center gap-1.5 font-mono text-sm font-semibold hover:underline ${
                            entry.isPrimary ? 'text-blue-700' : 'text-slate-700'
                          }`}
                        >
                          {entry.email}
                        </a>
                        {entry.isPrimary && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-700">
                            primary
                          </span>
                        )}
                        {entry.status && isShowableEmailStatus(displayEmailStatus(entry.status)) && (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${verificationTone(displayEmailStatus(entry.status))}`}
                          >
                            {displayEmailStatus(entry.status)!.replace(/_/g, ' ')}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
            >
              {showRaw ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              {showRaw ? 'Hide raw snapshot' : 'Show raw snapshot'}
            </button>
            {showRaw && (
              <div className="mt-3">
                <EnrichmentJson
                  data={lead.enrichmentStatus === 'not_started' ? null : enrichProfileJson}
                  emptyLabel="No enrichment profile data was saved for this lead."
                />
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* The shared enrichment panels. Same components the capture detail page
          renders, so a capture and the lead it becomes look the same. */}
      {hasLinkedInPerson ? (
        <PersonLinkedInPanel
          person={linkedinSnapshot?.person}
          fromCapture={linkedinSnapshot?.personFromCapture}
        />
      ) : null}

      <ContactPanel contact={lead.contact} />

      <CompanyProfilePanel company={lead.company} />

      {hasLinkedInCompany ? (
        <CompanyLinkedInPanel
          company={linkedinSnapshot?.company}
          colleagues={linkedinSnapshot?.colleagues}
        />
      ) : null}

      {openRoles?.length ? <HiringPanel roles={openRoles} sources={hiringSources} /> : null}

      {detailedSignals?.length ? (
        <SignalsPanel
          signals={detailedSignals}
          intentScore={lead.intentScore ?? undefined}
          id="signals-detail"
        />
      ) : null}

      {hasFacts ? <EvidencePanel facts={facts} /> : null}

      {showSignals && (signals.length > 0 || hiring) && (
        <SectionCard
          id="signals"
          title="Signals & hiring"
          subtitle="Recent triggers that support timing"
          icon={<IconSparkles size={16} />}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {signals.length > 0 && (
              <ul className="space-y-2">
                {signals.slice(0, 6).map((s) => (
                  <li
                    key={`${s.type}-${s.summary}`}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                  >
                    <p className="text-sm text-slate-800">{s.summary}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {s.source ?? s.type}
                      {s.date ? ` · ${s.date}` : ''}
                      {s.sourceUrl ? (
                        <>
                          {' · '}
                          <a
                            href={s.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="normal-case tracking-normal text-blue-600 hover:underline"
                          >
                            Source
                          </a>
                        </>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {hiring && (hiring.isHiring || (hiring.roles?.length ?? 0) > 0) && (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-bold text-slate-700">
                  {hiring.isHiring ? 'Actively hiring' : 'Hiring signals'}
                  {hiring.roles?.length ? ` · ${hiring.roles.length} role(s)` : ''}
                </p>
                <ul className="mt-2 space-y-2">
                  {(hiring.roles ?? []).slice(0, 5).map((r) => (
                    <li key={`${r.title}-${r.posted ?? ''}-${r.sourceUrl ?? ''}`} className="text-sm text-slate-800">
                      <span className="font-semibold">{r.title}</span>
                      {r.department ? ` · ${r.department}` : ''}
                      {r.posted ? (
                        <span className="text-xs text-slate-500"> · posted {r.posted}</span>
                      ) : null}
                      {(r.source || r.sourceUrl) ? (
                        <p className="mt-0.5 text-xs text-slate-500">
                          Source:{' '}
                          {r.sourceUrl ? (
                            <a
                              href={r.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {r.source ?? r.sourceUrl}
                            </a>
                          ) : (
                            r.source
                          )}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {(() => {
        const stats = lead.researchSuggestions?.fetchStats;
        if (!stats || !(stats.urlsAttempted > 0 || stats.urlsRead > 0)) return null;
        return (
          <SectionCard
            id="scrape-stats"
            title="Pages read"
            subtitle="Crawl totals from this enrichment run"
            icon={<IconRobot size={16} />}
          >
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">URLs read</p>
                <p className="mt-0.5 text-base font-bold text-slate-800">
                  {stats.urlsRead}
                  <span className="ml-1 text-xs font-medium text-slate-500">/ {stats.urlsAttempted}</span>
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bot walls detected</p>
                <p className="mt-0.5 text-base font-bold text-amber-700">{stats.botBlocked}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dropped</p>
                <p className="mt-0.5 text-base font-bold text-rose-700">{stats.dropped}</p>
              </div>
            </div>
          </SectionCard>
        );
      })()}

      {showOutreach && (
        <SectionCard
          id="outreach"
          title="Outreach"
          subtitle="Angles, openers, and fit narrative from research"
          icon={<IconSparkles size={16} />}
        >
          {outreachPanel}
        </SectionCard>
      )}

      {showCustom && (
        <SectionCard
          id="custom"
          title="Custom research"
          subtitle="Answers from agent custom questions"
          icon={<IconNotes size={16} />}
        >
          <div className="space-y-3">
            {customAnswers.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">{item.question}</p>
                  {item.confidence ? (
                    <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {item.confidence}%
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-slate-700">{item.answer}</p>

                {item.evidence?.[0]?.quote ? (
                  <p className="mt-2 border-l-2 border-slate-200 pl-2 text-xs italic text-slate-500">
                    “{item.evidence[0].quote}”
                  </p>
                ) : null}

                {item.status !== 'answered' ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    {item.searchesPerformed
                      ? `${item.searchesPerformed} search${item.searchesPerformed > 1 ? 'es' : ''} performed`
                      : 'No searches performed'}
                    {item.rejected?.length
                      ? ` · ${item.rejected.length} unrelated mention${item.rejected.length > 1 ? 's' : ''} rejected`
                      : ''}
                    {item.requiredEvidence?.[0] ? ` · needs ${item.requiredEvidence[0]}` : ''}
                  </p>
                ) : null}

                {item.sources?.[0] ? (
                  <a
                    href={item.sources[0]}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    Source
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard
        id="my-data"
        title="My data"
        subtitle="CRM fields you control — pipeline, notes, lists"
        icon={<IconNotes size={16} />}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Pipeline Stage
              </label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                value={lead.pipelineStage}
                onChange={(e) => void onPatch({ pipelineStage: e.target.value })}
                disabled={saving}
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Priority
              </label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
                value={lead.priority}
                onChange={(e) => void onPatch({ priority: e.target.value })}
                disabled={saving}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Category
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
              value={lead.category?.id ?? ''}
              onChange={(e) => void onPatch({ categoryId: e.target.value || null })}
              disabled={saving}
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes</label>
            <textarea
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none focus:border-blue-300 focus:bg-white"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add private notes…"
            />
            <button
              type="button"
              onClick={onSaveNotes}
              disabled={saving}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <IconLoader2 size={13} className="animate-spin" /> : <IconCheck size={13} />}
              Save notes
            </button>
          </div>

          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Lists</h3>
            <div className="mb-3 flex flex-wrap gap-2">
              {(lead.lists ?? []).map((l) => (
                <span
                  key={l.id}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700"
                >
                  {l.name}
                </span>
              ))}
              {(lead.lists ?? []).length === 0 && (
                <p className="text-xs text-slate-400">Not in any list.</p>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={listToAdd}
                onChange={(e) => setListToAdd(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                <option value="">Select list…</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onAddToList}
                disabled={!listToAdd}
                className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {(lead.activities ?? []).length > 0 && (
            <div>
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Activity
              </h3>
              <ul className="space-y-3">
                {lead.activities!.map((act) => (
                  <li key={act.id} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                      {act.type.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{act.title}</p>
                      {act.body && <p className="text-[11px] text-slate-500">{act.body}</p>}
                      <p className="mt-0.5 text-[10px] text-slate-400">{formatDate(act.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

