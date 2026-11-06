/**
 * Data API client for Tools page
 */

import api from './api';

export interface DataMeta {
  creditsCharged: number;
  creditsReserved?: number;
  balanceAfter: number;
  cache: { hit: boolean; ageDays?: number };
  asOf: string;
  provider: 'apify' | 'tinyfish' | 'gemini';
  priceVersion: number;
}

export interface PriceEntry {
  operation: string;
  credits: number;
  chargeRule: string;
  version: number;
}

export interface CreditBalance {
  balance: number;
  freeBalance: number;
  freeExpiresAt: string | null;
  reservedBalance: number;
  available: number;
}

// ─────────────────────────────────────────────────────────────────
// Credits API
// ─────────────────────────────────────────────────────────────────

export async function fetchCreditBalance(): Promise<CreditBalance | null> {
  try {
    const { data } = await api.get<{ success: boolean; data?: CreditBalance }>(
      '/api/v1/credits/balance',
    );
    return data.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchPricing(): Promise<PriceEntry[]> {
  try {
    const { data } = await api.get<{ success: boolean; data?: PriceEntry[] }>(
      '/api/v1/credits/pricing',
    );
    return data.data ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// LinkedIn Data API
// ─────────────────────────────────────────────────────────────────

export interface LinkedInProfileResult {
  success: boolean;
  data?: Record<string, unknown>;
  meta?: DataMeta;
  error?: string;
  message?: string;
}

export async function fetchLinkedInProfile(url: string): Promise<LinkedInProfileResult> {
  const { data } = await api.post<LinkedInProfileResult>('/api/v1/linkedin/profile', { url });
  return data;
}

export interface LinkedInCompanyResult {
  success: boolean;
  data?: Record<string, unknown>;
  meta?: DataMeta;
  error?: string;
  message?: string;
}

export async function fetchLinkedInCompany(url: string): Promise<LinkedInCompanyResult> {
  const { data } = await api.post<LinkedInCompanyResult>('/api/v1/linkedin/company', { url });
  return data;
}

export interface LinkedInEmployeesResult {
  success: boolean;
  data?: Record<string, unknown>[];
  count?: number;
  meta?: DataMeta;
  error?: string;
  message?: string;
}

export async function fetchLinkedInEmployees(
  url: string,
  maxResults: number = 10,
  jobTitles?: string[],
): Promise<LinkedInEmployeesResult> {
  const { data } = await api.post<LinkedInEmployeesResult>('/api/v1/linkedin/company/employees', {
    url,
    maxResults,
    jobTitles,
  });
  return data;
}

// ─────────────────────────────────────────────────────────────────
// Web Data API
// ─────────────────────────────────────────────────────────────────

export interface WebScrapeResult {
  success: boolean;
  data?: {
    results: Array<{
      url: string;
      title?: string;
      description?: string;
      text?: string;
    }>;
    errors: Array<{ url: string; error: string }>;
    pagesFetched: number;
  };
  meta?: DataMeta;
  error?: string;
  message?: string;
}

export async function fetchWebScrape(urls: string[]): Promise<WebScrapeResult> {
  const { data } = await api.post<WebScrapeResult>('/api/v1/web/scrape', { urls });
  return data;
}

export interface WebSearchResult {
  success: boolean;
  data?: {
    query: string;
    results: Array<{
      position: number;
      title: string;
      snippet: string;
      url: string;
    }>;
    totalResults: number;
  };
  meta?: DataMeta;
  error?: string;
  message?: string;
}

export async function fetchWebSearch(query: string): Promise<WebSearchResult> {
  const { data } = await api.post<WebSearchResult>('/api/v1/web/search', { query });
  return data;
}

export interface WebExtractResult {
  success: boolean;
  data?: {
    url: string;
    title?: string;
    extracted: unknown;
  };
  meta?: DataMeta;
  error?: string;
  message?: string;
}

export async function fetchWebExtract(url: string, prompt: string): Promise<WebExtractResult> {
  const { data } = await api.post<WebExtractResult>('/api/v1/web/extract', { url, prompt });
  return data;
}

// ─────────────────────────────────────────────────────────────────
// Tool definitions for UI
// ─────────────────────────────────────────────────────────────────

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  operation: string;
  category: 'linkedin' | 'web' | 'email';
  method: 'POST';
  path: string;
  scope: 'data:linkedin' | 'data:web';
  sampleBody: Record<string, unknown>;
  inputSchema: {
    type: 'url' | 'text';
    placeholder: string;
    validation?: RegExp;
    label: string;
  };
  available: boolean;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: 'linkedin-profile',
    name: 'LinkedIn Profile',
    description: 'Extract detailed information from a LinkedIn profile',
    operation: 'linkedin/profile',
    category: 'linkedin',
    method: 'POST',
    path: '/api/v1/linkedin/profile',
    scope: 'data:linkedin',
    sampleBody: { url: 'https://www.linkedin.com/in/example' },
    inputSchema: {
      type: 'url',
      label: 'Profile URL',
      placeholder: 'https://linkedin.com/in/username',
      validation: /linkedin\.com\/in\//i,
    },
    available: true,
  },
  {
    id: 'linkedin-company',
    name: 'LinkedIn Company',
    description: 'Extract company details from LinkedIn',
    operation: 'linkedin/company',
    category: 'linkedin',
    method: 'POST',
    path: '/api/v1/linkedin/company',
    scope: 'data:linkedin',
    sampleBody: { url: 'https://www.linkedin.com/company/example' },
    inputSchema: {
      type: 'url',
      label: 'Company URL',
      placeholder: 'https://linkedin.com/company/name',
      validation: /linkedin\.com\/company\//i,
    },
    available: true,
  },
  {
    id: 'linkedin-employees',
    name: 'Company Employees',
    description: 'Find employees of a company',
    operation: 'linkedin/company/employees',
    category: 'linkedin',
    method: 'POST',
    path: '/api/v1/linkedin/company/employees',
    scope: 'data:linkedin',
    sampleBody: {
      url: 'https://www.linkedin.com/company/example',
      maxResults: 10,
      jobTitles: ['Founder', 'CEO'],
    },
    inputSchema: {
      type: 'url',
      label: 'Company URL',
      placeholder: 'https://linkedin.com/company/name',
      validation: /linkedin\.com\/company\//i,
    },
    available: true,
  },
  {
    id: 'web-scrape',
    name: 'Web Scrape',
    description: 'Fetch and extract content from any webpage',
    operation: 'web/scrape',
    category: 'web',
    method: 'POST',
    path: '/api/v1/web/scrape',
    scope: 'data:web',
    sampleBody: { urls: ['https://example.com'], format: 'markdown' },
    inputSchema: {
      type: 'url',
      label: 'URL',
      placeholder: 'https://example.com/page',
    },
    available: true,
  },
  {
    id: 'web-search',
    name: 'Web Search',
    description: 'Search the web with AI-enhanced results',
    operation: 'web/search',
    category: 'web',
    method: 'POST',
    path: '/api/v1/web/search',
    scope: 'data:web',
    sampleBody: { query: 'best CRM tools for startups' },
    inputSchema: {
      type: 'text',
      label: 'Search Query',
      placeholder: 'e.g., best CRM tools for startups',
    },
    available: true,
  },
  {
    id: 'web-extract',
    name: 'Web Extract',
    description: 'AI-powered extraction from webpages',
    operation: 'web/extract',
    category: 'web',
    method: 'POST',
    path: '/api/v1/web/extract',
    scope: 'data:web',
    sampleBody: {
      url: 'https://example.com/pricing',
      prompt: 'Extract pricing plans, features, and contact email',
    },
    inputSchema: {
      type: 'url',
      label: 'URL',
      placeholder: 'https://example.com/page',
    },
    available: true,
  },
];
