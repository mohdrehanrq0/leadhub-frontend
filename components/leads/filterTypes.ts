import type { PipelineStage } from './types';

export type ExtraFilterField =
  | 'hasEmail'
  | 'hasWebsite'
  | 'location'
  | 'role'
  | 'priority'
  | 'enrichmentStatus'
  | 'emailVerificationStatus';

export type ExtraFilterChip = {
  id: string;
  field: ExtraFilterField;
  /** For boolean fields: 'true' | 'false'. For text: free string. For enums: option value. */
  value: string;
};

export type LeadQueryFilters = {
  stage: 'all' | PipelineStage;
  priority: 'all' | 'hot' | 'warm' | 'cold' | 'unknown';
  source: string;
  categoryId: string;
  listId: string;
  enrichmentStatus: string;
  /** Contact email verification: all | valid | invalid | catch_all | disposable | unknown */
  emailVerificationStatus: string;
  query: string;
  extras: ExtraFilterChip[];
};

export const PAGE_SIZE = 50;
export const BULK_CHUNK = 500;
export const ENRICH_CHUNK = 100;

export function buildLeadSearchParams(
  filters: LeadQueryFilters,
  pagination?: { limit: number; offset: number },
): URLSearchParams {
  const params = new URLSearchParams();
  if (pagination) {
    params.set('limit', String(pagination.limit));
    params.set('offset', String(pagination.offset));
  }
  if (filters.stage !== 'all') params.set('pipelineStage', filters.stage);
  if (filters.priority !== 'all') params.set('priority', filters.priority);
  if (filters.source !== 'all') params.set('source', filters.source);
  if (filters.categoryId !== 'all') params.set('categoryId', filters.categoryId);
  if (filters.listId !== 'all') params.set('listId', filters.listId);
  if (filters.enrichmentStatus !== 'all') params.set('enrichmentStatus', filters.enrichmentStatus);
  if (filters.emailVerificationStatus !== 'all') {
    params.set('emailVerificationStatus', filters.emailVerificationStatus);
  }
  if (filters.query.trim()) params.set('q', filters.query.trim());

  for (const chip of filters.extras) {
    if (chip.field === 'hasEmail' || chip.field === 'hasWebsite') {
      params.set(chip.field, chip.value === 'true' ? 'true' : 'false');
    } else if (chip.field === 'location' || chip.field === 'role') {
      if (chip.value.trim()) params.set(chip.field, chip.value.trim());
    } else if (chip.field === 'priority' && chip.value) {
      // Extra priority chip only applies when quick dropdown is "all"
      if (filters.priority === 'all') params.set('priority', chip.value);
    } else if (chip.field === 'enrichmentStatus' && chip.value) {
      if (filters.enrichmentStatus === 'all') params.set('enrichmentStatus', chip.value);
    } else if (chip.field === 'emailVerificationStatus' && chip.value) {
      if (filters.emailVerificationStatus === 'all') {
        params.set('emailVerificationStatus', chip.value);
      }
    }
  }

  return params;
}

export function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

export function companyDomainFromLead(domain?: string | null, website?: string | null): string | null {
  if (domain?.trim()) return domain.trim().replace(/^www\./, '');
  if (!website?.trim()) return null;
  try {
    const host = new URL(website.startsWith('http') ? website : `https://${website}`).hostname;
    return host.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

export function faviconUrlForDomain(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

export function companyUrlHref(domain?: string | null, website?: string | null): string | null {
  if (website?.trim()) {
    return website.startsWith('http') ? website.trim() : `https://${website.trim()}`;
  }
  if (domain?.trim()) return `https://${domain.trim()}`;
  return null;
}

export const EXTRA_FILTER_OPTIONS: Array<{ field: ExtraFilterField; label: string }> = [
  { field: 'hasEmail', label: 'Has email' },
  { field: 'emailVerificationStatus', label: 'Email verification is' },
  { field: 'hasWebsite', label: 'Has company URL' },
  { field: 'location', label: 'Location contains' },
  { field: 'role', label: 'Role contains' },
  { field: 'priority', label: 'Priority is' },
  { field: 'enrichmentStatus', label: 'Enrichment is' },
];
