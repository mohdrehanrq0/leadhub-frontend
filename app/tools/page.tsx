'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  IconBrandLinkedin,
  IconCoin,
  IconKey,
  IconLoader2,
  IconMail,
  IconPlayerPlay,
  IconX,
} from '@tabler/icons-react';
import {
  fetchPublicToolsPricing,
  initPublicToolsSession,
  PUBLIC_TOOL_DEFINITIONS,
  runPublicTool,
  type PublicToolPrice,
  type PublicToolsSession,
  type ToolDefinition,
} from '@/lib/public-tools-api';
import { getBrowserFingerprint } from '@/lib/fingerprint';
import { AUTH_SIGNUP_UI } from '@/lib/features';
import { useAuth } from '@/context/AuthContext';
import { ToolsApiDocs } from '@/components/tools/ToolsApiDocs';
import { cn } from '@/lib/utils';
import { spinnerClass } from '@/components/ui/styles';

const CATEGORY_ICONS = {
  linkedin: IconBrandLinkedin,
  email: IconMail,
};

function creditsFor(tool: ToolDefinition, prices: PublicToolPrice[]): number {
  return prices.find((p) => p.operation === tool.operation)?.credits ?? 1;
}

function ResultView({ data }: { data: Record<string, unknown> }) {
  if (data.email !== undefined) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-slate-600">{String(data.message ?? '')}</p>
        {data.email ? (
          <p className="text-lg font-semibold text-slate-900">{String(data.email)}</p>
        ) : (
          <p className="font-medium text-slate-800">Email not found</p>
        )}
        <dl className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-500">
          <div>
            <dt>Website</dt>
            <dd className="text-slate-700">{data.websiteActive ? 'Active' : 'Inactive'}</dd>
          </div>
          <div>
            <dt>MX</dt>
            <dd className="text-slate-700">{data.hasMx ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      </div>
    );
  }

  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0),
  );

  return (
    <dl className="space-y-3 text-sm">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {key.replace(/([A-Z])/g, ' $1')}
          </dt>
          <dd className="mt-0.5 text-slate-800">
            {typeof value === 'object' ? (
              <pre className="overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs">
                {JSON.stringify(value, null, 2)}
              </pre>
            ) : (
              String(value)
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ToolCard({
  tool,
  credits,
  disabled,
  onRun,
}: {
  tool: ToolDefinition;
  credits: number;
  disabled: boolean;
  onRun: (tool: ToolDefinition) => void;
}) {
  const Icon = CATEGORY_ICONS[tool.category];
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            tool.category === 'linkedin' && 'bg-sky-50 text-sky-700',
            tool.category === 'email' && 'bg-emerald-50 text-emerald-700',
          )}
        >
          <Icon size={22} />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          <IconCoin size={14} />
          {credits} cr
        </span>
      </div>
      <h3 className="text-base font-semibold text-slate-900">{tool.name}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-600">{tool.description}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRun(tool)}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconPlayerPlay size={16} />
        Run
      </button>
    </div>
  );
}

