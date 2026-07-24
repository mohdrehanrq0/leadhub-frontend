/**
 * Column-level filter definitions for the Lead CRM grid.
 * Filters map to server query params via LeadQueryFilters.
 */

export type ColumnFilterKey = 'emailVerificationStatus' | 'enrichmentStatus' | 'priority';

export type ColumnFilterOption = {
  value: string;
  label: string;
};

export const COLUMN_FILTER_CONFIG: Record<
  ColumnFilterKey,
  { label: string; allLabel: string; options: ColumnFilterOption[] }
> = {
  emailVerificationStatus: {
    label: 'Verify',
    allLabel: 'All verification',
    options: [
      { value: 'valid', label: 'Valid email' },
      { value: 'invalid', label: 'Invalid' },
      { value: 'catch_all', label: 'Catch-all' },
      { value: 'disposable', label: 'Disposable' },
      { value: 'unknown', label: 'Unknown / unverified' },
    ],
  },
  enrichmentStatus: {
    label: 'Enrichment',
    allLabel: 'All enrichment',
    options: [
      { value: 'completed', label: 'Fully enriched' },
      { value: 'partial', label: 'Partial' },
      { value: 'in_progress', label: 'Enriching…' },
      { value: 'failed', label: 'Failed' },
      { value: 'not_started', label: 'Not enriched' },
    ],
  },
  priority: {
    label: 'Priority',
    allLabel: 'All priority',
    options: [
      { value: 'hot', label: 'Hot' },
      { value: 'warm', label: 'Warm' },
      { value: 'cold', label: 'Cold' },
      { value: 'unknown', label: 'Unknown' },
    ],
  },
};

/** Map LeadsColumnId → filter key when the column supports filtering. */
export const COLUMN_ID_TO_FILTER: Partial<Record<string, ColumnFilterKey>> = {
  verify: 'emailVerificationStatus',
  enrichment: 'enrichmentStatus',
  priority: 'priority',
};
