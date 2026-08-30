export type CaptureType = 'profile' | 'post' | 'company' | 'other';
export type CaptureStatus = 'saved' | 'linked' | 'enriching' | 'enriched' | 'failed';

export interface CapturedExperience {
  title?: string;
  company?: string;
  companyProfileUrl?: string;
  dateRange?: string;
  location?: string;
  isCurrent?: boolean;
}

export interface CapturedPerson {
  profileUrl?: string;
  fullName?: string;
  headline?: string;
  location?: string;
  about?: string;
  connectionDegree?: string;
  avatarUrl?: string;
  currentPosition?: CapturedExperience;
  experience?: CapturedExperience[];
}

export type CaptureGapField =
  | 'companyName'
  | 'companyLinkedinUrl'
  | 'website'
  | 'domain'
  | 'industry'
  | 'employeeCount'
  | 'location'
  | 'description'
  | 'foundedYear';

/** A field LinkedIn did not carry, with the reason it is missing. */
export interface CaptureDataGap {
  field: CaptureGapField;
  label: string;
  reason: string;
  severity: 'blocking' | 'warning' | 'info';
}

export interface CaptureCurrentRole {
  title?: string;
  dateRange?: string;
  location?: string;
  source: 'current_position' | 'experience' | 'headline' | 'manual';
}

export type CaptureDomainSource = 'linkedin_company' | 'known_company' | 'web_search' | 'manual';

/**
 * Everything read from the company's own website, after LinkedIn.
 *
 * Arrives as `pending` while the background chain is still running, so the
 * card can show a placeholder instead of an empty section.
 */
export interface CaptureCompanyProfile {
  status: 'pending' | 'ready' | 'failed' | 'skipped';
  message: string;
  fetchedAt?: string;
  website?: string;
  tagline?: string;
  description?: string;
  industry?: string;
  subIndustry?: string;
  businessModel?: string;
  companyStage?: string;
  size?: string;
  foundedYear?: number;
  estimatedRevenue?: string;
  headquarters?: string;
  products?: string[];
  services?: string[];
  technologies?: string[];
  targetAudience?: string[];
  valueProposition?: string;
  socialLinks?: Record<string, string>;
  contactInfo?: Record<string, unknown>;
  sourcePages?: string[];
}

/** Employer resolved from the captured LinkedIn profile or post. */
export interface CaptureCompanyResolution {
  status: 'resolved' | 'partial' | 'unresolved';
  source: 'linkedin_company' | 'capture_dom' | 'headline' | 'manual' | null;
  resolvedAt: string;
  message: string;
  fromLinkedIn: boolean;
  fromCache?: boolean;
  currentRole?: CaptureCurrentRole;
  companyLinkedinUrl?: string;
  name?: string;
  domain?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  sizeLabel?: string;
  location?: string;
  description?: string;
  foundedYear?: number;
  specialities?: string[];
  domainSource?: CaptureDomainSource;
  profile?: CaptureCompanyProfile;
  /** True when the person's profile had to be scraped to find their employer. */
  personScraped?: boolean;
}

/** Labels for how a domain was found, so a searched-for one is never mistaken for fact. */
export const DOMAIN_SOURCE_LABEL: Record<CaptureDomainSource, string> = {
  linkedin_company: 'From LinkedIn',
  known_company: 'Known company',
  web_search: 'Found by search',
  manual: 'Entered manually',
};

/**
 * True while the background chain still owes this capture data.
 *
 * Drives polling: a capture sits in `saved` the whole time its company is
 * being worked out, so status alone cannot tell the page to keep refreshing.
 */
export function isEnrichmentPending(capture: {
  status: CaptureStatus;
  companyResolution: CaptureCompanyResolution | null;
}): boolean {
  if (capture.status === 'enriching') return true;
  if (!capture.companyResolution) return capture.status === 'saved';
  return capture.companyResolution.profile?.status === 'pending';
}

export interface CaptureListRow {
  id: string;
  type: CaptureType;
  status: CaptureStatus;
  url: string;
  personName: string | null;
  personProfileUrl: string | null;
  headline: string | null;
  positionTitle: string | null;
  companyName: string | null;
  companyProfileUrl: string | null;
  location: string | null;
  postText: string | null;
  companyResolution: CaptureCompanyResolution | null;
  dataGaps: CaptureDataGap[] | null;
  leadId: string | null;
  error: string | null;
  capturedAt: string;
  leadEnrichmentStatus: string | null;
}

export interface CaptureDetail extends CaptureListRow {
  personSnapshot: CapturedPerson | null;
  postPublishedAt: string | null;
  postMedia: Array<{ type: string; url?: string; alt?: string }> | null;
  postMetrics: { reactions?: number; comments?: number; reposts?: number } | null;
  sourceContext: Record<string, unknown> | null;
  note: string | null;
  enrichmentJobId: string | null;
}

export const CAPTURE_STATUS_STYLE: Record<CaptureStatus, { label: string; className: string }> = {
  saved: { label: 'Saved', className: 'border-slate-200 bg-slate-50 text-slate-600' },
  linked: { label: 'In CRM', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  enriching: { label: 'Enriching', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  enriched: { label: 'Enriched', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  failed: { label: 'Failed', className: 'border-red-200 bg-red-50 text-red-700' },
};

export const RESOLUTION_STYLE: Record<
  CaptureCompanyResolution['status'],
  { label: string; className: string }
> = {
  resolved: {
    label: 'Company resolved',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  partial: {
    label: 'Partial company data',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  unresolved: {
    label: 'Company not found',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
};

export const GAP_SEVERITY_STYLE: Record<
  CaptureDataGap['severity'],
  { className: string; dot: string }
> = {
  blocking: { className: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' },
  warning: { className: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  info: { className: 'border-slate-200 bg-slate-50 text-slate-600', dot: 'bg-slate-400' },
};

/** Index gaps by field so a value cell can render its own warning badge. */
export function gapsByField(gaps: CaptureDataGap[] | null | undefined) {
  const map = new Map<CaptureGapField, CaptureDataGap>();
  for (const gap of gaps ?? []) map.set(gap.field, gap);
  return map;
}

/** True when the capture cannot become a lead yet. */
export function hasBlockingGap(gaps: CaptureDataGap[] | null | undefined): boolean {
  return (gaps ?? []).some((gap) => gap.severity === 'blocking');
}

export function formatCapturedAt(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffHours = diffMs / 3_600_000;
  if (diffHours < 1) return `${Math.max(1, Math.round(diffMs / 60_000))}m ago`;
  if (diffHours < 24) return `${Math.round(diffHours)}h ago`;
  return date.toLocaleDateString();
}
