import type { FetchStats, ResearchActivity } from '../components/leads/types';

export type IdentityNote = {
  headline: string;
  reasons: string[];
};

const BLOCK_REASON_LABELS: Record<string, string> = {
  missing_valid_company_domain: 'No verified company website or domain was found',
  insufficient_entity_confidence: 'Entity confidence was too low to lock company identity',
  dropped_document_or_directory_website:
    'The discovered website was a directory or document page, not the company site',
  dropped_invalid_domain: 'The discovered domain was invalid or not a real company domain',
  dropped_mismatched_linkedin: 'The LinkedIn company page did not match the intake company name',
  prior_scrape_rejection: 'An earlier scrape contradicted the company name from intake',
  scrape_identity_rejected: 'Scraped page content contradicted the company name from intake',
  description_name_contradiction: 'Company description contradicted the intake name',
  linkedin_slug_mismatch: 'LinkedIn URL slug did not match the company name',
  website_linkedin_pair_unanchored:
    'Website and LinkedIn could not be anchored to the same company',
  company_not_found: 'Company could not be located in search or scrape results',
  company_identity_unvalidated: 'Company identity did not pass validation',
  insufficient_entity_confidence_gap: 'Not enough reliable evidence to confirm this company',
};

const GAP_LABELS: Record<string, string> = {
  company_not_found: 'Company could not be located in search results',
  missing_valid_company_domain: 'No verified company website or domain',
  company_identity_unvalidated: 'Company identity was not fully validated',
  insufficient_entity_confidence: 'Not enough reliable evidence to confirm this company',
  website: 'Company website',
  company_linkedin: 'Company LinkedIn',
  decision_maker: 'Decision-maker name',
  person_linkedin: 'Founder / decision-maker LinkedIn',
  contact_email: 'Contact email',
  recent_activity: 'Recent company activity',
};

function formatBlockReasonCode(code: string): string | null {
  if (BLOCK_REASON_LABELS[code]) return BLOCK_REASON_LABELS[code];

  // Emitted by the LinkedIn company step, which carries the conflicting values.
  const websiteMismatch = /^linkedin_website_mismatch:(.+)_vs_(.+)$/.exec(code);
  if (websiteMismatch) {
    return `The LinkedIn company page links to ${websiteMismatch[1]}, not ${websiteMismatch[2]}`;
  }

  const nameMismatch = /^linkedin_name_mismatch:(.+)_vs_(.+)$/.exec(code);
  if (nameMismatch) {
    return `The LinkedIn company is named "${nameMismatch[1]}", not "${nameMismatch[2]}"`;
  }

  const signalMatch = /^insufficient_signals_(\d+)_of_(\d+)$/.exec(code);
  if (signalMatch) {
    const found = signalMatch[1];
    const required = signalMatch[2];
    return `Only ${found} of ${required} required identity signals matched (need at least ${required} agreeing signals)`;
  }

  if (GAP_LABELS[code]) return GAP_LABELS[code];

  return null;
}

function reasonsFromActivities(activities: ResearchActivity[]): string[] {
  const blocked = activities.find(
    (a) =>
      a.title?.startsWith('Identity blocked') ||
      a.title?.includes('Rejected company identity') ||
      a.metadata?.pass === false,
  );
  if (!blocked) return [];

  const fromMeta = Array.isArray(blocked.metadata?.blockReasons)
    ? (blocked.metadata.blockReasons as string[])
    : [];
  const formatted = fromMeta
    .map(formatBlockReasonCode)
    .filter((r): r is string => Boolean(r));

  if (formatted.length) return formatted;

  if (blocked.body?.includes('Reasons:')) {
    const tail = blocked.body.split('Reasons:')[1]?.split('. Signals')[0]?.trim();
    if (tail) {
      return tail
        .split(';')
        .map((part) => formatBlockReasonCode(part.trim()) ?? part.trim())
        .filter(Boolean);
    }
  }

  if (blocked.title?.startsWith('Identity blocked —')) {
    const tail = blocked.title.replace(/^Identity blocked —\s*/, '').trim();
    if (tail && tail !== 'insufficient signals') {
      return tail
        .split(',')
        .map((part) => formatBlockReasonCode(part.trim()) ?? part.trim())
        .filter(Boolean);
    }
  }

  return blocked.body ? [blocked.body] : [];
}

function reasonsFromFetchStats(fetchStats?: FetchStats | null): string[] {
  if (!fetchStats || fetchStats.botBlocked <= 0) return [];
  const suffix =
    fetchStats.urlsAttempted > 0
      ? ` (${fetchStats.botBlocked} of ${fetchStats.urlsAttempted} URLs)`
      : '';
  return [`Website fetch was blocked by bot protection${suffix}`];
}

const IDENTITY_GAP_CODES = new Set([
  'company_not_found',
  'missing_valid_company_domain',
  'company_identity_unvalidated',
  'insufficient_entity_confidence',
  'website',
  'company_linkedin',
]);

function reasonsFromGaps(gapsRemaining: string[], blockReasons: string[]): string[] {
  const knownCodes = new Set([...blockReasons, ...Object.keys(BLOCK_REASON_LABELS)]);
  return gapsRemaining
    .filter((gap) => IDENTITY_GAP_CODES.has(gap) && !knownCodes.has(gap))
    .map((gap) => formatBlockReasonCode(gap) ?? GAP_LABELS[gap])
    .filter((r): r is string => Boolean(r));
}

function dedupeReasons(reasons: string[]): string[] {
  return [...new Set(reasons.filter(Boolean))];
}

export function buildIdentityNote(params: {
  companyNotFound: boolean;
  identityUnvalidated: boolean;
  blockReasons?: string[];
  gapsRemaining?: string[];
  fetchStats?: FetchStats | null;
  researchActivities?: ResearchActivity[];
}): IdentityNote | null {
  const {
    companyNotFound,
    identityUnvalidated,
    blockReasons = [],
    gapsRemaining = [],
    fetchStats,
    researchActivities = [],
  } = params;

  if (!companyNotFound && !identityUnvalidated) return null;

  const headline = companyNotFound
    ? 'Company identity could not be locked — ICP/intent narrative was abstained so we do not invent a company profile.'
    : 'Company identity was not fully validated — treat outreach scores as low-confidence.';

  const reasons: string[] = [];

  for (const code of blockReasons) {
    const label = formatBlockReasonCode(code);
    if (label && code !== 'description_brand_mismatch_soft') reasons.push(label);
  }

  reasons.push(...reasonsFromGaps(gapsRemaining, blockReasons));

  reasons.push(...reasonsFromFetchStats(fetchStats));

  if (!reasons.length) {
    reasons.push(...reasonsFromActivities(researchActivities));
  }

  if (companyNotFound && !reasons.length) {
    reasons.push(
      'Enrichment could not tie intake name and location to a verified website, domain, or matching LinkedIn company page.',
    );
  }

  const footer = companyNotFound
    ? 'Contact and email facts from enrichment may still appear under Verify.'
    : null;

  const unique = dedupeReasons(reasons);
  if (footer) unique.push(footer);

  return { headline, reasons: unique };
}

export function identityNoteToPlainText(note: IdentityNote | null | undefined): string | null {
  if (!note) return null;
  if (!note.reasons.length) return note.headline;
  return `${note.headline} ${note.reasons.join(' ')}`;
}
