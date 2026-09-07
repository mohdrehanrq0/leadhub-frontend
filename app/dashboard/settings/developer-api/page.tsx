'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api-base';
import { toast } from 'sonner';
import {
  SettingsCard,
  SettingsEmpty,
  SettingsField,
  SettingsPanel,
  settingsBtnDanger,
  settingsBtnPrimary,
  settingsBtnSecondary,
  settingsInputClass,
} from '@/components/settings/primitives';
import {
  IconCheck,
  IconCode,
  IconCopy,
  IconExternalLink,
  IconKey,
  IconPlus,
  IconRefresh,
  IconSend,
  IconSparkles,
  IconTerminal2,
  IconTrash,
  IconUsers,
  IconBuilding,
  IconMailOpened,
  IconAlertCircle,
  IconChevronRight,
} from '@tabler/icons-react';

interface ServiceApiKey {
  id: string;
  name: string;
  maskedKey: string;
  scopes: string[];
  lastUsedAt?: string | null;
  createdAt: string;
}

type CodeLang = 'curl' | 'javascript' | 'python';

interface EndpointDoc {
  id: string;
  title: string;
  method: 'GET' | 'POST';
  path: string;
  scope: string;
  description: string;
  queryParams?: Array<{ name: string; type: string; required: boolean; description: string; example: string }>;
  bodyParams?: Array<{ name: string; type: string; required: boolean; description: string; example: string }>;
  sampleBody?: Record<string, unknown>;
  sampleResponse: Record<string, unknown>;
}

const ALL_SCOPES = [
  { id: 'leads:read', label: 'leads:read', desc: 'Read & filter CRM leads' },
  { id: 'leads:write', label: 'leads:write', desc: 'Push / create leads in LeadCRM' },
  { id: 'enrich:write', label: 'enrich:write', desc: 'Trigger on-demand AI lead enrichment' },
  { id: 'signups:read', label: 'signups:read', desc: 'Fetch website signup leads' },
  { id: 'signups:write', label: 'signups:write', desc: 'Ingest signup leads' },
  { id: 'account:read', label: 'account:read', desc: 'Read workspace profile, credits & stats' },
];

