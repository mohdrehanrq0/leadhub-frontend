import api from './api';
import type { BriefField, ResearchBrief, ResearchJobListItem } from './research-types';
import type { PersonaPreset, PersonaSpec } from './persona-types';

export type RecipeInputDef = {
  key: string;
  type: 'linkedin_person_url' | 'url' | 'text' | 'boolean' | 'role_list' | 'number' | 'persona';
  required: boolean;
  label?: string;
  description?: string;
  default?: string | number | boolean;
};

export type RecipeDefinition = {
  id: string;
  name: string;
  description?: string | null;
  inputs: RecipeInputDef[];
  steps: string[];
  optional_steps: string[];
  outputs: string[];
  credits: Record<string, number> & { base: number };
  limits: { max_rows: number };
};

export type RecipeOpener = {
  opener: BriefField;
  closing: BriefField;
  whatYouSell: BriefField;
};

export type FindContactsCandidate = {
  name: string | null;
  title: string | null;
  linkedin_url: string | null;
  tier: 'confirmed_current' | 'likely_current' | 'unverified';
  evidence: Array<{ source: string; quote?: string; as_of?: string }>;
  as_of: string | null;
  score?: number;
  persona_match?: 'strong' | 'partial' | 'none';
  matched_on?: string[];
  matched_rung?: number;
  row_state?: string;
  billed?: boolean;
  rejected_reason?: string;
  company?: string | null;
  jobId?: string;
};

export type RecipeRunBundle = {
  runId: string;
  recipeId: string;
  status: string;
  creditsPerLead: number;
  brief: ResearchBrief | null;
  opener: RecipeOpener | null;
  candidates?: FindContactsCandidate[] | null;
  summary?: {
    found_strong?: number;
    found_partial?: number;
    not_found?: number;
    failed?: number;
    credits_charged?: number;
  };
  runs?: Array<Record<string, unknown>>;
};

export type MyRecipe = {
  id: string;
  baseRecipeId: string;
  name: string;
  description?: string | null;
  spec: Record<string, unknown>;
  version: number;
  visibility: string;
  updatedAt?: string;
};

export async function listRecipes() {
  const { data } = await api.get<{ success: boolean; data: RecipeDefinition[] }>('/api/recipes');
  return data.data;
}

export async function getRecipe(id: string) {
  const { data } = await api.get<{ success: boolean; data: RecipeDefinition }>(`/api/recipes/${id}`);
  return data.data;
}

export async function startRecipeRun(
  recipeId: string,
  body: {
    inputs?: Record<string, unknown>;
    rows?: Array<Record<string, string>>;
    optional_steps?: string[];
  },
) {
  const { data } = await api.post<{
    success: boolean;
    data: {
      runId: string | null;
      batchId?: string;
      jobId?: string;
      leadId?: string;
      recipeId: string;
      creditsReserved: number;
      status: string;
      startedCount?: number;
      errorCount?: number;
      runs?: Array<{ jobId: string; leadId: string; index: number }>;
      proposedDomain?: string;
      companyName?: string;
      message?: string;
      maxResults?: number;
      roles?: string[];
      code?: string;
    };
  }>(`/api/recipes/${recipeId}/runs`, body);
  return data.data;
}

export async function draftPersona(body: {
  motive: string;
  recipeId?: string;
  sellStatement?: string;
}) {
  const { data } = await api.post<{
    success: boolean;
    data:
      | { ok: true; persona: PersonaSpec; source: string; preview?: string }
      | { ok: false; message: string; presets: PersonaPreset[] };
  }>('/api/recipes/persona-draft', body);
  return data.data;
}

export async function listPersonaPresetsApi() {
  const { data } = await api.get<{ success: boolean; data: PersonaPreset[] }>(
    '/api/recipes/presets/persona',
  );
  return data.data;
}

export async function listMyRecipes() {
  const { data } = await api.get<{ success: boolean; data: MyRecipe[] }>('/api/recipes/mine');
  return data.data;
}

