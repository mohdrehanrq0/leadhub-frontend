'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { MessageTemplateEditor } from '@/components/campaigns/MessageTemplateEditor';
import { PageHeader } from '@/components/layout/PageHeader';
import { btnOutline, btnPrimary, cardClass, inputClass } from '@/components/ui/styles';
import { DEFAULT_MESSAGE_TEMPLATE } from '@/lib/campaigns';
import { toTemplateLead, type TemplateLead } from '@/lib/message-template';
import { flushLinkedInOutbox } from '@/lib/flush-linkedin-outbox';
import type { LeadList, LeadRow } from '@/components/leads/types';

type CampaignKind = 'invite_then_message' | 'message_1st';
type Message1stSource = 'people_search' | 'prospect_list';
type Step = 'details' | 'filters' | 'leads' | 'pick' | 'message' | 'review';

type SearchQuery = {
  title: string;
  location: string;
  company: string;
  keywords: string;
};

type SyncedConnection = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  headline: string | null;
  linkedinUrl: string;
};

const CONNECTIONS_PAGE_SIZE = 500;

const SAMPLE_SEARCH_TEMPLATE_LEAD: TemplateLead = toTemplateLead({
  id: 'sample',
  name: 'Alex',
  firstName: 'Alex',
  lastName: null,
  title: 'Founder',
  companyName: 'Acme',
  location: null,
});

function leadRowToTemplateLead(lead: LeadRow): TemplateLead {
  const firstName = lead.contact?.firstName ?? null;
  const lastName = lead.contact?.lastName ?? null;
  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Lead';
  return toTemplateLead({
    id: lead.id,
    name,
    firstName,
    lastName,
    title: lead.contact?.role ?? null,
    companyName: lead.company?.name ?? null,
    location: lead.contact?.location ?? lead.company?.city ?? lead.company?.country ?? null,
  });
}

function connectionToTemplateLead(c: SyncedConnection): TemplateLead {
  return toTemplateLead({
    id: c.id,
    name: c.fullName || 'Lead',
    firstName: c.firstName,
    lastName: c.lastName,
    title: c.headline,
    companyName: null,
    location: null,
  });
}

