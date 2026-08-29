'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { IconCopy, IconPlus, IconTrash } from '@tabler/icons-react';

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
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
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
    <div className="mx-auto max-w-4xl animate-fade-in space-y-6 text-text">
      <PageHeader
        eyebrow="Settings"
        title="Browser extension"
        description="Connect the LeadHub extension so you can save LinkedIn profiles and posts straight into this workspace."
        actions={
          <button
            type="button"
            onClick={() => void create()}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-main px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-main/80 disabled:opacity-50"
          >
            <IconPlus size={15} />
            {creating ? 'Creating…' : 'Connect extension'}
          </button>
        }
      />

      {plainToken ? (
        <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-900">
            Paste this into the extension now — it will not be shown again.
          </p>
          <code className="block break-all rounded bg-white/70 p-2 font-mono text-xs text-amber-950">
            {plainToken}
          </code>
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

      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-text-100">How it works</h2>
        <ol className="mt-3 space-y-2 text-sm leading-6 text-text-200">
          <li>1. Install the LeadHub extension in Chrome.</li>
          <li>2. Create a token above and paste it into the extension popup.</li>
          <li>
            3. On any LinkedIn profile or post, press Save to LeadHub. The person is added as a
            lead and shows up under Captures.
          </li>
        </ol>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-text-100">
          Active tokens
        </div>
        {loading ? (
          <div className="space-y-2 p-5">
            <div className="h-12 skeleton" />
          </div>
        ) : tokens.length === 0 ? (
          <p className="p-6 text-sm text-text-300">
            No tokens yet. Create one to connect the extension.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {tokens.map((token) => (
              <div key={token.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-text-100">{token.label}</p>
                  <p className="font-mono text-xs text-text-300">{token.maskedToken}</p>
                  <p className="text-[11px] text-text-300">
                    {token.lastUsedAt
                      ? `Last used ${new Date(token.lastUsedAt).toLocaleString()}`
                      : 'Never used'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void revoke(token.id)}
                  title="Revoke"
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-red-300 hover:text-red-600"
                >
                  <IconTrash size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
