'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/lib/api';
import { EXTENSION_SETTINGS_UI, RECIPE_ENGINE_V2 } from '@/lib/features';
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconPlus,
  IconPuzzle,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import {
  SettingsCard,
  SettingsEmpty,
  SettingsPanel,
  settingsBtnDanger,
  settingsBtnPrimary,
  settingsBtnSecondary,
} from '@/components/settings/primitives';
import type { CaptureEnrichMode } from '@/lib/captures';

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to legacy path (some browsers block clipboard without focus).
  }
  try {
    const el = document.createElement('textarea');
    el.value = value;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function ExtensionTokenModal({
  token,
  onDismiss,
}: {
  token: string;
  onDismiss: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(id);
  }, [token]);

  async function handleCopy() {
    const ok = await copyText(token);
    if (ok) {
      setCopied(true);
      toast.success('Token copied');
    } else {
      toast.error('Could not copy automatically — select the token and press ⌘C / Ctrl+C.');
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="extension-token-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 id="extension-token-modal-title" className="text-base font-semibold text-slate-900">
            Connect browser extension
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Paste this token into the extension popup, then click Connect account.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-950">
            <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <p>
              <strong>Shown only once.</strong> LeadHub stores a hash of this token — after you close
              this dialog you cannot view it again. Copy it now, or create a new token later.
            </p>
          </div>

          <div>
            <label htmlFor="extension-one-time-token" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              One-time token
            </label>
            <div className="flex gap-2">
              <input
                id="extension-one-time-token"
                ref={inputRef}
                type="text"
                readOnly
                value={token}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-xs text-slate-900 outline-none focus:border-settings-accent focus:ring-[3px] focus:ring-settings-accent/20"
              />
              <button
                type="button"
                onClick={() => void handleCopy()}
                className={settingsBtnPrimary}
              >
                {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <ol className="list-decimal space-y-1.5 pl-4 text-sm leading-6 text-slate-600">
            <li>Click <strong>Copy</strong> (or select the token and press ⌘C / Ctrl+C).</li>
            <li>Open the LeadHub Chrome extension popup.</li>
            <li>Paste the token → <strong>Connect account</strong>.</li>
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onDismiss} className={settingsBtnSecondary}>
            {copied ? "I've pasted it — done" : 'Close without copying'}
          </button>
          {!copied ? (
            <button type="button" onClick={() => void handleCopy()} className={settingsBtnPrimary}>
              <IconCopy size={15} />
              Copy token
            </button>
          ) : (
            <button type="button" onClick={onDismiss} className={settingsBtnPrimary}>
              <IconCheck size={15} />
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ExtensionToken {
  id: string;
  label: string;
  maskedToken: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface LinkedInAllowance {
  date: string;
  warmupWeek: number;
  connectsAllowed: number;
  messagesAllowed: number;
  connectsRemaining: number;
  messagesRemaining: number;
  viewsRemaining: number;
}

export default function ExtensionSettingsPage() {
  const [tokens, setTokens] = useState<ExtensionToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [plainToken, setPlainToken] = useState<string | null>(null);
  const [captureEnrichMode, setCaptureEnrichMode] = useState<CaptureEnrichMode>('manual');
  const [savingMode, setSavingMode] = useState(false);
  const [agents, setAgents] = useState<
    Array<{ id: string; name: string; isDefault?: boolean; outreachAgentId?: string | null }>
  >([]);
  const [writers, setWriters] = useState<Array<{ id: string; name: string; sequenceCount: number; isDefault?: boolean }>>([]);
  const [defaultAgentId, setDefaultAgentId] = useState('');
  const [sendTiming, setSendTiming] = useState('right_away');
  const [autoSend, setAutoSend] = useState(false);
  const [autoLinkedIn, setAutoLinkedIn] = useState(false);
  const [digestSlack, setDigestSlack] = useState(false);
  const [whatsappUpdates, setWhatsappUpdates] = useState('');
  const [slackWebhook, setSlackWebhook] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [leadSniperConnected, setLeadSniperConnected] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [agentPaused, setAgentPaused] = useState(false);
  const [quietStart, setQuietStart] = useState(21);
  const [quietEnd, setQuietEnd] = useState(7);
  const [draftCap, setDraftCap] = useState(20);
  const [maxFollowUps, setMaxFollowUps] = useState(1);
  const [followUpDays, setFollowUpDays] = useState(4);
  const [savingAgent, setSavingAgent] = useState(false);
  const [savingAutonomy, setSavingAutonomy] = useState(false);
  const [waStatus, setWaStatus] = useState('disconnected');
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waError, setWaError] = useState<string | null>(null);
  const [allowance, setAllowance] = useState<LinkedInAllowance | null>(null);

  const legacyFull = EXTENSION_SETTINGS_UI;
  const connected = tokens.some((t) => t.lastUsedAt);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [tokensRes, settingsRes, agentsRes, writersRes] = await Promise.all([
        api.get('/api/extension/tokens'),
        legacyFull ? api.get('/api/captures/settings').catch(() => null) : Promise.resolve(null),
        api.get('/api/enrichment-agents').catch(() => null),
        legacyFull ? api.get('/api/outreach-agents').catch(() => null) : Promise.resolve(null),
      ]);
      setTokens(tokensRes.data?.data ?? []);
      const settings = settingsRes?.data?.data;
      const mode = settings?.captureEnrichMode;
      if (mode === 'auto' || mode === 'manual') setCaptureEnrichMode(mode);
      if (settings) {
        setDefaultAgentId(settings.defaultAgentId ?? '');
        setSendTiming(settings.sendTiming ?? 'right_away');
        setAutoSend(Boolean(settings.autoSend));
        setAutoLinkedIn(Boolean(settings.autoLinkedIn));
        setDigestSlack(Boolean(settings.digestSlack));
        setWhatsappUpdates(
          settings.whatsappUpdates ?? (settings.digestWhatsapp ? 'both' : ''),
        );
        setSlackWebhook(settings.slackWebhook ?? '');
        setWhatsappNumber(settings.whatsappNumber ?? '');
        setTimezone(settings.timezone ?? 'UTC');
        setLeadSniperConnected(Boolean(settings.leadSniperConnected));
        setAgentEnabled(Boolean(settings.outreachAgentEnabled));
        setAgentPaused(Boolean(settings.outreachAgentPaused));
        setQuietStart(settings.outreachQuietStart ?? 21);
        setQuietEnd(settings.outreachQuietEnd ?? 7);
        setDraftCap(settings.outreachDraftCap ?? 20);
        setMaxFollowUps(settings.outreachMaxFollowUps ?? 1);
        setFollowUpDays(settings.outreachFollowUpWaitDays ?? 4);
      }
      setAgents((agentsRes?.data?.data ?? []) as typeof agents);
      setWriters((writersRes?.data?.data ?? []) as typeof writers);
      if (RECIPE_ENGINE_V2) {
        const allowanceRes = await api.get('/api/extension/linkedin-allowance').catch(() => null);
        setAllowance(allowanceRes?.data?.data ?? null);
      }
    } catch {
      toast.error('Failed to load extension tokens.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveMode(mode: CaptureEnrichMode) {
    setSavingMode(true);
    try {
      const res = await api.patch('/api/captures/settings', { captureEnrichMode: mode });
      setCaptureEnrichMode(res.data?.data?.captureEnrichMode ?? mode);
      toast.success(mode === 'auto' ? 'Auto-enrich on save enabled.' : 'Manual capture mode enabled.');
    } catch {
      toast.error('Could not update capture mode.');
    } finally {
      setSavingMode(false);
    }
  }

  async function saveAutonomy() {
    setSavingAutonomy(true);
    try {
      await api.patch('/api/captures/settings', {
        defaultAgentId: defaultAgentId || null,
        sendTiming,
        autoSend,
        autoLinkedIn,
        digestSlack,
        digestWhatsapp:
          whatsappUpdates === 'morning' || whatsappUpdates === 'evening' || whatsappUpdates === 'both',
        whatsappUpdates: whatsappUpdates || null,
        slackWebhook: slackWebhook.trim() || null,
        whatsappNumber: whatsappNumber.trim() || null,
        timezone,
      });
      toast.success('Autonomous emailing settings saved.');
    } catch {
      toast.error('Could not save autonomous settings.');
    } finally {
      setSavingAutonomy(false);
    }
  }

  async function connectWhatsApp() {
    try {
      await api.post('/api/captures/whatsapp/connect');
      setWaStatus('starting');
      setWaError(null);
      setWaQr(null);
      toast.success('Starting WhatsApp. The QR code appears here when the worker is ready.');
    } catch {
      toast.error('Could not start WhatsApp.');
    }
  }

  async function sendWhatsAppTest() {
    try {
      await api.post('/api/captures/whatsapp/test');
      toast.success('Test message sent to your WhatsApp. Reply in that chat.');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? 'Could not send the test message.');
    }
  }

  async function disconnectWhatsApp() {
    try {
      await api.post('/api/captures/whatsapp/disconnect');
      setWaStatus('disconnected');
      setWaQr(null);
      setWaError(null);
    } catch {
      toast.error('Could not disconnect WhatsApp.');
    }
  }

  useEffect(() => {
    if (!legacyFull) return;
    void api.get('/api/captures/whatsapp').then((res) => {
      const next = res.data?.data;
      if (!next) return;
      setWaStatus(next.status ?? 'disconnected');
      setWaQr(next.qrDataUrl ?? null);
      setWaError(next.error ?? null);
    }).catch(() => undefined);
  }, [legacyFull]);

  useEffect(() => {
    if (!legacyFull) return;
    if (waStatus !== 'starting' && waStatus !== 'qr') return;
    const timer = setInterval(() => {
      void api.get('/api/captures/whatsapp').then((res) => {
        const next = res.data?.data;
        if (!next) return;
        setWaStatus(next.status ?? 'disconnected');
        setWaQr(next.qrDataUrl ?? null);
        setWaError(next.error ?? null);
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [waStatus, legacyFull]);

  async function create() {
    setCreating(true);
    try {
      const res = await api.post('/api/extension/tokens', { label: 'Chrome Extension' });
      const token = (res.data?.data?.token as string | undefined) ?? null;
      if (!token) {
        toast.error('Token was created but the one-time secret was missing. Revoke it and try again.');
        await load();
        return;
      }
      setPlainToken(token);
      await load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? 'Failed to create token.');
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this token? The extension will stop saving until you reconnect it.')) {
      return;
    }
    try {
      await api.delete(`/api/extension/tokens/${id}`);
      setTokens((prev) => prev.filter((t) => t.id !== id));
      toast.success('Token revoked.');
    } catch {
      toast.error('Failed to revoke token.');
    }
  }

  const selectedAgent =
    agents.find((agent) => agent.id === defaultAgentId) ?? agents.find((agent) => agent.isDefault);
  const writer =
    writers.find((agent) => agent.id === selectedAgent?.outreachAgentId) ??
    writers.find((agent) => agent.isDefault);
  const sequenceLabel = writer
    ? `${writer.sequenceCount} email${writer.sequenceCount === 1 ? '' : 's'} from ${writer.name}`
    : 'Set an outreach agent on the enrichment agent';

  return (
    <SettingsPanel>
      {plainToken ? (
        <ExtensionTokenModal token={plainToken} onDismiss={() => setPlainToken(null)} />
      ) : null}

      <SettingsCard
        icon={IconPuzzle}
        title="Browser extension connection"
        actions={
          <button type="button" onClick={() => void create()} disabled={creating || Boolean(plainToken)} className={settingsBtnPrimary}>
            <IconPlus size={15} />
            {creating ? 'Creating…' : 'Connect extension'}
          </button>
        }
      >
        <p className="mb-4 text-sm leading-6 text-slate-600">
          Status:{' '}
          {connected ? (
            <span className="font-medium text-emerald-700">Connected — the extension has called LeadHub.</span>
          ) : tokens.length ? (
            <span className="font-medium text-amber-700">Token created — paste it into the extension popup to finish.</span>
          ) : (
            <span className="font-medium text-slate-700">Not connected yet.</span>
          )}
        </p>
        <ol className="space-y-3 text-sm leading-6 text-slate-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-settings-accent text-[11px] font-bold text-white">1</span>
            <span>
              Build and load the extension: <code className="rounded bg-slate-100 px-1 text-xs">cd leadhub-extension &amp;&amp; pnpm build</code>, then in{' '}
              <code className="rounded bg-slate-100 px-1 text-xs">chrome://extensions</code> enable Developer mode → Load unpacked → select the{' '}
              <code className="rounded bg-slate-100 px-1 text-xs">dist/</code> folder.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-settings-accent text-[11px] font-bold text-white">2</span>
            Click <strong>Connect extension</strong> here. A one-time <code className="rounded bg-slate-100 px-1 text-xs">lhx_…</code> token is shown once — copy it.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-settings-accent text-[11px] font-bold text-white">3</span>
            Open the extension popup and paste the token → <strong>Connect account</strong>. For a local API, set{' '}
            <code className="rounded bg-slate-100 px-1 text-xs">leadhub_api_base</code> to <code className="rounded bg-slate-100 px-1 text-xs">http://localhost:4001</code> in the service-worker console.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-settings-accent text-[11px] font-bold text-white">4</span>
            Reload this page — status becomes Connected. Then run a recipe ending in <code className="rounded bg-slate-100 px-1 text-xs">out.linkedin_queue</code>; the extension only ever receives today&apos;s backend-allowed batch.
          </li>
        </ol>
        {RECIPE_ENGINE_V2 ? (
          <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            {allowance ? (
              <p>
                Today ({allowance.date}, warm-up week {allowance.warmupWeek + 1}):{' '}
                <strong>{allowance.connectsRemaining}</strong> of {allowance.connectsAllowed} connections left ·{' '}
                <strong>{allowance.messagesRemaining}</strong> of {allowance.messagesAllowed} messages left.
              </p>
            ) : (
              <p>Could not load today&apos;s LinkedIn allowance — check that the backend is running with RECIPE_ENGINE_V2=true.</p>
            )}
            <Link href="/research" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800">
              Open recipes <IconExternalLink size={13} />
            </Link>
          </div>
        ) : null}
      </SettingsCard>

      {legacyFull ? (
      <>
      <SettingsCard icon={IconSparkles} title="Capture enrich mode">
        <p className="mb-4 text-sm leading-6 text-slate-600">
          Controls what happens when the extension saves a LinkedIn person. Manual Save never
          scrapes or enriches. Add to CRM creates the lead only — enrichment starts only when you
          choose Enrich (or opt in from the CRM modal).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={savingMode}
            onClick={() => void saveMode('manual')}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              captureEnrichMode === 'manual'
                ? 'border-brand-main bg-brand-main/5 ring-1 ring-brand-main/30'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">Manual</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Save only stores the profile in Captures (no Apify / enrichment). Add to CRM creates
              the lead without enriching. Use Enrich when you are ready.
            </p>
          </button>
          <button
            type="button"
            disabled={savingMode}
            onClick={() => void saveMode('auto')}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              captureEnrichMode === 'auto'
                ? 'border-brand-main bg-brand-main/5 ring-1 ring-brand-main/30'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">Auto-enrich</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Every save links a lead, builds a capture dossier, and writes the email sequence.
              The full CRM enrichment job stays on the Enrich button.
            </p>
          </button>
        </div>
      </SettingsCard>

      <SettingsCard icon={IconSparkles} title="Autonomous emailing">
        <p className="mb-4 text-sm leading-6 text-slate-600">
          The default enrichment agent stays as you set it. Sequence length comes from the outreach
          agent linked to that enrichment agent. Lead Sniper sends when the message is due in the
          timezone below.{' '}
          {leadSniperConnected ? (
            <span className="font-medium text-emerald-700">Lead Sniper key is connected.</span>
          ) : (
            <Link href="/dashboard/settings/api-keys" className="font-medium underline">
              Connect a Lead Sniper key
            </Link>
          )}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-800">Default agent</span>
            <select
              value={defaultAgentId}
              onChange={(e) => setDefaultAgentId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <option value="">Workspace default</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
          <div className="block text-sm">
            <span className="mb-1 block font-medium text-slate-800">Sequence length</span>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">
              {sequenceLabel}
            </p>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-800">When to send after enrichment</span>
            <select
              value={sendTiming}
              onChange={(e) => setSendTiming(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <option value="after_enrichment">After enrichment finishes</option>
              <option value="right_away">Right away after enrichment</option>
              <option value="after_1_hour">1 hour later</option>
              <option value="evening">That evening</option>
              <option value="next_day">The next day</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-800">Timezone for Lead Sniper and digests</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              {[
                timezone,
                'UTC',
                'America/New_York',
                'America/Los_Angeles',
                'Europe/London',
                'Asia/Kolkata',
                'Asia/Dubai',
              ]
                .filter((zone, index, all) => zone && all.indexOf(zone) === index)
                .map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end text-sm font-medium text-slate-800">
            <input type="checkbox" checked={autoSend} onChange={(e) => setAutoSend(e.target.checked)} />
            Auto-generate the email sequence after enrichment, then send it through Lead Sniper after WhatsApp confirms
          </label>
          <label className="flex items-center gap-2 self-end text-sm font-medium text-slate-800 sm:col-span-2">
            <input type="checkbox" checked={autoLinkedIn} onChange={(e) => setAutoLinkedIn(e.target.checked)} />
            Auto-generate the LinkedIn message after enrichment, then send it from the silent LeadHub tab.
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 flex items-center gap-2 font-medium text-slate-800">
              <input type="checkbox" checked={digestSlack} onChange={(e) => setDigestSlack(e.target.checked)} />
              Morning and evening Slack digest
            </span>
            <input
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-slate-800">When to message on WhatsApp</span>
            <select
              value={whatsappUpdates}
              onChange={(e) => setWhatsappUpdates(e.target.value)}
              className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <option value="">Ask me when I connect</option>
              <option value="off">Don&apos;t message me</option>
              <option value="each">Every enrichment, only when something needs me</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="both">Morning and evening</option>
            </select>
            <input
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="Country code and number"
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" disabled={savingAutonomy} onClick={() => void saveAutonomy()} className={settingsBtnPrimary}>
            {savingAutonomy ? 'Saving…' : 'Save autonomous settings'}
          </button>
          <button type="button" onClick={() => void connectWhatsApp()} className={settingsBtnPrimary}>
            Connect WhatsApp
          </button>
          <button
            type="button"
            onClick={() => void sendWhatsAppTest()}
            disabled={waStatus !== 'ready'}
            className={settingsBtnPrimary}
          >
            Send test message
          </button>
          <button type="button" onClick={() => void disconnectWhatsApp()} className={settingsBtnDanger}>
            Disconnect
          </button>
          <span className="text-xs text-slate-500">WhatsApp status: {waStatus}</span>
        </div>
        {waStatus === 'starting' ? (
          <p className="mt-3 text-sm text-slate-500">Starting WhatsApp in the worker. The QR code shows here in a few seconds.</p>
        ) : null}
        {waError ? <p className="mt-3 text-sm text-rose-700">{waError}</p> : null}
        {waQr ? (
          <img src={waQr} alt="WhatsApp QR code" className="mt-4 h-48 w-48 rounded-xl border border-slate-200" />
        ) : null}
        <p className="mt-3 text-sm leading-6 text-slate-500">
          After you scan the code, LeadHub asks when you want updates if you have not chosen yet. Reply 1 for each enrichment only when something needs you, 2 for morning, 3 for evening, or 4 for both. Replies you send outside that window wait until then. During the chat you can still say samples, find a name, emails, show 1, approve 1, reject 1, or schedule 1 tomorrow.
        </p>
      </SettingsCard>
      </>
      ) : null}

      <SettingsCard icon={IconPuzzle} title="How it works">
        <ol className="space-y-3 text-sm leading-6 text-slate-600">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-settings-accent text-[11px] font-bold text-white">
              1
            </span>
            Install the LeadHub extension in Chrome.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-settings-accent text-[11px] font-bold text-white">
              2
            </span>
            Click <strong>Connect extension</strong> — a one-time token appears in a modal. Copy it, then paste it into the extension popup.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-settings-accent text-[11px] font-bold text-white">
              3
            </span>
            {RECIPE_ENGINE_V2
              ? 'Run a recipe that ends in out.linkedin_queue — queued notes appear in the extension within today’s backend allowance.'
              : 'On any LinkedIn profile or post, press Save to LeadHub. That person becomes your target — enrich and add them to CRM from Captures (or automatically when Auto-enrich is on).'}
          </li>
        </ol>
      </SettingsCard>

      {legacyFull ? (
      <SettingsCard title="LinkedIn outreach agent">
        <p className="mb-4 text-sm leading-6 text-slate-600">
          Morning and evening jobs prepare drafts for people you already saved. They do not send
          LinkedIn invitations or messages. The draft cap is a LeadHub operational policy, not a
          LinkedIn limit. LinkedIn&apos;s numeric quotas are undisclosed, and staying under an 80%
          figure does not guarantee account safety.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={agentEnabled} onChange={(event) => setAgentEnabled(event.target.checked)} />
            Enable morning and evening preparation
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={agentPaused} onChange={(event) => setAgentPaused(event.target.checked)} />
            Kill switch — pause scheduling
          </label>
          <label className="text-sm text-slate-700">
            Quiet hours start
            <input className="mt-1 w-full rounded-lg border px-2 py-1" type="number" min={0} max={23} value={quietStart} onChange={(event) => setQuietStart(Number(event.target.value))} />
          </label>
          <label className="text-sm text-slate-700">
            Quiet hours end
            <input className="mt-1 w-full rounded-lg border px-2 py-1" type="number" min={0} max={23} value={quietEnd} onChange={(event) => setQuietEnd(Number(event.target.value))} />
          </label>
          <label className="text-sm text-slate-700">
            Drafts per run (LeadHub policy)
            <input className="mt-1 w-full rounded-lg border px-2 py-1" type="number" min={1} max={100} value={draftCap} onChange={(event) => setDraftCap(Number(event.target.value))} />
          </label>
          <label className="text-sm text-slate-700">
            Max follow-ups
            <input className="mt-1 w-full rounded-lg border px-2 py-1" type="number" min={0} max={5} value={maxFollowUps} onChange={(event) => setMaxFollowUps(Number(event.target.value))} />
          </label>
          <label className="text-sm text-slate-700">
            Business days before a follow-up
            <input className="mt-1 w-full rounded-lg border px-2 py-1" type="number" min={1} max={30} value={followUpDays} onChange={(event) => setFollowUpDays(Number(event.target.value))} />
          </label>
        </div>
        <button
          type="button"
          disabled={savingAgent}
          className={`${settingsBtnPrimary} mt-4`}
          onClick={() => {
            setSavingAgent(true);
            void api
              .patch('/api/captures/settings', {
                outreachAgentEnabled: agentEnabled,
                outreachAgentPaused: agentPaused,
                outreachQuietStart: quietStart,
                outreachQuietEnd: quietEnd,
                outreachDraftCap: draftCap,
                outreachMaxFollowUps: maxFollowUps,
                outreachFollowUpWaitDays: followUpDays,
              })
              .then(() => toast.success('Outreach agent settings saved.'))
              .catch(() => toast.error('Could not save outreach agent settings.'))
              .finally(() => setSavingAgent(false));
          }}
        >
          {savingAgent ? 'Saving…' : 'Save outreach settings'}
        </button>
      </SettingsCard>
      ) : null}

      <SettingsCard title="Active tokens" padded={false}>
        {loading ? (
          <div className="space-y-2 p-5">
            <div className="h-12 skeleton" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="p-5">
            <SettingsEmpty>No tokens yet. Create one to connect the extension.</SettingsEmpty>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tokens.map((token) => (
              <div key={token.id} className="flex min-w-0 items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{token.label}</p>
                  <p className="truncate font-mono text-xs text-slate-400">{token.maskedToken}</p>
                  <p className="text-[11px] text-slate-400">
                    {token.lastUsedAt ? `Last used ${new Date(token.lastUsedAt).toLocaleString()}` : 'Never used'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void revoke(token.id)}
                  title="Revoke"
                  className={settingsBtnDanger}
                >
                  <IconTrash size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>
    </SettingsPanel>
  );
}
