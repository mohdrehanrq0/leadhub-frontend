/**
 * Column-level filter definitions for the Lead grid.
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
    label: 'Email',
    allLabel: 'All emails',
    options: [
      { value: 'valid', label: 'Verified ✓' },
      { value: 'invalid', label: 'Invalid ✕' },
      { value: 'catch_all', label: 'Catch-all' },
      { value: 'disposable', label: 'Disposable' },
      { value: 'unknown', label: 'Not verified' },
    ],
  },
  enrichmentStatus: {
    label: 'Research',
    allLabel: 'All research status',
    options: [
      { value: 'completed', label: 'Complete' },
      { value: 'partial', label: 'Partial data' },
      { value: 'in_progress', label: 'In progress' },
      { value: 'failed', label: 'Failed' },
      { value: 'not_started', label: 'Not started' },
    ],
  },
  priority: {
    label: 'Priority',
    allLabel: 'All priorities',
    options: [
      { value: 'hot', label: '🔥 Hot' },
      { value: 'warm', label: '☀️ Warm' },
      { value: 'cold', label: '❄️ Cold' },
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
