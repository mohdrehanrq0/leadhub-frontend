'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import { IconKey, IconTrash, IconCheck, IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

interface ApiKeyRecord {
  id: string;
  provider: 'apollo' | 'apify' | 'openai' | 'leadsnipper';
  maskedKey: string;
  isValid: boolean;
  lastTestedAt?: string;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<'apollo' | 'apify' | 'openai' | 'leadsnipper'>('apollo');
  const [keyValue, setKeyValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/api-keys');
      setKeys(res.data.data ?? []);
    } catch {
      toast.error('Failed to load API keys.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyValue) return;
    setSubmitting(true);
    try {
      await api.post('/api/api-keys', { provider, key: keyValue });
      toast.success('API key saved successfully.');
      setKeyValue('');
      fetchKeys();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to save API key.');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-text">
      <div>
        <h1 className="text-2xl font-bold text-text-100 flex items-center space-x-2">
          <IconKey className="text-primary" />
          <span>Workspace API Keys</span>
        </h1>
        <p className="text-text-200 text-sm mt-1">
          Save credentials to authorize lead collection. Keys are encrypted at rest using AES-256-GCM.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form panel */}
        <div className="md:col-span-1 bg-card p-6 h-fit space-y-4 border border-border rounded-xl shadow-input">
          <h2 className="text-sm font-semibold text-text-100">Add Credentials</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="provider" className="text-xs font-semibold text-text-200">Provider</label>
              <select
                id="provider"
                value={provider}
                onChange={(e: any) => setProvider(e.target.value)}
                className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
              >
                <option value="apollo">Apollo API</option>
                <option value="apify">Apify Platform</option>
                <option value="openai">OpenAI Platform</option>
                <option value="leadsnipper">LeadSniper API</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="key" className="text-xs font-semibold text-text-200">API Key</label>
              <input
                id="key"
                type="password"
                required
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
                placeholder="sk-..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary-200 text-white font-medium py-2 rounded-lg text-xs shadow-sm active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Add Key'}
            </button>
          </form>
        </div>

        {/* List panel */}
        <div className="md:col-span-2 space-y-4">
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
                  className="bg-card p-4 border border-border rounded-xl flex items-center justify-between hover:border-primary/50 transition-all shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold capitalize text-text-100">
                        {key.provider === 'leadsnipper' ? 'LeadSniper' : key.provider}
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
    </div>
  );
}
