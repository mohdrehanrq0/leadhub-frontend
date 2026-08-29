export type SystemFieldKey =
  | 'contact.firstName'
  | 'contact.lastName'
  | 'contact.fullName'
  | 'contact.email'
  | 'contact.role'
  | 'contact.phone'
  | 'contact.linkedinUrl'
  | 'contact.location'
  | 'company.name'
  | 'company.domain'
  | 'company.linkedin'
  | 'notes'
  | 'enrichment.researchGoal'
  | 'enrichment.intentPack'
  | 'enrichment.personTarget';

export type FieldMapping = Partial<Record<SystemFieldKey, string>>;

export interface SystemFieldDefinition {
  key: SystemFieldKey;
  label: string;
  group: 'contact' | 'company' | 'other';
  requiredForImport?: boolean;
  requiredForEnrichment?: boolean;
  recommendedForEnrichment?: boolean;
  /** Identifies a company on its own, so mapping it makes a row importable. */
  isAnchor?: boolean;
  aliases: string[];
}


export const SYSTEM_FIELDS: SystemFieldDefinition[] = [
  {
    key: 'company.domain',
    label: 'Company Website / Domain',
    group: 'company',
    // The website is what turns enrichment from a guess into a lookup.
    requiredForEnrichment: true,
    isAnchor: true,
    aliases: ['domain', 'website', 'company website', 'company domain', 'url', 'website url', 'primary_domain', 'website_url'],
  },
  {
    key: 'company.name',
    label: 'Company Name',
    group: 'company',
    requiredForImport: true,
    isAnchor: true,
    aliases: ['company', 'company name', 'organization', 'account', 'org', 'company_name', 'organization_name', 'employer'],
  },
  {
    key: 'contact.location',
    label: 'Location',
    group: 'contact',
    // Not required. A wrong location actively hurts company matching, so it is
    // only used to break ties when the company has to be discovered by name.
    aliases: ['location', 'city', 'address', 'country', 'region', 'present address', 'present_raw_address', 'company location', 'headquarters'],
  },
  {
    key: 'contact.firstName',
    label: 'First Name',
    group: 'contact',
    aliases: ['first name', 'firstname', 'first', 'given name', 'first_name'],
  },
  {
    key: 'contact.lastName',
    label: 'Last Name',
    group: 'contact',
    aliases: ['last name', 'lastname', 'last', 'surname', 'family name', 'last_name'],
  },
  {
    key: 'contact.fullName',
    label: 'Full Name',
    group: 'contact',
    // Optional — research agent finds decision-makers when missing.
    // Avoid bare "name" alias so it does not steal "company name".
    aliases: ['full name', 'contact name', 'contactname', 'person name', 'personname', 'contact_name', 'person_name'],
  },
  {
    key: 'contact.email',
    label: 'Email',
    group: 'contact',
    recommendedForEnrichment: true,
    aliases: ['email', 'work email', 'business email', 'email address', 'work_email', 'contact email'],
  },
  {
    key: 'contact.role',
    label: 'Job Title / Role',
    group: 'contact',
    recommendedForEnrichment: true,
    aliases: ['role', 'title', 'job title', 'position', 'headline', 'job_title', 'contact role', 'contactrole'],
  },
  {
    key: 'contact.phone',
    label: 'Phone',
    group: 'contact',
    aliases: ['phone', 'mobile', 'phone number', 'telephone', 'cell', 'phone_number'],
  },
  {
    key: 'contact.linkedinUrl',
    label: 'LinkedIn URL',
    group: 'contact',
    recommendedForEnrichment: true,
    aliases: ['linkedin', 'linkedin url', 'linkedin profile', 'profile url', 'linkedin_url', 'person linkedin'],
  },
  {
    key: 'company.linkedin',
    label: 'Company LinkedIn',
    group: 'company',
    // Unlocks person discovery without first hunting for the company page.
    recommendedForEnrichment: true,
    isAnchor: true,
    aliases: ['company linkedin', 'linkedin company', 'company_linkedin', 'organization linkedin'],
  },
  {
    key: 'notes',
    label: 'Notes',
    group: 'other',
    aliases: ['notes', 'note', 'comments', 'description'],
  },
  {
    key: 'enrichment.researchGoal',
    label: 'Research Goal',
    group: 'other',
    aliases: ['research goal', 'researchgoal', 'outreach purpose', 'goal'],
  },
  {
    key: 'enrichment.intentPack',
    label: 'Enrichment Pack',
    group: 'other',
    aliases: ['enrichment pack', 'intent pack', 'person pack', 'find', 'target pack'],
  },
  {
    key: 'enrichment.personTarget',
    label: 'Person Target',
    group: 'other',
    aliases: ['person target', 'target role', 'find person', 'role target', 'person_target'],
  },
];

