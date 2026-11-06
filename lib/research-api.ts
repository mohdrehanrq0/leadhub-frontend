import api from './api';
import type { ResearchBrief, ResearchJobListItem } from './research-types';

export async function startResearch(body: {
  personProfileUrl?: string;
  companyUrl?: string;
  companyName?: string;
  includeEmail?: boolean;
  includeHiring?: boolean;
  customQuestions?: string[];
  templateAgentId?: string;
}) {
  const { data } = await api.post<{ success: boolean; data: { jobId: string; leadId: string } }>(
    '/api/research/start',
    body,
  );
  return data.data;
}

export async function fetchResearchBrief(jobId: string) {
  const { data } = await api.get<{ success: boolean; data: ResearchBrief }>(
    `/api/research/jobs/${jobId}/brief`,
  );
  return data.data;
}

export async function listResearchJobs(limit = 50) {
  const { data } = await api.get<{ success: boolean; data: ResearchJobListItem[] }>(
    '/api/research/jobs',
    { params: { limit } },
  );
  return data.data;
}

export async function reResearch(jobId: string, body?: { includeEmail?: boolean; includeHiring?: boolean }) {
  const { data } = await api.post<{ success: boolean; data: { jobId: string; leadId: string } }>(
    `/api/research/jobs/${jobId}/re-research`,
    body ?? {},
  );
  return data.data;
}

export async function deleteResearch(jobId: string, deleteLeadData = true) {
  const { data } = await api.delete<{ success: boolean }>(`/api/research/jobs/${jobId}`, {
    params: { deleteLeadData },
  });
  return data;
}

export function researchExportUrl(jobId: string, format: 'markdown' | 'json' = 'markdown') {
  const base = api.defaults.baseURL?.replace(/\/$/, '') ?? '';
  return `${base}/api/research/jobs/${jobId}/export?format=${format}`;
}

export async function startBatchResearch(body: {
  rows: Array<{
    personProfileUrl?: string;
    companyUrl?: string;
    companyName?: string;
    includeEmail?: boolean;
  }>;
  includeEmail?: boolean;
  includeHiring?: boolean;
  customQuestions?: string[];
}) {
  const { data } = await api.post('/api/research/batch', body);
  return data.data as {
    startedCount: number;
    errorCount: number;
    started: Array<{ jobId: string; leadId: string; index: number }>;
    errors: Array<{ index: number; message: string }>;
  };
}

export async function listTemplates() {
  const { data } = await api.get('/api/research/templates');
  return data.data as Array<{
    id: string;
    name: string;
    description: string | null;
    mission: string | null;
  }>;
}

export async function createTemplate(body: {
  name: string;
  description?: string;
  includeEmail?: boolean;
  includeHiring?: boolean;
  customQuestions?: string[];
  mission?: string;
}) {
  const { data } = await api.post('/api/research/templates', body);
  return data.data;
}

export async function deleteTemplate(id: string) {
  await api.delete(`/api/research/templates/${id}`);
}

export async function listMonitoring() {
  const { data } = await api.get('/api/research/monitoring');
  return data.data as Array<{
    id: string;
    companyName: string;
    companyUrl?: string | null;
    cadenceDays: number;
    nextRunAt: string;
    lastJobId?: string | null;
  }>;
}

export async function addMonitoring(body: {
  companyName: string;
  companyUrl?: string;
  cadenceDays?: number;
}) {
  const { data } = await api.post('/api/research/monitoring', body);
  return data.data;
}

export async function removeMonitoring(id: string) {
  await api.delete(`/api/research/monitoring/${id}`);
}
