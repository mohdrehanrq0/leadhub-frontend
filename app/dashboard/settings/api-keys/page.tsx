'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '../../../../lib/api';
import { toast } from 'sonner';
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
  provider: 'apollo' | 'apify' | 'openai' | 'gemini' | 'reoon' | 'leadsnipper';
  maskedKey: string;
  isValid: boolean;
  lastTestedAt?: string;
  createdAt: string;
}

type LlmMode = 'openai' | 'gemini' | 'mix';
type Provider = 'apollo' | 'apify' | 'openai' | 'gemini' | 'reoon';

interface ProviderModelOption {
  id: string;
  label: string;
}

const PROVIDER_LABEL: Record<Provider | 'leadsnipper', string> = {
  apollo: 'Apollo',
  apify: 'Apify',
  openai: 'OpenAI',
  gemini: 'Gemini',
  reoon: 'Reoon',
  leadsnipper: 'LeadSniper',
};

const VALID_PROVIDERS: Provider[] = ['apollo', 'apify', 'openai', 'gemini', 'reoon'];

function ApiKeysPageInner() {
  const searchParams = useSearchParams();
  const providerFromQuery = searchParams.get('provider');

  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider>(() => {
    if (providerFromQuery && VALID_PROVIDERS.includes(providerFromQuery as Provider)) {
      return providerFromQuery as Provider;
    }
    return 'apollo';
  });
  const [keyValue, setKeyValue] = useState('');
  const [newKeyModels, setNewKeyModels] = useState<ProviderModelOption[]>([]);
  const [selectedNewKeyModel, setSelectedNewKeyModel] = useState('');
  const [fetchingNewKeyModels, setFetchingNewKeyModels] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [llmMode, setLlmMode] = useState<LlmMode>('openai');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [openaiModels, setOpenaiModels] = useState<ProviderModelOption[]>([]);
  const [geminiModels, setGeminiModels] = useState<ProviderModelOption[]>([]);
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
      setLlmMode(data.llmMode ?? 'openai');
      setOpenaiModel(data.openaiModel ?? 'gpt-4o-mini');
      setGeminiModel(data.geminiModel ?? 'gemini-1.5-flash');
    } catch {
      toast.error('Failed to load LLM preferences.');
    }
  }

  async function fetchSavedProviderModels(targetProvider: 'openai' | 'gemini') {
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
    const [openai, gemini] = await Promise.all([
      mode === 'openai' || mode === 'mix' ? fetchSavedProviderModels('openai') : Promise.resolve([]),
      mode === 'gemini' || mode === 'mix' ? fetchSavedProviderModels('gemini') : Promise.resolve([]),
    ]);
    setOpenaiModels(openai);
    setGeminiModels(gemini);
    if (openai.length && !openai.some((m) => m.id === openaiModel)) setOpenaiModel(openai[0].id);
    if (gemini.length && !gemini.some((m) => m.id === geminiModel)) setGeminiModel(gemini[0].id);
    setLoadingModeModels(false);
  }

  async function fetchModelsForNewKey() {
    if ((provider !== 'openai' && provider !== 'gemini') || keyValue.trim().length < 10) return;
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
      });
      toast.success('LLM preferences updated.');
      await refreshRoutingModelLists(llmMode);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? 'Failed to save LLM preferences.');
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
    const isLlmProvider = provider === 'openai' || provider === 'gemini';
    if (isLlmProvider && !selectedNewKeyModel) {
      toast.error(`Fetch and select a ${PROVIDER_LABEL[provider]} model first.`);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/api-keys', {
        provider,
        key: keyValue.trim(),
        ...(isLlmProvider ? { selectedModel: selectedNewKeyModel } : {}),
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
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in text-text">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-input">
        <h1 className="text-2xl font-bold text-text-100 flex items-center space-x-2">
          <IconKey className="text-primary" size={24} />
          <span>Workspace API Keys</span>
        </h1>
        <p className="text-text-200 text-sm mt-2">
          Add provider credentials and configure conditional LLM routing. Keys are encrypted at rest using AES-256-GCM.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 bg-card p-6 h-fit space-y-4 border border-border rounded-2xl shadow-input">
          <h2 className="text-sm font-semibold text-text-100 flex items-center gap-2">
            <IconKey size={16} className="text-primary" />
            Add Credentials
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="provider" className="text-xs font-semibold text-text-200">Provider</label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
              >
                <option value="apollo">Apollo API</option>
                <option value="apify">Apify Platform</option>
                <option value="openai">OpenAI Platform</option>
                <option value="gemini">Gemini Platform</option>
                <option value="reoon">Reoon Email Verification</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="key" className="text-xs font-semibold text-text-200">API Key</label>
              <input
                id="key"
                type="password"
                required
                value={keyValue}
                onChange={(e) => {
                  setKeyValue(e.target.value);
                  if (provider === 'openai' || provider === 'gemini') {
                    setNewKeyModels([]);
                    setSelectedNewKeyModel('');
                  }
                }}
                className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
                placeholder={
                  provider === 'openai'
                    ? 'sk-...'
                    : provider === 'reoon'
                      ? 'Your Reoon API key'
                      : 'Paste API key'
                }
              />
            </div>

            {(provider === 'openai' || provider === 'gemini') && (
              <div className="space-y-3 rounded-lg border border-border bg-bg-200/40 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-text-200">{PROVIDER_LABEL[provider]} models</p>
                  <button
                    type="button"
                    onClick={fetchModelsForNewKey}
                    disabled={fetchingNewKeyModels || keyValue.trim().length < 10}
                    className="text-[11px] px-2 py-1 rounded border border-border bg-bg-300 hover:bg-bg-300/70 text-text-200 disabled:opacity-50"
                  >
                    {fetchingNewKeyModels ? 'Fetching...' : 'Fetch Models'}
                  </button>
                </div>

                {newKeyModels.length > 0 ? (
                  <select
                    value={selectedNewKeyModel}
                    onChange={(e) => setSelectedNewKeyModel(e.target.value)}
                    className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
                  >
                    {newKeyModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-text-300">
                    Enter key and fetch models to select one before saving.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary-200 text-white font-medium py-2 rounded-lg text-xs shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : `Add ${PROVIDER_LABEL[provider]} Key`}
            </button>
          </form>
        </div>

        <div className="xl:col-span-1 bg-card p-6 h-fit space-y-4 border border-border rounded-2xl shadow-input">
          <h2 className="text-sm font-semibold text-text-100 flex items-center gap-2">
            <IconSparkles size={16} className="text-primary" />
            LLM Routing
          </h2>
          <p className="text-[11px] text-text-300 leading-5">
            Conditional routing based on use case importance. Provider model selectors are shown only for active mode.
          </p>
          <form onSubmit={savePreferences} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="llmMode" className="text-xs font-semibold text-text-200">Mode</label>
              <select
                id="llmMode"
                value={llmMode}
                onChange={(e) => void handleModeChange(e.target.value as LlmMode)}
                className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
              >
                <option value="openai">OpenAI only</option>
                <option value="gemini">Gemini only</option>
                <option value="mix">Mix mode (dynamic)</option>
              </select>
            </div>

            {(llmMode === 'openai' || llmMode === 'mix') && (
              <div className="space-y-1">
                <label htmlFor="openaiModel" className="text-xs font-semibold text-text-200">OpenAI model</label>
                <select
                  id="openaiModel"
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
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
              </div>
            )}

            {(llmMode === 'gemini' || llmMode === 'mix') && (
              <div className="space-y-1">
                <label htmlFor="geminiModel" className="text-xs font-semibold text-text-200">Gemini model</label>
                <select
                  id="geminiModel"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
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
              </div>
            )}

            {loadingModeModels && (
              <p className="text-[11px] text-text-300">Refreshing available models...</p>
            )}

            <button
              type="submit"
              disabled={savingPrefs}
              className="w-full bg-primary hover:bg-primary-200 text-white font-medium py-2 rounded-lg text-xs shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {savingPrefs ? 'Saving...' : 'Save LLM Settings'}
            </button>
          </form>
        </div>

        <div className="xl:col-span-1 space-y-4">
          {loading ? (
            <div className="space-y-3">
              <div className="h-16 skeleton" />
              <div className="h-16 skeleton" />
            </div>
          ) : keys.length === 0 ? (
            <div className="bg-card p-8 border border-border rounded-xl shadow-input text-center text-text-300 text-xs">
              No API keys configured yet.
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="bg-card p-4 border border-border rounded-2xl flex items-center justify-between hover:border-primary/50 transition-all shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold capitalize text-text-100">
                        {PROVIDER_LABEL[key.provider]}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full flex items-center space-x-1 border ${
                          key.isValid
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                        }`}
                      >
                        {key.isValid ? (
                          <>
                            <IconCheck size={10} className="mr-0.5" />
                            <span>Valid</span>
                          </>
                        ) : (
                          <>
                            <IconAlertTriangle size={10} className="mr-0.5" />
                            <span>Invalid / Untested</span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-text-300">{key.maskedKey}</p>
                    {key.lastTestedAt && (
                      <p className="text-[10px] text-text-300">
                        Tested: {new Date(key.lastTestedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTest(key.provider, key.id)}
                      disabled={testingId === key.id}
                      className="p-1.5 rounded bg-bg-300 hover:bg-bg-300/80 border border-border text-text-200 hover:text-primary transition-all disabled:opacity-50 cursor-pointer"
                      title="Test Key"
                    >
                      <IconRefresh size={14} className={testingId === key.id ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={() => handleDelete(key.id)}
                      className="p-1.5 rounded bg-bg-300 hover:bg-bg-300/80 border border-border text-text-200 hover:text-error transition-all cursor-pointer"
                      title="Delete Key"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LeadSniper Autopilot — service API keys */}
      <div className="rounded-xl border border-border bg-bg-200 p-5 space-y-4 mt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-100">LeadSniper Autopilot keys</h2>
            <p className="text-sm text-text-300 mt-1">
              Create a service API key (starts with lh_) and paste it into LeadSniper → Settings →
              Integrations to connect Autopilot campaigns.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void createServiceKey()}
            disabled={creatingServiceKey}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-white text-sm hover:opacity-90 disabled:opacity-50"
          >
            {creatingServiceKey ? 'Creating…' : 'Create key'}
          </button>
        </div>

        {plainServiceKey && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm space-y-2">
            <p className="font-medium text-amber-900">Copy this key now — it won&apos;t be shown again.</p>
            <code className="block break-all text-xs font-mono text-amber-950 bg-white/70 p-2 rounded">
              {plainServiceKey}
            </code>
            <button
              type="button"
              className="text-xs underline text-amber-900"
              onClick={() => {
                void navigator.clipboard.writeText(plainServiceKey);
                toast.success('Copied');
              }}
            >
              Copy to clipboard
            </button>
          </div>
        )}

        {serviceKeys.length === 0 ? (
          <p className="text-sm text-text-300">No active service keys.</p>
        ) : (
          <div className="space-y-2">
            {serviceKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-100 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-text-100">{key.name}</p>
                  <p className="text-xs font-mono text-text-300">{key.maskedKey}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void revokeServiceKey(key.id)}
                  className="p-1.5 rounded border border-border text-text-200 hover:text-error"
                  title="Revoke"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
