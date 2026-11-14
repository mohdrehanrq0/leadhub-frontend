/** Client-side LeadSniper-style template render + personalization coverage. */

export type TemplateVars = {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  companyName?: string | null;
  title?: string | null;
  location?: string | null;
  [key: string]: string | null | undefined;
};

export type TemplateLead = {
  id: string;
  name: string;
  vars: TemplateVars;
};

export type TokenCoverage = {
  withValue: number;
  withoutValue: number;
  total: number;
  coveragePct: number;
};

export type CoverageStatus = 'ok' | 'warning' | 'missing';

export const TEMPLATE_VARIABLES = [
  { key: 'firstName', label: 'First name', insert: '{{firstName|there}}' },
  { key: 'lastName', label: 'Last name', insert: '{{lastName}}' },
  { key: 'fullName', label: 'Full name', insert: '{{fullName}}' },
  { key: 'companyName', label: 'Company', insert: '{{companyName}}' },
  { key: 'title', label: 'Title', insert: '{{title}}' },
  { key: 'location', label: 'Location', insert: '{{location}}' },
] as const;

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)(?:\|([^}]*))?\s*\}\}/g;
const SPINTAX_RE = /\{([^{}|]+(?:\|[^{}|]+)+)\}/g;

function pickSpin(options: string[], seed?: number): string {
  if (options.length === 0) return '';
  if (options.length === 1) return options[0]!;
  const index =
    seed == null ? Math.floor(Math.random() * options.length) : Math.abs(seed) % options.length;
  return options[index]!;
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0;
  return h;
}

export function applyTemplateVariables(template: string, vars: TemplateVars): string {
  return template.replace(VAR_RE, (_m, key: string, fallback?: string) => {
    const raw = vars[key];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value) return value;
    return fallback?.trim() ?? '';
  });
}

export function applySpintax(template: string, seed?: number): string {
  let out = template;
  let guard = 0;
  while (SPINTAX_RE.test(out) && guard < 20) {
    SPINTAX_RE.lastIndex = 0;
    out = out.replace(SPINTAX_RE, (_m, group: string) => {
      const options = group
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean);
      return pickSpin(options, seed == null ? undefined : seed + guard);
    });
    guard += 1;
  }
  return out;
}

export function renderMessageTemplate(
  template: string,
  vars: TemplateVars,
  options?: { seed?: string | number },
): string {
  const withVars = applyTemplateVariables(template, vars);
  const seed =
    typeof options?.seed === 'number'
      ? options.seed
      : typeof options?.seed === 'string'
        ? hashSeed(options.seed)
        : undefined;
  return applySpintax(withVars, seed).replace(/\s+\n/g, '\n').trim();
}

function hasVarValue(vars: TemplateVars, key: string): boolean {
  const value = vars[key];
  return typeof value === 'string' && value.trim().length > 0;
}

/** Only keys that exist on at least one selected lead (LeadSniper-style). */
export function availableVariablesForLeads(leads: TemplateLead[]) {
  if (leads.length === 0) return [];
  return TEMPLATE_VARIABLES.filter((variable) =>
    leads.some((lead) => hasVarValue(lead.vars, variable.key)),
  );
}

export function computeTokenCoverage(leads: TemplateLead[], key: string): TokenCoverage {
  const total = leads.length;
  let withValue = 0;
  for (const lead of leads) {
    if (hasVarValue(lead.vars, key)) withValue += 1;
  }
  const withoutValue = total - withValue;
  const coveragePct = total === 0 ? 0 : Math.round((withValue / total) * 100);
  return { withValue, withoutValue, total, coveragePct };
}

export function getCoverageStatus(coverage: TokenCoverage | null | undefined): CoverageStatus {
  if (!coverage || coverage.total === 0 || coverage.withValue === 0) return 'missing';
  if (coverage.withoutValue > 0 || coverage.coveragePct < 10) return 'warning';
  return 'ok';
}

export function toTemplateLead(input: {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  companyName?: string | null;
  location?: string | null;
  vars?: TemplateVars | null;
}): TemplateLead {
  const firstName = input.vars?.firstName ?? input.firstName ?? null;
  const lastName = input.vars?.lastName ?? input.lastName ?? null;
  const joined = [firstName, lastName].filter(Boolean).join(' ');
  const fullName = input.vars?.fullName ?? input.name ?? (joined || null);
  return {
    id: input.id,
    name: fullName || input.name || 'Lead',
    vars: {
      firstName,
      lastName,
      fullName: fullName && fullName !== 'Unknown' ? fullName : null,
      companyName: input.vars?.companyName ?? input.companyName ?? null,
      title: input.vars?.title ?? input.title ?? null,
      location: input.vars?.location ?? input.location ?? null,
    },
  };
}
