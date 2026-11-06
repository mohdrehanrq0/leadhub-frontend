'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  IconBrandLinkedin,
  IconCheck,
  IconCode,
  IconCoin,
  IconCopy,
  IconDownload,
  IconGlobe,
  IconKey,
  IconLoader2,
  IconMail,
  IconPlayerPlay,
  IconX,
} from '@tabler/icons-react';
import {
  fetchCreditBalance,
  fetchLinkedInCompany,
  fetchLinkedInEmployees,
  fetchLinkedInProfile,
  fetchPricing,
  fetchWebExtract,
  fetchWebScrape,
  fetchWebSearch,
  TOOL_DEFINITIONS,
  type CreditBalance,
  type DataMeta,
  type PriceEntry,
  type ToolDefinition,
} from '@/lib/data-api';
import { getApiBaseUrl } from '@/lib/api-base';
import { cn } from '@/lib/utils';
import { spinnerClass } from '@/components/ui/styles';

const CATEGORY_ICONS = {
  linkedin: IconBrandLinkedin,
  web: IconGlobe,
  email: IconMail,
};

type CodeLang = 'curl' | 'javascript' | 'python';

function copyText(text: string, label = 'Copied') {
  void navigator.clipboard.writeText(text);
  toast.success(label);
}

function ToolCard({
  tool,
  price,
  onRun,
}: {
  tool: ToolDefinition;
  price?: PriceEntry;
  onRun: (tool: ToolDefinition) => void;
}) {
  const Icon = CATEGORY_ICONS[tool.category];
  const credits = price?.credits ?? 1;

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border bg-white p-5 transition-shadow hover:shadow-md',
        !tool.available && 'opacity-60',
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            tool.category === 'linkedin' && 'bg-blue-50 text-blue-600',
            tool.category === 'web' && 'bg-green-50 text-green-600',
            tool.category === 'email' && 'bg-purple-50 text-purple-600',
          )}
        >
          <Icon size={22} />
        </div>
        <div className="flex items-center gap-1 text-sm text-zinc-500">
          <IconCoin size={14} />
          <span>{credits}</span>
        </div>
      </div>

      <h3 className="mb-1 font-semibold text-zinc-900">{tool.name}</h3>
      <p className="mb-4 flex-1 text-sm text-zinc-500">{tool.description}</p>

      {tool.available ? (
        <button
          type="button"
          onClick={() => onRun(tool)}
          className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          <IconPlayerPlay size={16} />
          Run Tool
        </button>
      ) : (
        <div className="rounded-lg bg-zinc-100 px-4 py-2 text-center text-sm text-zinc-500">
          Coming Soon
        </div>
      )}
    </div>
  );
}

