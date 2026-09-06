'use client';

import React, { useEffect, useState, Suspense } from 'react';
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
  IconKey,
  IconRefresh,
  IconSparkles,
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
type Provider = 'apollo' | 'apify' | 'openai' | 'gemini' | 'openrouter' | 'reoon';
type LlmProvider = 'openai' | 'gemini' | 'openrouter';

interface ProviderModelOption {
  id: string;
  label: string;
}

const PROVIDER_LABEL: Record<Provider | 'leadsnipper', string> = {
  apollo: 'Apollo',
  apify: 'Apify',
  openai: 'OpenAI',
  gemini: 'Gemini',
  openrouter: 'OpenRouter',
  reoon: 'Reoon',
  leadsnipper: 'LeadSniper',
};

const VALID_PROVIDERS: Provider[] = APOLLO_UI_ENABLED
  ? ['apollo', 'apify', 'openai', 'gemini', 'openrouter', 'reoon']
  : ['apify', 'openai', 'gemini', 'openrouter', 'reoon'];

function isLlmProvider(p: Provider): p is LlmProvider {
  return p === 'openai' || p === 'gemini' || p === 'openrouter';
}

function ApiKeysPageInner() {
  const searchParams = useSearchParams();
  const providerFromQuery = searchParams.get('provider');

  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider>(() => {
    if (providerFromQuery && VALID_PROVIDERS.includes(providerFromQuery as Provider)) {
      return providerFromQuery as Provider;
    }
    return 'apify';
  });
  const [keyValue, setKeyValue] = useState('');
  const [newKeyModels, setNewKeyModels] = useState<ProviderModelOption[]>([]);
  const [selectedNewKeyModel, setSelectedNewKeyModel] = useState('');
  const [fetchingNewKeyModels, setFetchingNewKeyModels] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [llmMode, setLlmMode] = useState<LlmMode>('mix');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [openrouterModel, setOpenrouterModel] = useState('openai/gpt-4o-mini');
  const [emailVerificationProvider, setEmailVerificationProvider] =
    useState<EmailVerificationProviderPreference>('reoon');
  const [openaiModels, setOpenaiModels] = useState<ProviderModelOption[]>([]);
  const [geminiModels, setGeminiModels] = useState<ProviderModelOption[]>([]);
  const [openrouterModels, setOpenrouterModels] = useState<ProviderModelOption[]>([]);
  const [loadingModeModels, setLoadingModeModels] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // LeadSniper M2M service API keys
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

  useEffect(() => {
    void Promise.all([fetchKeys(), fetchPreferences(), fetchServiceKeys()]);
  }, []);

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

  useEffect(() => {
    if (providerFromQuery && VALID_PROVIDERS.includes(providerFromQuery as Provider)) {
      setProvider(providerFromQuery as Provider);
    }
  }, [providerFromQuery]);

  useEffect(() => {
    setNewKeyModels([]);
    setSelectedNewKeyModel('');
  }, [provider]);

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
      setEmailVerificationProvider(
        data.emailVerificationProvider === 'apify' ? 'apify' : 'reoon',
      );
    } catch {
      toast.error('Failed to load workspace preferences.');
    }
  }

  async function fetchSavedProviderModels(targetProvider: LlmProvider) {
    try {
      const res = await api.post('/api/api-keys/models', { provider: targetProvider });
      return (res.data.data ?? []) as ProviderModelOption[];
    } catch {
      return [];
    }
  }

  async function refreshRoutingModelLists(currentMode?: LlmMode) {
    const mode = currentMode ?? llmMode;
    setLoadingModeModels(true);
    const [openai, gemini, openrouter] = await Promise.all([
      mode === 'openai' || mode === 'mix' ? fetchSavedProviderModels('openai') : Promise.resolve([]),
      mode === 'gemini' || mode === 'mix' ? fetchSavedProviderModels('gemini') : Promise.resolve([]),
      mode === 'openrouter' ? fetchSavedProviderModels('openrouter') : Promise.resolve([]),
    ]);
    setOpenaiModels(openai);
    setGeminiModels(gemini);
    setOpenrouterModels(openrouter);
    if (openai.length && !openai.some((m) => m.id === openaiModel)) setOpenaiModel(openai[0].id);
    if (gemini.length && !gemini.some((m) => m.id === geminiModel)) setGeminiModel(gemini[0].id);
    if (openrouter.length && !openrouter.some((m) => m.id === openrouterModel)) {
      setOpenrouterModel(openrouter[0].id);
    }
    setLoadingModeModels(false);
  }

  async function fetchModelsForNewKey() {
    if (!isLlmProvider(provider) || keyValue.trim().length < 10) return;
    setFetchingNewKeyModels(true);
    try {
      const res = await api.post('/api/api-keys/models', {
        provider,
        key: keyValue.trim(),
      });
      const models = (res.data.data ?? []) as ProviderModelOption[];
      setNewKeyModels(models);
      setSelectedNewKeyModel(models[0]?.id ?? '');
      if (!models.length) toast.error(`No supported ${PROVIDER_LABEL[provider]} models found for this key.`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? `Failed to fetch ${PROVIDER_LABEL[provider]} models.`);
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
      await api.put('/api/api-keys/preferences', {
        llmMode,
        openaiModel,
        geminiModel,
        openrouterModel,
        emailVerificationProvider,
      });
      toast.success('Workspace preferences updated.');
      await refreshRoutingModelLists(llmMode);
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

  const handleModeChange = async (nextMode: LlmMode) => {
    setLlmMode(nextMode);
    await refreshRoutingModelLists(nextMode);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyValue.trim()) return;
    if (isLlmProvider(provider) && !selectedNewKeyModel) {
      toast.error(`Fetch and select a ${PROVIDER_LABEL[provider]} model first.`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/api-keys', {
        provider,
        key: keyValue.trim(),
        ...(isLlmProvider(provider) ? { selectedModel: selectedNewKeyModel } : {}),
      });
      toast.success(`${PROVIDER_LABEL[provider]} key saved successfully.`);
      setKeyValue('');
      setNewKeyModels([]);
      setSelectedNewKeyModel('');
      await Promise.all([fetchKeys(), fetchPreferences(), refreshRoutingModelLists()]);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? 'Failed to save API key.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    void refreshRoutingModelLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SettingsPanel wide>
      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <SettingsCard
          icon={IconKey}
          title="Add credentials"
          description="Keys are encrypted at rest with AES-256-GCM."
        >
          <form onSubmit={handleSave} className="space-y-4">
            <SettingsField label="Provider" htmlFor="provider">
              <select
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className={settingsInputClass}
              >
                {APOLLO_UI_ENABLED && <option value="apollo">Apollo API</option>}
                <option value="apify">Apify Platform</option>
                <option value="openai">OpenAI Platform</option>
                <option value="gemini">Gemini Platform</option>
                <option value="openrouter">OpenRouter</option>
                <option value="reoon">Reoon Email Verification</option>
              </select>
            </SettingsField>

            <SettingsField label="API key" htmlFor="key">
              <input
                id="key"
                type="password"
                required
                value={keyValue}
                onChange={(e) => {
                  setKeyValue(e.target.value);
                  if (isLlmProvider(provider)) {
                    setNewKeyModels([]);
                    setSelectedNewKeyModel('');
                  }
                }}
                className={settingsInputClass}
                placeholder={
                  provider === 'openai'
                    ? 'sk-...'
                    : provider === 'openrouter'
                      ? 'sk-or-...'
                      : provider === 'reoon'
                        ? 'Your Reoon API key'
                        : 'Paste API key'
                }
              />
            </SettingsField>

            {isLlmProvider(provider) ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-600">{PROVIDER_LABEL[provider]} models</p>
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
              {submitting ? 'Saving…' : `Add ${PROVIDER_LABEL[provider]} key`}
            </button>
          </form>
        </SettingsCard>

        <SettingsCard
          icon={IconSparkles}
          title="Enrichment preferences"
          description="Only the selected verifier runs — no fallback. Verified emails are cached for 30 days."
        >
          <form onSubmit={(e) => void savePreferences(e)} className="space-y-4">
            <SettingsField
              label="Email verification"
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

            <div className="space-y-4 border-t border-slate-100 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">LLM routing</p>
              <SettingsField label="Mode" htmlFor="llmMode">
                <select
                  id="llmMode"
                  value={llmMode}
                  onChange={(e) => void handleModeChange(e.target.value as LlmMode)}
                  className={settingsInputClass}
                >
                  <option value="openai">OpenAI only</option>
                  <option value="gemini">Gemini only</option>
                  <option value="openrouter">OpenRouter only</option>
                  <option value="mix">Mix mode (dynamic)</option>
                </select>
              </SettingsField>

              {llmMode === 'openai' || llmMode === 'mix' ? (
                <SettingsField label="OpenAI model" htmlFor="openaiModel">
                  <select
                    id="openaiModel"
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    className={settingsInputClass}
                  >
                    {openaiModels.length ? (
                      openaiModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))
                    ) : (
                      <option value={openaiModel}>No OpenAI key/models found</option>
                    )}
                  </select>
                </SettingsField>
              ) : null}

              {llmMode === 'gemini' || llmMode === 'mix' ? (
                <SettingsField label="Gemini model" htmlFor="geminiModel">
                  <select
                    id="geminiModel"
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className={settingsInputClass}
                  >
                    {geminiModels.length ? (
                      geminiModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))
                    ) : (
                      <option value={geminiModel}>No Gemini key/models found</option>
                    )}
                  </select>
                </SettingsField>
              ) : null}

              {llmMode === 'openrouter' ? (
                <SettingsField label="OpenRouter model" htmlFor="openrouterModel">
                  <select
                    id="openrouterModel"
                    value={openrouterModel}
                    onChange={(e) => setOpenrouterModel(e.target.value)}
                    className={settingsInputClass}
                  >
                    {openrouterModels.length ? (
                      openrouterModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label}
                        </option>
                      ))
                    ) : (
                      <option value={openrouterModel}>No OpenRouter key/models found</option>
                    )}
                  </select>
                </SettingsField>
              ) : null}

              {loadingModeModels ? <p className="text-xs text-slate-400">Refreshing available models…</p> : null}
            </div>

            <button type="submit" disabled={savingPrefs} className={`${settingsBtnPrimary} w-full`}>
              {savingPrefs ? 'Saving…' : 'Save preferences'}
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
        ) : keys.filter((key) => APOLLO_UI_ENABLED || key.provider !== 'apollo').length === 0 ? (
          <div className="p-5">
            <SettingsEmpty>No API keys configured yet.</SettingsEmpty>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {keys
              .filter((key) => APOLLO_UI_ENABLED || key.provider !== 'apollo')
              .map((key) => (
                <li key={key.id} className="flex min-w-0 items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{PROVIDER_LABEL[key.provider]}</span>
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
                    {key.lastTestedAt ? (
                      <p className="text-[11px] text-slate-400">Tested {new Date(key.lastTestedAt).toLocaleString()}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
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
              ))}
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
