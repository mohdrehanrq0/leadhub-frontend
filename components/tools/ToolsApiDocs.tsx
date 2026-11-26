'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  IconAlertCircle,
  IconBrandLinkedin,
  IconCheck,
  IconCode,
  IconCopy,
  IconKey,
  IconMail,
} from '@tabler/icons-react';
import { getApiBaseUrl } from '@/lib/api-base';
import type { PublicToolPrice } from '@/lib/public-tools-api';
import { cn } from '@/lib/utils';

type CodeLang = 'curl' | 'javascript' | 'python';
type EndpointId = 'linkedin-profile' | 'linkedin-company' | 'email-finder';

interface BodyParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example: string;
}

interface EndpointSpec {
  id: EndpointId;
  name: string;
  operation: 'linkedin/profile' | 'linkedin/company' | 'tools/email-finder';
  method: 'POST';
  path: string;
  scope: string;
  summary: string;
  bodyParams: BodyParam[];
  sampleBody: Record<string, unknown>;
  sampleSuccess: Record<string, unknown>;
  notes?: string[];
}

const ENDPOINTS: EndpointSpec[] = [
  {
    id: 'linkedin-profile',
    name: 'LinkedIn Profile',
    operation: 'linkedin/profile',
    method: 'POST',
    path: '/api/v1/linkedin/profile',
    scope: 'data:linkedin',
    summary: 'Scrape a LinkedIn person profile via Apify and return structured profile details.',
    bodyParams: [
      {
        name: 'url',
        type: 'string (URL)',
        required: true,
        description: 'Full LinkedIn profile URL containing linkedin.com/in/',
        example: 'https://www.linkedin.com/in/satyanadella',
      },
    ],
    sampleBody: {
      url: 'https://www.linkedin.com/in/satyanadella',
    },
    sampleSuccess: {
      success: true,
      data: {
        linkedinUrl: 'https://www.linkedin.com/in/satyanadella',
        firstName: 'Satya',
        lastName: 'Nadella',
        headline: 'Chairman and CEO at Microsoft',
        location: { linkedinText: 'Redmond, Washington, United States' },
        connectionsCount: 500,
        followerCount: 11200000,
        experience: [
          {
            position: 'Chairman and CEO',
            companyName: 'Microsoft',
            duration: '2014 - Present',
          },
        ],
      },
      meta: {
        creditsCharged: 2,
        balanceAfter: 18,
        cache: { hit: false },
        asOf: '2026-11-26T06:15:00.000Z',
        provider: 'apify',
        priceVersion: 1,
      },
    },
  },
  {
    id: 'linkedin-company',
    name: 'LinkedIn Company',
    operation: 'linkedin/company',
    method: 'POST',
    path: '/api/v1/linkedin/company',
    scope: 'data:linkedin',
    summary: 'Scrape a LinkedIn company page and return industry, size, website, and HQ details.',
    bodyParams: [
      {
        name: 'url',
        type: 'string (URL)',
        required: true,
        description: 'Full LinkedIn company URL containing linkedin.com/company/',
        example: 'https://www.linkedin.com/company/microsoft',
      },
    ],
    sampleBody: {
      url: 'https://www.linkedin.com/company/microsoft',
    },
    sampleSuccess: {
      success: true,
      data: {
        linkedinUrl: 'https://www.linkedin.com/company/microsoft',
        name: 'Microsoft',
        website: 'https://www.microsoft.com',
        industry: 'Software Development',
        employeeCount: 221000,
        followerCount: 24500000,
        headquarter: { city: 'Redmond', geographicArea: 'WA', country: 'US' },
        founded: { year: 1975 },
      },
      meta: {
        creditsCharged: 2,
        balanceAfter: 16,
        cache: { hit: false },
        asOf: '2026-11-26T06:16:00.000Z',
        provider: 'apify',
        priceVersion: 1,
      },
    },
  },
  {
    id: 'email-finder',
    name: 'Email Finder',
    operation: 'tools/email-finder',
    method: 'POST',
    path: '/api/v1/email/find',
    scope: 'data:email (or enrich:write)',
    summary:
      'Checks if the company website is active, verifies MX records, generates name@domain combinations, and verifies them with Apify Bounceverify.',
    bodyParams: [
      {
        name: 'fullName',
        type: 'string',
        required: true,
        description: "Person's full name (first and last name)",
        example: 'Jane Doe',
      },
      {
        name: 'domain',
        type: 'string',
        required: true,
        description: 'Company domain (with or without https:// or www.)',
        example: 'acme.com',
      },
    ],
    sampleBody: {
      fullName: 'Jane Doe',
      domain: 'acme.com',
    },
    sampleSuccess: {
      success: true,
      data: {
        email: 'jane.doe@acme.com',
        message: 'Email found',
        websiteActive: true,
        hasMx: true,
        patternsTried: 8,
      },
      meta: {
        creditsCharged: 3,
        balanceAfter: 13,
        cache: { hit: false },
        asOf: '2026-11-26T06:17:00.000Z',
        provider: 'apify',
        priceVersion: 1,
      },
    },
    notes: [
      'When no valid email is found, the endpoint still returns HTTP 200 with data.email = null and data.message = "Email not found".',
      'If the company website is inactive/unreachable, verification is skipped and only 1 credit is charged (data.websiteActive = false).',
    ],
  },
];

