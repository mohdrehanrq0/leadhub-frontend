'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft,
  IconCheck,
  IconLoader2,
  IconRefresh,
  IconSparkles,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../../../lib/api';
import { APOLLO_UI_ENABLED } from '../../../../lib/features';
import { FieldMappingPanel } from '../../../../components/leads/FieldMappingPanel';
import {
  ImportDestinationFields,
  parseTagInput,
} from '../../../../components/leads/ImportDestinationFields';
import type { LeadCategory, LeadList } from '../../../../components/leads/types';
import {
  APOLLO_DEFAULT_MAPPING,
  applyFieldMapping,
  detectFieldMapping,
  getDefaultMappingForSource,
  isUsableMappedLead,
  type FieldMapping,
} from '../../../../lib/lead-field-mapping';

type ProviderKey = {
  id: string;
  provider: string;
  maskedKey: string;
  isValid: boolean;
};

type ApolloPreviewLead = {
  key: string;
  companyName?: string;
  domain?: string;
  email?: string;
  contactName?: string;
  contactRole?: string;
  linkedinUrl?: string;
  location?: string;
  apolloContactId?: string;
  apolloPersonId?: string;
};

type ApolloPreview = {
  contacts: ApolloPreviewLead[];
  people: ApolloPreviewLead[];
};

type ApifyPreview = {
  items: Record<string, unknown>[];
  sourceFields: string[];
  sampleCount: number;
};