function ToolRunModal({
  tool,
  price,
  onClose,
  onBalanceUpdate,
}: {
  tool: ToolDefinition;
  price?: PriceEntry;
  onClose: () => void;
  onBalanceUpdate: (meta: DataMeta) => void;
}) {
  const [input, setInput] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ data: unknown; meta?: DataMeta } | null>(null);

  const needsPrompt = tool.id === 'web-extract';
  const credits = price?.credits ?? 1;

  const isValid = useMemo(() => {
    if (!input.trim()) return false;
    if (needsPrompt && !prompt.trim()) return false;
    if (tool.inputSchema.validation) {
      return tool.inputSchema.validation.test(input);
    }
    return true;
  }, [input, prompt, needsPrompt, tool.inputSchema.validation]);

  async function handleRun() {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;
      if (tool.id === 'linkedin-profile') {
        response = await fetchLinkedInProfile(input);
      } else if (tool.id === 'linkedin-company') {
        response = await fetchLinkedInCompany(input);
      } else if (tool.id === 'linkedin-employees') {
        response = await fetchLinkedInEmployees(input);
      } else if (tool.id === 'web-scrape') {
        response = await fetchWebScrape([input]);
      } else if (tool.id === 'web-search') {
        response = await fetchWebSearch(input);
      } else if (tool.id === 'web-extract') {
        response = await fetchWebExtract(input, prompt);
      } else {
        throw new Error('Tool not implemented');
      }

      if (!response.success) {
        const anyRes = response as { required?: number; balance?: number; message?: string; error?: string };
        if (response.error === 'insufficient_credits') {
          setError(`Insufficient credits. Need ${anyRes.required}, have ${anyRes.balance}.`);
        } else {
          setError(anyRes.message ?? anyRes.error ?? 'Request failed');
        }
        return;
      }

      setResult({ data: response.data, meta: response.meta });
      if (response.meta) onBalanceUpdate(response.meta);
      toast.success('Tool completed');
    } catch (err) {
      const axiosErr = err as {
        response?: { status?: number; data?: { message?: string; error?: string; required?: number; balance?: number } };
        message?: string;
      };
      const data = axiosErr.response?.data;
      if (axiosErr.response?.status === 402 || data?.error === 'insufficient_credits') {
        setError(
          `Insufficient credits. Need ${data?.required ?? '?'}, have ${data?.balance ?? '?'}.`,
        );
      } else {
        setError(data?.message ?? data?.error ?? axiosErr.message ?? 'Request failed');
      }
    } finally {
      setLoading(false);
    }
  }

  function downloadResult() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tool.id}-result.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRunAgain() {
    setResult(null);
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={cn(
          'flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-xl',
          result ? 'max-w-3xl' : 'max-w-md',
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">{tool.name}</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {credits} credit{credits === 1 ? '' : 's'} per run · {tool.path}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Close"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {!result ? (
            <>
              <label className="mb-2 block text-sm font-medium text-zinc-700">
                {tool.inputSchema.label}
              </label>
              <input
                type={tool.inputSchema.type === 'url' ? 'url' : 'text'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={tool.inputSchema.placeholder}
                className="mb-4 w-full rounded-lg border px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                autoFocus
                disabled={loading}
              />

              {needsPrompt && (
                <>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Extraction Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="What data should be extracted? e.g., 'Extract company name, pricing info, and key features'"
                    rows={3}
                    className="mb-4 w-full rounded-lg border px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                    disabled={loading}
                  />
                </>
              )}

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {result.meta && (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-zinc-700">
                    Credits used: <strong>{result.meta.creditsCharged}</strong>
                  </span>
                  <span className="rounded-md bg-zinc-100 px-2.5 py-1 text-zinc-700">
                    Balance: <strong>{result.meta.balanceAfter}</strong>
                  </span>
                  {result.meta.cache.hit && (
                    <span className="rounded-md bg-green-50 px-2.5 py-1 text-green-700">Cached</span>
                  )}
                  <span className="text-xs text-zinc-400">{result.meta.provider}</span>
                </div>
              )}
              <pre className="max-h-[55vh] overflow-auto rounded-lg border bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-700">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t px-5 py-4">
          {!result ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={!isValid || loading}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white',
                  (!isValid || loading) && 'cursor-not-allowed opacity-50',
                )}
              >
                {loading ? (
                  <>
                    <IconLoader2 size={16} className="animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <IconPlayerPlay size={16} />
                    Run
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={downloadResult}
                className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                <IconDownload size={16} />
                Download JSON
              </button>
              <button
                type="button"
                onClick={handleRunAgain}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Run again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function buildSnippet(tool: ToolDefinition, baseUrl: string, lang: CodeLang): string {
  const url = `${baseUrl}${tool.path}`;
  const body = JSON.stringify(tool.sampleBody, null, 2);

  if (lang === 'curl') {
    return `curl -X POST "${url}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '${JSON.stringify(tool.sampleBody)}'`;
  }

  if (lang === 'javascript') {
    return `const res = await fetch("${url}", {
  method: "POST",
  headers: {
    Authorization: "Bearer YOUR_API_KEY",
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify(${body}),
});

const json = await res.json();
console.log(json.data, json.meta);`;
  }

  const pyBody = JSON.stringify(tool.sampleBody, null, 4)
    .replace(/\btrue\b/g, 'True')
    .replace(/\bfalse\b/g, 'False')
    .replace(/\bnull\b/g, 'None');

  return `import requests
import uuid

res = requests.post(
    "${url}",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json",
        "Idempotency-Key": str(uuid.uuid4()),
    },
    json=${pyBody},
)
print(res.json())`;
}

function ToolsApiSection({ pricing }: { pricing: PriceEntry[] }) {
  const baseUrl = useMemo(() => getApiBaseUrl(), []);
  const availableTools = TOOL_DEFINITIONS.filter((t) => t.available);
  const [selectedId, setSelectedId] = useState(availableTools[0]?.id ?? '');
  const [lang, setLang] = useState<CodeLang>('curl');
  const [copied, setCopied] = useState(false);

  const selected = availableTools.find((t) => t.id === selectedId) ?? availableTools[0];
  const price = pricing.find((p) => p.operation === selected?.operation);

  const snippet = selected ? buildSnippet(selected, baseUrl, lang) : '';

  function handleCopy() {
    copyText(snippet, 'Code copied');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!selected) return null;

  return (
    <section className="rounded-xl border bg-white">
      <div className="border-b px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <IconCode size={18} className="text-zinc-500" />
              <h2 className="text-lg font-semibold text-zinc-900">Data Tools API</h2>
            </div>
            <p className="text-sm text-zinc-500">
              Call these same tools from n8n, Zapier, or your own backend with an API key.
            </p>
          </div>
          <Link
            href="/dashboard/settings/developer-api"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <IconKey size={14} />
            Manage API keys
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr]">
        <div className="border-b lg:border-b-0 lg:border-r">
          <div className="p-3">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
              Endpoints
            </p>
            <div className="space-y-1">
              {availableTools.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setSelectedId(tool.id)}
                  className={cn(
                    'flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors',
                    selectedId === tool.id ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-50',
                  )}
                >
                  <span className="text-sm font-medium">{tool.name}</span>
                  <span
                    className={cn(
                      'mt-0.5 font-mono text-[11px]',
                      selectedId === tool.id ? 'text-zinc-300' : 'text-zinc-400',
                    )}
                  >
                    {tool.method} {tool.path}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {selected.method}
              </span>
              <code className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-sm text-zinc-800">
                {selected.path}
              </code>
              <button
                type="button"
                onClick={() => copyText(`${baseUrl}${selected.path}`, 'Endpoint copied')}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                aria-label="Copy endpoint"
              >
                <IconCopy size={14} />
              </button>
            </div>
            <p className="text-sm text-zinc-600">{selected.description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border px-2.5 py-1 text-zinc-600">
                Scope: <code className="font-mono">{selected.scope}</code>
              </span>
              <span className="rounded-full border px-2.5 py-1 text-zinc-600">
                Credits: {price?.credits ?? '—'}
              </span>
              <span className="rounded-full border px-2.5 py-1 text-zinc-600">
                Auth: Bearer API key
              </span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Request body
            </p>
            <pre className="overflow-x-auto rounded-lg border bg-zinc-50 p-3 text-xs text-zinc-700">
              {JSON.stringify(selected.sampleBody, null, 2)}
            </pre>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Example
              </p>
              <div className="flex items-center gap-1 rounded-lg border p-0.5">
                {(['curl', 'javascript', 'python'] as CodeLang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium capitalize',
                      lang === l ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50',
                    )}
                  >
                    {l === 'javascript' ? 'JS' : l}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-100">
                {snippet}
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
              >
                {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Response includes credit meta</p>
            <p className="mt-1 text-amber-800/90">
              Successful calls return <code className="rounded bg-white/70 px-1">data</code> plus{' '}
              <code className="rounded bg-white/70 px-1">meta.creditsCharged</code>,{' '}
              <code className="rounded bg-white/70 px-1">meta.balanceAfter</code>, and cache info.
              Insufficient credits return <strong>402</strong> with a billing URL.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ToolsPage() {
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [pricing, setPricing] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);

  useEffect(() => {
    Promise.all([fetchCreditBalance(), fetchPricing()])
      .then(([bal, prices]) => {
        setBalance(bal);
        setPricing(prices);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  function getPrice(operation: string): PriceEntry | undefined {
    return pricing.find((p) => p.operation === operation);
  }

  function handleBalanceUpdate(meta: DataMeta) {
    setBalance((prev) =>
      prev
        ? {
            ...prev,
            balance: meta.balanceAfter,
            available: meta.balanceAfter,
          }
        : prev,
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <IconLoader2 className={spinnerClass} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Data Tools</h1>
          <p className="mt-1 text-zinc-500">
            Run single lookups powered by LinkedIn and web data
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 rounded-lg bg-zinc-50 px-4 py-2">
          <div className="flex items-center gap-2">
            <IconCoin size={18} className="text-zinc-400" />
            <span className="text-lg font-semibold text-zinc-900">{balance?.available ?? balance?.balance ?? 0}</span>
            <span className="text-sm text-zinc-500">credits</span>
          </div>
          {balance?.freeBalance && balance.freeBalance > 0 && (
            <div className="text-xs text-zinc-500">
              {balance.freeBalance} free
              {balance.freeExpiresAt && (
                <> (expires {new Date(balance.freeExpiresAt).toLocaleDateString()})</>
              )}
            </div>
          )}
        </div>
      </div>

      {balance && balance.available === 20 && (
        <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-6">
          <h2 className="mb-2 text-lg font-semibold text-green-900">
            Welcome — you have 20 free credits
          </h2>
          <p className="mb-4 text-green-700">Try these tools to get started:</p>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg bg-white px-3 py-2 text-sm">
              <strong>LinkedIn Profile</strong> — 2 credits
            </div>
            <div className="rounded-lg bg-white px-3 py-2 text-sm">
              <strong>LinkedIn Company</strong> — 1 credit
            </div>
            <div className="rounded-lg bg-white px-3 py-2 text-sm">
              <strong>Web Extract</strong> — 2 credits
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
          LinkedIn Tools
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_DEFINITIONS.filter((t) => t.category === 'linkedin').map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              price={getPrice(tool.operation)}
              onRun={setSelectedTool}
            />
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Web Tools
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_DEFINITIONS.filter((t) => t.category === 'web').map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              price={getPrice(tool.operation)}
              onRun={setSelectedTool}
            />
          ))}
        </div>
      </div>

      <ToolsApiSection pricing={pricing} />

      {selectedTool && (
        <ToolRunModal
          tool={selectedTool}
          price={getPrice(selectedTool.operation)}
          onClose={() => setSelectedTool(null)}
          onBalanceUpdate={handleBalanceUpdate}
        />
      )}
    </div>
  );
}