/** Columns that identify a company, and so make an import viable. */
export const ANCHOR_FIELDS: SystemFieldKey[] = SYSTEM_FIELDS.filter((f) => f.isAnchor).map(
  (f) => f.key,
);

export interface DetectedMapping {
  mapping: FieldMapping;
  confidence: Partial<Record<SystemFieldKey, 'high' | 'medium' | 'low'>>;
  unmappedSources: string[];
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function scoreMatch(source: string, alias: string) {
  const normalizedSource = normalizeHeader(source);
  const normalizedAlias = normalizeHeader(alias);
  if (normalizedSource === normalizedAlias) return 100;
  if (normalizedSource.replace(/\s/g, '') === normalizedAlias.replace(/\s/g, '')) return 95;
  if (normalizedSource.includes(normalizedAlias) || normalizedAlias.includes(normalizedSource)) return 70;
  return 0;
}

export function detectFieldMapping(sourceFields: string[]): DetectedMapping {
  const mapping: FieldMapping = {};
  const confidence: DetectedMapping['confidence'] = {};
  const usedSources = new Set<string>();

  for (const field of SYSTEM_FIELDS) {
    let bestSource: string | undefined;
    let bestScore = 0;

    for (const source of sourceFields) {
      if (usedSources.has(source)) continue;
      for (const alias of field.aliases) {
        const score = scoreMatch(source, alias);
        if (score > bestScore) {
          bestScore = score;
          bestSource = source;
        }
      }
      const directScore = scoreMatch(source, field.key.split('.').pop() ?? field.key);
      if (directScore > bestScore) {
        bestScore = directScore;
        bestSource = source;
      }
    }

    if (bestSource && bestScore >= 70) {
      mapping[field.key] = bestSource;
      confidence[field.key] = bestScore >= 95 ? 'high' : bestScore >= 85 ? 'medium' : 'low';
      usedSources.add(bestSource);
    }
  }

  const unmappedSources = sourceFields.filter((source) => !usedSources.has(source));
  return { mapping, confidence, unmappedSources };
}

function readMappedValue(row: Record<string, unknown>, mapping: FieldMapping, key: SystemFieldKey) {
  const sourceKey = mapping[key];
  if (!sourceKey) return undefined;
  const value = row[sourceKey];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number') return String(value);
  return undefined;
}

function splitFullName(fullName?: string) {
  if (!fullName) return { firstName: undefined, lastName: undefined };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: undefined };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export interface MappedLeadInput {
  company: {
    name?: string;
    domain?: string;
    linkedin?: string;
    location?: string;
  };
  contact: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    phone?: string;
    linkedinUrl?: string;
    location?: string;
  };
  notes?: string;
  tags?: string[];
  rawData?: Record<string, unknown>;
}