export default function DeveloperApiPage() {
  const [tokens, setTokens] = useState<ServiceApiKey[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [activeToken, setActiveToken] = useState<string>('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [creatingToken, setCreatingToken] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTokenName, setNewTokenName] = useState('LeadCRM Integration');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['*']);
  const [fullAccessPreset, setFullAccessPreset] = useState(true);

  // Ping / connectivity test
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [pingLatency, setPingLatency] = useState<number | null>(null);

  // Docs state
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('push-lead');
  const [selectedLang, setSelectedLang] = useState<CodeLang>('curl');

  // Interactive Live Console state
  const [customTestBody, setCustomTestBody] = useState<string>('');
  const [consoleRunning, setConsoleRunning] = useState(false);
  const [consoleResponse, setConsoleResponse] = useState<{
    status: number;
    latencyMs: number;
    data: any;
  } | null>(null);

  const apiBase = useMemo(() => `${getApiBaseUrl()}/api/v1/crm`, []);

  // Fetch existing tokens
  useEffect(() => {
    void fetchTokens();
  }, []);

  async function fetchTokens() {
    setLoadingTokens(true);
    try {
      const res = await api.get('/api/service-api-keys');
      const data = res.data?.data ?? [];
      setTokens(data);
      if (data.length > 0 && !activeToken) {
        // Default to first masked key or leave placeholder
      }
    } catch {
      toast.error('Failed to load API tokens.');
    } finally {
      setLoadingTokens(false);
    }
  }

  async function handleCreateToken(e: React.FormEvent) {
    e.preventDefault();
    setCreatingToken(true);
    try {
      const scopes = fullAccessPreset ? ['*'] : selectedScopes;
      const res = await api.post('/api/service-api-keys', {
        name: newTokenName.trim() || 'LeadCRM API Token',
        scopes,
      });
      const key = res.data?.data?.apiKey;
      if (key) {
        setRevealedKey(key);
        setActiveToken(key);
        toast.success('API token generated successfully!');
      }
      setShowCreateModal(false);
      setNewTokenName('LeadCRM Integration');
      await fetchTokens();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create token');
    } finally {
      setCreatingToken(false);
    }
  }

  async function handleRevokeToken(id: string) {
    if (!confirm('Are you sure you want to revoke this API token? Any integrations using it will stop working immediately.')) {
      return;
    }
    try {
      await api.delete(`/api/service-api-keys/${id}`);
      toast.success('API token revoked.');
      await fetchTokens();
    } catch {
      toast.error('Failed to revoke API token.');
    }
  }

  async function testPing() {
    setPingStatus('testing');
    const start = performance.now();
    try {
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      const res = await api.get('/api/v1/crm/ping', { headers });
      const latency = Math.round(performance.now() - start);
      setPingLatency(latency);
      setPingStatus('success');
      toast.success(`Ping successful! (${latency}ms)`);
    } catch (err: any) {
      setPingStatus('error');
      toast.error(err?.response?.data?.message || 'Ping failed');
    }
  }

  function copyToClipboard(text: string, label = 'Copied') {
    void navigator.clipboard.writeText(text);
    toast.success(label);
  }

  // Endpoints catalog
  const ENDPOINTS: EndpointDoc[] = useMemo(
    () => [
      {
        id: 'push-lead',
        title: 'Push a Lead to LeadCRM',
        method: 'POST',
        path: '/leads',
        scope: 'leads:write',
        description:
          'Create and push a lead into LeadCRM with contact details, company information, tags, notes, and optional instant AI enrichment.',
        bodyParams: [
          { name: 'companyName', type: 'string', required: true, description: 'Company name (or domain)', example: '"Microsoft"' },
          { name: 'companyDomain', type: 'string', required: false, description: 'Corporate website domain', example: '"microsoft.com"' },
          { name: 'firstName', type: 'string', required: false, description: 'First name of contact', example: '"Satya"' },
          { name: 'lastName', type: 'string', required: false, description: 'Last name of contact', example: '"Nadella"' },
          { name: 'email', type: 'string', required: false, description: 'Work email address', example: '"satya@microsoft.com"' },
          { name: 'role', type: 'string', required: false, description: 'Job role or title', example: '"Chief Executive Officer"' },
          { name: 'phone', type: 'string', required: false, description: 'Direct or office phone number', example: '"+14258828080"' },
          { name: 'location', type: 'string', required: false, description: 'City, state, or country', example: '"Redmond, WA"' },
          { name: 'linkedinUrl', type: 'string', required: false, description: 'LinkedIn profile URL', example: '"https://linkedin.com/in/satyanadella"' },
          { name: 'tags', type: 'string[]', required: false, description: 'Labels for segmentation', example: '["enterprise", "inbound"]' },
          { name: 'notes', type: 'string', required: false, description: 'Internal CRM notes', example: '"Cloud summit lead"' },
          { name: 'priority', type: 'string', required: false, description: '"hot" | "warm" | "cold"', example: '"hot"' },
          { name: 'autoEnrich', type: 'boolean', required: false, description: 'Automatically enqueue AI enrichment upon push', example: 'false' },
        ],
        sampleBody: {
          firstName: 'Satya',
          lastName: 'Nadella',
          email: 'satya@microsoft.com',
          role: 'Chief Executive Officer',
          companyName: 'Microsoft',
          companyDomain: 'microsoft.com',
          location: 'Redmond, WA',
          tags: ['enterprise', 'inbound'],
          notes: 'Met at cloud summit',
          priority: 'hot',
          pipelineStage: 'qualified',
          autoEnrich: false,
        },
        sampleResponse: {
          success: true,
          message: 'Lead created successfully in LeadCRM.',
          data: {
            id: '81f2115e-990a-4740-9a3d-c1186716a5b6',
            status: 'raw',
            pipelineStage: 'qualified',
            priority: 'hot',
            tags: ['enterprise', 'inbound'],
            notes: 'Met at cloud summit',
            company: {
              name: 'Microsoft',
              domain: 'microsoft.com',
              location: 'Redmond, WA',
            },
            contact: {
              firstName: 'Satya',
              lastName: 'Nadella',
              email: 'satya@microsoft.com',
              role: 'Chief Executive Officer',
            },
            enrichmentStatus: 'not_started',
            createdAt: '2026-09-07T10:00:00.000Z',
          },
        },
      },
      {
        id: 'fetch-leads',
        title: 'Fetch Leads with Filters',
        method: 'GET',
        path: '/leads',
        scope: 'leads:read',
        description:
          'Query workspace leads with flexible filtering on status, priority, stage, enrichment status, verified email, website, and text search.',
        queryParams: [
          { name: 'q', type: 'string', required: false, description: 'Search term across name, company, email, role', example: '"Microsoft"' },
          { name: 'status', type: 'string', required: false, description: '"raw" | "enriched" | "verified" | "researched"', example: '"enriched"' },
          { name: 'priority', type: 'string', required: false, description: '"hot" | "warm" | "cold"', example: '"hot"' },
          { name: 'pipelineStage', type: 'string', required: false, description: '"new" | "contacted" | "qualified" | "negotiation"', example: '"qualified"' },
          { name: 'enrichmentStatus', type: 'string', required: false, description: '"not_started" | "in_progress" | "completed" | "failed"', example: '"completed"' },
          { name: 'hasEmail', type: 'boolean', required: false, description: 'Only leads that have an email address', example: 'true' },
          { name: 'hasWebsite', type: 'boolean', required: false, description: 'Only leads with a company website', example: 'true' },
          { name: 'location', type: 'string', required: false, description: 'Filter by city or country substring', example: '"San Francisco"' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (1 to 100, default 50)', example: '50' },
          { name: 'offset', type: 'number', required: false, description: 'Pagination offset (default 0)', example: '0' },
        ],
        sampleResponse: {
          success: true,
          data: [
            {
              id: '81f2115e-990a-4740-9a3d-c1186716a5b6',
              status: 'raw',
              pipelineStage: 'qualified',
              priority: 'hot',
              company: { name: 'Microsoft', domain: 'microsoft.com' },
              contact: { firstName: 'Satya', email: 'satya@microsoft.com', role: 'CEO' },
              enrichmentStatus: 'completed',
              createdAt: '2026-09-07T10:00:00.000Z',
            },
          ],
          meta: { total: 1, limit: 50, offset: 0 },
        },
      },
      {
        id: 'enrich-lead',
        title: 'Enrich a Particular Lead',
        method: 'POST',
        path: '/leads/:id/enrich',
        scope: 'enrich:write',
        description:
          'Trigger multi-step AI enrichment for a specific lead by its UUID. Uncovers verified emails, key decision makers, company profile, and AI sales intelligence.',
        bodyParams: [
          { name: 'intentPack', type: 'string', required: false, description: '"decision_maker" | "founder" | "sales_leader" | "technology_decision_maker"', example: '"decision_maker"' },
          { name: 'roleHint', type: 'string', required: false, description: 'Specific target role hint', example: '"VP of Engineering"' },
          { name: 'researchGoal', type: 'string', required: false, description: '"sales" | "marketing" | "AI" | "engineering"', example: '"sales"' },
          { name: 'reEnrich', type: 'boolean', required: false, description: 'Re-run enrichment even if previously completed', example: 'true' },
          { name: 'refreshCompanyProfile', type: 'boolean', required: false, description: 'Bust 14-day company cache and re-scrape website', example: 'false' },
        ],
        sampleBody: {
          intentPack: 'decision_maker',
          roleHint: 'VP Engineering',
          researchGoal: 'sales',
          reEnrich: true,
        },
        sampleResponse: {
          success: true,
          message: 'Enrichment job queued for lead.',
          data: {
            jobId: '22a188f1-332e-4b91-97b7-6bb909e7c5b1',
            leadId: '81f2115e-990a-4740-9a3d-c1186716a5b6',
            status: 'queued',
            intentPack: 'decision_maker',
            reEnrich: true,
          },
        },
      },
      {
        id: 'get-signups',
        title: 'Get All Signup Leads',
        method: 'GET',
        path: '/signups',
        scope: 'signups:read',
        description:
          'Retrieve all inbound sign-up leads captured from your website or apps, including contact email, enriched company profile, and AI personalized onboarding copy.',
        queryParams: [
          { name: 'status', type: 'string', required: false, description: '"pending" | "enriching" | "ready" | "sent" | "failed"', example: '"ready"' },
          { name: 'category', type: 'string', required: false, description: '"hot" | "warm" | "cold"', example: '"hot"' },
          { name: 'since', type: 'string', required: false, description: 'ISO date filter for leads updated after timestamp', example: '"2026-09-01T00:00:00Z"' },
          { name: 'limit', type: 'number', required: false, description: 'Max records (default 50)', example: '50' },
          { name: 'offset', type: 'number', required: false, description: 'Pagination offset', example: '0' },
        ],
        sampleResponse: {
          success: true,
          data: [
            {
              id: 'd9b7348e-289e-4a6c-a87f-440cc079b76c',
              email: 'patrick@stripe.com',
              name: 'Patrick Collison',
              companyName: 'Stripe, Inc.',
              companyAddress: 'San Francisco, CA',
              companyWebsite: 'https://stripe.com',
              status: 'ready',
              enrichmentStatus: 'completed',
              createdAt: '2026-09-07T08:30:00.000Z',
            },
          ],
          meta: { limit: 50, offset: 0, count: 1 },
        },
      },
      {
        id: 'get-account',
        title: 'Get Account & Credits Information',
        method: 'GET',
        path: '/account',
        scope: 'account:read',
        description:
          'Retrieve workspace identity, active credit balances (available and reserved), total lifetime usage, and live CRM metrics.',
        sampleResponse: {
          success: true,
          data: {
            workspace: {
              id: 'a91d59f3-8b7c-473d-8153-61a0c8b6b27d',
              name: 'Acme Growth Labs',
              slug: 'acme-growth-labs',
              createdAt: '2026-08-15T12:00:00.000Z',
            },
            credits: {
              balance: 1450,
              reservedBalance: 0,
              totalPurchased: 2000,
              totalUsed: 550,
            },
            stats: {
              totalLeads: 320,
              enrichedLeads: 185,
              totalSignups: 42,
            },
            apiAuth: {
              authType: 'api_key',
              scopes: ['*'],
            },
          },
        },
      },
      {
        id: 'ping',
        title: 'Ping / Connectivity Test',
        method: 'GET',
        path: '/ping',
        scope: 'any',
        description: 'Verify your API token authentication and measure server latency.',
        sampleResponse: {
          success: true,
          data: {
            ok: true,
            message: 'LeadCRM API connection healthy',
            workspaceId: 'a91d59f3-8b7c-473d-8153-61a0c8b6b27d',
            authType: 'api_key',
            scopes: ['*'],
            timestamp: '2026-09-07T13:30:00.000Z',
          },
        },
      },
    ],
    [],
  );

  const activeDoc = useMemo(
    () => ENDPOINTS.find((e) => e.id === selectedEndpointId) ?? ENDPOINTS[0],
    [ENDPOINTS, selectedEndpointId],
  );

  // Sync custom test body when endpoint changes
  useEffect(() => {
    if (activeDoc.sampleBody) {
      setCustomTestBody(JSON.stringify(activeDoc.sampleBody, null, 2));
    } else {
      setCustomTestBody('');
    }
    setConsoleResponse(null);
  }, [activeDoc]);

  // Code snippet generator
  const codeSnippet = useMemo(() => {
    const tokenDisplay = activeToken || revealedKey || 'lh_your_api_token_here';
    const url = `${apiBase}${activeDoc.path}`;

    if (selectedLang === 'curl') {
      if (activeDoc.method === 'GET') {
        return `curl -X GET "${url}" \\
  -H "Authorization: Bearer ${tokenDisplay}" \\
  -H "Content-Type: application/json"`;
      }
      const bodyStr = activeDoc.sampleBody ? JSON.stringify(activeDoc.sampleBody, null, 2) : '{}';
      return `curl -X POST "${url}" \\
  -H "Authorization: Bearer ${tokenDisplay}" \\
  -H "Content-Type: application/json" \\
  -d '${bodyStr}'`;
    }

    if (selectedLang === 'javascript') {
      if (activeDoc.method === 'GET') {
        return `// LeadCRM API - ${activeDoc.title}
const response = await fetch("${url}", {
  method: "GET",
  headers: {
    "Authorization": "Bearer ${tokenDisplay}",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data);`;
      }
      const bodyStr = activeDoc.sampleBody ? JSON.stringify(activeDoc.sampleBody, null, 2) : '{}';
      return `// LeadCRM API - ${activeDoc.title}
const response = await fetch("${url}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${tokenDisplay}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${bodyStr})
});

const data = await response.json();
console.log(data);`;
    }

    if (selectedLang === 'python') {
      if (activeDoc.method === 'GET') {
        return `# LeadCRM API - ${activeDoc.title}
import requests

url = "${url}"
headers = {
    "Authorization": "Bearer ${tokenDisplay}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
print(response.json())`;
      }
      const bodyStr = activeDoc.sampleBody ? JSON.stringify(activeDoc.sampleBody, null, 4) : '{}';
      return `# LeadCRM API - ${activeDoc.title}
import requests

url = "${url}"
headers = {
    "Authorization": "Bearer ${tokenDisplay}",
    "Content-Type": "application/json"
}
payload = ${bodyStr}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;
    }

    return '';
  }, [activeDoc, activeToken, revealedKey, apiBase, selectedLang]);

  // Run live test from the browser
  async function handleRunConsole() {
    setConsoleRunning(true);
    const start = performance.now();
    try {
      const url = `${apiBase}${activeDoc.path.replace(':id', tokens[0]?.id ? 'test-id' : 'sample-id')}`;
      let parsedBody: any = undefined;
      if (activeDoc.method === 'POST' && customTestBody.trim()) {
        try {
          parsedBody = JSON.parse(customTestBody);
        } catch {
          toast.error('Invalid JSON payload in request body.');
          setConsoleRunning(false);
          return;
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const res = await api({
        method: activeDoc.method,
        url,
        headers,
        data: parsedBody,
      });

      const latency = Math.round(performance.now() - start);
      setConsoleResponse({
        status: res.status,
        latencyMs: latency,
        data: res.data,
      });
      toast.success(`Request completed with ${res.status} OK`);
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      setConsoleResponse({
        status: err?.response?.status || 500,
        latencyMs: latency,
        data: err?.response?.data || { message: err?.message || 'Network request error' },
      });
    } finally {
      setConsoleRunning(false);
    }
  }

  return (
    <SettingsPanel wide>
      {/* ─── Top Banner & Quick Status ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              <IconCode size={14} className="text-indigo-400" />
              LeadCRM Developer Platform v1
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              LeadCRM REST API & Tokens
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              Push leads, trigger on-demand AI enrichment, sync inbound signups, and query CRM data
              programmatically using your workspace API tokens.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
            >
              <IconPlus size={16} />
              Create API Token
            </button>
            <a
              href={`${getApiBaseUrl()}/api/docs`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
            >
              <IconExternalLink size={16} />
              Swagger UI
            </a>
          </div>
        </div>

        {/* Base URL bar */}
        <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Base URL:
            </span>
            <code className="truncate rounded-md bg-white/10 px-2.5 py-1 font-mono text-xs text-indigo-200">
              {apiBase}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(apiBase, 'Base URL copied')}
              className="rounded p-1 text-slate-400 hover:text-white"
              title="Copy base URL"
            >
              <IconCopy size={14} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                pingStatus === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : pingStatus === 'error'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-white/10 text-slate-300'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  pingStatus === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                }`}
              />
              {pingStatus === 'success'
                ? `Operational (${pingLatency}ms)`
                : pingStatus === 'testing'
                  ? 'Pinging…'
                  : 'Ready'}
            </span>

            <button
              type="button"
              onClick={() => void testPing()}
              disabled={pingStatus === 'testing'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200 transition hover:bg-white/15"
            >
              <IconRefresh size={12} className={pingStatus === 'testing' ? 'animate-spin' : ''} />
              Ping API
            </button>
          </div>
        </div>
      </div>

      {/* ─── One-Time Token Reveal Alert ─── */}
      {revealedKey ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-slate-950">
                  <IconCheck size={14} stroke={3} />
                </span>
                <h3 className="font-semibold text-emerald-900 dark:text-emerald-200">
                  New API Token Generated
                </h3>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Copy this token now. For security reasons, it will not be displayed again.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
            >
              Dismiss
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-white/80 p-3 dark:bg-slate-900/90">
            <code className="break-all font-mono text-sm font-semibold text-emerald-950 dark:text-emerald-300">
              {revealedKey}
            </code>
            <button
              type="button"
              onClick={() => copyToClipboard(revealedKey, 'API Token copied!')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-emerald-500"
            >
              <IconCopy size={13} />
              Copy Token
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── API Tokens Card ─── */}
      <SettingsCard
        icon={IconKey}
        title="Workspace API Tokens"
        description="Tokens authenticate requests to the LeadCRM API via 'Authorization: Bearer lh_...' or 'X-API-Key: lh_...' headers."
        actions={
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className={settingsBtnPrimary}
          >
            <IconPlus size={15} />
            Create API Token
          </button>
        }
      >
        {loadingTokens ? (
          <div className="space-y-3 py-2">
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : tokens.length === 0 ? (
          <SettingsEmpty>
            <div className="space-y-2 text-center py-4">
              <IconKey className="mx-auto h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No active API tokens found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Generate an API token to start pushing leads, triggering enrichment, and integrating LeadCRM with your workflows.
              </p>
            </div>
          </SettingsEmpty>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 transition hover:bg-slate-50/70"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 text-sm">{token.name}</p>
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                      {token.maskedKey}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>Created: {new Date(token.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>
                      Last used: {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : 'Never'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      Scopes:
                      {token.scopes.map((s) => (
                        <span
                          key={s}
                          className="rounded bg-indigo-50 px-1.5 py-0.2 text-[10px] font-medium text-indigo-700"
                        >
                          {s}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveToken(token.maskedKey);
                      toast.info(`Selected ${token.name} for docs`);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1"
                  >
                    Use in Docs
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRevokeToken(token.id)}
                    className={settingsBtnDanger}
                    title="Revoke Token"
                  >
                    <IconTrash size={14} />
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>

      {/* ─── Interactive API Documentation Section ─── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <header className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <IconTerminal2 className="h-5 w-5 text-indigo-600" />
                Interactive LeadCRM API Documentation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an endpoint below to view parameters, copyable code samples in cURL, JS, and Python, or run live requests.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-slate-200/60 p-1">
              {(['curl', 'javascript', 'python'] as CodeLang[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLang(lang)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                    selectedLang === lang
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'curl' ? 'cURL' : lang === 'javascript' ? 'JavaScript' : 'Python'}
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint selection pills */}
          <div className="no-scrollbar mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            {ENDPOINTS.map((ep) => {
              const isSelected = ep.id === activeDoc.id;
              return (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => setSelectedEndpointId(ep.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      ep.method === 'GET'
                        ? isSelected
                          ? 'bg-indigo-700 text-white'
                          : 'bg-blue-50 text-blue-700'
                        : isSelected
                          ? 'bg-indigo-700 text-white'
                          : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {ep.method}
                  </span>
                  {ep.title}
                </button>
              );
            })}
          </div>
        </header>

        {/* Endpoint details & interactive explorer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* Left / Info Column */}
          <div className="p-6 lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                    activeDoc.method === 'GET'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {activeDoc.method}
                </span>
                <code className="font-mono text-sm font-semibold text-slate-800">
                  /api/v1/crm{activeDoc.path}
                </code>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 ml-auto">
                  Scope: {activeDoc.scope}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{activeDoc.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600 mt-1">{activeDoc.description}</p>
            </div>

            {/* Authentication guide */}
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Headers
              </p>
              <div className="font-mono text-xs text-slate-600 space-y-1">
                <div>
                  <span className="font-semibold text-slate-800">Authorization:</span> Bearer &lt;API_TOKEN&gt;
                </div>
                <div className="text-[11px] text-slate-400 pl-4">
                  (Or alternatively: <code className="text-slate-600">X-API-Key: &lt;API_TOKEN&gt;</code>)
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Content-Type:</span> application/json
                </div>
              </div>
            </div>

            {/* Query parameters table */}
            {activeDoc.queryParams && activeDoc.queryParams.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Query Parameters
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200/70">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200/70 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-2.5 font-semibold">Parameter</th>
                        <th className="p-2.5 font-semibold">Type</th>
                        <th className="p-2.5 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {activeDoc.queryParams.map((param) => (
                        <tr key={param.name} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-mono font-medium text-indigo-700">
                            {param.name}
                            {param.required ? <span className="text-red-500 ml-1">*</span> : null}
                          </td>
                          <td className="p-2.5 font-mono text-slate-500">{param.type}</td>
                          <td className="p-2.5">
                            {param.description}
                            <span className="block text-[11px] text-slate-400 mt-0.5">
                              e.g. {param.example}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {/* Request Body parameters table */}
            {activeDoc.bodyParams && activeDoc.bodyParams.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Request Body Schema
                </h4>
                <div className="overflow-hidden rounded-xl border border-slate-200/70">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200/70 bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-2.5 font-semibold">Field</th>
                        <th className="p-2.5 font-semibold">Type</th>
                        <th className="p-2.5 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {activeDoc.bodyParams.map((param) => (
                        <tr key={param.name} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-mono font-medium text-indigo-700">
                            {param.name}
                            {param.required ? <span className="text-red-500 ml-1">*</span> : null}
                          </td>
                          <td className="p-2.5 font-mono text-slate-500">{param.type}</td>
                          <td className="p-2.5">
                            {param.description}
                            <span className="block text-[11px] text-slate-400 mt-0.5">
                              e.g. {param.example}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right / Code & Live Runner Column */}
          <div className="p-6 lg:col-span-6 space-y-5 bg-slate-900 text-slate-200">
            {/* Code Snippet Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <IconCode size={14} className="text-indigo-400" />
                {selectedLang.toUpperCase()} Request Example
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(codeSnippet, 'Code snippet copied!')}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-white transition"
              >
                <IconCopy size={13} />
                Copy Code
              </button>
            </div>

            {/* Code block */}
            <pre className="no-scrollbar overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-400 border border-slate-800/80">
              <code>{codeSnippet}</code>
            </pre>

            {/* Custom JSON payload input for POST endpoints */}
            {activeDoc.method === 'POST' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Test Request Body (JSON)</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomTestBody(JSON.stringify(activeDoc.sampleBody, null, 2))
                    }
                    className="text-[11px] text-indigo-400 hover:underline"
                  >
                    Reset to Default
                  </button>
                </div>
                <textarea
                  value={customTestBody}
                  onChange={(e) => setCustomTestBody(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="Enter JSON payload"
                />
              </div>
            ) : null}

            {/* Run Live Request Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => void handleRunConsole()}
                disabled={consoleRunning}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-50"
              >
                <IconSend size={14} />
                {consoleRunning ? 'Sending Request…' : 'Run Live Request'}
              </button>
              <span className="text-[11px] text-slate-400">
                {activeToken ? 'Using active token' : 'Using active session'}
              </span>
            </div>

            {/* Live Console Output */}
            {consoleResponse ? (
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Live Response</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                        consoleResponse.status >= 200 && consoleResponse.status < 300
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {consoleResponse.status} {consoleResponse.status === 200 ? 'OK' : consoleResponse.status === 201 ? 'CREATED' : 'ERROR'}
                    </span>
                    <span className="text-slate-500 text-[11px]">{consoleResponse.latencyMs}ms</span>
                  </div>
                </div>
                <pre className="no-scrollbar max-h-60 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-indigo-300 border border-slate-800">
                  <code>{JSON.stringify(consoleResponse.data, null, 2)}</code>
                </pre>
              </div>
            ) : (
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <span className="text-xs font-semibold text-slate-400">Example Response</span>
                <pre className="no-scrollbar max-h-52 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-400 border border-slate-800">
                  <code>{JSON.stringify(activeDoc.sampleResponse, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Modal: Create API Token ─── */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create LeadCRM API Token</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generate a token to access your workspace programmatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateToken} className="space-y-4">
              <SettingsField label="Token Name" htmlFor="tokenName">
                <input
                  id="tokenName"
                  type="text"
                  required
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  placeholder="e.g. Zapier Sync, LeadHub Bot, Production CRM"
                  className={settingsInputClass}
                />
              </SettingsField>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Permissions & Scopes
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fullAccessPreset}
                      onChange={(e) => setFullAccessPreset(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Full Access (*)
                  </label>
                </div>

                {!fullAccessPreset ? (
                  <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 max-h-48 overflow-y-auto">
                    {ALL_SCOPES.map((scope) => (
                      <label
                        key={scope.id}
                        className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer p-1 hover:bg-white rounded transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedScopes([...selectedScopes, scope.id]);
                            } else {
                              setSelectedScopes(selectedScopes.filter((s) => s !== scope.id));
                            }
                          }}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="font-mono font-semibold text-slate-900">{scope.label}</span>
                          <p className="text-[11px] text-slate-500">{scope.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 rounded-xl bg-slate-50 p-3 border border-slate-100">
                    Full access grants permissions to read/push leads, run enrichment, view signups, and query account metrics.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={settingsBtnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingToken || !newTokenName.trim()}
                  className={settingsBtnPrimary}
                >
                  {creatingToken ? 'Generating…' : 'Generate Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </SettingsPanel>
  );
}
