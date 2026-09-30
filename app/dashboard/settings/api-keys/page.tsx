'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '../../../../lib/api';
import { APOLLO_UI_ENABLED } from '../../../../lib/features';
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
  IconAlertTriangle,
  IconCheck,
  IconChevronRight,
  IconKey,
  IconRefresh,
  IconSparkles,
  IconTerminal2,
  IconTrash,
} from '@tabler/icons-react';

interface ApiKeyRecord {
  id: string;
  provider: 'apollo' | 'apify' | 'openai' | 'gemini' | 'openrouter' | 'reoon' | 'leadsnipper';
  maskedKey: string;
  isValid: boolean;
  lastTestedAt?: string;
  createdAt: string;
}

type LlmMode = 'openai' | 'gemini' | 'mix' | 'openrouter';
type EmailVerificationProviderPreference = 'reoon' | 'apify';
type CredentialKind = 'apollo' | 'apify' | 'llm' | 'reoon';
type LlmProvider = 'openai' | 'gemini' | 'openrouter';
type StoredProvider = 'apollo' | 'apify' | 'openai' | 'gemini' | 'openrouter' | 'reoon';

interface ProviderModelOption {
  id: string;
  label: string;
}

interface LlmPreferences {
  llmMode: LlmMode;
  openaiModel: string;
  geminiModel: string;
  openrouterModel: string;
  emailVerificationProvider: EmailVerificationProviderPreference;
}

const PROVIDER_LABEL: Record<StoredProvider | 'leadsnipper', string> = {
  apollo: 'Apollo',
  apify: 'Apify',
  openai: 'OpenAI',
  gemini: 'Gemini',
  openrouter: 'OpenRouter',
  reoon: 'Reoon',
  leadsnipper: 'LeadSniper',
};

function isLlmProvider(provider: string): provider is LlmProvider {
  return provider === 'openai' || provider === 'gemini' || provider === 'openrouter';
}

function parseCredentialQuery(providerFromQuery: string | null): {
  kind: CredentialKind;
  llmType: LlmProvider;
} {
  if (providerFromQuery && isLlmProvider(providerFromQuery)) {
    return { kind: 'llm', llmType: providerFromQuery };
  }
  if (providerFromQuery === 'apollo' && APOLLO_UI_ENABLED) {
    return { kind: 'apollo', llmType: 'openai' };
  }
  if (providerFromQuery === 'reoon') {
    return { kind: 'reoon', llmType: 'openai' };
  }
  return { kind: 'apify', llmType: 'openai' };
}

function modelForProvider(prefs: LlmPreferences, provider: LlmProvider): string {
  if (provider === 'openai') return prefs.openaiModel;
  if (provider === 'gemini') return prefs.geminiModel;
  return prefs.openrouterModel;
}