export function applyFieldMapping(
  row: Record<string, unknown>,
  mapping: FieldMapping,
): MappedLeadInput {
  const fullName = readMappedValue(row, mapping, 'contact.fullName');
  const split = splitFullName(fullName);

  const firstName = readMappedValue(row, mapping, 'contact.firstName') ?? split.firstName;
  const lastName = readMappedValue(row, mapping, 'contact.lastName') ?? split.lastName;
  const location = readMappedValue(row, mapping, 'contact.location');

  const companyLinkedin = readMappedValue(row, mapping, 'company.linkedin');
  const companyName = readMappedValue(row, mapping, 'company.name');
  const companyDomain = readMappedValue(row, mapping, 'company.domain');

  // Normalize keys enrichment eligibility + intake always look for
  const rawData: Record<string, unknown> = { ...row };
  if (companyLinkedin) rawData.companyLinkedin = companyLinkedin;
  if (companyName) {
    rawData.companyName = companyName;
    rawData.company = companyName;
  }
  if (companyDomain) {
    rawData.domain = companyDomain;
    rawData.website = companyDomain;
  }
  if (location) {
    rawData.location = location;
    rawData.companyLocation = location;
  }

  const researchGoal = readMappedValue(row, mapping, 'enrichment.researchGoal');
  const intentPack = readMappedValue(row, mapping, 'enrichment.intentPack');
  const personTarget = readMappedValue(row, mapping, 'enrichment.personTarget');
  if (researchGoal) rawData.researchGoal = researchGoal;
  if (intentPack) rawData.intentPack = intentPack;
  if (personTarget) {
    rawData.roleHint = personTarget;
    if (!intentPack) rawData.intentPack = 'custom';
  }

  return {
    company: {
      name: companyName,
      domain: companyDomain,
      linkedin: companyLinkedin,
      location,
    },
    contact: {
      firstName,
      lastName,
      email: readMappedValue(row, mapping, 'contact.email'),
      role: readMappedValue(row, mapping, 'contact.role'),
      phone: readMappedValue(row, mapping, 'contact.phone'),
      linkedinUrl: readMappedValue(row, mapping, 'contact.linkedinUrl'),
      location,
    },
    notes: readMappedValue(row, mapping, 'notes'),
    rawData,
  };
}

const FREE_EMAIL_HOSTS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'ymail.com',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'yandex.ru',
  'gmx.com',
  'gmx.net',
  'web.de',
  'rediffmail.com',
  'qq.com',
  '163.com',
  'naver.com',
]);

/** The company domain implied by an email, or undefined for consumer mail. */
export function companyDomainFromEmail(email?: string) {
  const host = email?.split('@')[1]?.trim().toLowerCase().replace(/^www\./, '');
  if (!host?.includes('.')) return undefined;
  return FREE_EMAIL_HOSTS.has(host) ? undefined : host;
}

/**
 * Input tiers, mirroring the backend contract.
 *
 * The website is the dividing line: with one, the company is identified and
 * research is a lookup; without one, it has to be discovered, which costs more
 * and can fail outright.
 */
export type InputTier = 'rejected' | 'discovery' | 'base' | 'medium' | 'good';

export const TIER_LABEL: Record<InputTier, string> = {
  rejected: 'Cannot enrich',
  discovery: 'Needs discovery',
  base: 'Ready',
  medium: 'Good',
  good: 'Complete',
};

export interface EnrichmentReadiness {
  tier: InputTier;
  /** True when this row can be enriched without a discovery opt-in. */
  enrichable: boolean;
  /** Why it is not higher, in one sentence. */
  reason: string;
  /** The single most valuable column to add. */
  nextBestField?: string;
  missingRecommended: string[];
}

export function assessEnrichmentReadiness(row: MappedLeadInput): EnrichmentReadiness {
  const domain = row.company.domain?.trim() || companyDomainFromEmail(row.contact.email?.trim());
  const companyLinkedin = row.company.linkedin?.trim();
  const companyName = row.company.name?.trim();
  const personName = [row.contact.firstName, row.contact.lastName].filter(Boolean).join(' ').trim();

  const missingRecommended: string[] = [];
  if (!row.contact.email?.trim()) missingRecommended.push('Email');
  if (!row.contact.role?.trim()) missingRecommended.push('Job Title');

  if (!domain && !companyLinkedin && !companyName) {
    return {
      tier: 'rejected',
      enrichable: false,
      reason: 'No company website, LinkedIn URL, or name — nothing to identify the company.',
      nextBestField: 'Company Website / Domain',
      missingRecommended,
    };
  }

  if (!domain && !companyLinkedin) {
    return {
      tier: 'discovery',
      enrichable: false,
      reason: 'Company name only — the website has to be found first, which costs more and can fail.',
      nextBestField: 'Company Website / Domain',
      missingRecommended,
    };
  }

  if (!companyLinkedin) {
    return {
      tier: 'base',
      enrichable: true,
      reason: 'Company website known, so research starts immediately.',
      nextBestField: 'Company LinkedIn',
      missingRecommended,
    };
  }

  if (!personName) {
    return {
      tier: 'medium',
      enrichable: true,
      reason: 'Website and company LinkedIn known, so people can be searched directly.',
      nextBestField: 'Full Name',
      missingRecommended,
    };
  }

  return {
    tier: 'good',
    enrichable: true,
    reason: 'Company and person both identified.',
    missingRecommended,
  };
}