const APOLLO_SOURCE_FIELDS = ['contactName', 'email', 'contactRole', 'linkedinUrl', 'location', 'companyName', 'domain'];

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function LeadSyncPage() {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [apolloLimit, setApolloLimit] = useState(100);
  const [apolloKeywords, setApolloKeywords] = useState('');
  const [apolloModalOpen, setApolloModalOpen] = useState(false);
  const [apolloPreview, setApolloPreview] = useState<ApolloPreview | null>(null);
  const [apolloMapping, setApolloMapping] = useState<FieldMapping>({ ...APOLLO_DEFAULT_MAPPING });
  const [apolloStep, setApolloStep] = useState<'select' | 'mapping'>('select');
  const [selectedContactKeys, setSelectedContactKeys] = useState<Set<string>>(new Set());
  const [selectedPeopleKeys, setSelectedPeopleKeys] = useState<Set<string>>(new Set());
  const [importAllContacts, setImportAllContacts] = useState(true);
  const [importAllPeople, setImportAllPeople] = useState(false);

  const [apifyActorId, setApifyActorId] = useState('apify/web-scraper');
  const [apifyInput, setApifyInput] = useState('{\n  "startUrls": []\n}');
  const [apifyLimit, setApifyLimit] = useState(100);
  const [apifyModalOpen, setApifyModalOpen] = useState(false);
  const [apifyPreview, setApifyPreview] = useState<ApifyPreview | null>(null);
  const [apifyMapping, setApifyMapping] = useState<FieldMapping>({});
  const [apifyConfidence, setApifyConfidence] = useState<ReturnType<typeof detectFieldMapping>['confidence']>({});

  const [loading, setLoading] = useState<'keys' | 'apollo-preview' | 'apollo-import' | 'apify-preview' | 'apify-import' | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const [lists, setLists] = useState<LeadList[]>([]);
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [listId, setListId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');

  const apolloKey = keys.find((key) => key.provider === 'apollo');
  const apifyKey = keys.find((key) => key.provider === 'apify');
  const apolloEnabled = !!apolloKey?.isValid;
  const apifyEnabled = !!apifyKey?.isValid;

  const destinationPayload = () => {
    const parsedTags = parseTagInput(tags);
    return {
      listId: listId || undefined,
      categoryId: categoryId || undefined,
      tags: parsedTags.length > 0 ? parsedTags : undefined,
    };
  };

  const selectedApolloLeads = useMemo(() => {
    if (!apolloPreview) return [];
    const contacts = importAllContacts
      ? apolloPreview.contacts
      : apolloPreview.contacts.filter((lead) => selectedContactKeys.has(lead.key));
    const people = importAllPeople
      ? apolloPreview.people
      : apolloPreview.people.filter((lead) => selectedPeopleKeys.has(lead.key));
    return [...contacts, ...people];
  }, [apolloPreview, importAllContacts, importAllPeople, selectedContactKeys, selectedPeopleKeys]);

  const apolloMappedPreview = useMemo(() => {
    return selectedApolloLeads
      .map((lead) => applyFieldMapping(lead as Record<string, unknown>, apolloMapping))
      .filter(isUsableMappedLead);
  }, [selectedApolloLeads, apolloMapping]);

  const apifyMappedPreview = useMemo(() => {
    if (!apifyPreview) return [];
    return apifyPreview.items
      .map((item) => applyFieldMapping(item, apifyMapping))
      .filter(isUsableMappedLead);
  }, [apifyPreview, apifyMapping]);

  async function fetchKeys() {
    try {
      setLoading('keys');
      const res = await api.get('/api/api-keys');
      setKeys(res.data.data ?? []);
    } catch {
      toast.error('Failed to load API key status.');
    } finally {
      setLoading(null);
    }
  }

  async function fetchDestinations() {
    try {
      const [listsRes, categoriesRes] = await Promise.all([
        api.get('/api/lists'),
        api.get('/api/categories'),
      ]);
      setLists(listsRes.data.data ?? []);
      setCategories(categoriesRes.data.data ?? []);
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchKeys();
    void fetchDestinations();
  }, []);

  const apolloFilters = () => ({
    keywords: apolloKeywords
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  });

  const openApolloModal = async () => {
    if (!apolloEnabled) return;
    setApolloModalOpen(true);
    setApolloPreview(null);
    setApolloStep('select');
    setApolloMapping({ ...APOLLO_DEFAULT_MAPPING });
    setSelectedContactKeys(new Set());
    setSelectedPeopleKeys(new Set());
    setImportAllContacts(true);
    setImportAllPeople(false);
    try {
      setLoading('apollo-preview');
      const res = await api.post('/api/sync/apollo/preview', {
        estimatedCount: apolloLimit,
        filters: apolloFilters(),
      });
      const preview = res.data.data as ApolloPreview;
      setApolloPreview(preview);
      setSelectedContactKeys(new Set(preview.contacts.map((lead) => lead.key)));
      toast.success(`Loaded ${preview.contacts.length} Apollo contacts and ${preview.people.length} exported people.`);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to fetch Apollo preview.'));
    } finally {
      setLoading(null);
    }
  };

  const importApolloSelection = async () => {
    try {
      setLoading('apollo-import');
      const res = await api.post('/api/sync/apollo/import', {
        estimatedCount: apolloLimit,
        filters: apolloFilters(),
        contactKeys: Array.from(selectedContactKeys),
        peopleKeys: Array.from(selectedPeopleKeys),
        importAllContacts,
        importAllPeople,
        fieldMapping: apolloMapping,
        ...destinationPayload(),
      });
      setJobId(res.data.data?.jobId);
      setApolloModalOpen(false);
      toast.success('Apollo import started.');
    } catch (err) {
      toast.error(errorMessage(err, 'Apollo import failed.'));
    } finally {
      setLoading(null);
    }
  };

  const openApifyModal = async () => {
    if (!apifyEnabled) return;
    setApifyModalOpen(true);
    setApifyPreview(null);
    try {
      setLoading('apify-preview');
      const actorInput = apifyInput.trim() ? JSON.parse(apifyInput) : {};
      const res = await api.post('/api/sync/apify/preview', {
        actorId: apifyActorId,
        actorInput,
        sampleLimit: 5,
      });
      const preview = res.data.data as ApifyPreview;
      const detected = getDefaultMappingForSource('apify', preview.sourceFields);
      setApifyPreview(preview);
      setApifyMapping(detected.mapping);
      setApifyConfidence(detected.confidence);
      toast.success(`Loaded ${preview.sampleCount} sample rows from Apify. Review field mapping.`);
    } catch (err) {
      toast.error(errorMessage(err, 'Apify preview failed. Check JSON input.'));
      setApifyModalOpen(false);
    } finally {
      setLoading(null);
    }
  };

  const importApifySelection = async () => {
    try {
      setLoading('apify-import');
      const actorInput = apifyInput.trim() ? JSON.parse(apifyInput) : {};
      const res = await api.post('/api/sync/apify/import', {
        actorId: apifyActorId,
        actorInput,
        estimatedCount: apifyLimit,
        fieldMapping: apifyMapping,
        ...destinationPayload(),
      });
      setJobId(res.data.data?.jobId);
      setApifyModalOpen(false);
      toast.success('Apify import started.');
    } catch (err) {
      toast.error(errorMessage(err, 'Apify import failed.'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/dashboard/leads" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
        <IconArrowLeft size={14} /> Back to Leads
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#ede9fe,transparent_28%),linear-gradient(135deg,#fff,#f8fafc)] p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-700">Provider Sync</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          {APOLLO_UI_ENABLED ? 'Sync Apollo and Apify with field mapping.' : 'Sync Apify with field mapping.'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Preview integration data, review auto-detected field mapping, adjust mappings if needed, then import enrichment-ready leads.
        </p>
      </section>

      {jobId && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          Sync job started. <Link href="/dashboard/jobs" className="font-black underline">Open Jobs Queue</Link>
        </div>
      )}

      <div className={`grid gap-6 ${APOLLO_UI_ENABLED ? 'lg:grid-cols-2' : ''}`}>
        {APOLLO_UI_ENABLED && (
        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
          <ProviderHeader
            icon={<IconSparkles size={22} />}
            title="Apollo Sync"
            subtitle="Preview contacts, review field mapping, then import."
            enabled={apolloEnabled}
            keyLabel={apolloKey?.maskedKey}
            missingLabel={apolloKey ? 'Test Apollo key to enable sync' : 'Add Apollo API key to enable sync'}
          />

          <label className="mt-5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Keywords</label>
          <input
            value={apolloKeywords}
            onChange={(event) => setApolloKeywords(event.target.value)}
            placeholder="SaaS, fintech, revenue ops"
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
          />

          <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Preview limit</label>
          <input
            type="number"
            min={1}
            max={500}
            value={apolloLimit}
            onChange={(event) => setApolloLimit(Number(event.target.value))}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
          />

          <button
            onClick={openApolloModal}
            disabled={!apolloEnabled || loading !== null}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {loading === 'apollo-preview' ? <IconLoader2 size={16} className="animate-spin" /> : <IconUsers size={16} />}
            Open Apollo Sync
          </button>
        </section>
        )}

        <section className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
          <ProviderHeader
            icon={<IconRefresh size={22} />}
            title="Apify Sync"
            subtitle="Preview actor output, map fields, then import."
            enabled={apifyEnabled}
            keyLabel={apifyKey?.maskedKey}
            missingLabel={apifyKey ? 'Test Apify key to enable sync' : 'Add Apify API key to enable sync'}
          />

          <label className="mt-5 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Actor ID</label>
          <input value={apifyActorId} onChange={(event) => setApifyActorId(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-300 focus:bg-white" />

          <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Limit</label>
          <input type="number" min={1} max={500} value={apifyLimit} onChange={(event) => setApifyLimit(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-300 focus:bg-white" />

          <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-400">Actor input JSON</label>
          <textarea value={apifyInput} onChange={(event) => setApifyInput(event.target.value)} rows={8} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs text-slate-100 outline-none focus:border-violet-300" />

          <button onClick={openApifyModal} disabled={!apifyEnabled || loading !== null} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-black text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
            {loading === 'apify-preview' ? <IconLoader2 size={16} className="animate-spin" /> : <IconRefresh size={16} />}
            Preview & Map Apify Fields
          </button>
        </section>
      </div>

      {APOLLO_UI_ENABLED && apolloModalOpen && (
        <ApolloModal
          preview={apolloPreview}
          loading={loading}
          step={apolloStep}
          setStep={setApolloStep}
          mapping={apolloMapping}
          setMapping={setApolloMapping}
          mappedPreview={apolloMappedPreview}
          selectedPreviewRows={selectedApolloLeads}
          importAllContacts={importAllContacts}
          importAllPeople={importAllPeople}
          selectedContactKeys={selectedContactKeys}
          selectedPeopleKeys={selectedPeopleKeys}
          setImportAllContacts={setImportAllContacts}
          setImportAllPeople={setImportAllPeople}
          setSelectedContactKeys={setSelectedContactKeys}
          setSelectedPeopleKeys={setSelectedPeopleKeys}
          onClose={() => setApolloModalOpen(false)}
          onImport={importApolloSelection}
          lists={lists}
          categories={categories}
          listId={listId}
          categoryId={categoryId}
          tags={tags}
          onListIdChange={setListId}
          onCategoryIdChange={setCategoryId}
          onTagsChange={setTags}
        />
      )}

      {apifyModalOpen && (
        <ApifyModal
          preview={apifyPreview}
          loading={loading}
          mapping={apifyMapping}
          confidence={apifyConfidence}
          mappedPreview={apifyMappedPreview}
          setMapping={setApifyMapping}
          onClose={() => setApifyModalOpen(false)}
          onImport={importApifySelection}
          lists={lists}
          categories={categories}
          listId={listId}
          categoryId={categoryId}
          tags={tags}
          onListIdChange={setListId}
          onCategoryIdChange={setCategoryId}
          onTagsChange={setTags}
        />
      )}
    </div>
  );
}

function ProviderHeader({
  icon,
  title,
  subtitle,
  enabled,
  keyLabel,
  missingLabel,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  enabled: boolean;
  keyLabel?: string;
  missingLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-2xl p-3 ${enabled ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>{icon}</div>
        <div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black ${enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
        {enabled ? `Key ${keyLabel}` : missingLabel}
      </div>
    </div>
  );
}

function ApolloModal({
  preview,
  loading,
  step,
  setStep,
  mapping,
  setMapping,
  mappedPreview,
  selectedPreviewRows,
  importAllContacts,
  importAllPeople,
  selectedContactKeys,
  selectedPeopleKeys,
  setImportAllContacts,
  setImportAllPeople,
  setSelectedContactKeys,
  setSelectedPeopleKeys,
  onClose,
  onImport,
  lists,
  categories,
  listId,
  categoryId,
  tags,
  onListIdChange,
  onCategoryIdChange,
  onTagsChange,
}: {
  preview: ApolloPreview | null;
  loading: string | null;
  step: 'select' | 'mapping';
  setStep: (step: 'select' | 'mapping') => void;
  mapping: FieldMapping;
  setMapping: (mapping: FieldMapping) => void;
  mappedPreview: ReturnType<typeof applyFieldMapping>[];
  selectedPreviewRows: ApolloPreviewLead[];
  importAllContacts: boolean;
  importAllPeople: boolean;
  selectedContactKeys: Set<string>;
  selectedPeopleKeys: Set<string>;
  setImportAllContacts: (value: boolean) => void;
  setImportAllPeople: (value: boolean) => void;
  setSelectedContactKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedPeopleKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
  onClose: () => void;
  onImport: () => void;
  lists: LeadList[];
  categories: LeadCategory[];
  listId: string;
  categoryId: string;
  tags: string;
  onListIdChange: (value: string) => void;
  onCategoryIdChange: (value: string) => void;
  onTagsChange: (value: string) => void;
}) {
  const selectedCount =
    (importAllContacts ? preview?.contacts.length ?? 0 : selectedContactKeys.size) +
    (importAllPeople ? preview?.people.length ?? 0 : selectedPeopleKeys.size);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Apollo review</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {step === 'select' ? 'Choose records to import' : 'Review Apollo field mapping'}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <IconX size={18} />
          </button>
        </div>

        {loading === 'apollo-preview' || !preview ? (
          <div className="grid min-h-[420px] place-items-center">
            <div className="text-center">
              <IconLoader2 size={28} className="mx-auto animate-spin text-blue-600" />
              <p className="mt-3 text-sm font-bold text-slate-700">Fetching Apollo contacts and exported people...</p>
            </div>
          </div>
        ) : step === 'select' ? (
          <>
            <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-5 lg:grid-cols-2">
              <ApolloSelectionPanel
                title="Saved contacts"
                subtitle={`${preview.contacts.length} contacts from Apollo Contacts`}
                leads={preview.contacts}
                importAll={importAllContacts}
                selectedKeys={selectedContactKeys}
                setImportAll={setImportAllContacts}
                setSelectedKeys={setSelectedContactKeys}
              />
              <ApolloSelectionPanel
                title="Exported people"
                subtitle={`${preview.people.length} people exported/prospected before, excluding contacts`}
                leads={preview.people}
                importAll={importAllPeople}
                selectedKeys={selectedPeopleKeys}
                setImportAll={setImportAllPeople}
                setSelectedKeys={setSelectedPeopleKeys}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-600">
                <span className="font-black text-slate-950">{selectedCount}</span> Apollo records selected.
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  onClick={() => setStep('mapping')}
                  disabled={selectedCount === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  Continue to mapping
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 thin-scrollbar">
              <FieldMappingPanel
                sourceLabel="Apollo"
                sourceFields={APOLLO_SOURCE_FIELDS}
                mapping={mapping}
                onMappingChange={setMapping}
                previewRows={selectedPreviewRows.slice(0, 5) as Record<string, unknown>[]}
                mappedPreviewRows={mappedPreview}
                sampleSize={5}
              />
              <ImportDestinationFields
                lists={lists}
                categories={categories}
                listId={listId}
                categoryId={categoryId}
                tags={tags}
                onListIdChange={onListIdChange}
                onCategoryIdChange={onCategoryIdChange}
                onTagsChange={onTagsChange}
                compact
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
              <button onClick={() => setStep('select')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                Back
              </button>
              <button onClick={onImport} disabled={selectedCount === 0 || loading === 'apollo-import'} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-40">
                {loading === 'apollo-import' ? <IconLoader2 size={16} className="animate-spin" /> : <IconCheck size={16} />}
                Import {selectedCount} records
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ApifyModal({
  preview,
  loading,
  mapping,
  confidence,
  mappedPreview,
  setMapping,
  onClose,
  onImport,
  lists,
  categories,
  listId,
  categoryId,
  tags,
  onListIdChange,
  onCategoryIdChange,
  onTagsChange,
}: {
  preview: ApifyPreview | null;
  loading: string | null;
  mapping: FieldMapping;
  confidence: ReturnType<typeof detectFieldMapping>['confidence'];
  mappedPreview: ReturnType<typeof applyFieldMapping>[];
  setMapping: (mapping: FieldMapping) => void;
  onClose: () => void;
  onImport: () => void;
  lists: LeadList[];
  categories: LeadCategory[];
  listId: string;
  categoryId: string;
  tags: string;
  onListIdChange: (value: string) => void;
  onCategoryIdChange: (value: string) => void;
  onTagsChange: (value: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-700">Apify field mapping</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Review how Apify fields map to LeadHub</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <IconX size={18} />
          </button>
        </div>

        {loading === 'apify-preview' || !preview ? (
          <div className="grid min-h-[420px] place-items-center">
            <div className="text-center">
              <IconLoader2 size={28} className="mx-auto animate-spin text-violet-600" />
              <p className="mt-3 text-sm font-bold text-slate-700">Running Apify preview...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 thin-scrollbar">
              <FieldMappingPanel
                sourceLabel="Apify"
                sourceFields={preview.sourceFields}
                mapping={mapping}
                confidence={confidence}
                onMappingChange={setMapping}
                previewRows={preview.items}
                mappedPreviewRows={mappedPreview}
                sampleSize={5}
              />
              <ImportDestinationFields
                lists={lists}
                categories={categories}
                listId={listId}
                categoryId={categoryId}
                tags={tags}
                onListIdChange={onListIdChange}
                onCategoryIdChange={onCategoryIdChange}
                onTagsChange={onTagsChange}
                compact
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4">
              <div className="text-sm text-slate-600">
                Previewed <span className="font-black text-slate-950">{preview.sampleCount}</span> sample rows. Full import uses your configured limit.
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={onImport} disabled={loading === 'apify-import'} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-40">
                  {loading === 'apify-import' ? <IconLoader2 size={16} className="animate-spin" /> : <IconCheck size={16} />}
                  Import with mapping
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ApolloSelectionPanel({
  title,
  subtitle,
  leads,
  importAll,
  selectedKeys,
  setImportAll,
  setSelectedKeys,
}: {
  title: string;
  subtitle: string;
  leads: ApolloPreviewLead[];
  importAll: boolean;
  selectedKeys: Set<string>;
  setImportAll: (value: boolean) => void;
  setSelectedKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const toggle = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-950">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
            <input type="checkbox" checked={importAll} onChange={(event) => setImportAll(event.target.checked)} />
            Import all
          </label>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 thin-scrollbar">
        {leads.length === 0 ? (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-slate-300 text-center text-xs font-bold text-slate-400">
            Nothing returned by Apollo.
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => (
              <label key={lead.key} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${importAll || selectedKeys.has(lead.key) ? 'border-blue-200 bg-blue-50/70' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <input
                  type="checkbox"
                  disabled={importAll}
                  checked={importAll || selectedKeys.has(lead.key)}
                  onChange={() => toggle(lead.key)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-slate-950">{lead.contactName || lead.email || 'Unnamed Apollo record'}</p>
                    {lead.apolloContactId && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">contact</span>}
                    {lead.apolloPersonId && !lead.apolloContactId && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-700">person</span>}
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{lead.contactRole || 'No role'} at {lead.companyName || 'Unknown company'}</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-slate-400">{lead.email || lead.linkedinUrl || lead.domain || 'No email/domain'}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