function searchQueryHasValue(q: SearchQuery): boolean {
  return Boolean(q.title.trim() || q.location.trim() || q.company.trim() || q.keywords.trim());
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [kind, setKind] = useState<CampaignKind>('invite_then_message');
  const [message1stSource, setMessage1stSource] = useState<Message1stSource>('people_search');
  const [name, setName] = useState('');
  const [dropTrackingDays, setDropTrackingDays] = useState(6);
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    title: '',
    location: '',
    company: '',
    keywords: '',
  });
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [connections, setConnections] = useState<SyncedConnection[]>([]);
  const [connectionTotal, setConnectionTotal] = useState(0);
  const [connectionPage, setConnectionPage] = useState(1);
  const [pickQuery, setPickQuery] = useState('');
  const [pickHeadline, setPickHeadline] = useState('');
  const [appliedPickQuery, setAppliedPickQuery] = useState('');
  const [appliedPickHeadline, setAppliedPickHeadline] = useState('');
  /** Explicit selected ids (used when not in select-all-matching mode). */
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<Set<string>>(new Set());
  /** When true, every connection matching applied filters is selected, minus excludeIds. */
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [excludedConnectionIds, setExcludedConnectionIds] = useState<Set<string>>(new Set());
  const [matchingTotal, setMatchingTotal] = useState(0);
  const [selectBusy, setSelectBusy] = useState(false);
  const [templateLeads, setTemplateLeads] = useState<TemplateLead[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isMessage1st = kind === 'message_1st';
  const isSearchSource = isMessage1st && message1stSource === 'people_search';
  const isConnectionsSource = isMessage1st && message1stSource === 'prospect_list';

  const steps: Step[] = useMemo(() => {
    if (isSearchSource) return ['details', 'filters', 'message', 'review'];
    if (isConnectionsSource) return ['details', 'pick', 'message', 'review'];
    return ['details', 'leads', 'message', 'review'];
  }, [isSearchSource, isConnectionsSource]);

  const stepIndex = steps.indexOf(step);

  useEffect(() => {
    if (!steps.includes(step)) setStep('details');
  }, [steps, step]);

  useEffect(() => {
    void (async () => {
      try {
        setLoadingLists(true);
        const res = await api.get('/api/lists');
        setLists(res.data.data ?? []);
      } catch {
        toast.error('Failed to load prospect lists.');
      } finally {
        setLoadingLists(false);
      }
    })();
  }, []);

  const selectedListLeadCount = useMemo(
    () =>
      lists
        .filter((list) => selectedListIds.includes(list.id))
        .reduce((sum, list) => sum + (list.leadCount ?? 0), 0),
    [lists, selectedListIds],
  );

  const connectionTotalPages = Math.max(1, Math.ceil(connectionTotal / CONNECTIONS_PAGE_SIZE));

  const selectedConnectionCount = useMemo(() => {
    if (selectAllMatching) return Math.max(0, matchingTotal - excludedConnectionIds.size);
    return selectedConnectionIds.size;
  }, [selectAllMatching, matchingTotal, excludedConnectionIds, selectedConnectionIds]);

  const pageSelectedCount = useMemo(
    () =>
      connections.filter((c) =>
        selectAllMatching ? !excludedConnectionIds.has(c.id) : selectedConnectionIds.has(c.id),
      ).length,
    [connections, selectAllMatching, excludedConnectionIds, selectedConnectionIds],
  );

  const allOnPageSelected =
    connections.length > 0 && pageSelectedCount === connections.length;

  function isConnectionSelected(id: string): boolean {
    if (selectAllMatching) return !excludedConnectionIds.has(id);
    return selectedConnectionIds.has(id);
  }

  function toggleList(id: string) {
    setSelectedListIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleConnection(id: string) {
    if (selectAllMatching) {
      setExcludedConnectionIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    setSelectedConnectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePageConnections() {
    if (allOnPageSelected) {
      if (selectAllMatching) {
        setExcludedConnectionIds((prev) => {
          const next = new Set(prev);
          for (const c of connections) next.add(c.id);
          return next;
        });
      } else {
        setSelectedConnectionIds((prev) => {
          const next = new Set(prev);
          for (const c of connections) next.delete(c.id);
          return next;
        });
      }
      return;
    }
    if (selectAllMatching) {
      setExcludedConnectionIds((prev) => {
        const next = new Set(prev);
        for (const c of connections) next.delete(c.id);
        return next;
      });
    } else {
      setSelectedConnectionIds((prev) => {
        const next = new Set(prev);
        for (const c of connections) next.add(c.id);
        return next;
      });
    }
  }

  async function selectAllMatchingConnections() {
    setSelectBusy(true);
    try {
      const res = await api.get('/api/linkedin-connections/ids', {
        params: {
          q: appliedPickQuery.trim() || undefined,
          headline: appliedPickHeadline.trim() || undefined,
        },
      });
      const total = Number(res.data.data?.total ?? 0);
      setMatchingTotal(total);
      setSelectAllMatching(true);
      setExcludedConnectionIds(new Set());
      setSelectedConnectionIds(new Set());
      if (total === 0) toast.message('No connections match this filter.');
    } catch {
      toast.error('Failed to select matching connections.');
    } finally {
      setSelectBusy(false);
    }
  }

  function clearAllConnectionSelection() {
    setSelectAllMatching(false);
    setExcludedConnectionIds(new Set());
    setSelectedConnectionIds(new Set());
    setMatchingTotal(0);
  }

  async function clearMatchingConnections() {
    setSelectBusy(true);
    try {
      if (selectAllMatching) {
        clearAllConnectionSelection();
        return;
      }
      const res = await api.get('/api/linkedin-connections/ids', {
        params: {
          q: appliedPickQuery.trim() || undefined,
          headline: appliedPickHeadline.trim() || undefined,
        },
      });
      const ids = (res.data.data?.ids ?? []) as string[];
      const drop = new Set(ids);
      setSelectedConnectionIds((prev) => {
        const next = new Set<string>();
        for (const id of prev) {
          if (!drop.has(id)) next.add(id);
        }
        return next;
      });
    } catch {
      toast.error('Failed to clear matching connections.');
    } finally {
      setSelectBusy(false);
    }
  }

  const loadSyncedConnectionsPage = useCallback(
    async (page: number, q: string, headline: string) => {
      setLoadingConnections(true);
      try {
        const res = await api.get('/api/linkedin-connections', {
          params: {
            page,
            limit: CONNECTIONS_PAGE_SIZE,
            q: q.trim() || undefined,
            headline: headline.trim() || undefined,
          },
        });
        const data = res.data.data;
        const items = (data?.items ?? []) as SyncedConnection[];
        const total = Number(data?.total ?? items.length);
        setConnections(items);
        setConnectionTotal(total);
        setConnectionPage(Number(data?.page ?? page));
        if (total === 0 && !q.trim() && !headline.trim()) {
          toast.message('No synced LinkedIn connections yet. Sync them under Prospect Lists first.');
        }
      } catch {
        toast.error('Failed to load synced LinkedIn connections.');
        setConnections([]);
        setConnectionTotal(0);
      } finally {
        setLoadingConnections(false);
      }
    },
    [],
  );

  function applyPickFilters() {
    const q = pickQuery.trim();
    const headline = pickHeadline.trim();
    setAppliedPickQuery(q);
    setAppliedPickHeadline(headline);
    setConnectionPage(1);
    // Leaving select-all mode when filters change — selection would no longer match the query.
    if (selectAllMatching) clearAllConnectionSelection();
    void loadSyncedConnectionsPage(1, q, headline);
  }

  async function loadTemplateLeadsFromSelection() {
    if (isSearchSource) {
      setTemplateLeads([SAMPLE_SEARCH_TEMPLATE_LEAD]);
      return;
    }
    if (isConnectionsSource) {
      const selected = connections
        .filter((c) => isConnectionSelected(c.id))
        .slice(0, 100)
        .map(connectionToTemplateLead);
      setTemplateLeads(selected.length ? selected : [SAMPLE_SEARCH_TEMPLATE_LEAD]);
      return;
    }
    if (selectedListIds.length === 0) {
      setTemplateLeads([]);
      return;
    }
    setLoadingLeads(true);
    try {
      const pages = await Promise.all(
        selectedListIds.map(async (listId) => {
          const res = await api.get(`/api/lists/${listId}/leads`, { params: { limit: 100, offset: 0 } });
          return (res.data.data ?? []) as LeadRow[];
        }),
      );
      const byId = new Map<string, TemplateLead>();
      for (const lead of pages.flat()) {
        if (!byId.has(lead.id)) byId.set(lead.id, leadRowToTemplateLead(lead));
      }
      setTemplateLeads(Array.from(byId.values()));
    } catch {
      toast.error('Failed to load selected leads for personalization.');
      setTemplateLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }

  async function goNext() {
    const next = steps[stepIndex + 1];
    if (!next) return;
    if (step === 'details' && next === 'pick') {
      setConnectionPage(1);
      setPickQuery('');
      setPickHeadline('');
      setAppliedPickQuery('');
      setAppliedPickHeadline('');
      clearAllConnectionSelection();
      await loadSyncedConnectionsPage(1, '', '');
    }
    if ((step === 'pick' || step === 'leads' || step === 'filters') && next === 'message') {
      await loadTemplateLeadsFromSelection();
    }
    setStep(next);
  }

  function canContinue() {
    if (step === 'details') return name.trim().length > 0;
    if (step === 'filters') return searchQueryHasValue(searchQuery);
    if (step === 'leads') return selectedListIds.length > 0 && selectedListLeadCount > 0;
    if (step === 'pick') return selectedConnectionCount > 0;
    if (step === 'message') {
      if (isSearchSource) return messageTemplate.trim().length > 0;
      if (isConnectionsSource) {
        return messageTemplate.trim().length > 0 && selectedConnectionCount > 0;
      }
      return messageTemplate.trim().length > 0 && templateLeads.length > 0;
    }
    return true;
  }

  async function createAndOptionallyStart(start: boolean) {
    setSubmitting(true);
    try {
      const payload =
        kind === 'message_1st'
          ? {
              name: name.trim(),
              messageTemplate,
              dropTrackingDays: 6,
              mode: 'message_1st' as const,
              source: message1stSource,
              ...(message1stSource === 'people_search'
                ? {
                    searchQuery: {
                      title: searchQuery.title.trim() || undefined,
                      location: searchQuery.location.trim() || undefined,
                      company: searchQuery.company.trim() || undefined,
                      keywords: searchQuery.keywords.trim() || undefined,
                    },
                  }
                : {}),
            }
          : {
              name: name.trim(),
              messageTemplate,
              dropTrackingDays,
              mode: 'invite_then_message' as const,
            };

      const created = await api.post('/api/campaigns', payload);
      const campaignId = created.data.data.id as string;

      if (isConnectionsSource) {
        if (selectAllMatching) {
          await api.post(`/api/campaigns/${campaignId}/leads`, {
            connectionFilter: {
              q: appliedPickQuery.trim() || undefined,
              headline: appliedPickHeadline.trim() || undefined,
              excludeIds: excludedConnectionIds.size ? [...excludedConnectionIds] : undefined,
            },
          });
        } else {
          await api.post(`/api/campaigns/${campaignId}/leads`, {
            connectionIds: [...selectedConnectionIds],
          });
        }
      } else if (!isSearchSource && selectedListIds.length > 0) {
        await api.post(`/api/campaigns/${campaignId}/leads`, { listIds: selectedListIds });
      }

      if (start) {
        await api.post(`/api/campaigns/${campaignId}/start`);
        flushLinkedInOutbox();
        window.setTimeout(() => flushLinkedInOutbox(), 2_000);
        window.setTimeout(() => flushLinkedInOutbox(), 8_000);
        toast.success(
          isSearchSource
            ? 'Campaign started. Keep LinkedIn open — LeadHub will message 1st connections from your search.'
            : 'Campaign started. Keep LinkedIn open — the LeadHub extension processes leads under daily caps.',
        );
      } else {
        toast.success('Campaign saved as draft.');
      }
      router.push(`/dashboard/campaigns/${campaignId}`);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create campaign.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function stepLabel(s: Step): string {
    if (s === 'filters') return 'filters';
    if (s === 'leads') return 'lists';
    if (s === 'pick') return 'people';
    return s;
  }

  const busy = loadingLeads || loadingConnections;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Campaigns"
        title="Create campaign"
        description="Invite then message, or message 1st connections from search filters or synced connections."
        actions={
          <Link href="/dashboard/campaigns" className={btnOutline}>
            <IconArrowLeft size={16} /> Back
          </Link>
        }
      />

      <div className="flex gap-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex-1 rounded-full px-3 py-1.5 text-center text-[11px] font-semibold capitalize ${
              i <= stepIndex ? 'bg-brand-main/10 text-brand-main' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {stepLabel(s)}
          </div>
        ))}
      </div>

      {step === 'details' && (
        <div className={`${cardClass} space-y-4`}>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Campaign type</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setKind('invite_then_message')}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  kind === 'invite_then_message'
                    ? 'border-brand-main bg-brand-main/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">Invite + message</div>
                <div className="mt-1 text-xs text-slate-500">
                  Blank connection request, then your message after they accept.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setKind('message_1st')}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  kind === 'message_1st'
                    ? 'border-brand-main bg-brand-main/5'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">Message 1st connections</div>
                <div className="mt-1 text-xs text-slate-500">
                  Skip invites. Message people who already show Message (up to 100/day).
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Campaign name</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isMessage1st ? 'Pune founders — 1st connections' : 'Founders from comment scrape'}
            />
          </div>

          {isMessage1st ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">Lead source</label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMessage1stSource('people_search')}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm ${
                    message1stSource === 'people_search'
                      ? 'border-brand-main bg-brand-main/5 font-semibold'
                      : 'border-slate-200'
                  }`}
                >
                  People Search filters
                </button>
                <button
                  type="button"
                  onClick={() => setMessage1stSource('prospect_list')}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm ${
                    message1stSource === 'prospect_list'
                      ? 'border-brand-main bg-brand-main/5 font-semibold'
                      : 'border-slate-200'
                  }`}
                >
                  Synced connections
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {message1stSource === 'people_search'
                  ? 'Next: title, location, company, and keywords. LeadHub builds the LinkedIn search (1st connections) for you.'
                  : 'Next: pick people from your synced LinkedIn connections (no list step).'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Drop tracking after (days)</label>
              <input
                type="number"
                min={1}
                max={90}
                className={inputClass}
                value={dropTrackingDays}
                onChange={(e) => setDropTrackingDays(Number(e.target.value) || 6)}
              />
              <p className="text-xs text-slate-500">
                If a connection request is not accepted within this window, tracking stops (default 6).
              </p>
            </div>
          )}
        </div>
      )}

      {step === 'filters' && (
        <div className={`${cardClass} space-y-4`}>
          <p className="text-sm text-slate-600">
            1st-degree network is always applied. Add any combination of filters — LeadHub builds the LinkedIn
            People Search URL.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Title</label>
              <input
                className={inputClass}
                value={searchQuery.title}
                onChange={(e) => setSearchQuery((q) => ({ ...q, title: e.target.value }))}
                placeholder="Founder, CEO, Marketing Manager"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Location</label>
              <input
                className={inputClass}
                value={searchQuery.location}
                onChange={(e) => setSearchQuery((q) => ({ ...q, location: e.target.value }))}
                placeholder="Pune, Mumbai, India"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Company</label>
              <input
                className={inputClass}
                value={searchQuery.company}
                onChange={(e) => setSearchQuery((q) => ({ ...q, company: e.target.value }))}
                placeholder="Acme, InfoBeans"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Keywords</label>
              <input
                className={inputClass}
                value={searchQuery.keywords}
                onChange={(e) => setSearchQuery((q) => ({ ...q, keywords: e.target.value }))}
                placeholder="SaaS, outbound, Product Hunt"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Industry filter comes later. Location is matched via search keywords for now.
          </p>
        </div>
      )}

      {step === 'leads' && (
        <div className={`${cardClass} space-y-3`}>
          <p className="text-sm text-slate-600">
            Select prospect lists to enroll. {selectedListLeadCount} lead
            {selectedListLeadCount === 1 ? '' : 's'} in selected list
            {selectedListIds.length === 1 ? '' : 's'}.
          </p>
          {loadingLists ? (
            <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ) : lists.length === 0 ? (
            <p className="text-sm text-slate-500">
              No lists yet. Create one under{' '}
              <Link href="/dashboard/prospect-lists" className="font-semibold text-brand-main hover:underline">
                Prospect Lists
              </Link>
              .
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {lists.map((list) => {
                const selected = selectedListIds.includes(list.id);
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => toggleList(list.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      selected
                        ? 'border-brand-main bg-brand-main/5'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{list.name}</div>
                      <div className="text-xs text-slate-500">{list.leadCount ?? 0} prospects</div>
                    </div>
                    {selected ? <IconCheck size={18} className="text-brand-main" /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 'pick' && (
        <div className={`${cardClass} space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              {selectedConnectionCount.toLocaleString()} selected
              {connectionTotal
                ? ` · ${connectionTotal.toLocaleString()} match${
                    appliedPickQuery || appliedPickHeadline ? ' filter' : ''
                  }`
                : ''}
              {selectAllMatching ? ' · all matching' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnOutline}
                onClick={() => void selectAllMatchingConnections()}
                disabled={loadingConnections || selectBusy || connectionTotal === 0}
              >
                {selectBusy ? 'Selecting…' : 'Select all matching'}
              </button>
              <button
                type="button"
                className={btnOutline}
                onClick={togglePageConnections}
                disabled={loadingConnections || connections.length === 0}
              >
                {allOnPageSelected ? 'Unselect page' : 'Select page'}
              </button>
              <button
                type="button"
                className={btnOutline}
                onClick={() => void clearMatchingConnections()}
                disabled={loadingConnections || selectBusy || selectedConnectionCount === 0}
              >
                Clear matching
              </button>
              <button
                type="button"
                className={btnOutline}
                onClick={clearAllConnectionSelection}
                disabled={selectedConnectionCount === 0}
              >
                Clear all
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className={`${inputClass} min-w-[180px] flex-1`}
              value={pickQuery}
              onChange={(e) => setPickQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyPickFilters();
              }}
              placeholder="Search name…"
            />
            <input
              className={`${inputClass} min-w-[180px] flex-1`}
              value={pickHeadline}
              onChange={(e) => setPickHeadline(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyPickFilters();
              }}
              placeholder="Headline contains…"
            />
            <button type="button" className={btnOutline} onClick={applyPickFilters} disabled={loadingConnections}>
              Apply filter
            </button>
          </div>
          {loadingConnections ? (
            <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
          ) : connections.length === 0 ? (
            <p className="text-sm text-slate-500">
              {connectionTotal === 0 && !appliedPickQuery && !appliedPickHeadline ? (
                <>
                  No synced connections yet. Sync under{' '}
                  <Link href="/dashboard/prospect-lists" className="font-semibold text-brand-main hover:underline">
                    Prospect Lists
                  </Link>
                  .
                </>
              ) : (
                'No people match this filter.'
              )}
            </p>
          ) : (
            <>
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {connections.map((c) => {
                  const selected = isConnectionSelected(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleConnection(c.id)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        selected
                          ? 'border-brand-main bg-brand-main/5'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          selected ? 'border-brand-main bg-brand-main text-white' : 'border-slate-300'
                        }`}
                      >
                        {selected ? <IconCheck size={14} /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {c.fullName}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {c.headline || 'No headline'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>
                  Showing {(connections.length ? (connectionPage - 1) * CONNECTIONS_PAGE_SIZE + 1 : 0).toLocaleString()}
                  –
                  {Math.min(connectionPage * CONNECTIONS_PAGE_SIZE, connectionTotal).toLocaleString()} of{' '}
                  {connectionTotal.toLocaleString()}
                  {' · '}
                  {CONNECTIONS_PAGE_SIZE}/page
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={btnOutline}
                    disabled={connectionPage <= 1 || loadingConnections}
                    onClick={() => {
                      const next = connectionPage - 1;
                      setConnectionPage(next);
                      void loadSyncedConnectionsPage(next, appliedPickQuery, appliedPickHeadline);
                    }}
                  >
                    Prev
                  </button>
                  <span>
                    {connectionPage} / {connectionTotalPages}
                  </span>
                  <button
                    type="button"
                    className={btnOutline}
                    disabled={connectionPage >= connectionTotalPages || loadingConnections}
                    onClick={() => {
                      const next = connectionPage + 1;
                      setConnectionPage(next);
                      void loadSyncedConnectionsPage(next, appliedPickQuery, appliedPickHeadline);
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {step === 'message' && (
        <div className={`${cardClass} space-y-3`}>
          {busy ? (
            <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <MessageTemplateEditor
              value={messageTemplate}
              onChange={setMessageTemplate}
              leads={templateLeads.length ? templateLeads : [SAMPLE_SEARCH_TEMPLATE_LEAD]}
              onNeedLeads={
                isSearchSource ? undefined : () => setStep(isConnectionsSource ? 'pick' : 'leads')
              }
            />
          )}
        </div>
      )}

      {step === 'review' && (
        <div className={`${cardClass} space-y-3 text-sm text-slate-700`}>
          <div>
            <span className="font-semibold">Name:</span> {name}
          </div>
          <div>
            <span className="font-semibold">Type:</span>{' '}
            {isMessage1st ? 'Message 1st connections' : 'Invite + message'}
          </div>
          {isMessage1st ? (
            <div>
              <span className="font-semibold">Source:</span>{' '}
              {message1stSource === 'people_search' ? 'People Search filters' : 'Synced connections'}
            </div>
          ) : null}
          {isSearchSource ? (
            <div className="space-y-1">
              <span className="font-semibold">Filters:</span>
              <ul className="list-inside list-disc text-xs text-slate-500">
                {searchQuery.title.trim() ? <li>Title: {searchQuery.title.trim()}</li> : null}
                {searchQuery.location.trim() ? <li>Location: {searchQuery.location.trim()}</li> : null}
                {searchQuery.company.trim() ? <li>Company: {searchQuery.company.trim()}</li> : null}
                {searchQuery.keywords.trim() ? <li>Keywords: {searchQuery.keywords.trim()}</li> : null}
                <li>Network: 1st connections (F)</li>
              </ul>
            </div>
          ) : isConnectionsSource ? (
            <div>
              <span className="font-semibold">People:</span> {selectedConnectionCount.toLocaleString()} synced
              connections
              {selectAllMatching ? ' (all matching filter)' : ''}
            </div>
          ) : (
            <div>
              <span className="font-semibold">Leads:</span> {selectedListLeadCount} from {selectedListIds.length}{' '}
              list
              {selectedListIds.length === 1 ? '' : 's'}
            </div>
          )}
          {!isMessage1st ? (
            <div>
              <span className="font-semibold">Drop tracking:</span> {dropTrackingDays} days
            </div>
          ) : (
            <div>
              <span className="font-semibold">Daily message cap:</span> up to 100
            </div>
          )}
          <div>
            <span className="font-semibold">Message:</span>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {messageTemplate}
            </pre>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className={btnOutline}
          disabled={stepIndex <= 0 || submitting}
          onClick={() => setStep(steps[stepIndex - 1]!)}
        >
          Back
        </button>
        {step !== 'review' ? (
          <button
            type="button"
            className={btnPrimary}
            disabled={!canContinue() || busy}
            onClick={() => void goNext()}
          >
            {busy ? 'Loading…' : 'Continue'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              className={btnOutline}
              disabled={submitting}
              onClick={() => void createAndOptionallyStart(false)}
            >
              Save draft
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={submitting}
              onClick={() => void createAndOptionallyStart(true)}
            >
              {submitting ? 'Starting…' : 'Create & start'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
