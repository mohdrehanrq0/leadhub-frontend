export const PIPELINE_STAGES = [
  { value: 'new', label: 'New', tone: 'border-slate-200 bg-slate-50 text-slate-700' },
  { value: 'contacted', label: 'Contacted', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'qualified', label: 'Qualified', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'negotiation', label: 'Negotiation', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'won', label: 'Won', tone: 'border-green-200 bg-green-50 text-green-700' },
  { value: 'lost', label: 'Lost', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
] as const;

export const PRIORITIES = ['unknown', 'cold', 'warm', 'hot'] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number]['value'];
export type Priority = (typeof PRIORITIES)[number];

// ─── Enrichment Engine Types ─────────────────────────────────────

export type EnrichmentStatus = 'not_started' | 'in_progress' | 'completed' | 'partial' | 'failed';

export type EnrichmentStep =
  | 'identity_resolution'
  | 'company_fetch'
  | 'contact_enrichment'
  | 'email_verification'
  | 'ai_research'
  | 'ai_scoring'
  | 'intake'
  | 'query_planning'
  | 'search'
  | 'scrape_extract'
  | 'synthesis';

export type ResearchPhase = 'intake' | 'query_planning' | 'search' | 'scrape_extract' | 'synthesis';

export const RESEARCH_PHASES: ResearchPhase[] = [
  'intake',
  'query_planning',
  'search',
  'scrape_extract',
  'synthesis',
];

