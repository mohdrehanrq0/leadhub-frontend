'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { getApiBaseUrl } from '../../../lib/api-base';
import { useAuth } from '../../../context/AuthContext';
import { useLinkedInSnapshot } from '../../enrichment/useEnrichmentData';
import type { EnrichmentFact } from '../../enrichment/types';
import { buildIdentityNote } from '../../../lib/identity-reasons';
import {
  canEnrichLead,
  canReEnrichLead,
  enrichmentBlockReason,
  enrichmentDisabledReason,
  type AiIntelligenceData,
  type CanonicalLeadProfile,
  type EnrichmentLog,
  type FetchStats,
  type LeadCategory,
  type LeadList,
  type ResearchActivity,
  type ResearchQuery,
} from '../types';
import type { LeadDetail } from './types';

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

const GENERIC_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'zoho.com',
  'mail.com',
  'yandex.com',
  'gmx.com',
]);

export function useLeadDetail() {
  const { activeWorkspaceId, user } = useAuth();
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notes, setNotes] = useState('');
  const [listToAdd, setListToAdd] = useState('');
  const [enrichmentLogs, setEnrichmentLogs] = useState<EnrichmentLog[]>([]);
  const [researchActivities, setResearchActivities] = useState<ResearchActivity[]>([]);
  const [researchQueries, setResearchQueries] = useState<ResearchQuery[]>([]);
  const [aiIntelligence, setAiIntelligence] = useState<AiIntelligenceData | null>(null);
  const [canonicalProfile, setCanonicalProfile] = useState<CanonicalLeadProfile | null>(null);
  const [facts, setFacts] = useState<EnrichmentFact[]>([]);
  const { snapshot: linkedinSnapshot } = useLinkedInSnapshot(id ? `/api/leads/${id}` : null);
  const [reEnriching, setReEnriching] = useState(false);
  const [enrichmentAgentId, setEnrichmentAgentId] = useState('');
  const [identityDismissed, setIdentityDismissed] = useState(false);
  const [identityForced, setIdentityForced] = useState(false);
  const [liveFetchStats, setLiveFetchStats] = useState<FetchStats | null>(null);
  const [draft, setDraft] = useState<{ subject: string; body: string; evidence: string[] } | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const loadedOnce = useRef(false);

  const loadDraft = useCallback(async (current: LeadDetail | null) => {
    if (!id) return;
    const fallbackSubject =
      typeof current?.rawData?.generatedEmailSubject === 'string' ? current.rawData.generatedEmailSubject : '';
    const fallbackBody =
      typeof current?.rawData?.generatedEmailBody === 'string' ? current.rawData.generatedEmailBody : '';
    try {
      const res = await api.get(`/api/outreach/runs/${id}`);
      const runs = (res.data.data ?? []) as Array<{
        message?: { subject?: string | null; body?: string | null; claimsJson?: Array<{ text?: string }> } | null;
        messages?: Array<{ subject?: string | null; body?: string | null; claimsJson?: Array<{ text?: string }> }>;
      }>;
      const latest = runs[0];
      const message = latest?.messages?.[0] ?? latest?.message ?? null;
      const subject = message?.subject?.trim() || fallbackSubject;
      const body = message?.body?.trim() || fallbackBody;
      const evidence = (message?.claimsJson ?? []).map((claim) => claim.text?.trim() || '').filter(Boolean);
      setDraft(subject || body ? { subject, body, evidence } : null);
    } catch {
      setDraft(fallbackSubject || fallbackBody ? { subject: fallbackSubject, body: fallbackBody, evidence: [] } : null);
    }
  }, [id]);

  const loadLead = useCallback(async () => {
    if (!activeWorkspaceId || !id) return;
    try {
      if (!loadedOnce.current) setLoading(true);
      const [leadRes, catRes, listRes] = await Promise.all([
        api.get(`/api/leads/${id}`),
        api.get('/api/categories'),
        api.get('/api/lists'),
      ]);
      const leadData: LeadDetail = leadRes.data.data;
      setLead(leadData);
      setNotes(leadData.notes ?? '');
      if (leadData.enrichmentAgentId) setEnrichmentAgentId(leadData.enrichmentAgentId);
      setCategories(catRes.data.data ?? []);
      setLists(listRes.data.data ?? []);
      await loadDraft(leadData);
    } catch {
      toast.error('Failed to load lead.');
    } finally {
      loadedOnce.current = true;
      setLoading(false);
    }
  }, [activeWorkspaceId, id, loadDraft]);

  const loadEnrichmentData = useCallback(async () => {
    if (!id) return;
    try {
      const [logsRes, activitiesRes, queriesRes, aiRes, profileRes, factsRes] = await Promise.all([
        api.get(`/api/leads/${id}/enrichment-logs`),
        api.get(`/api/leads/${id}/research-activities`),
        api.get(`/api/leads/${id}/research-queries`),
        api.get(`/api/leads/${id}/ai-intelligence`),
        api.get(`/api/leads/${id}/profile`),
        api.get(`/api/leads/${id}/facts`),
      ]);
      setFacts(factsRes.data.data ?? []);
      setEnrichmentLogs(logsRes.data.data ?? []);
      setResearchActivities(activitiesRes.data.data ?? []);
      setResearchQueries(queriesRes.data.data ?? []);
      setAiIntelligence(
        aiRes.data.data
          ? { ...aiRes.data.data, enrichmentProfile: aiRes.data.enrichmentProfile ?? null }
          : null,
      );
      setCanonicalProfile(profileRes.data.data ?? null);
    } catch {
      // Findings can render from the lead payload alone.
    }
  }, [id]);

  const reload = useCallback(async () => {
    await loadLead();
    await loadEnrichmentData();
  }, [loadLead, loadEnrichmentData]);

  useEffect(() => {
    void loadLead();
    void loadEnrichmentData();
  }, [loadLead, loadEnrichmentData]);

  useEffect(() => {
    if (!lead || !id || lead.enrichmentStatus !== 'in_progress') return;
    const es = new EventSource(`${getApiBaseUrl()}/api/leads/${id}/enrichment-status`, { withCredentials: true });
    sseRef.current = es;
    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'step' && payload.step) {
          setEnrichmentLogs((prev) => {
            const idx = prev.findIndex((log) => log.id === payload.step.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = payload.step;
              return next;
            }
            return [...prev, payload.step];
          });
        } else if (payload.type === 'activity' && payload.activity) {
          setResearchActivities((prev) => (prev.some((item) => item.id === payload.activity.id) ? prev : [...prev, payload.activity]));
        } else if (payload.type === 'query' && payload.query) {
          setResearchQueries((prev) => {
            const idx = prev.findIndex((query) => query.id === payload.query.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = payload.query;
              return next;
            }
            return [...prev, payload.query];
          });
        } else if (payload.type === 'queries' && payload.queries) {
          setResearchQueries(payload.queries);
        } else if (payload.type === 'steps' || payload.type === 'snapshot') {
          setEnrichmentLogs(payload.steps ?? []);
          if (payload.activities) setResearchActivities(payload.activities);
          if (payload.queries) setResearchQueries(payload.queries);
          if (payload.fetchStats) setLiveFetchStats(payload.fetchStats as FetchStats);
        } else if (payload.type === 'done') {
          es.close();
          sseRef.current = null;
          void reload();
        }
      } catch {
        // Ignore malformed stream events.
      }
    };
    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [lead?.enrichmentStatus, id, reload]);

  const patch = useCallback(
    async (payload: Record<string, unknown>) => {
      setSaving(true);
      try {
        await api.patch(`/api/leads/${id}`, payload);
        await loadLead();
        toast.success('Saved.');
      } catch (err) {
        toast.error(errorMessage(err, 'Save failed.'));
      } finally {
        setSaving(false);
      }
    },
    [id, loadLead],
  );

  const saveNotes = useCallback(() => patch({ notes }), [notes, patch]);

  const suggestedDomain = useMemo(() => {
    if (lead?.company?.domain) return null;
    const email = lead?.contact?.email?.trim();
    if (!email?.includes('@')) return null;
    const domain = email.split('@')[1]?.toLowerCase().trim();
    if (!domain || GENERIC_DOMAINS.has(domain)) return null;
    return domain;
  }, [lead?.company?.domain, lead?.contact?.email]);

  const saveWebsite = useCallback(
    async (domainToSave: string) => {
      const clean = domainToSave.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
      if (!clean) return;
      await patch({
        company: {
          ...(lead?.company ?? {}),
          name: lead?.company?.name || clean,
          domain: clean,
        },
      });
    },
    [lead?.company, patch],
  );

  const addToList = useCallback(async () => {
    if (!listToAdd) return;
    try {
      await api.post(`/api/leads/${id}/lists`, { listId: listToAdd });
      toast.success('Added to list.');
      setListToAdd('');
      await loadLead();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to add to list.'));
    }
  }, [id, listToAdd, loadLead]);

  const reEnrich = useCallback(async () => {
    if (!lead || lead.enrichmentStatus === 'in_progress') return;
    const again = lead.enrichmentStatus === 'completed' || lead.enrichmentStatus === 'partial';
    if (again) {
      const ok = window.confirm('Re-run research on this lead? Previous searches stay in the log.');
      if (!ok) return;
    }
    try {
      setReEnriching(true);
      await api.post('/api/leads/enrich', {
        leadIds: [lead.id],
        reEnrich: again,
        ...(enrichmentAgentId ? { enrichmentAgentId } : {}),
      });
      toast.success(again ? 'Re-enrichment started.' : 'Enrichment started.');
      setResearchActivities([]);
      setResearchQueries([]);
      setLiveFetchStats(null);
      await reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to start enrichment.'));
    } finally {
      setReEnriching(false);
    }
  }, [lead, enrichmentAgentId, reload]);

  const remove = useCallback(async () => {
    if (!lead || deleting) return;
    if (lead.enrichmentStatus === 'in_progress') {
      toast.error('Wait for enrichment to finish before deleting.');
      return;
    }
    const label =
      [lead.contact?.firstName, lead.contact?.lastName].filter(Boolean).join(' ') ||
      lead.contact?.email ||
      lead.company?.name ||
      'this lead';
    if (!window.confirm(`Permanently delete ${label}?`)) return;
    try {
      setDeleting(true);
      sseRef.current?.close();
      await api.delete(`/api/leads/${id}`);
      toast.success('Lead deleted.');
      router.push('/dashboard/leads');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to delete lead.'));
      setDeleting(false);
    }
  }, [lead, deleting, id, router]);

  const identityHeadline = useMemo(() => {
    if (!lead) return null;
    const enrichmentDone = lead.enrichmentStatus === 'completed' || lead.enrichmentStatus === 'partial';
    const suggestions = lead.researchSuggestions as {
      companyNotFound?: boolean;
      identityRejected?: boolean;
      identityValidated?: boolean;
      gapsRemaining?: string[];
      unableToFind?: string[];
      identityBlockReasons?: string[];
      fetchStats?: FetchStats | null;
    } | null;
    const companyNotFound =
      suggestions?.companyNotFound === true ||
      suggestions?.identityRejected === true ||
      (suggestions?.identityValidated === false &&
        (suggestions.gapsRemaining ?? suggestions.unableToFind ?? []).some(
          (gap) => gap === 'company_not_found' || gap === 'missing_valid_company_domain',
        )) ||
      (enrichmentDone && !lead.company?.domain && !lead.company?.website && suggestions?.identityValidated === false);
    const identityUnvalidated =
      suggestions?.identityValidated === false ||
      companyNotFound ||
      (enrichmentDone && (suggestions?.gapsRemaining ?? []).includes('company_identity_unvalidated'));
    if (!companyNotFound && !identityUnvalidated) return null;
    return (
      buildIdentityNote({
        companyNotFound,
        identityUnvalidated,
        blockReasons: suggestions?.identityBlockReasons,
        gapsRemaining: suggestions?.gapsRemaining ?? suggestions?.unableToFind,
        fetchStats: liveFetchStats ?? suggestions?.fetchStats ?? null,
        researchActivities,
      })?.headline ?? null
    );
  }, [lead, liveFetchStats, researchActivities]);

  const formatDate = useCallback(
    (value?: string | null) =>
      value
        ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
        : '—',
    [],
  );

  return {
    loading,
    lead,
    categories,
    lists,
    notes,
    setNotes,
    saving,
    listToAdd,
    setListToAdd,
    aiIntelligence,
    canonicalProfile,
    facts,
    linkedinSnapshot,
    researchQueries,
    researchActivities,
    enrichmentLogs,
    fetchStats: liveFetchStats ?? (lead?.researchSuggestions as { fetchStats?: FetchStats } | null)?.fetchStats ?? null,
    draft,
    isPlatformAdmin: Boolean(user?.isPlatformAdmin),
    enrichmentAgentId,
    setEnrichmentAgentId,
    reEnriching,
    deleting,
    canRunEnrich: Boolean(lead && (canEnrichLead(lead) || canReEnrichLead(lead)) && lead.enrichmentStatus !== 'in_progress'),
    enrichDisabled: lead ? enrichmentDisabledReason(lead) : null,
    enrichBlock: lead ? enrichmentBlockReason(lead) : null,
    suggestedDomain,
    identityHeadline,
    identityOpen:
      Boolean(lead) &&
      !identityDismissed &&
      (identityForced || lead?.enrichmentStatus === 'needs_identity_confirmation'),
    openIdentity: () => {
      setIdentityDismissed(false);
      setIdentityForced(true);
    },
    closeIdentity: () => {
      setIdentityForced(false);
      setIdentityDismissed(true);
    },
    patch,
    saveNotes,
    saveWebsite,
    addToList,
    reEnrich,
    remove,
    reload,
    formatDate,
  };
}

export type LeadDetailController = ReturnType<typeof useLeadDetail> & { lead: LeadDetail };
