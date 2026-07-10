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
  | 'notes';

export type FieldMapping = Partial<Record<SystemFieldKey, string>>;

export interface SystemFieldDefinition {
  key: SystemFieldKey;
  label: string;
  group: 'contact' | 'company' | 'other';
  requiredForImport?: boolean;
  requiredForEnrichment?: boolean;
  recommendedForEnrichment?: boolean;
  aliases: string[];
}

export const SYSTEM_FIELDS: SystemFieldDefinition[] = [
  {
    key: 'company.name',
    label: 'Company Name',
    group: 'company',
    requiredForImport: true,
    requiredForEnrichment: true,
    aliases: ['company', 'company name', 'organization', 'account', 'org', 'company_name', 'organization_name', 'employer'],
  },
  {
    key: 'contact.location',
    label: 'Location',
    group: 'contact',
    requiredForEnrichment: true,
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
    key: 'company.domain',
    label: 'Company Website / Domain',
    group: 'company',
    recommendedForEnrichment: true,
    aliases: ['domain', 'website', 'company website', 'company domain', 'url', 'website url', 'primary_domain', 'website_url'],
  },
  {
    key: 'company.linkedin',
    label: 'Company LinkedIn',
    group: 'company',
    aliases: ['company linkedin', 'linkedin company', 'company_linkedin', 'organization linkedin'],
  },
  {
    key: 'notes',
    label: 'Notes',
    group: 'other',
    aliases: ['notes', 'note', 'comments', 'description'],
  },
];

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

  return {
    company: {
      name: companyName,
      domain: companyDomain,
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

export function isUsableMappedLead(row: MappedLeadInput) {
  return Boolean(
    row.contact.email ||
      row.company.name ||
      row.company.domain ||
      row.contact.firstName ||
      row.contact.lastName ||
      row.contact.location,
  );
}

export interface EnrichmentReadiness {
  enrichable: boolean;
  missingRequired: string[];
  missingRecommended: string[];
}

export function assessEnrichmentReadiness(row: MappedLeadInput): EnrichmentReadiness {
  const missingRequired: string[] = [];
  const missingRecommended: string[] = [];

  // Research agent requires company name + location. Person name is optional —
  // enrichment discovers founders / decision-makers when missing.
  if (!row.company.name?.trim()) missingRequired.push('Company Name');
  if (!row.contact.location?.trim()) missingRequired.push('Location');

  if (!row.company.domain?.trim()) missingRecommended.push('Company Domain');
  const personName = [row.contact.firstName, row.contact.lastName].filter(Boolean).join(' ').trim();
  if (!personName) missingRecommended.push('Contact Name (optional — agent will find decision-makers)');
  if (!row.contact.email?.trim()) missingRecommended.push('Email');
  if (!row.contact.role?.trim()) missingRecommended.push('Job Title');

  return {
    enrichable: missingRequired.length === 0,
    missingRequired,
    missingRecommended,
  };
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

export function summarizeReadiness(rows: MappedLeadInput[]) {
  let enrichable = 0;
  let partial = 0;
  let notReady = 0;

  for (const row of rows) {
    const readiness = assessEnrichmentReadiness(row);
    if (readiness.enrichable && readiness.missingRecommended.length === 0) enrichable += 1;
    else if (readiness.enrichable) partial += 1;
    else notReady += 1;
  }

  return { enrichable, partial, notReady, total: rows.length };
}

export const CSV_TEMPLATE_HEADERS = [
  'First Name',
  'Last Name',
  'Email',
  'Company',
  'Domain',
  'Role',
  'Phone',
  'LinkedIn',
  'Location',
  'Notes',
] as const;

export const CSV_TEMPLATE_SAMPLE_ROWS: string[][] = [
  [
    'Jane',
    'Smith',
    'jane.smith@acme.com',
    'Acme Inc',
    'acme.com',
    'CEO',
    '+1 555 0100',
    'https://linkedin.com/in/janesmith',
    'San Francisco, USA',
    'Met at SaaS conference',
  ],
  [
    'Rahul',
    'Verma',
    'rahul@techcorp.in',
    'TechCorp India',
    'techcorp.in',
    'Head of Sales',
    '+91 98765 43210',
    'https://linkedin.com/in/rahulverma',
    'Bengaluru, India',
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