export type EnrichmentStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export type EnrichmentLog = {
  id: string;
  leadId: string;
  jobId: string;
  step: EnrichmentStep;
  status: EnrichmentStepStatus;
  message?: string | null;
  dataFound?: unknown;
  dataNotFound?: unknown;
  error?: string | null;
  errorCode?: string | null;
  duration?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

export type ResearchQueryStatus = 'pending' | 'running' | 'completed' | 'failed' | 'no_results';

export type ResearchQuery = {
  id: string;
  leadId: string;
  jobId: string;
  category: string;
  query: string;
  rationale?: string | null;
  priority: number;
  wave: number;
  status: ResearchQueryStatus;
  resultUrls?: string[];
  resultSnippets?: Array<{ url: string; title: string; snippet: string }>;
  selectedUrl?: string | null;
  error?: string | null;
  durationMs?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

export type ResearchActivity = {
  id: string;
  leadId: string;
  jobId: string;
  phase: ResearchPhase;
  type: string;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type AiIntelligenceField<T> = { value: T; confidence: number } | null;
export type ScoredField<T> = { value: T; score: number; confidence: number } | null;

export type AiIntelligenceData = {
  id: string;
  leadId: string;
  companyId?: string | null;
  companySummary?: AiIntelligenceField<string>;
  personSummary?: AiIntelligenceField<string>;
  painPoints?: AiIntelligenceField<string[]>;
  likelyChallenges?: AiIntelligenceField<string[]>;
  growthOpportunities?: AiIntelligenceField<string[]>;
  buyingIntent?: ScoredField<string>;
  recommendedOutreachAngle?: AiIntelligenceField<string>;
  personalizationNotes?: AiIntelligenceField<string[]>;
  personaAnalysis?: AiIntelligenceField<Record<string, unknown>>;
  productFit?: ScoredField<string>;
  buyingSignals?: AiIntelligenceField<string[]>;
  recentActivity?: AiIntelligenceField<string[]>;
  outreachInsights?: AiIntelligenceField<string[]>;
  suggestedEmailOpening?: AiIntelligenceField<string>;
  suggestedCta?: AiIntelligenceField<string>;
  icpBreakdown?: { score: number; matched: string[]; missing: string[] } | null;
  intentBreakdown?: { score: number; contributions: Array<{ signal: string; delta: number }> } | null;
  confidenceBreakdown?: {
    company: number;
    person: number;
    email: number;
    buyingIntent: number;
    painPoints: number;
    overall: number;
  } | null;
  recentCompanyEvents?: Array<{ type: string; label: string; dateHint?: string; sourceUrl?: string }> | null;
  companyLinkedInPosts?: Array<{ text: string; topics: string[]; engagementHint?: string | null; url?: string }> | null;
  personLinkedInPosts?: Array<{ text: string; topics: string[]; engagementHint?: string | null; url?: string }> | null;
  techChanges?: string[] | null;
  competitors?: string[] | null;
  existingTools?: Array<{ category: string; tools: string[] }> | null;
  websiteCtas?: string[] | null;
  idealBuyerPersona?: string[] | null;
  growthStage?: string | null;
  outreachObjections?: string[] | null;
  bestOutreachAngle?: AiIntelligenceField<string>;
  personalizationSnippets?: string[] | null;
  emailVariables?: {
    hook: string;
    problem: string;
    benefit: string;
    cta: string;
    proof: string;
    competitor: string;
    trigger: string;
  } | null;
  icpScore?: number | null;
  intentScore?: number | null;
  overallConfidence?: number | null;
  priority?: Priority | null;
  generatedAt: string;
  updatedAt: string;
};

export type EnrichedProfileField = {
  value: unknown;
  source: string;
  confidence: number;
  status: 'found' | 'not_found' | 'inferred';
  evidence?: Record<string, unknown>;
  lastUpdated: string;
};

export type CanonicalLeadProfile = {
  leadId: string;
  companyId?: string | null;
  contactId?: string | null;
  fields: Record<string, EnrichedProfileField>;
  registry: Array<{
    key: string;
    label: string;
    entityType: 'company' | 'contact' | 'lead';
    layer: 'verified' | 'ai' | 'user';
    fetchStrategy: string;
    requiredForEnrichment?: boolean;
  }>;
};

// ─── Lead types ──────────────────────────────────────────────────

export type LeadCategory = {
  id: string;
  name: string;
  color: string;
};

export type LeadList = {
  id: string;
  name: string;
  description?: string | null;
  leadCount?: number;
};

export type LeadRow = {
  id: string;
  status: string;
  pipelineStage: PipelineStage;
  priority: Priority;
  source: string;
  icpScore?: number | null;
  intentScore?: number | null;
  confidence?: number | null;
  apolloCategory?: string | null;
  notes?: string | null;
  createdAt: string;
  // Enrichment
  enrichmentStatus?: EnrichmentStatus | null;
  enrichmentJobId?: string | null;
  enrichmentError?: string | null;
  enrichmentStartedAt?: string | null;
  enrichmentCompletedAt?: string | null;
  category?: LeadCategory | null;
  company?: {
    id?: string | null;
    name?: string | null;
    domain?: string | null;
    website?: string | null;
    industry?: string | null;
    size?: string | null;
    foundedYear?: number | null;
    country?: string | null;
    city?: string | null;
    technologies?: string[];
    description?: string | null;
    products?: string[];
    services?: string[];
    socialLinks?: Record<string, string>;
    location?: { country?: string; city?: string } | null;
    sourceHistory?: Array<{ source: string; fields: string[]; pages?: string[]; at: string }>;
  } | null;
  contact?: {
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    otherEmails?: string[] | null;
    role?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
    emailVerificationStatus?: string | null;
    location?: string | null;
  } | null;
};

export function leadName(lead: LeadRow) {
  const first = lead.contact?.firstName ?? '';
  const last = lead.contact?.lastName ?? '';
  const full = `${first} ${last}`.trim();
  return full || lead.contact?.email || 'Unnamed contact';
}

export function leadCompanyName(lead: LeadRow) {
  const raw = (lead as LeadRow & { rawData?: Record<string, unknown> }).rawData;
  const fromRaw =
    typeof raw?.companyName === 'string'
      ? raw.companyName
      : typeof raw?.company === 'string'
        ? raw.company
        : '';
  return (lead.company?.name || fromRaw || '').trim();
}

export function leadLocation(lead: LeadRow) {
  const raw = (lead as LeadRow & { rawData?: Record<string, unknown> }).rawData;
  const fromRaw =
    typeof raw?.location === 'string'
      ? raw.location
      : [typeof raw?.city === 'string' ? raw.city : '', typeof raw?.country === 'string' ? raw.country : '']
          .filter(Boolean)
          .join(', ') ||
        (typeof raw?.companyLocation === 'string' ? raw.companyLocation : '');
  const locJson = lead.company?.location;
  const fromLocJson =
    locJson && typeof locJson === 'object'
      ? [locJson.city, locJson.country].filter(Boolean).join(', ')
      : '';
  const fromCompany = [lead.company?.city, lead.company?.country].filter(Boolean).join(', ');
  const fromContact = lead.contact?.location?.trim() ?? '';
  return (fromRaw || fromLocJson || fromCompany || fromContact || '').trim();
}

export function leadHasEnrichmentInput(lead: LeadRow) {
  return Boolean(leadCompanyName(lead) && leadLocation(lead));
}

/** Why enrichment is blocked — shown as a warning chip on lead cards. */
export function enrichmentBlockReason(lead: LeadRow): string | null {
  if (lead.enrichmentStatus === 'in_progress') return null;
  if (lead.enrichmentStatus === 'completed') return null;
  const missing: string[] = [];
  if (!leadCompanyName(lead)) missing.push('company name');
  if (!leadLocation(lead)) missing.push('location');
  if (!missing.length) return null;
  return `Missing ${missing.join(' + ')} — enrichment blocked`;
}

export function canEnrichLead(lead: LeadRow) {
  return lead.enrichmentStatus !== 'in_progress' && leadHasEnrichmentInput(lead);
}

export function canReEnrichLead(lead: LeadRow) {
  // Already enriched once — allow re-run even if location isn't on the list row
  if (lead.enrichmentStatus === 'completed') return true;
  return lead.enrichmentStatus === 'partial' && leadHasEnrichmentInput(lead);
}

export function stageMeta(stage: string) {
  return PIPELINE_STAGES.find((item) => item.value === stage) ?? PIPELINE_STAGES[0];
}

export function priorityTone(priority?: string) {
  if (priority === 'hot') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (priority === 'warm') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (priority === 'cold') return 'border-sky-200 bg-sky-50 text-sky-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

export function apolloCategoryLabel(category?: string | null) {
  if (category === 'net_new') return 'Net new';
  if (category === 'saved') return 'Saved';
  if (category === 'previously_contacted') return 'Contacted';
  return null;
}

export function enrichmentStatusMeta(status?: EnrichmentStatus | null) {
  switch (status) {
    case 'completed':
      return { label: 'Enriched', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: '✓' };
    case 'partial':
      return { label: 'Partial', tone: 'border-amber-200 bg-amber-50 text-amber-700', icon: '~' };
    case 'in_progress':
      return { label: 'Enriching…', tone: 'border-blue-200 bg-blue-50 text-blue-700', icon: '⟳' };
    case 'failed':
      return { label: 'Failed', tone: 'border-rose-200 bg-rose-50 text-rose-700', icon: '✕' };
    default:
      return { label: 'Not enriched', tone: 'border-slate-200 bg-slate-50 text-slate-500', icon: '○' };
  }
}

export const ENRICHMENT_STEP_LABELS: Record<EnrichmentStep, string> = {
  identity_resolution: 'Identity Resolution',
  company_fetch: 'Company Data',
  contact_enrichment: 'Contact Enrichment',
  email_verification: 'Email Verification',
  ai_research: 'AI Research',
  ai_scoring: 'AI Scoring',
  intake: 'Intake Analysis',
  query_planning: 'Query Planning',
  search: 'Parallel Search',
  scrape_extract: 'Scrape & Extract',
  synthesis: 'Synthesis',
};

export const ENRICHMENT_STEP_ICONS: Record<EnrichmentStep, string> = {
  identity_resolution: '🔎',
  company_fetch: '🏢',
  contact_enrichment: '👤',
  email_verification: '📧',
  ai_research: '🤖',
  ai_scoring: '⭐',
  intake: '📋',
  query_planning: '🎯',
  search: '🔍',
  scrape_extract: '🌐',
  synthesis: '✨',
};

export const RESEARCH_PHASE_LABELS: Record<ResearchPhase, string> = {
  intake: 'Intake Analysis',
  query_planning: 'Query Planning',
  search: 'Parallel Search',
  scrape_extract: 'Scrape & Extract',
  synthesis: 'Synthesis',
};

export const RESEARCH_PHASE_ICONS: Record<ResearchPhase, string> = {
  intake: '📋',
  query_planning: '🎯',
  search: '🔍',
  scrape_extract: '🌐',
  synthesis: '✨',
};

export function queryStatusTone(status: ResearchQueryStatus) {
  switch (status) {
    case 'completed':
      return 'text-emerald-600';
    case 'running':
      return 'text-blue-600';
    case 'failed':
      return 'text-rose-600';
    case 'no_results':
      return 'text-amber-600';
    default:
      return 'text-slate-500';
  }
}

