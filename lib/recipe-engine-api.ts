import api from './api';

export type ConfigFieldSchema = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'string_list' | 'url_list';
  required?: boolean;
  default?: string | number | boolean | string[];
  options?: string[];
  placeholder?: string;
  help?: string;
};

export type NodeMeta = {
  type: string;
  category: 'source' | 'transform' | 'ai' | 'enrich' | 'email' | 'output';
  label: string;
  description: string;
  configSchema: ConfigFieldSchema[];
  inputColumns: string[];
  outputColumns: string[];
  estimatedCostPerRow: number;
};

export type EngineStep = { id: string; type: string; config: Record<string, unknown> };

export type EngineRecipe = {
  id: string;
  name: string;
  version: number;
  steps: EngineStep[];
  costCap?: number;
  description?: string | null;
  myRecipeId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EngineRow = Record<string, unknown> & {
  dropped_reason?: string | null;
  dropped_by_step?: string | null;
};

export type StepRunResult = {
  stepId: string;
  stepType: string;
  cacheHit: boolean;
  rowsIn: number;
  rowsOut: number;
  droppedCount: number;
  dropReasons: Record<string, number>;
  estimatedCost: number;
  actualCost: number;
  rows: EngineRow[];
};

export type EngineRunResult = {
  runId: string;
  recipeId: string;
  recipeVersion: number;
  status: string;
  estimatedCost: number;
  actualCost: number;
  error: string | null;
  funnel: Array<Omit<StepRunResult, 'rows'>>;
  steps: StepRunResult[];
  finalRows: EngineRow[];
};

type Envelope<T> = { success: boolean; data: T };

export async function listEngineNodes(): Promise<NodeMeta[]> {
  const res = await api.get<Envelope<NodeMeta[]>>('/api/recipe-engine/nodes');
  return res.data.data;
}

export async function listEngineRecipes(): Promise<EngineRecipe[]> {
  const res = await api.get<Envelope<EngineRecipe[]>>('/api/recipe-engine/recipes');
  return res.data.data;
}

export async function getEngineRecipe(id: string): Promise<EngineRecipe> {
  const res = await api.get<Envelope<EngineRecipe>>(`/api/recipe-engine/recipes/${id}`);
  return res.data.data;
}

export async function createEngineRecipe(body: {
  name: string;
  description?: string;
  steps: EngineStep[];
  costCap?: number;
}): Promise<EngineRecipe> {
  const res = await api.post<Envelope<EngineRecipe>>('/api/recipe-engine/recipes', body);
  return res.data.data;
}

export async function saveEngineRecipeVersion(
  id: string,
  body: { name?: string; description?: string; steps: EngineStep[]; costCap?: number },
): Promise<EngineRecipe> {
  const res = await api.post<Envelope<EngineRecipe>>(`/api/recipe-engine/recipes/${id}/versions`, body);
  return res.data.data;
}

export async function listEngineRecipeVersions(id: string): Promise<EngineRecipe[]> {
  const res = await api.get<Envelope<EngineRecipe[]>>(`/api/recipe-engine/recipes/${id}/versions`);
  return res.data.data;
}

export async function restoreEngineRecipeVersion(id: string, version: number): Promise<EngineRecipe> {
  const res = await api.post<Envelope<EngineRecipe>>(`/api/recipe-engine/recipes/${id}/restore/${version}`);
  return res.data.data;
}

export async function runEngineRecipe(
  id: string,
  body: { mode: 'test' | 'full'; costCap?: number },
): Promise<EngineRunResult> {
  const res = await api.post<Envelope<EngineRunResult>>(`/api/recipe-engine/recipes/${id}/runs`, body);
  return res.data.data;
}