export async function saveMyRecipe(body: {
  name: string;
  description?: string;
  base_recipe_id: string;
  visibility?: 'me' | 'workspace';
  spec: Record<string, unknown>;
}) {
  const { data } = await api.post<{ success: boolean; data: MyRecipe }>('/api/recipes/mine', body);
  return data.data;
}

export async function deleteMyRecipe(id: string) {
  await api.delete(`/api/recipes/mine/${id}`);
}

export async function reportWrongPerson(
  runId: string,
  rowId: string,
  body: {
    reason: string;
    note?: string;
    person?: Record<string, unknown>;
    company?: Record<string, unknown>;
    persona?: Record<string, unknown>;
    leadId?: string;
  },
) {
  const { data } = await api.post<{
    success: boolean;
    data: { refunded: boolean; manualReview: boolean; message: string };
  }>(`/api/runs/${runId}/rows/${rowId}/feedback`, body);
  return data.data;
}

/** Parse CSV/TSV paste: header row optional. Columns: full_name, company_name, company_url, role_hint */
export function parseCleanListCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const split = (line: string) => {
    if (line.includes('\t')) return line.split('\t').map((c) => c.trim());
    // simple CSV split (no escaped commas in quotes for v1)
    return line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
  };

  const first = split(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const hasHeader =
    first.includes('company_name') ||
    first.includes('company') ||
    first.includes('full_name') ||
    first.includes('name');

  const headers = hasHeader
    ? first.map((h) => {
        if (h === 'name' || h === 'person' || h === 'person_name') return 'full_name';
        if (h === 'company') return 'company_name';
        if (h === 'website' || h === 'domain' || h === 'company_domain') return 'company_url';
        if (h === 'title' || h === 'role') return 'role_hint';
        return h;
      })
    : ['full_name', 'company_name', 'company_url', 'role_hint'];

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const rows: Array<Record<string, string>> = [];
  for (const line of dataLines) {
    const cols = split(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (cols[i]) row[h] = cols[i];
    });
    // If no header and 2 cols: name, company
    if (!hasHeader && cols.length === 2) {
      row.full_name = cols[0];
      row.company_name = cols[1];
      delete row.company_url;
      delete row.role_hint;
    }
    if (row.company_name || row.company) rows.push(row);
  }
  return rows;
}

export async function fetchRun(runId: string) {
  const { data } = await api.get<{ success: boolean; data: RecipeRunBundle }>(`/api/runs/${runId}`);
  return data.data;
}

export async function listRuns(limit = 50) {
  const { data } = await api.get<{ success: boolean; data: ResearchJobListItem[] }>('/api/runs', {
    params: { limit },
  });
  return data.data;
}

export async function deleteRun(runId: string, deleteLeadData = true) {
  const { data } = await api.delete<{ success: boolean }>(`/api/runs/${runId}`, {
    params: { deleteLeadData },
  });
  return data;
}

export function runResultsUrl(runId: string, format: 'csv' | 'json' | 'markdown' = 'csv') {
  const base = api.defaults.baseURL?.replace(/\/$/, '') ?? '';
  return `${base}/api/runs/${runId}/results?format=${format}`;
}

export function estimateRecipeCredits(
  recipe: RecipeDefinition,
  optionalSteps: string[],
  opts?: { maxResults?: number },
): number {
  let total = recipe.credits.base ?? 0;
  for (const step of optionalSteps) {
    const add = recipe.credits[step];
    if (typeof add === 'number' && add > 0) total += add;
  }
  const per = recipe.credits.per_confirmed_candidate;
  if (typeof per === 'number' && per > 0) {
    total += per * Math.min(5, Math.max(1, opts?.maxResults ?? 3));
  }
  if (total === 0 && recipe.id !== 'find-contacts') total = 1;
  return total;
}

export async function fetchCreditBalance(): Promise<number | null> {
  try {
    const { data } = await api.get<{
      success: boolean;
      data?: { available?: number; balance?: number };
    }>('/api/credits/balance');
    return data.data?.available ?? data.data?.balance ?? null;
  } catch {
    return null;
  }
}