/**
 * Whether a row can be imported at all. Contact fragments with no company are
 * rejected here rather than importing as leads that can never be enriched.
 */
export function isUsableMappedLead(row: MappedLeadInput) {
  return assessEnrichmentReadiness(row).tier !== 'rejected';
}

/** True once the mapping includes at least one column that names a company. */
export function mappingHasAnchor(mapping: FieldMapping) {
  return ANCHOR_FIELDS.some((key) => Boolean(mapping[key]));
}

export const APOLLO_DEFAULT_MAPPING: FieldMapping = {
  'contact.fullName': 'contactName',
  'contact.email': 'email',
  'contact.role': 'contactRole',
  'contact.linkedinUrl': 'linkedinUrl',
  'contact.location': 'location',
  'company.name': 'companyName',
  'company.domain': 'domain',
};

export function getDefaultMappingForSource(source: 'csv' | 'apollo' | 'apify', sourceFields: string[]) {
  if (source === 'apollo') return { mapping: { ...APOLLO_DEFAULT_MAPPING }, confidence: {}, unmappedSources: [] };
  return detectFieldMapping(sourceFields);
}

export interface ReadinessSummary {
  byTier: Record<InputTier, number>;
  /** Rows that can be enriched right away (base and above). */
  ready: number;
  /** Rows that need the discovery opt-in. */
  needsDiscovery: number;
  /** Rows that cannot be imported at all. */
  rejected: number;
  total: number;
}

export function summarizeReadiness(rows: MappedLeadInput[]): ReadinessSummary {
  const byTier: Record<InputTier, number> = {
    rejected: 0,
    discovery: 0,
    base: 0,
    medium: 0,
    good: 0,
  };

  for (const row of rows) {
    byTier[assessEnrichmentReadiness(row).tier] += 1;
  }

  return {
    byTier,
    ready: byTier.base + byTier.medium + byTier.good,
    needsDiscovery: byTier.discovery,
    rejected: byTier.rejected,
    total: rows.length,
  };
}

// Website leads the template because it is the column that decides whether
// enrichment can run at all.
export const CSV_TEMPLATE_HEADERS = [
  'Domain',
  'Company',
  'Company LinkedIn',
  'First Name',
  'Last Name',
  'Email',
  'Role',
  'Phone',
  'LinkedIn',
  'Notes',
] as const;

export const CSV_TEMPLATE_SAMPLE_ROWS: string[][] = [
  [
    'acme.com',
    'Acme Inc',
    'https://linkedin.com/company/acme-inc',
    'Jane',
    'Smith',
    'jane.smith@acme.com',
    'CEO',
    '+1 555 0100',
    'https://linkedin.com/in/janesmith',
    'Met at SaaS conference',
  ],
  [
    'techcorp.in',
    'TechCorp India',
    'https://linkedin.com/company/techcorp-india',
    'Rahul',
    'Verma',
    'rahul@techcorp.in',
    'Head of Sales',
    '+91 98765 43210',
    'https://linkedin.com/in/rahulverma',
    '',
  ],
];

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildCsvTemplateContent() {
  const lines = [
    CSV_TEMPLATE_HEADERS.join(','),
    ...CSV_TEMPLATE_SAMPLE_ROWS.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  return lines.join('\n');
}

export function downloadCsvTemplate(filename = 'leadhub-import-template.csv') {
  const content = buildCsvTemplateContent();
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
