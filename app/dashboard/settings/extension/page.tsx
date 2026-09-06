'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { IconCopy, IconPlus, IconPuzzle, IconTrash } from '@tabler/icons-react';
import {
  SettingsCard,
  SettingsEmpty,
  SettingsPanel,
  settingsBtnDanger,
  settingsBtnPrimary,
} from '@/components/settings/primitives';

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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/extension/tokens');
      setTokens(res.data?.data ?? []);
    } catch {
      toast.error('Failed to load extension tokens.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
            On any LinkedIn profile or post, press Save to LeadHub. The person is added as a lead and shows up under
            Captures.
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
