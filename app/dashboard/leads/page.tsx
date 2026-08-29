'use client';

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import { APOLLO_UI_ENABLED } from '../../../lib/features';
import { PageHeader } from '../../../components/layout/PageHeader';
import { btnNavy, btnOutline } from '../../../components/ui/styles';
import { toast } from 'sonner';
import {
  IconEye,
  IconLoader2,
  IconUpload,
  // IconRefresh,
  IconListDetails,
  IconAlertTriangle,
  IconKey,
  IconCopyOff,
  IconPlus,
  IconX,
  IconCoin,
} from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';
import {
  apolloCategoryLabel,
  enrichmentBlockReason,
  enrichmentStatusMeta,
  leadName,
  LeadCategory,
  LeadList,
  LeadRow,
  PIPELINE_STAGES,
  PipelineStage,
  priorityTone,
  stageMeta,
} from '../../../components/leads/types';
import { AddLeadModal } from '../../../components/leads/AddLeadModal';
import { LeadsToolbar } from '../../../components/leads/LeadsToolbar';
import { EnrichmentAgentPicker } from '../../../components/leads/EnrichmentAgentPicker';
import { SelectionActionBar } from '../../../components/leads/SelectionActionBar';
import { LeadsTable } from '../../../components/leads/LeadsTable';
import type { ColumnFilterKey } from '../../../components/leads/columnFilters';
import {
  BULK_CHUNK,
  buildLeadSearchParams,
  chunkIds,
  ENRICH_CHUNK,
  PAGE_SIZE,
  type ExtraFilterChip,
  type LeadQueryFilters,
} from '../../../components/leads/filterTypes';
import {
  DEFAULT_LEADS_COLUMN_ORDER,
  normalizeLeadsGridLayout,
  type LeadsGridLayout,
} from '../../../components/leads/columnLayout';

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function LeadsPage() {
  const { activeWorkspaceId } = useAuth();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [reEnriching, setReEnriching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasLlmKey, setHasLlmKey] = useState<boolean | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [stage, setStage] = useState<'all' | PipelineStage>('all');
  const [priorities, setPriorities] = useState<string[]>([]);
  const [source, setSource] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [listId, setListId] = useState('all');
  const [enrichmentStatuses, setEnrichmentStatuses] = useState<string[]>([]);
  const [emailVerificationStatuses, setEmailVerificationStatuses] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [extras, setExtras] = useState<ExtraFilterChip[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [matchAll, setMatchAll] = useState(false);
  const [bulkStage, setBulkStage] = useState<PipelineStage>('contacted');
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkListId, setBulkListId] = useState('');
  const [enrichmentAgentId, setEnrichmentAgentId] = useState('');

  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showDeduplicateModal, setShowDeduplicateModal] = useState(false);
  const [matchOn, setMatchOn] = useState<'email' | 'domain' | 'linkedinUrl' | 'company_contact'>('email');
  const [keepStrategy, setKeepStrategy] = useState<'oldest' | 'newest'>('oldest');
  const [dupListId, setDupListId] = useState('all');
  const [dupCategoryId, setDupCategoryId] = useState('all');
  const [dupSource, setDupSource] = useState('all');
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [purging, setPurging] = useState(false);
  const [columnLayout, setColumnLayout] = useState<LeadsGridLayout>({
    order: DEFAULT_LEADS_COLUMN_ORDER,
    widths: {},
  });

  const loadingMoreRef = useRef(false);
  const filterKeyRef = useRef('');
  const layoutSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextLayoutSaveRef = useRef(true);

  const queryFilters: LeadQueryFilters = useMemo(
    () => ({
      stage,
      priorities,
      source,
      categoryId,
      listId,
      enrichmentStatuses,
      emailVerificationStatuses,
      query: deferredQuery,
      extras,
    }),
    [stage, priorities, source, categoryId, listId, enrichmentStatuses, emailVerificationStatuses, deferredQuery, extras],
  );

  const filterKey = useMemo(() => buildLeadSearchParams(queryFilters).toString(), [queryFilters]);

  const hasActiveFilters = useMemo(() => {
    return (
      queryFilters.stage !== 'all' ||
      queryFilters.priorities.length > 0 ||
      queryFilters.source !== 'all' ||
      queryFilters.categoryId !== 'all' ||
      queryFilters.listId !== 'all' ||
      queryFilters.enrichmentStatuses.length > 0 ||
      queryFilters.emailVerificationStatuses.length > 0 ||
      Boolean(queryFilters.query.trim()) ||
      queryFilters.extras.length > 0
    );
  }, [queryFilters]);

  const clearFilters = useCallback(() => {
    setStage('all');
    setPriorities([]);
    setSource('all');
    setCategoryId('all');
    setListId('all');
    setEnrichmentStatuses([]);
    setEmailVerificationStatuses([]);
    setQuery('');
    setExtras([]);
  }, []);

  const handleColumnFilterChange = useCallback((key: ColumnFilterKey, values: string[]) => {
    if (key === 'emailVerificationStatus') setEmailVerificationStatuses(values);
    else if (key === 'enrichmentStatus') setEnrichmentStatuses(values);
    else if (key === 'priority') setPriorities(values);
  }, []);

  const fetchMatchingIds = useCallback(async (filters: LeadQueryFilters) => {
    const params = buildLeadSearchParams(filters);
    const res = await api.get(`/api/leads/ids?${params.toString()}`);
    const ids: string[] = res.data.data?.ids ?? [];
    const total: number = res.data.data?.total ?? ids.length;
    setSelected(new Set(ids));
    setMatchAll(ids.length > 0 && ids.length === total);
    return { ids, total };
  }, []);

  const fetchLeadsPage = useCallback(
    async (filters: LeadQueryFilters, offset: number, append: boolean) => {
      const params = buildLeadSearchParams(filters, { limit: PAGE_SIZE, offset });
      const res = await api.get(`/api/leads?${params.toString()}`);
      const rows: LeadRow[] = res.data.data ?? [];
      const total: number = res.data.meta?.total ?? rows.length;
      setTotalCount(total);
      setLeads((prev) => (append ? [...prev, ...rows] : rows));
      return { rows, total };
    },
    [],
  );

  async function fetchMeta() {
    try {
      const [categoryRes, listRes] = await Promise.all([api.get('/api/categories'), api.get('/api/lists')]);
      setCategories(categoryRes.data.data ?? []);
      setLists(listRes.data.data ?? []);
    } catch {
      // Metadata is non-blocking for the hub.
    }
  }

  async function fetchColumnLayout() {
    try {
      skipNextLayoutSaveRef.current = true;
      const res = await api.get('/api/workspaces/ui-preferences/leads-grid');
      setColumnLayout(normalizeLeadsGridLayout(res.data.data));
    } catch {
      skipNextLayoutSaveRef.current = true;
      setColumnLayout({ order: DEFAULT_LEADS_COLUMN_ORDER, widths: {} });
    }
  }

  const handleColumnLayoutChange = useCallback((next: LeadsGridLayout) => {
    const normalized = normalizeLeadsGridLayout(next);
    setColumnLayout(normalized);
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (skipNextLayoutSaveRef.current) {
      skipNextLayoutSaveRef.current = false;
      return;
    }
    if (layoutSaveTimerRef.current) clearTimeout(layoutSaveTimerRef.current);
    layoutSaveTimerRef.current = setTimeout(() => {
      void api
        .put('/api/workspaces/ui-preferences/leads-grid', {
          order: columnLayout.order,
          widths: columnLayout.widths,
        })
        .catch(() => {
          // Silent — layout is still applied locally for the session.
        });
    }, 500);
    return () => {
      if (layoutSaveTimerRef.current) clearTimeout(layoutSaveTimerRef.current);
    };
  }, [activeWorkspaceId, columnLayout]);

  async function fetchApiKeyStatus() {
    try {
      const res = await api.get('/api/api-keys');
      const keys: Array<{ provider: string }> = res.data.data ?? [];
      setHasLlmKey(
        keys.some(
          (k) => k.provider === 'openai' || k.provider === 'gemini' || k.provider === 'openrouter',
        ),
      );
    } catch {
      setHasLlmKey(false);
    }
  }

  async function fetchCreditBalance() {
    try {
      const res = await api.get('/api/credits/balance');
      setCreditBalance(res.data.data?.available ?? 0);
    } catch {
      setCreditBalance(null);
    }
  }

  useEffect(() => {
    if (!activeWorkspaceId) return;

    let cancelled = false;
    filterKeyRef.current = filterKey;

    const run = async () => {
      setLoading(true);
      try {
        const listPromise = fetchLeadsPage(queryFilters, 0, false);
        const selectPromise = hasActiveFilters
          ? fetchMatchingIds(queryFilters).catch((err) => {
              toast.error(errorMessage(err, 'Failed to select matching leads.'));
              setSelected(new Set());
              setMatchAll(false);
              return { ids: [], total: 0 };
            })
          : Promise.resolve().then(() => {
              setSelected(new Set());
              setMatchAll(false);
              return { ids: [], total: 0 };
            });
        const [{ total }] = await Promise.all([listPromise, selectPromise]);
        if (cancelled) return;
        setTotalCount(total);
      } catch {
        if (!cancelled) toast.error('Failed to load leads.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    void fetchMeta();
    void fetchApiKeyStatus();
    void fetchCreditBalance();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId, filterKey]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    void fetchColumnLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId]);

  const refreshLeads = async () => {
    setLoading(true);
    try {
      await fetchLeadsPage(queryFilters, 0, false);
      await fetchMatchingIds(queryFilters).catch(() => {
        setSelected(new Set());
        setMatchAll(false);
      });
      await fetchMeta();
    } catch {
      toast.error('Failed to refresh leads.');
    } finally {
      setLoading(false);
    }
  };

  const hasMore = leads.length < totalCount;

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || loading || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    void fetchLeadsPage(queryFilters, leads.length, true)
      .catch(() => toast.error('Failed to load more leads.'))
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, [fetchLeadsPage, hasMore, leads.length, loading, queryFilters]);

  const selectAllMatching = useCallback(() => {
    void fetchMatchingIds(queryFilters).catch((err) => {
      toast.error(errorMessage(err, 'Failed to select matching leads.'));
    });
  }, [fetchMatchingIds, queryFilters]);

  const allSelected = matchAll || (totalCount > 0 && selected.size === totalCount && selected.size > 0);
  const someSelected = selected.size > 0 && !allSelected;

  const toggleLead = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMatchAll(false);
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
      setMatchAll(false);
      return;
    }
    void fetchMatchingIds(queryFilters)
      .then(({ ids }) => {
        if (ids.length === 0) toast.message('No leads to select.');
        else toast.success(`Selected ${ids.length.toLocaleString()} lead(s).`);
      })
      .catch((err) => {
        toast.error(errorMessage(err, 'Failed to select all leads.'));
      });
  };

  const handleAnalyze = async () => {
    try {
      setLoadingPreview(true);
      const res = await api.post('/api/leads/duplicates/preview', {
        matchOn,
        keepStrategy,
        listId: dupListId === 'all' ? undefined : dupListId,
        categoryId: dupCategoryId === 'all' ? undefined : dupCategoryId,
        source: dupSource === 'all' ? undefined : dupSource,
      });
      setPreviewData(res.data.data);
      toast.success('Duplicate scan complete!');
    } catch (err) {
      toast.error(errorMessage(err, 'Duplicate scan failed.'));
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePurge = async () => {
    if (!previewData || previewData.totalDuplicates === 0) return;
    const ok = window.confirm(
      `Are you sure you want to permanently delete all ${previewData.totalDuplicates} duplicate leads? This action is irreversible.`,
    );
    if (!ok) return;

    try {
      setPurging(true);
      const res = await api.post('/api/leads/duplicates/purge', {
        matchOn,
        keepStrategy,
        listId: dupListId === 'all' ? undefined : dupListId,
        categoryId: dupCategoryId === 'all' ? undefined : dupCategoryId,
        source: dupSource === 'all' ? undefined : dupSource,
      });
      toast.success(
        `Successfully deleted ${res.data.data?.deletedCount ?? previewData.totalDuplicates} duplicate leads!`,
      );
      setShowDeduplicateModal(false);
      await refreshLeads();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to purge duplicates.'));
    } finally {
      setPurging(false);
    }
  };

  const startEnrichment = async (leadIds: string[], reEnrich: boolean) => {
    if (leadIds.length === 0) return;
    if (hasLlmKey === false) {
      toast.error('AI API key required. Add OpenAI, Gemini, or OpenRouter in Settings › API Keys.', {
        duration: 6000,
        icon: <IconKey size={16} />,
      });
      return;
    }

    if (creditBalance !== null && creditBalance < leadIds.length) {
      toast.error(
        `Need ${leadIds.length} enrichment credit(s), have ${creditBalance}. Buy more on Billing.`,
        {
          duration: 7000,
          action: {
            label: 'Billing',
            onClick: () => {
              window.location.href = '/dashboard/billing';
            },
          },
        },
      );
      return;
    }

    // Find out what would actually run before reserving anything. Without this
    // a selection of 500 could quietly enrich 180 and report success.
    let allowDiscovery = false;
    let runIds = leadIds;
    try {
      const pre = await api.post('/api/leads/enrich/preflight', { leadIds, reEnrich });
      const preflight = pre.data.data as {
        ready: string[];
        needsDiscovery: string[];
        blocked: string[];
        alreadyEnriched: string[];
      };

      if (preflight.ready.length === 0 && preflight.needsDiscovery.length === 0) {
        toast.error(
          preflight.blocked.length
            ? `${preflight.blocked.length} lead(s) have no company website, LinkedIn, or name. Add one to enrich them.`
            : 'These leads are already enriched. Use re-enrich to run research again.',
          { duration: 7000 },
        );
        return;
      }

      const notes: string[] = [];
      if (preflight.blocked.length) {
        notes.push(`${preflight.blocked.length} will be skipped (no company to identify)`);
      }
      if (preflight.alreadyEnriched.length) {
        notes.push(`${preflight.alreadyEnriched.length} already enriched`);
      }

      if (preflight.needsDiscovery.length > 0) {
        allowDiscovery = window.confirm(
          `${preflight.needsDiscovery.length} of these leads have only a company name.\n\n` +
            'Finding their website costs extra searches and can still end without a match. ' +
            `${preflight.ready.length} other lead(s) are ready to run.\n\n` +
            'OK to include the name-only leads, or Cancel to enrich only the ready ones.',
        );
        if (!allowDiscovery && preflight.ready.length === 0) return;
      }

      // Send only the leads that will actually run. A chunk made up entirely of
      // skipped leads is rejected outright and would abort the whole batch.
      runIds = [
        ...preflight.ready,
        ...(allowDiscovery ? preflight.needsDiscovery : []),
      ];

      const confirmed = window.confirm(
        `${reEnrich ? 'Re-run research on' : 'Enrich'} ${runIds.length} lead(s)? ` +
          `Uses up to ${runIds.length} credit(s), only charged on success.` +
          (notes.length ? `\n\n${notes.join('. ')}.` : ''),
      );
      if (!confirmed) return;
    } catch (err) {
      toast.error(errorMessage(err, 'Could not check which leads are eligible.'));
      return;
    }

    try {
      if (reEnrich) setReEnriching(true);
      else setEnriching(true);

      let leadCount = 0;
      let skipped = 0;
      for (const chunk of chunkIds(runIds, ENRICH_CHUNK)) {
        const res = await api.post('/api/leads/enrich', {
          leadIds: chunk,
          reEnrich,
          allowDiscovery,
          ...(enrichmentAgentId ? { enrichmentAgentId } : {}),
        });
        leadCount += res.data.data?.leadCount ?? chunk.length;
        skipped += res.data.data?.skippedCount ?? 0;
      }

      toast.success(
        reEnrich
          ? `Re-enrichment started for ${leadCount} lead(s).${skipped ? ` ${skipped} skipped.` : ''}`
          : `Enrichment started for ${leadCount} lead(s).${skipped ? ` ${skipped} skipped.` : ''}`,
      );
      setSelected(new Set());
      setMatchAll(false);
      await Promise.all([refreshLeads(), fetchCreditBalance()]);
    } catch (err) {
      toast.error(errorMessage(err, reEnrich ? 'Failed to start re-enrichment.' : 'Failed to start enrichment.'));
      void fetchCreditBalance();
    } finally {
      setEnriching(false);
      setReEnriching(false);
    }
  };

  const handleEnrich = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.error('Select at least one lead.');
      return;
    }
    void startEnrichment(ids, false);
  };

  const handleReEnrich = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.error('Select at least one lead.');
      return;
    }
    void startEnrichment(ids, true);
  };

  const handleEnrichSingle = (lead: LeadRow) => {
    void startEnrichment([lead.id], lead.enrichmentStatus === 'completed' || lead.enrichmentStatus === 'partial');
  };

  const patchLead = async (leadId: string, payload: Record<string, unknown>) => {
    await api.patch(`/api/leads/${leadId}`, payload);
    await refreshLeads();
  };

  const applyBulk = async (payload: Record<string, unknown>) => {
    const leadIds = Array.from(selected);
    if (leadIds.length === 0) {
      toast.error('Select at least one lead.');
      return;
    }

    try {
      for (const chunk of chunkIds(leadIds, BULK_CHUNK)) {
        await api.patch('/api/leads/bulk', { leadIds: chunk, ...payload });
      }
      toast.success('Bulk update applied.');
      setSelected(new Set());
      setMatchAll(false);
      await refreshLeads();
    } catch (err) {
      toast.error(errorMessage(err, 'Bulk update failed.'));
    }
  };

  const handleDelete = async () => {
    const leadIds = Array.from(selected);
    if (leadIds.length === 0) return;
    const ok = window.confirm(`Delete ${leadIds.length.toLocaleString()} lead(s)? This cannot be undone.`);
    if (!ok) return;

    try {
      setDeleting(true);
      let deleted = 0;
      for (const chunk of chunkIds(leadIds, BULK_CHUNK)) {
        const res = await api.delete('/api/leads/bulk', { data: { leadIds: chunk } });
        deleted += res.data.data?.deleted ?? chunk.length;
      }
      toast.success(`Deleted ${deleted.toLocaleString()} lead(s).`);
      setSelected(new Set());
      setMatchAll(false);
      await refreshLeads();
    } catch (err) {
      toast.error(errorMessage(err, 'Bulk delete failed.'));
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    const leadIds = Array.from(selected);
    if (leadIds.length === 0) {
      toast.error('Select at least one lead.');
      return;
    }

    try {
      setExporting(true);
      const res = await api.post(
        '/api/leads/export',
        { leadIds, format },
        { responseType: 'blob' },
      );

      const contentType =
        (res.headers['content-type'] as string | undefined) ??
        (format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv; charset=utf-8');

      // If the server returned JSON error as blob, surface it
      if (contentType.includes('application/json')) {
        const text = await (res.data as Blob).text();
        try {
          const parsed = JSON.parse(text) as { message?: string };
          throw new Error(parsed.message ?? 'Export failed.');
        } catch (err) {
          if (err instanceof Error && err.message !== 'Export failed.') throw err;
          throw new Error('Export failed.');
        }
      }

      const disposition = (res.headers['content-disposition'] as string | undefined) ?? '';
      const match = /filename="?([^"]+)"?/i.exec(disposition);
      const filename =
        match?.[1] ??
        `leadhub-leads-${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : 'csv'}`;

      const blob = new Blob([res.data], { type: contentType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${leadIds.length.toLocaleString()} lead(s) as ${format.toUpperCase()}.`);
    } catch (err) {
      let message = 'Export failed.';
      if (typeof err === 'object' && err && 'response' in err) {
        const response = (err as { response?: { data?: unknown; status?: number } }).response;
        const data = response?.data;
        if (data instanceof Blob) {
          try {
            const text = await data.text();
            const parsed = JSON.parse(text) as { message?: string };
            message = parsed.message ?? message;
          } catch {
            // keep fallback
          }
        } else if (data && typeof data === 'object' && 'message' in data) {
          message = String((data as { message?: string }).message ?? message);
        }
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const createCategory = async () => {
    const name = window.prompt('Category name');
    if (!name?.trim()) return;
    try {
      await api.post('/api/categories', { name: name.trim(), color: '#3b82f6' });
      toast.success('Category created.');
      await fetchMeta();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create category.'));
    }
  };

  const onDropLead = async (leadId: string, nextStage: PipelineStage) => {
    try {
      await patchLead(leadId, { pipelineStage: nextStage });
      toast.success(`Moved to ${stageMeta(nextStage).label}.`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not move lead.'));
    }
  };

  const sourceOptions = APOLLO_UI_ENABLED
    ? ['all', 'apollo', 'apify', 'google_maps', 'csv', 'manual']
    : ['all', 'apify', 'google_maps', 'csv', 'manual'];
  const totalScore = (lead: LeadRow) =>
    Math.round(((lead.icpScore ?? 0) + (lead.intentScore ?? 0) + (lead.confidence ?? 0)) / 3);

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-4 text-text">
      <PageHeader
        eyebrow="Lead CRM"
        title="Leads"
        description="Import, qualify, enrich, and move contacts through the pipeline."
        actions={
          <>
            {creditBalance !== null && (
              <Link href="/dashboard/billing" className={btnOutline}>
                <IconCoin size={16} className="text-brand-main" />
                {creditBalance.toLocaleString()} credits
              </Link>
            )}
            {hasLlmKey === false && (
              <Link
                href="/dashboard/settings/api-keys"
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"
              >
                <IconAlertTriangle size={16} /> Add AI key
              </Link>
            )}
            <button
              type="button"
              onClick={() => setShowAddLeadModal(true)}
              className={btnNavy}
            >
              <IconPlus size={16} /> Add lead
            </button>
            <button
              type="button"
              onClick={() => {
                setDupListId(listId);
                setDupCategoryId(categoryId);
                setDupSource(source);
                setPreviewData(null);
                setShowDeduplicateModal(true);
              }}
              className={btnOutline}
            >
              <IconCopyOff size={16} /> Clean duplicates
            </button>
            <Link href="/dashboard/leads/import" className={btnOutline}>
              <IconUpload size={16} /> Import CSV
            </Link>
            {/* <Link href="/dashboard/leads/sync" className={btnOutline}>
              <IconRefresh size={16} /> Apify sync
            </Link> */}
            <Link href="/dashboard/leads/lists" className={btnOutline}>
              <IconListDetails size={16} /> Lists
            </Link>
          </>
        }
      />

      <LeadsToolbar
        query={query}
        onQueryChange={setQuery}
        stage={stage}
        onStageChange={setStage}
        priorities={priorities}
        onPrioritiesChange={setPriorities}
        source={source}
        onSourceChange={setSource}
        categoryId={categoryId}
        onCategoryIdChange={setCategoryId}
        listId={listId}
        onListIdChange={setListId}
        enrichmentStatuses={enrichmentStatuses}
        onEnrichmentStatusesChange={setEnrichmentStatuses}
        emailVerificationStatuses={emailVerificationStatuses}
        onEmailVerificationStatusesChange={setEmailVerificationStatuses}
        extras={extras}
        onExtrasChange={setExtras}
        view={view}
        onViewChange={setView}
        categories={categories}
        lists={lists}
        loadedCount={leads.length}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <SelectionActionBar
        selectedCount={selected.size}
        matchAll={matchAll}
        enriching={enriching}
        reEnriching={reEnriching}
        deleting={deleting}
        exporting={exporting}
        creditBalance={creditBalance}
        onEnrich={handleEnrich}
        onReEnrich={handleReEnrich}
        onDelete={() => void handleDelete()}
        onExportCsv={() => void handleExport('csv')}
        onExportXlsx={() => void handleExport('xlsx')}
        bulkStage={bulkStage}
        onBulkStageChange={setBulkStage}
        onApplyStage={() => void applyBulk({ pipelineStage: bulkStage })}
        bulkCategoryId={bulkCategoryId}
        onBulkCategoryIdChange={setBulkCategoryId}
        onApplyCategory={() =>
          bulkCategoryId ? void applyBulk({ categoryId: bulkCategoryId }) : void createCategory()
        }
        bulkListId={bulkListId}
        onBulkListIdChange={setBulkListId}
        onAddToList={() => bulkListId && void applyBulk({ listId: bulkListId })}
        categories={categories}
        lists={lists}
        onSelectAllMatching={selectAllMatching}
        intentPackSlot={
          <EnrichmentAgentPicker
            value={enrichmentAgentId}
            onChange={setEnrichmentAgentId}
            compact
          />
        }
      />

      {view === 'kanban' ? (
        loading && leads.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-48 skeleton" />
            <div className="h-48 skeleton" />
            <div className="h-48 skeleton" />
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-sm font-bold text-slate-700">No leads match this view.</p>
            <p className="mt-1 text-xs text-slate-500">Add a lead, import CSV, or adjust your filters.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Pipeline board</h2>
                <p className="text-xs text-slate-500">
                  Showing {leads.length.toLocaleString()} of {totalCount.toLocaleString()} loaded leads. Use Table
                  view to load more.
                </p>
              </div>
              {hasMore && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 hover:bg-white disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
            <div className="flex snap-x gap-4 overflow-x-auto overflow-y-hidden pb-4 thin-scrollbar">
              {PIPELINE_STAGES.map((column) => {
                const columnLeads = leads.filter((lead) => lead.pipelineStage === column.value);
                return (
                  <section
                    key={column.value}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      const leadId = event.dataTransfer.getData('lead-id');
                      if (leadId) void onDropLead(leadId, column.value);
                    }}
                    className="flex h-[620px] w-[320px] shrink-0 snap-start flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between rounded-xl border border-white/70 bg-white/80 p-2 shadow-sm">
                      <div>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${column.tone}`}>
                          {column.label}
                        </span>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                          Sales stage
                        </p>
                      </div>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-xs font-black text-white">
                        {columnLeads.length}
                      </span>
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 thin-scrollbar">
                      {columnLeads.map((lead) => (
                        <article
                          key={lead.id}
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData('lead-id', lead.id)}
                          className={`group cursor-grab rounded-2xl border bg-white p-3 shadow-sm transition active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md ${selected.has(lead.id) ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selected.has(lead.id)}
                              onChange={() => toggleLead(lead.id)}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/dashboard/leads/${lead.id}`}
                                className="block truncate text-sm font-black text-slate-950 group-hover:text-blue-700"
                              >
                                {leadName(lead)}
                              </Link>
                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {lead.contact?.role || 'No role'} at {lead.company?.name || 'Unknown company'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-2">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                              <span>Score</span>
                              <span className="text-slate-700">{totalScore(lead)}%</span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                              <div className="h-full rounded-full bg-blue-600" style={{ width: `${totalScore(lead)}%` }} />
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${priorityTone(lead.priority)}`}
                            >
                              {lead.priority}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              {lead.status}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold capitalize text-slate-600">
                              {lead.source}
                            </span>
                            {lead.importFileName && (
                              <span
                                className="max-w-[140px] truncate rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700"
                                title={lead.importFileName}
                              >
                                {lead.importFileName}
                              </span>
                            )}
                            {APOLLO_UI_ENABLED && lead.apolloCategory && (
                              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                                {apolloCategoryLabel(lead.apolloCategory)}
                              </span>
                            )}
                            {(() => {
                              const em = enrichmentStatusMeta(lead.enrichmentStatus);
                              return (
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${em.tone}`}>
                                  {em.icon} {em.label}
                                </span>
                              );
                            })()}
                            {(() => {
                              const block = enrichmentBlockReason(lead);
                              if (!block) return null;
                              return (
                                <span
                                  className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800"
                                  title={block}
                                >
                                  ⚠ {block}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                            <span className="truncate">{lead.company?.domain || lead.contact?.email || 'No domain'}</span>
                            <Link
                              href={`/dashboard/leads/${lead.id}`}
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white shadow-sm transition hover:bg-blue-700"
                            >
                              Case <IconEye size={11} />
                            </Link>
                          </div>
                        </article>
                      ))}
                      {columnLeads.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-center text-xs font-bold text-slate-400">
                          Drop leads here
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )
      ) : (
        <LeadsTable
          leads={leads}
          selected={selected}
          allSelected={allSelected}
          someSelected={someSelected}
          matchAll={matchAll}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          totalCount={totalCount}
          onToggleLead={toggleLead}
          onToggleSelectAll={toggleSelectAll}
          onLoadMore={loadMore}
          onPatchLead={(id, payload) => void patchLead(id, payload)}
          onEnrichLead={handleEnrichSingle}
          enriching={enriching || reEnriching}
          columnLayout={columnLayout}
          onColumnLayoutChange={handleColumnLayoutChange}
          columnFilters={{
            emailVerificationStatus: emailVerificationStatuses,
            enrichmentStatus: enrichmentStatuses,
            priority: priorities,
          }}
          onColumnFilterChange={handleColumnFilterChange}
        />
      )}

      <AddLeadModal
        open={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
        categories={categories}
        lists={lists}
        onCreated={async () => {
          setLoading(true);
          try {
            await fetchLeadsPage(queryFilters, 0, false);
            await fetchMeta();
          } catch {
            toast.error('Lead saved, but the list failed to refresh.');
          } finally {
            setLoading(false);
          }
        }}
      />

      {showDeduplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex max-h-[90vh] w-[540px] max-w-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                  <IconCopyOff className="text-rose-600" size={18} /> Find & Remove Duplicates
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Locate and purge duplicate lead records in your CRM based on flexible matching rules.
                </p>
              </div>
              <button
                onClick={() => setShowDeduplicateModal(false)}
                className="text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 thin-scrollbar">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Match leads on
                </label>
                <select
                  value={matchOn}
                  onChange={(e: any) => {
                    setMatchOn(e.target.value);
                    setPreviewData(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="email">Exact Email Address</option>
                  <option value="domain">Company Website Domain</option>
                  <option value="linkedinUrl">Contact LinkedIn URL</option>
                  <option value="company_contact">Same Company & Contact Name</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Deduplication Strategy
                </label>
                <select
                  value={keepStrategy}
                  onChange={(e: any) => {
                    setKeepStrategy(e.target.value);
                    setPreviewData(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="oldest">Keep Oldest Record first (Preserve original imports)</option>
                  <option value="newest">Keep Newest Record first (Preserve latest overrides)</option>
                </select>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Scope Filters
                </label>
                <div className="grid gap-2 grid-cols-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">List</label>
                    <select
                      value={dupListId}
                      onChange={(e) => {
                        setDupListId(e.target.value);
                        setPreviewData(null);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none"
                    >
                      <option value="all">All lists</option>
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Category</label>
                    <select
                      value={dupCategoryId}
                      onChange={(e) => {
                        setDupCategoryId(e.target.value);
                        setPreviewData(null);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none"
                    >
                      <option value="all">All categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Source</label>
                    <select
                      value={dupSource}
                      onChange={(e) => {
                        setDupSource(e.target.value);
                        setPreviewData(null);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none"
                    >
                      <option value="all">All sources</option>
                      {sourceOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {previewData && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <div className="flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-150">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Analysis Results</p>
                      <p className="text-[11px] text-slate-500">Matches grouped: {previewData.duplicateGroupsCount}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-black ${previewData.totalDuplicates > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}
                    >
                      {previewData.totalDuplicates} duplicates found
                    </span>
                  </div>

                  {previewData.totalDuplicates > 0 && (
                    <div className="rounded-xl border border-slate-100 max-h-36 overflow-y-auto p-2 bg-slate-50/50 space-y-1.5 thin-scrollbar">
                      {previewData.preview.map((group: any, i: number) => (
                        <div
                          key={i}
                          className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/65 flex justify-between items-center"
                        >
                          <span className="font-bold text-slate-800 truncate max-w-[240px]">{group.matchValue}</span>
                          <span className="text-slate-400">
                            Keeping ID: {group.keeper.id.slice(0, 8)} ({group.duplicates.length} to purge)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 flex gap-3 justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowDeduplicateModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loadingPreview}
                className="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 px-4 py-2.5 text-xs font-bold hover:bg-blue-100 disabled:opacity-40 cursor-pointer"
              >
                {loadingPreview ? <IconLoader2 className="animate-spin inline mr-1" size={13} /> : null}
                Run Duplicate Scan
              </button>
              {previewData && previewData.totalDuplicates > 0 && (
                <button
                  type="button"
                  onClick={handlePurge}
                  disabled={purging}
                  className="rounded-xl bg-rose-600 text-white px-4 py-2.5 text-xs font-bold hover:bg-rose-700 shadow-md shadow-rose-200 disabled:opacity-40 cursor-pointer"
                >
                  {purging ? <IconLoader2 className="animate-spin inline mr-1" size={13} /> : null}
                  Purge {previewData.totalDuplicates} Duplicates
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