function ApiKeysPageInner() {
  const searchParams = useSearchParams();
  const providerFromQuery = searchParams.get('provider');
  const initialCredential = parseCredentialQuery(providerFromQuery);

  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [credentialKind, setCredentialKind] = useState<CredentialKind>(initialCredential.kind);
  const [llmType, setLlmType] = useState<LlmProvider>(initialCredential.llmType);
  const [keyValue, setKeyValue] = useState('');
  const [newKeyModels, setNewKeyModels] = useState<ProviderModelOption[]>([]);
  const [selectedNewKeyModel, setSelectedNewKeyModel] = useState('');
  const [fetchingNewKeyModels, setFetchingNewKeyModels] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [activatingProvider, setActivatingProvider] = useState<LlmProvider | null>(null);
  const [llmMode, setLlmMode] = useState<LlmMode>('mix');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [openrouterModel, setOpenrouterModel] = useState('openai/gpt-4o-mini');
  const [emailVerificationProvider, setEmailVerificationProvider] =
    useState<EmailVerificationProviderPreference>('reoon');
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [serviceKeys, setServiceKeys] = useState<
    Array<{
      id: string;
      name: string;
      maskedKey: string;
      createdAt: string;
      lastUsedAt?: string | null;
    }>
  >([]);
  const [creatingServiceKey, setCreatingServiceKey] = useState(false);
  const [plainServiceKey, setPlainServiceKey] = useState<string | null>(null);

  const resolvedProvider: StoredProvider = credentialKind === 'llm' ? llmType : credentialKind;
  const preferences: LlmPreferences = {
    llmMode,
    openaiModel,
    geminiModel,
    openrouterModel,
    emailVerificationProvider,
  };

  useEffect(() => {
    void Promise.all([fetchKeys(), fetchPreferences(), fetchServiceKeys()]);
  }, []);

  useEffect(() => {
    const next = parseCredentialQuery(providerFromQuery);
    setCredentialKind(next.kind);
    if (providerFromQuery && isLlmProvider(providerFromQuery)) {
      setLlmType(next.llmType);
    }
  }, [providerFromQuery]);

  useEffect(() => {
    setNewKeyModels([]);
    setSelectedNewKeyModel('');
  }, [credentialKind, llmType]);

  async function fetchServiceKeys() {
    try {
      const res = await api.get('/api/service-api-keys');
      setServiceKeys(res.data?.data ?? []);
    } catch {
      // endpoint may be new — ignore until migrated
    }
  }

  async function createServiceKey() {
    try {
      setCreatingServiceKey(true);
      const res = await api.post('/api/service-api-keys', { name: 'LeadSniper' });
      setPlainServiceKey(res.data?.data?.apiKey ?? null);
      toast.success('Service API key created — copy it now');
      await fetchServiceKeys();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create service key');
    } finally {
      setCreatingServiceKey(false);
    }
  }

  async function revokeServiceKey(id: string) {
    try {
      await api.delete(`/api/service-api-keys/${id}`);
      toast.success('Service key revoked');
      await fetchServiceKeys();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to revoke key');
    }
  }

  async function fetchKeys() {
    try {
      setLoading(true);
      const res = await api.get('/api/api-keys');
      setKeys(res.data.data ?? []);
    } catch {
      toast.error('Failed to load API keys.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchPreferences() {
    try {
      const res = await api.get('/api/api-keys/preferences');
      const data = res.data.data;
      setLlmMode(data.llmMode ?? 'mix');
      setOpenaiModel(data.openaiModel ?? 'gpt-4o-mini');
      setGeminiModel(data.geminiModel ?? 'gemini-1.5-flash');
      setOpenrouterModel(data.openrouterModel ?? 'openai/gpt-4o-mini');
      setEmailVerificationProvider(data.emailVerificationProvider === 'apify' ? 'apify' : 'reoon');
    } catch {
      toast.error('Failed to load workspace preferences.');
    }
  }

  async function saveLlmPreferences(next: LlmPreferences) {
    await api.put('/api/api-keys/preferences', next);
  }

  async function fetchModelsForNewKey() {
    if (credentialKind !== 'llm' || keyValue.trim().length < 10) return;
    setFetchingNewKeyModels(true);
    try {
      const res = await api.post('/api/api-keys/models', {
        provider: llmType,
        key: keyValue.trim(),
      });
      const models = (res.data.data ?? []) as ProviderModelOption[];
      setNewKeyModels(models);
      setSelectedNewKeyModel(models[0]?.id ?? '');
      if (!models.length) toast.error(`No supported ${PROVIDER_LABEL[llmType]} models found for this key.`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? `Failed to fetch ${PROVIDER_LABEL[llmType]} models.`);
      setNewKeyModels([]);
      setSelectedNewKeyModel('');
    } finally {
      setFetchingNewKeyModels(false);
    }
  }

  const savePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      const next = { ...preferences, emailVerificationProvider };
      await saveLlmPreferences(next);
      toast.success('Email verification updated.');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? 'Failed to save preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    try {
      await api.delete(`/api/api-keys/${id}`);
      toast.success('API key deleted.');
      fetchKeys();
    } catch {
      toast.error('Failed to delete API key.');
    }
  };

  const handleTest = async (providerName: string, id: string) => {
    setTestingId(id);
    try {
      const res = await api.post(`/api/api-keys/test/${providerName}`);
      const data = res.data.data;
      if (data.valid) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      fetchKeys();
    } catch {
      toast.error('Test request failed.');
    } finally {
      setTestingId(null);
    }
  };

  const handleUseLlm = async (provider: LlmProvider) => {
    if (llmMode === provider || activatingProvider) return;
    setActivatingProvider(provider);
    try {
      const next: LlmPreferences = { ...preferences, llmMode: provider };
      await saveLlmPreferences(next);
      setLlmMode(provider);
      toast.success(`${PROVIDER_LABEL[provider]} is now the LLM in use.`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? 'Failed to switch LLM.');
    } finally {
      setActivatingProvider(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyValue.trim()) return;
    if (credentialKind === 'llm' && !selectedNewKeyModel) {
      toast.error(`Fetch and select a ${PROVIDER_LABEL[llmType]} model first.`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/api-keys', {
        provider: resolvedProvider,
        key: keyValue.trim(),
        ...(credentialKind === 'llm' ? { selectedModel: selectedNewKeyModel } : {}),
      });
      toast.success(`${PROVIDER_LABEL[resolvedProvider]} key saved.`);
      setKeyValue('');
      setNewKeyModels([]);
      setSelectedNewKeyModel('');
      if (credentialKind === 'llm') {
        setLlmMode(llmType);
        if (llmType === 'openai') setOpenaiModel(selectedNewKeyModel);
        if (llmType === 'gemini') setGeminiModel(selectedNewKeyModel);
        if (llmType === 'openrouter') setOpenrouterModel(selectedNewKeyModel);
      }
      await Promise.all([fetchKeys(), fetchPreferences()]);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? 'Failed to save API key.');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleKeys = keys.filter((key) => APOLLO_UI_ENABLED || key.provider !== 'apollo');

  return (
    <SettingsPanel wide>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow">
            <IconTerminal2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Looking for the LeadCRM REST API & Tokens?</h2>
            <p className="text-xs text-slate-500">
              Create LeadCRM API tokens, push leads, run enrichment via API, and explore interactive documentation.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/settings/developer-api"
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow transition hover:bg-indigo-500"
        >
          Open Developer API & Docs
          <IconChevronRight size={14} />
        </Link>
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <SettingsCard
          icon={IconKey}
          title="Add credentials"
          description="Connect Apify, one LLM, or Reoon. Keys are encrypted at rest."
        >
          <form onSubmit={handleSave} className="space-y-4">
            <SettingsField label="Provider" htmlFor="provider">
              <select
                id="provider"
                value={credentialKind}
                onChange={(e) => setCredentialKind(e.target.value as CredentialKind)}
                className={settingsInputClass}
              >
                {APOLLO_UI_ENABLED && <option value="apollo">Apollo</option>}
                <option value="apify">Apify</option>
                <option value="llm">LLM</option>
                <option value="reoon">Email verification (Reoon)</option>
              </select>
            </SettingsField>

            {credentialKind === 'llm' ? (
              <SettingsField label="LLM type" htmlFor="llmType">
                <select
                  id="llmType"
                  value={llmType}
                  onChange={(e) => setLlmType(e.target.value as LlmProvider)}
                  className={settingsInputClass}
                >
                  <option value="openai">OpenAI</option>
                  <option value="gemini">Gemini</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </SettingsField>
            ) : null}

            <SettingsField label="API key" htmlFor="key">
              <input
                id="key"
                type="password"
                required
                value={keyValue}
                onChange={(e) => {
                  setKeyValue(e.target.value);
                  if (credentialKind === 'llm') {
                    setNewKeyModels([]);
                    setSelectedNewKeyModel('');
                  }
                }}
                className={settingsInputClass}
                placeholder={
                  resolvedProvider === 'openai'
                    ? 'sk-...'
                    : resolvedProvider === 'openrouter'
                      ? 'sk-or-...'
                      : resolvedProvider === 'reoon'
                        ? 'Your Reoon API key'
                        : 'Paste API key'
                }
              />
            </SettingsField>

            {credentialKind === 'llm' ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-600">Model</p>
                  <button
                    type="button"
                    onClick={() => void fetchModelsForNewKey()}
                    disabled={fetchingNewKeyModels || keyValue.trim().length < 10}
                    className={settingsBtnSecondary}
                  >
                    {fetchingNewKeyModels ? 'Fetching…' : 'Fetch models'}
                  </button>
                </div>

                {newKeyModels.length > 0 ? (
                  <select
                    value={selectedNewKeyModel}
                    onChange={(e) => setSelectedNewKeyModel(e.target.value)}
                    className={settingsInputClass}
                    aria-label="Model"
                  >
                    {newKeyModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-400">Enter a key and fetch models before saving.</p>
                )}
              </div>
            ) : null}

            <button type="submit" disabled={submitting} className={`${settingsBtnPrimary} w-full`}>
              {submitting ? 'Saving…' : `Add ${PROVIDER_LABEL[resolvedProvider]} key`}
            </button>
          </form>
        </SettingsCard>

        <SettingsCard
          icon={IconSparkles}
          title="Email verification"
          description="Only the selected verifier runs — no fallback. Verified emails are cached for 30 days."
        >
          <form onSubmit={(e) => void savePreferences(e)} className="space-y-4">
            <SettingsField
              label="Verifier"
              htmlFor="emailVerificationProvider"
              hint={
                emailVerificationProvider === 'reoon'
                  ? 'Requires a Reoon API key. Apify is not used as a fallback.'
                  : 'Requires an Apify API key. Bounceverify runs for email checks — Reoon is not called.'
              }
            >
              <select
                id="emailVerificationProvider"
                value={emailVerificationProvider}
                onChange={(e) =>
                  setEmailVerificationProvider(e.target.value as EmailVerificationProviderPreference)
                }
                className={settingsInputClass}
              >
                <option value="reoon">Reoon only</option>
                <option value="apify">Apify Bounceverify only</option>
              </select>
            </SettingsField>
            {emailVerificationProvider === 'reoon' && !keys.some((k) => k.provider === 'reoon') ? (
              <p className="text-xs text-amber-600">Add a Reoon key before enriching.</p>
            ) : null}
            {emailVerificationProvider === 'apify' && !keys.some((k) => k.provider === 'apify') ? (
              <p className="text-xs text-amber-600">Add an Apify key before enriching.</p>
            ) : null}

            <button type="submit" disabled={savingPrefs} className={`${settingsBtnPrimary} w-full`}>
              {savingPrefs ? 'Saving…' : 'Save email verification'}
            </button>
          </form>
        </SettingsCard>
      </div>

      <SettingsCard title="Saved keys" padded={false}>
        {loading ? (
          <div className="space-y-3 p-5">
            <div className="h-16 skeleton" />
            <div className="h-16 skeleton" />
          </div>
        ) : visibleKeys.length === 0 ? (
          <div className="p-5">
            <SettingsEmpty>No API keys configured yet.</SettingsEmpty>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visibleKeys.map((key) => {
              const llmProvider = isLlmProvider(key.provider) ? key.provider : null;
              const inUse = llmProvider !== null && llmMode === llmProvider;
              return (
                <li key={key.id} className="flex min-w-0 items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {llmProvider ? `LLM · ${PROVIDER_LABEL[llmProvider]}` : PROVIDER_LABEL[key.provider]}
                      </span>
                      {inUse ? (
                        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          In use
                        </span>
                      ) : null}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          key.isValid
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                      >
                        {key.isValid ? <IconCheck size={10} /> : <IconAlertTriangle size={10} />}
                        {key.isValid ? 'Valid' : 'Invalid / untested'}
                      </span>
                    </div>
                    <p className="truncate font-mono text-xs text-slate-400">{key.maskedKey}</p>
                    {llmProvider ? (
                      <p className="text-[11px] text-slate-500">Model {modelForProvider(preferences, llmProvider)}</p>
                    ) : null}
                    {key.lastTestedAt ? (
                      <p className="text-[11px] text-slate-400">Tested {new Date(key.lastTestedAt).toLocaleString()}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {llmProvider ? (
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
                        <input
                          type="radio"
                          name="active-llm"
                          checked={inUse}
                          disabled={activatingProvider !== null}
                          onChange={() => void handleUseLlm(llmProvider)}
                          className="accent-indigo-600"
                        />
                        Use this
                      </label>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleTest(key.provider, key.id)}
                      disabled={testingId === key.id}
                      className={settingsBtnSecondary}
                      title="Test key"
                    >
                      <IconRefresh size={14} className={testingId === key.id ? 'animate-spin' : ''} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(key.id)}
                      className={settingsBtnDanger}
                      title="Delete key"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SettingsCard>

      <SettingsCard
        title="LeadSniper Autopilot keys"
        description="Service keys start with lh_ and include leads:read, enrich:write, signups:read, and signups:write. The full key is shown only once."
        actions={
          <button
            type="button"
            onClick={() => void createServiceKey()}
            disabled={creatingServiceKey}
            className={settingsBtnPrimary}
          >
            {creatingServiceKey ? 'Creating…' : 'Create key'}
          </button>
        }
      >
        {plainServiceKey ? (
          <div className="mb-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-900">Copy this key now — it won&apos;t be shown again.</p>
            <code className="block break-all rounded-lg bg-white/80 p-2 font-mono text-xs text-amber-950">
              {plainServiceKey}
            </code>
            <button
              type="button"
              className="text-xs font-semibold text-amber-900 underline"
              onClick={() => {
                void navigator.clipboard.writeText(plainServiceKey);
                toast.success('Copied');
              }}
            >
              Copy to clipboard
            </button>
          </div>
        ) : null}

        {serviceKeys.length === 0 ? (
          <SettingsEmpty>No active service keys.</SettingsEmpty>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {serviceKeys.map((key) => (
              <li key={key.id} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{key.name}</p>
                  <p className="truncate font-mono text-xs text-slate-400">{key.maskedKey}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void revokeServiceKey(key.id)}
                  className={settingsBtnDanger}
                  title="Revoke"
                >
                  <IconTrash size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SettingsCard>
    </SettingsPanel>
  );
}

export default function ApiKeysPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ApiKeysPageInner />
    </Suspense>
  );
}
