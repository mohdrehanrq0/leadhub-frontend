'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react';
import {
  fetchCreditBalance,
  fetchRun,
  startRecipeRun,
  type RecipeRunBundle,
} from '@/lib/recipes-api';
import { cn } from '@/lib/utils';
import { spinnerClass } from '@/components/ui/styles';

const FIND_CONTACTS_ID = 'find-contacts';
const PROSPECT_BRIEF_ID = 'prospect-brief';

const ROLE_PRESETS = [
  { id: 'founder', label: 'Founder / CEO / Owner' },
  { id: 'cto', label: 'CTO / Head of Engineering' },
  { id: 'sales', label: 'Head of Sales' },
  { id: 'marketing', label: 'Head of Marketing' },
  { id: 'hr', label: 'HR / People' },
] as const;

type Candidate = {
  name: string | null;
  title: string | null;
  linkedin_url: string | null;
  tier: 'confirmed_current' | 'likely_current' | 'unverified';
  evidence: Array<{ source: string; quote?: string; as_of?: string }>;
  as_of: string | null;
  score?: number;
};

type DomainConfirm = {
  companyName?: string;
  proposedDomain?: string;
  message?: string;
};

export default function FindContactsPage() {
  const router = useRouter();
  const [companyUrl, setCompanyUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['founder']);
  const [customRole, setCustomRole] = useState('');
  const [maxResults, setMaxResults] = useState(3);
  const [location, setLocation] = useState('');
  const [seniority, setSeniority] = useState('');
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<(RecipeRunBundle & { candidates?: Candidate[] | null }) | null>(
    null,
  );
  const [domainConfirm, setDomainConfirm] = useState<DomainConfirm | null>(null);
  const [proposedDomain, setProposedDomain] = useState('');
  const [showUnverified, setShowUnverified] = useState(false);
  const [polling, setPolling] = useState(false);

  const rolesPayload = useMemo(() => {
    const roles = [...selectedRoles];
    if (customRole.trim()) roles.push(customRole.trim());
    return roles;
  }, [selectedRoles, customRole]);

  const estimatedCredits = Math.min(5, Math.max(1, maxResults));

  const toggleRole = (id: string) => {
    setSelectedRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const pollRun = useCallback(async (id: string) => {
    setPolling(true);
    try {
      const data = await fetchRun(id);
      setBundle(data as RecipeRunBundle & { candidates?: Candidate[] | null });
      const done = ['ready', 'partial', 'failed', 'needs_identity_confirmation'].includes(
        String(data.status),
      );
      if (!done) {
        window.setTimeout(() => void pollRun(id), 3000);
      } else {
        setPolling(false);
      }
    } catch {
      setPolling(false);
      toast.error('Could not load find-contacts results');
    }
  }, []);

  useEffect(() => {
    fetchCreditBalance()
      .then(setCreditBalance)
      .catch(() => setCreditBalance(null));

    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const name = params.get('company_name');
    const domain = params.get('proposed_domain');
    const roles = params.get('roles');
    const run = params.get('run');
    if (name) setCompanyName(name);
    if (domain) {
      setProposedDomain(domain);
      setDomainConfirm({
        companyName: name ?? undefined,
        proposedDomain: domain,
        message: `Is this ${domain}? Confirm before searching.`,
      });
    }
    if (roles) {
      const parts = roles.split(',').map((s) => s.trim()).filter(Boolean);
      const presetIds = ROLE_PRESETS.map((p) => p.id as string);
      setSelectedRoles(parts.filter((p) => presetIds.includes(p)));
      setCustomRole(parts.filter((p) => !presetIds.includes(p)).join(', '));
    }
    if (run) {
      setRunId(run);
      void pollRun(run);
    }
  }, [pollRun]);

  async function startSearch(extra: Record<string, string | boolean | undefined> = {}) {
    if (!rolesPayload.length) {
      toast.error('Pick at least one target role.');
      return;
    }
    if (!companyUrl.trim() && !companyName.trim() && !extra.proposed_domain) {
      toast.error('Add a company website or company name.');
      return;
    }
    setSubmitting(true);
    setDomainConfirm(null);
    try {
      const result = await startRecipeRun(FIND_CONTACTS_ID, {
        inputs: {
          company_url: companyUrl.trim() || undefined,
          company_name: companyName.trim() || undefined,
          target_roles: rolesPayload.join(','),
          max_results: String(maxResults),
          location: location.trim() || undefined,
          seniority: seniority.trim() || undefined,
          ...extra,
        },
      });

      if ((result as { status?: string }).status === 'needs_domain_confirmation') {
        const conf = result as unknown as DomainConfirm & { proposedDomain?: string };
        setDomainConfirm(conf);
        setProposedDomain(conf.proposedDomain ?? '');
        toast.message(conf.message ?? 'Confirm the company domain');
        return;
      }

      if (!result.runId) {
        toast.error('Could not start find-contacts run');
        return;
      }
      setRunId(result.runId);
      toast.success(
        `Search started · up to ${result.creditsReserved} credit${result.creditsReserved === 1 ? '' : 's'} reserved (charged per confirmed only)`,
      );
      void pollRun(result.runId);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not start find-contacts';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDomainAndSearch() {
    if (!proposedDomain.trim()) {
      toast.error('Enter a domain to confirm.');
      return;
    }
    await startSearch({
      confirm_domain: true,
      proposed_domain: proposedDomain.trim().replace(/^https?:\/\//, ''),
      company_name: companyName.trim() || domainConfirm?.companyName,
    });
  }

  async function runBrief(candidate: Candidate) {
    if (!candidate.linkedin_url) {
      toast.error('Candidate has no LinkedIn URL');
      return;
    }
    setSubmitting(true);
    try {
      const result = await startRecipeRun(PROSPECT_BRIEF_ID, {
        inputs: {
          person_url: candidate.linkedin_url,
          company_url: companyUrl.trim() || (proposedDomain ? `https://${proposedDomain}` : undefined),
          company_name: companyName.trim() || undefined,
        },
      });
      toast.success('Prospect brief started');
      router.push(`/research/jobs/${result.runId}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not start prospect brief';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const candidates = (bundle?.candidates ?? []).filter((c) =>
    showUnverified ? true : c.tier === 'confirmed_current',
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <Link
            href="/research"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <IconArrowLeft className="h-4 w-4" />
            Research
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Find contacts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find current people by role, pick one, then run a brief — no charge for unverified names.
          </p>
        </div>
        {creditBalance != null && (
          <p className="text-sm text-muted-foreground">
            Balance · <span className="font-medium text-foreground">{creditBalance}</span>
          </p>
        )}
      </div>

      <section className="space-y-5 rounded-xl border border-border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Company website</span>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="https://acme.com"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Company name</span>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Acme Inc (asks to confirm domain)"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </label>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">
            Target position / role <span className="text-red-500">*</span>
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            Who should we find at this company? Pick one or more, or type a custom title.
          </p>
          <div className="flex flex-wrap gap-2">
            {ROLE_PRESETS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleRole(r.id)}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors',
                  selectedRoles.includes(r.id)
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background hover:bg-muted',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-muted-foreground">Custom title / position</span>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g. VP Customer Success"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Max results (1–5)</span>
            <input
              type="number"
              min={1}
              max={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={maxResults}
              onChange={(e) => setMaxResults(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Location</span>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Optional"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Seniority</span>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Optional"
              value={seniority}
              onChange={(e) => setSeniority(e.target.value)}
            />
          </label>
        </div>

        {domainConfirm && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            <p className="font-medium">Confirm company domain</p>
            <p className="mt-1 text-muted-foreground">
              {domainConfirm.message ??
                `Is this ${domainConfirm.proposedDomain}? Wrong-company matches cause bad results.`}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                className="min-w-[12rem] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={proposedDomain}
                onChange={(e) => setProposedDomain(e.target.value)}
              />
              <button
                type="button"
                disabled={submitting}
                onClick={() => void confirmDomainAndSearch()}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
              >
                Yes, search
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground">
            Est. reserve {estimatedCredits} · charge 1 credit per confirmed_current only
          </p>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void startSearch()}
            className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {submitting && <IconLoader2 className={cn('h-4 w-4', spinnerClass)} />}
            Find contacts
          </button>
        </div>
      </section>

      {(runId || bundle) && (
        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Candidates</h2>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showUnverified}
                onChange={(e) => setShowUnverified(e.target.checked)}
              />
              Show unverified
            </label>
          </div>
          {(polling || (bundle && !['ready', 'partial', 'failed'].includes(String(bundle.status)))) && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconLoader2 className={cn('h-4 w-4', spinnerClass)} />
              Searching… status {bundle?.status ?? 'starting'}
            </p>
          )}
          {!polling && candidates.length === 0 && bundle && (
            <p className="text-sm text-muted-foreground">
              No confirmed_current candidates. Credits for unconfirmed people are released.
            </p>
          )}
          <ul className="space-y-3">
            {candidates.map((c) => (
              <li
                key={`${c.linkedin_url}-${c.name}`}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{c.name ?? 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{c.title ?? '—'}</p>
                    {c.linkedin_url && (
                      <a
                        href={c.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-sm text-brand-main hover:underline"
                      >
                        LinkedIn
                      </a>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Tier · {c.tier}
                      {c.as_of ? ` · as of ${new Date(c.as_of).toLocaleDateString()}` : ''}
                    </p>
                    {c.evidence?.length ? (
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {c.evidence.slice(0, 3).map((e, i) => (
                          <li key={i}>
                            {e.source}
                            {e.quote ? `: ${e.quote}` : ''}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={submitting || c.tier !== 'confirmed_current'}
                    onClick={() => void runBrief(c)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    Run brief
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