const ERROR_SPECS = [
  {
    status: 400,
    code: 'invalid_input',
    charged: '0 cr',
    when: 'Missing or malformed fields (e.g. invalid LinkedIn URL, single-word name, bad domain).',
    example: {
      success: false,
      error: 'invalid_input',
      message: 'Must be a LinkedIn profile URL (linkedin.com/in/...)',
    },
  },
  {
    status: 401,
    code: 'unauthorized',
    charged: '0 cr',
    when: 'Missing, invalid, or revoked API key / Bearer token.',
    example: {
      success: false,
      message: 'Invalid or revoked API key.',
    },
  },
  {
    status: 402,
    code: 'insufficient_credits',
    charged: '0 cr',
    when: 'Workspace credit balance is lower than the tool cost.',
    example: {
      success: false,
      error: 'insufficient_credits',
      required: 3,
      balance: 1,
      buyUrl: 'https://app.leadhub.io/dashboard/billing',
      message: 'Need 3 credit(s), have 1.',
    },
  },
  {
    status: 403,
    code: 'insufficient_scope',
    charged: '0 cr',
    when: 'API key does not include the required scope (data:linkedin or data:email).',
    example: {
      success: false,
      message: 'API key lacks required scope: data:linkedin',
    },
  },
  {
    status: 404,
    code: 'not_found',
    charged: '0 cr',
    when: 'LinkedIn profile or company URL could not be found.',
    example: {
      success: false,
      error: 'not_found',
      message: 'Profile not found',
      meta: { creditsCharged: 0, balanceAfter: 18, provider: 'apify' },
    },
  },
  {
    status: 502,
    code: 'provider_failed',
    charged: '0 cr',
    when: 'Upstream Apify actor failed or timed out — credits are not deducted.',
    example: {
      success: false,
      error: 'provider_failed',
      message: 'Apify run failed — please retry.',
    },
  },
  {
    status: 503,
    code: 'provider_unavailable',
    charged: '0 cr',
    when: 'Provider is temporarily disabled or APIFY_TOKEN is not configured.',
    example: {
      success: false,
      error: 'provider_unavailable',
      message: 'LinkedIn profile lookup is temporarily unavailable',
    },
  },
];

