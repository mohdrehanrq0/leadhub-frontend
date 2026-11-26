/**
 * Public Tools API client (guest cookie + optional workspace auth).
 */

import axios from 'axios';
import { getApiBaseUrl } from './api-base';

/** Separate client so 401 on guest session does not bounce to /login */
const publicApi = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

publicApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const workspaceId = localStorage.getItem('leadhub_workspace_id');
    if (workspaceId) {
      config.headers['X-Workspace-ID'] = workspaceId;
    }
  }
  return config;
});

export interface PublicToolsMeta {
  creditsCharged: number;
  balanceAfter: number;
  provider: 'apify';
  operation?: string;
}

export interface PublicToolPrice {
  operation: string;
  credits: number;
  cogsUsd: number;
  cogsInr: number;
  marginCredits: number;
  chargeRule: string;
}

export interface PublicToolsSession {
  guest: {
    balance: number;
    totalUsed: number;
    grant: number;
    isNew: boolean;
  };
  workspace: { balance: number; available: number } | null;
  payer: 'workspace' | 'guest';
  balance: number;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  operation: 'linkedin/profile' | 'linkedin/company' | 'tools/email-finder';
  category: 'linkedin' | 'email';
  path: string;
  fields: Array<{
    name: string;
    label: string;
    placeholder: string;
    type?: 'text' | 'url';
  }>;
}

export const PUBLIC_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: 'linkedin-profile',
    name: 'LinkedIn Profile',
    description: 'Scrape a person profile — headline, experience, skills, and more.',
    operation: 'linkedin/profile',
    category: 'linkedin',
    path: '/api/public/tools/linkedin/profile',
    fields: [
      {
        name: 'url',
        label: 'LinkedIn profile URL',
        placeholder: 'https://www.linkedin.com/in/username',
        type: 'url',
      },
    ],
  },
  {
    id: 'linkedin-company',
    name: 'LinkedIn Company',
    description: 'Scrape a company page — industry, size, website, and headquarters.',
    operation: 'linkedin/company',
    category: 'linkedin',
    path: '/api/public/tools/linkedin/company',
    fields: [
      {
        name: 'url',
        label: 'LinkedIn company URL',
        placeholder: 'https://www.linkedin.com/company/acme',
        type: 'url',
      },
    ],
  },
  {
    id: 'email-finder',
    name: 'Email Finder',
    description: 'Find a work email from a full name and company domain (verified).',
    operation: 'tools/email-finder',
    category: 'email',
    path: '/api/public/tools/email/find',
    fields: [
      {
        name: 'fullName',
        label: 'Full name',
        placeholder: 'Jane Doe',
        type: 'text',
      },
      {
        name: 'domain',
        label: 'Company domain',
        placeholder: 'acme.com',
        type: 'text',
      },
    ],
  },
];

export async function initPublicToolsSession(fingerprint: string): Promise<PublicToolsSession> {
  const { data } = await publicApi.post<{ success: boolean; data: PublicToolsSession }>(
    '/api/public/tools/session',
    { fingerprint },
  );
  if (!data.data) throw new Error('Failed to init tools session');
  return data.data;
}

export async function fetchPublicToolsPricing(): Promise<{
  tools: PublicToolPrice[];
  guestGrant: number;
  websiteDeadCredits: number;
}> {
  const { data } = await publicApi.get<{
    success: boolean;
    data: { tools: PublicToolPrice[]; guestGrant: number; websiteDeadCredits: number };
  }>('/api/public/tools/pricing');
  return data.data ?? { tools: [], guestGrant: 10, websiteDeadCredits: 1 };
}

export async function runPublicTool(
  path: string,
  body: Record<string, string>,
): Promise<{
  success: boolean;
  data?: Record<string, unknown>;
  meta?: PublicToolsMeta;
  error?: string;
  message?: string;
  required?: number;
  balance?: number;
}> {
  try {
    const { data } = await publicApi.post(path, body);
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data) {
      return err.response.data as {
        success: boolean;
        error?: string;
        message?: string;
        required?: number;
        balance?: number;
        meta?: PublicToolsMeta;
      };
    }
    throw err;
  }
}
