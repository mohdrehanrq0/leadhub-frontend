/**
 * Shapes returned by the enrichment read endpoints.
 *
 * These mirror the backend view models in `services/linkedin/linkedin-view.ts`
 * and the facts route. They are shared by the lead detail page and the capture
 * detail page so both screens show the same thing from the same contract.
 */

// ─── LinkedIn snapshot ───────────────────────────────────────────

export interface LinkedInRole {
  title?: string;
  company?: string;
  companyLinkedinUrl?: string;
  location?: string;
  dateRange?: string;
  duration?: string;
  description?: string;
  isCurrent: boolean;
}

export interface LinkedInSchool {
  school?: string;
  degree?: string;
  fieldOfStudy?: string;
  dateRange?: string;
}

export interface LinkedInPersonView {
  linkedinUrl?: string;
  publicIdentifier?: string;
  fullName?: string;
  headline?: string;
  about?: string;
  location?: string;
  country?: string;
  photo?: string;
  openToWork?: boolean;
  hiring?: boolean;
  premium?: boolean;
  verified?: boolean;
  connectionsCount?: number;
  followerCount?: number;
  topSkills: string[];
  skills: string[];
  languages: string[];
  certifications: Array<{ name?: string; authority?: string }>;
  honors: Array<{ title?: string; description?: string }>;
  experience: LinkedInRole[];
  education: LinkedInSchool[];
  fetchedAt?: string;
}

export interface LinkedInCompanyView {
  linkedinUrl?: string;
  universalName?: string;
  name?: string;
  tagline?: string;
  description?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  employeeRange?: string;
  followerCount?: number;
  foundedYear?: number;
  specialities: string[];
  headquarters?: string;
  locations: string[];
  logo?: string;
  phone?: string | { number?: string | null; extension?: string | null } | null;
  similarCompanies: Array<{ name?: string; linkedinUrl?: string; industry?: string }>;
  fetchedAt?: string;
}

export interface LinkedInColleagueView {
  fullName?: string;
  headline?: string;
  title?: string;
  location?: string;
  linkedinUrl?: string;
  photo?: string;
}

export interface LinkedInSnapshot {
  person?: LinkedInPersonView;
  company?: LinkedInCompanyView;
  colleagues: LinkedInColleagueView[];
  /** True when the person data is the extension's DOM read, not a full scrape. */
  personFromCapture: boolean;
}

// ─── Evidence facts ──────────────────────────────────────────────

export type FactTier = 'identity' | 'qualification' | 'buyer' | 'signal' | 'personalization';

export interface EnrichmentFact {
  id: string;
  tier: FactTier;
  fieldKey: string;
  value: unknown;
  confidence: number | null;
  sourceType: string | null;
  sourceUrl: string | null;
  evidenceText: string | null;
  observedAt: string | null;
  freshness: 'fresh' | 'stale' | 'unknown' | null;
  conflict: boolean | null;
  alternatives: Array<Record<string, unknown>> | null;
  status: 'candidate' | 'validated' | 'rejected';
  rejectedReason: string | null;
  /** How many times this exact claim was independently observed. */
  seenCount?: number;
}

/** Hostname only, for showing where a claim came from without the full url. */
export function sourceHost(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

export const FACT_TIER_LABEL: Record<FactTier, string> = {
  identity: 'Identity',
  qualification: 'Qualification',
  buyer: 'Buyer',
  signal: 'Signals',
  personalization: 'Personalization',
};

// ─── Hiring ──────────────────────────────────────────────────────

export interface OpenRole {
  title: string;
  department?: string;
  location?: string;
  postedDate?: string;
  url?: string;
}

// ─── Buying signals ──────────────────────────────────────────────

export interface BuyingSignalDetail {
  type?: string;
  label?: string;
  description?: string;
  weight?: number;
  evidence?: string;
  sourceUrl?: string;
  date?: string;
}

// ─── Canonical field tree (GET /api/leads/:id/profile) ───────────

export interface CanonicalField {
  value: unknown;
  source?: string;
  confidence?: number;
  status?: string;
  evidence?: Record<string, unknown>;
  lastUpdated?: string;
}

export type CanonicalFieldTree = Record<string, CanonicalField>;

/** Reads one key out of the canonical tree with a runtime type guard. */
export function fieldValue<T>(
  tree: CanonicalFieldTree | null | undefined,
  key: string,
  guard: (value: unknown) => value is T,
): T | undefined {
  const value = tree?.[key]?.value;
  return guard(value) ? value : undefined;
}

export function isObjectArray(value: unknown): value is Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