function buildSnippet(lang: CodeLang, fullUrl: string, body: Record<string, unknown>): string {
  const json = JSON.stringify(body, null, 2);
  if (lang === 'curl') {
    return `curl -X POST "${fullUrl}" \\
  -H "Authorization: Bearer lh_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(body)}'`;
  }
  if (lang === 'javascript') {
    return `const res = await fetch("${fullUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer lh_your_api_key_here",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${json}),
});

const data = await res.json();
if (!res.ok) {
  console.error("API error:", res.status, data);
} else {
  console.log("Result:", data.data, "Credits used:", data.meta.creditsCharged);
}`;
  }
  return `import requests

res = requests.post(
    "${fullUrl}",
    headers={
        "Authorization": "Bearer lh_your_api_key_here",
        "Content-Type": "application/json",
    },
    json=${json},
    timeout=120,
)

payload = res.json()
if not res.ok:
    print("API error:", res.status_code, payload)
else:
    print("Result:", payload["data"], "Balance:", payload["meta"]["balanceAfter"])`;
}

export function ToolsApiDocs({
  prices,
  isLoggedIn,
}: {
  prices: PublicToolPrice[];
  isLoggedIn: boolean;
}) {
  const [selectedId, setSelectedId] = useState<EndpointId>('linkedin-profile');
  const [lang, setLang] = useState<CodeLang>('curl');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedErrorIdx, setSelectedErrorIdx] = useState<number>(2); // 402 by default

  const baseUrl = useMemo(() => getApiBaseUrl().replace(/\/+$/, ''), []);
  const endpoint = ENDPOINTS.find((e) => e.id === selectedId) ?? ENDPOINTS[0]!;
  const fullUrl = `${baseUrl}${endpoint.path}`;
  const price = prices.find((p) => p.operation === endpoint.operation)?.credits;
  const snippet = useMemo(
    () => buildSnippet(lang, fullUrl, endpoint.sampleBody),
    [lang, fullUrl, endpoint.sampleBody],
  );

  function copy(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <IconCode size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">API Documentation</h2>
            <p className="text-sm text-slate-600">
              Call LinkedIn Profile, LinkedIn Company, and Email Finder directly from your backend,
              scripts, or n8n using your LeadHub API key.
            </p>
          </div>
        </div>
        <Link
          href={isLoggedIn ? '/dashboard/settings/developer-api' : '/login?from=/dashboard/settings/developer-api'}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          <IconKey size={16} />
          {isLoggedIn ? 'Manage API keys' : 'Log in for API keys'}
        </Link>
      </div>

      {/* Authentication block */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-semibold text-slate-900">Authentication (Token)</p>
        <p className="mt-1 text-slate-600">
          Pass your workspace Service API key (<code className="rounded bg-white px-1.5 py-0.5 text-xs">lh_…</code>) in either header. Workspace is resolved automatically from the key.
        </p>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800">
            Authorization: Bearer lh_your_api_key_here
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800">
            X-API-Key: lh_your_api_key_here
          </div>
        </div>
      </div>

      {/* Endpoint tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {ENDPOINTS.map((ep) => {
          const active = ep.id === endpoint.id;
          const epCredits = prices.find((p) => p.operation === ep.operation)?.credits;
          const Icon = ep.id === 'email-finder' ? IconMail : IconBrandLinkedin;
          return (
            <button
              key={ep.id}
              type="button"
              onClick={() => setSelectedId(ep.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              <Icon size={16} />
              <span>{ep.name}</span>
              {typeof epCredits === 'number' ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {epCredits} cr
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Endpoint details */}
      <div className="mt-5 space-y-6">
        {/* Method + URL + Scope */}
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
                {endpoint.method}
              </span>
              <code className="break-all font-mono text-sm text-slate-900">{fullUrl}</code>
            </div>
            <button
              type="button"
              onClick={() => copy(fullUrl, 'url')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copiedKey === 'url' ? <IconCheck size={14} /> : <IconCopy size={14} />}
              Copy URL
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-600">{endpoint.summary}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
            <span>
              <strong className="text-slate-800">Scope:</strong>{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">{endpoint.scope}</code>
            </span>
            <span>
              <strong className="text-slate-800">Content-Type:</strong>{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">application/json</code>
            </span>
            <span>
              <strong className="text-slate-800">Optional Header:</strong>{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5">Idempotency-Key</code>
            </span>
            {typeof price === 'number' ? (
              <span>
                <strong className="text-slate-800">Cost:</strong> {price} credit(s) per run
              </span>
            ) : null}
          </div>
        </div>

        {/* Request Body schema */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Request Body (JSON)</h3>
          <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Required</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {endpoint.bodyParams.map((p) => (
                  <tr key={p.name}>
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-900">
                      {p.name}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{p.type}</td>
                    <td className="px-3 py-2 text-xs">
                      {p.required ? (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700">
                          Required
                        </span>
                      ) : (
                        <span className="text-slate-500">Optional</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{p.description}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{p.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Code examples */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Request Example</h3>
            <div className="flex items-center gap-1">
              {(['curl', 'javascript', 'python'] as CodeLang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-medium capitalize',
                    lang === l
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  )}
                >
                  {l === 'curl' ? 'cURL' : l}
                </button>
              ))}
              <button
                type="button"
                onClick={() => copy(snippet, 'snippet')}
                className="ml-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {copiedKey === 'snippet' ? <IconCheck size={14} /> : <IconCopy size={14} />}
                Copy
              </button>
            </div>
          </div>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
            {snippet}
          </pre>
        </div>

        {/* Success response */}
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Success Response <span className="ml-1 font-mono text-xs text-emerald-700">200 OK</span>
            </h3>
            <button
              type="button"
              onClick={() => copy(JSON.stringify(endpoint.sampleSuccess, null, 2), 'success')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {copiedKey === 'success' ? <IconCheck size={14} /> : <IconCopy size={14} />}
              Copy JSON
            </button>
          </div>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-200">
            {JSON.stringify(endpoint.sampleSuccess, null, 2)}
          </pre>
          <p className="mt-2 text-xs text-slate-600">
            Every successful response returns <code className="rounded bg-slate-100 px-1">success: true</code>, the tool output in{' '}
            <code className="rounded bg-slate-100 px-1">data</code>, and billing info in{' '}
            <code className="rounded bg-slate-100 px-1">meta</code> (<code className="rounded bg-slate-100 px-1">creditsCharged</code>,{' '}
            <code className="rounded bg-slate-100 px-1">balanceAfter</code>,{' '}
            <code className="rounded bg-slate-100 px-1">provider</code>,{' '}
            <code className="rounded bg-slate-100 px-1">asOf</code>).
          </p>
          {endpoint.notes?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
              {endpoint.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* Error responses & types */}
        <div className="border-t border-slate-200 pt-5">
          <div className="flex items-center gap-2">
            <IconAlertCircle size={18} className="text-rose-600" />
            <h3 className="text-sm font-semibold text-slate-900">
              Error Responses &amp; Error Types
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            All errors return <code className="rounded bg-slate-100 px-1">success: false</code>, a machine-readable{' '}
            <code className="rounded bg-slate-100 px-1">error</code> code (on 400/402/404/502/503), and a human-readable{' '}
            <code className="rounded bg-slate-100 px-1">message</code>. Click any row to inspect the exact JSON body.
          </p>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">HTTP Status</th>
                  <th className="px-3 py-2">Error Type</th>
                  <th className="px-3 py-2">Credits</th>
                  <th className="px-3 py-2">When it happens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ERROR_SPECS.map((err, idx) => (
                  <tr
                    key={err.status}
                    onClick={() => setSelectedErrorIdx(idx)}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-slate-50',
                      selectedErrorIdx === idx && 'bg-rose-50/60',
                    )}
                  >
                    <td className="px-3 py-2 font-mono font-semibold text-rose-700">{err.status}</td>
                    <td className="px-3 py-2 font-mono text-slate-900">{err.code}</td>
                    <td className="px-3 py-2 text-slate-600">{err.charged}</td>
                    <td className="px-3 py-2 text-slate-600">{err.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {ERROR_SPECS[selectedErrorIdx] ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-700">
                Example {ERROR_SPECS[selectedErrorIdx]!.status} ({ERROR_SPECS[selectedErrorIdx]!.code}) response body:
              </p>
              <pre className="mt-1.5 overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-rose-200">
                {JSON.stringify(ERROR_SPECS[selectedErrorIdx]!.example, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
