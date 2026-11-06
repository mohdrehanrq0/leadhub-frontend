export type Seniority =
  | 'junior'
  | 'senior_ic'
  | 'manager'
  | 'head'
  | 'director'
  | 'vp'
  | 'c_level';

export type Department =
  | 'hr_people'
  | 'founder_exec'
  | 'sales'
  | 'marketing'
  | 'engineering'
  | 'finance'
  | 'operations'
  | 'product'
  | 'custom';

export type PersonaSpec = {
  id: string;
  label: string;
  motive?: string;
  departments: Department[];
  titlesInclude: string[];
  titlesExclude: string[];
  seniorityMin: Seniority;
  seniorityMax?: Seniority;
  location?: { country?: string; city?: string; strict: boolean };
  fallbackLadder?: PersonaSpec[];
  source: 'preset' | 'ai_draft' | 'user_edited';
  confirmedAt?: string;
};

export type PersonaPreset = {
  id: string;
  label: string;
  persona: PersonaSpec;
};

export const SENIORITY_OPTIONS: Array<{ value: Seniority | 'any'; label: string }> = [
  { value: 'junior', label: 'Junior' },
  { value: 'senior_ic', label: 'Senior IC' },
  { value: 'manager', label: 'Manager' },
  { value: 'head', label: 'Head' },
  { value: 'director', label: 'Director' },
  { value: 'vp', label: 'VP' },
  { value: 'c_level', label: 'C-level' },
  { value: 'any', label: 'Any' },
];

export const DEPARTMENT_OPTIONS: Array<{ value: Department; label: string }> = [
  { value: 'hr_people', label: 'HR / People' },
  { value: 'founder_exec', label: 'Founder / Exec' },
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'product', label: 'Product' },
  { value: 'custom', label: 'Custom' },
];

export function buildPersonaPreview(params: {
  persona: PersonaSpec;
  companyCount: number;
  maxResults: number;
}): string {
  const titles = params.persona.titlesInclude.slice(0, 3).join(', ');
  const more =
    params.persona.titlesInclude.length > 3
      ? ` (+${params.persona.titlesInclude.length - 3} more)`
      : '';
  const loc = params.persona.location?.country
    ? `, in ${params.persona.location.country}`
    : '';
  const reserved = params.companyCount * params.maxResults;
  return (
    `I will look for: ${titles}${more} at ${params.companyCount} compan` +
    `${params.companyCount === 1 ? 'y' : 'ies'}, minimum level ${params.persona.seniorityMin}${loc}. ` +
    `You are charged only for confirmed current employees who match. Up to ${reserved} credit` +
    `${reserved === 1 ? '' : 's'} reserved.`
  );
}

export function newEmptyPersona(motive?: string): PersonaSpec {
  return {
    id: crypto.randomUUID(),
    label: 'Custom persona',
    motive,
    departments: ['hr_people'],
    titlesInclude: ['Head of People', 'HR Manager'],
    titlesExclude: ['intern', 'assistant', 'agency'],
    seniorityMin: 'manager',
    source: 'user_edited',
  };
}
