'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/lib/api';
import { IconCopy, IconPlus, IconPuzzle, IconSparkles, IconTrash } from '@tabler/icons-react';
import {
  SettingsCard,
  SettingsEmpty,
  SettingsPanel,
  settingsBtnDanger,
  settingsBtnPrimary,
} from '@/components/settings/primitives';
import type { CaptureEnrichMode } from '@/lib/captures';

interface ExtensionToken {
  id: string;
  label: string;
  maskedToken: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function ExtensionSettingsPage() {
  const [tokens, setTokens] = useState<ExtensionToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [plainToken, setPlainToken] = useState<string | null>(null);
  const [captureEnrichMode, setCaptureEnrichMode] = useState<CaptureEnrichMode>('manual');
  const [savingMode, setSavingMode] = useState(false);
  const [agents, setAgents] = useState<Array<{ id: string; name: string }>>([]);
  const [defaultAgentId, setDefaultAgentId] = useState('');
  const [sequenceCount, setSequenceCount] = useState(3);
  const [autoSend, setAutoSend] = useState(false);
  const [digestSlack, setDigestSlack] = useState(false);
  const [digestWhatsapp, setDigestWhatsapp] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [leadSniperConnected, setLeadSniperConnected] = useState(false);
  const [savingAutonomy, setSavingAutonomy] = useState(false);
  const [waStatus, setWaStatus] = useState('disconnected');
  const [waQr, setWaQr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [tokensRes, settingsRes, agentsRes] = await Promise.all([
        api.get('/api/extension/tokens'),
        api.get('/api/captures/settings').catch(() => null),
        api.get('/api/enrichment-agents').catch(() => null),
      ]);
      setTokens(tokensRes.data?.data ?? []);
      const settings = settingsRes?.data?.data;
      const mode = settings?.captureEnrichMode;
      if (mode === 'auto' || mode === 'manual') setCaptureEnrichMode(mode);
      if (settings) {
        setDefaultAgentId(settings.defaultAgentId ?? '');
        setSequenceCount(settings.sequenceCount ?? 3);
        setAutoSend(Boolean(settings.autoSend));
        setDigestSlack(Boolean(settings.digestSlack));
        setDigestWhatsapp(Boolean(settings.digestWhatsapp));
        setSlackWebhook(settings.slackWebhook ?? '');
        setWhatsappNumber(settings.whatsappNumber ?? '');
        setTimezone(settings.timezone ?? 'UTC');
        setLeadSniperConnected(Boolean(settings.leadSniperConnected));
      }
      const agentRows = (agentsRes?.data?.data ?? agentsRes?.data ?? []) as Array<{
        id: string;
        name: string;
      }>;
      setAgents(agentRows);
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
        sequenceCount,
        autoSend,
        digestSlack,
        digestWhatsapp,
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
      toast.success('Waiting for a WhatsApp QR code from the worker.');
    } catch {
      toast.error('Could not start WhatsApp.');
    }
  }

  async function disconnectWhatsApp() {
    try {
      await api.post('/api/captures/whatsapp/disconnect');
      setWaStatus('disconnected');
      setWaQr(null);
    } catch {
      toast.error('Could not disconnect WhatsApp.');
    }
  }

  useEffect(() => {
    if (waStatus !== 'starting' && waStatus !== 'qr') return;
    const timer = setInterval(() => {
      void api.get('/api/captures/whatsapp').then((res) => {
        const next = res.data?.data;
        if (!next) return;
        setWaStatus(next.status ?? 'disconnected');
        setWaQr(next.qrDataUrl ?? null);
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [waStatus]);

  async function create() {
    setCreating(true);
    try {
      const res = await api.post('/api/extension/tokens', { label: 'Chrome Extension' });
      setPlainToken(res.data?.data?.token ?? null);
      toast.success('Token created — copy it into the extension now.');
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

  return (
    <SettingsPanel>
      {plainToken ? (
        <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm">
          <p className="font-medium text-amber-900">Paste this into the extension now — it will not be shown again.</p>
          <code className="block break-all rounded-lg bg-white/80 p-3 font-mono text-xs text-amber-950">{plainToken}</code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(plainToken);
              toast.success('Copied');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 underline"
          >
            <IconCopy size={13} />
            Copy to clipboard
          </button>
        </div>
      ) : null}

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
          After a capture dossier is ready, the selected agent writes up to four emails. Lead Sniper
          pulls messages that are due when auto-send is on.{' '}
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
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-800">Sequence length</span>
            <select
              value={sequenceCount}
              onChange={(e) => setSequenceCount(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} email{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-800">Timezone</span>
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
            Auto-send due emails through Lead Sniper
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
            <span className="mb-1 flex items-center gap-2 font-medium text-slate-800">
              <input
                type="checkbox"
                checked={digestWhatsapp}
                onChange={(e) => setDigestWhatsapp(e.target.checked)}
              />
              Morning and evening WhatsApp digest
            </span>
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
          <button type="button" onClick={() => void disconnectWhatsApp()} className={settingsBtnDanger}>
            Disconnect
          </button>
          <span className="text-xs text-slate-500">WhatsApp status: {waStatus}</span>
        </div>
        {waQr ? (
          <img src={waQr} alt="WhatsApp QR code" className="mt-4 h-48 w-48 rounded-xl border border-slate-200" />
        ) : null}
      </SettingsCard>

      <SettingsCard
        icon={IconPuzzle}
        title="How it works"
        actions={
          <button type="button" onClick={() => void create()} disabled={creating} className={settingsBtnPrimary}>
            <IconPlus size={15} />
            {creating ? 'Creating…' : 'Connect extension'}
          </button>
        }
      >
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
            Create a token and paste it into the extension popup.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-settings-accent text-[11px] font-bold text-white">
              3
            </span>
            On any LinkedIn profile or post, press Save to LeadHub. That person becomes your target —
            enrich and add them to CRM from Captures (or automatically when Auto-enrich is on).
          </li>
        </ol>
      </SettingsCard>

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