export default function ToolsPage() {
  const { user, activeWorkspaceId } = useAuth();
  const isLoggedIn = Boolean(user);

  const [session, setSession] = useState<PublicToolsSession | null>(null);
  const [prices, setPrices] = useState<PublicToolPrice[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [activeTool, setActiveTool] = useState<ToolDefinition | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [lastMeta, setLastMeta] = useState<{ creditsCharged: number; balanceAfter: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fp = await getBrowserFingerprint();
        const [sess, pricing] = await Promise.all([
          initPublicToolsSession(fp),
          fetchPublicToolsPricing(),
        ]);
        if (cancelled) return;
        setSession(sess);
        setPrices(pricing.tools);
      } catch (err) {
        if (!cancelled) {
          setBootError(err instanceof Error ? err.message : 'Failed to start tools session');
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, activeWorkspaceId]);

  const balance = session?.balance ?? 0;
  const exhausted = !booting && balance <= 0;

  const priceMap = useMemo(() => prices, [prices]);

  function openTool(tool: ToolDefinition) {
    setActiveTool(tool);
    setForm({});
    setResult(null);
    setRunError(null);
    setLastMeta(null);
  }

  async function submitRun() {
    if (!activeTool) return;
    setRunning(true);
    setRunError(null);
    setResult(null);
    try {
      const body: Record<string, string> = {};
      for (const field of activeTool.fields) {
        body[field.name] = (form[field.name] ?? '').trim();
      }
      const res = await runPublicTool(activeTool.path, body);
      if (!res.success) {
        setRunError(res.message ?? res.error ?? 'Tool failed');
        if (typeof res.balance === 'number' && session) {
          setSession({ ...session, balance: res.balance });
        }
        if (res.error === 'insufficient_credits') {
          toast.error('Not enough credits');
        }
        return;
      }
      setResult(res.data ?? {});
      if (res.meta) {
        setLastMeta({
          creditsCharged: res.meta.creditsCharged,
          balanceAfter: res.meta.balanceAfter,
        });
        if (session) {
          setSession({
            ...session,
            balance: res.meta.balanceAfter,
            guest:
              session.payer === 'guest'
                ? { ...session.guest, balance: res.meta.balanceAfter }
                : session.guest,
            workspace:
              session.payer === 'workspace' && session.workspace
                ? { ...session.workspace, available: res.meta.balanceAfter }
                : session.workspace,
          });
        }
      }
      toast.success('Done');
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setRunning(false);
    }
  }

  if (booting) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className={spinnerClass} />
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {bootError}
      </div>
    );
  }

  return (
    <div className={isLoggedIn ? 'mx-auto max-w-6xl' : undefined}>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {!isLoggedIn ? (
            <p className="text-sm font-medium text-slate-500">Free tools</p>
          ) : null}
          <h1
            className={cn(
              'font-semibold tracking-tight text-slate-900',
              isLoggedIn ? 'text-2xl' : 'mt-1 text-3xl',
            )}
          >
            {isLoggedIn ? 'Tools' : 'LeadHub Tools'}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-600">
            {isLoggedIn
              ? 'Run LinkedIn profile scraper, company scraper, and email finder using your workspace credits or call them directly via API.'
              : `Try LinkedIn scrapers and email finder without signing up. Guests get ${session?.guest.grant ?? 10} free credits.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isLoggedIn ? (
            <Link
              href="/dashboard/settings/developer-api"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <IconKey size={16} />
              API Keys
            </Link>
          ) : null}
          <div className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <IconCoin size={18} className="text-amber-600" />
            <div>
              <p className="text-xs text-slate-500">
                {session?.payer === 'workspace' ? 'Workspace credits' : 'Guest credits'}
              </p>
              <p className="text-lg font-semibold tabular-nums leading-tight text-slate-900">
                {balance}
              </p>
            </div>
            {isLoggedIn ? (
              <Link
                href="/dashboard/billing"
                className="ml-2 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Buy
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Exhausted credits banner */}
      {exhausted ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          {isLoggedIn ? (
            <>
              <p className="font-semibold">You&apos;re out of workspace credits</p>
              <p className="mt-1 text-amber-900/80">
                Top up your workspace credits to keep running tools and API calls.
              </p>
              <div className="mt-3">
                <Link
                  href="/dashboard/billing"
                  className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Buy credits
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold">You&apos;ve used all your free guest credits</p>
              <p className="mt-1 text-amber-900/80">
                Log in or sign up to get free user credits, workspace access, and API keys.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {AUTH_SIGNUP_UI ? (
                  <Link
                    href="/signup"
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Sign up for free credits
                  </Link>
                ) : null}
                <Link
                  href="/login?from=/tools"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Log in
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Tool cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PUBLIC_TOOL_DEFINITIONS.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            credits={creditsFor(tool, priceMap)}
            disabled={exhausted}
            onRun={openTool}
          />
        ))}
      </div>

      {/* API Documentation */}
      <ToolsApiDocs prices={priceMap} isLoggedIn={isLoggedIn} />

      {/* Run modal */}
      {activeTool ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{activeTool.name}</h2>
                <p className="text-sm text-slate-500">
                  {creditsFor(activeTool, priceMap)} credits per run
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {activeTool.fields.map((field) => (
                <label key={field.name} className="block text-sm">
                  <span className="font-medium text-slate-700">{field.label}</span>
                  <input
                    type={field.type === 'url' ? 'url' : 'text'}
                    value={form[field.name] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none ring-slate-900 focus:ring-2"
                  />
                </label>
              ))}
            </div>

            {runError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {runError}
              </div>
            ) : null}

            {result ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <ResultView data={result} />
                {lastMeta ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Charged {lastMeta.creditsCharged} cr · balance {lastMeta.balanceAfter}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTool(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                disabled={running || exhausted}
                onClick={() => void submitRun()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {running ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : (
                  <IconPlayerPlay size={16} />
                )}
                {running ? 'Running…' : 'Run tool'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
