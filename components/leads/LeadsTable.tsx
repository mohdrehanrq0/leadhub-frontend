'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { IconBuilding, IconEye, IconGripVertical, IconLoader2 } from '@tabler/icons-react';
import { ContactCell } from './cells/ContactCell';
import { CompanyUrlCell } from './cells/CompanyUrlCell';
import { EmailCell } from './cells/EmailCell';
import {
  getColumnWidth,
  LEADS_COLUMNS,
  normalizeLeadsGridLayout,
  reorderColumns,
  type LeadsColumnId,
  type LeadsGridLayout,
} from './columnLayout';
import {
  apolloCategoryLabel,
  enrichmentBlockReason,
  enrichmentStatusMeta,
  PIPELINE_STAGES,
  priorityTone,
  type LeadRow,
} from './types';

type Props = {
  leads: LeadRow[];
  selected: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  matchAll: boolean;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  onToggleLead: (id: string) => void;
  onToggleSelectAll: () => void;
  onLoadMore: () => void;
  onPatchLead: (leadId: string, payload: Record<string, unknown>) => void;
  onEnrichLead: (lead: LeadRow) => void;
  enriching: boolean;
  columnLayout: LeadsGridLayout;
  onColumnLayoutChange: (layout: LeadsGridLayout) => void;
};

function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
    : '-';
}

function verificationTone(status?: string | null) {
  if (status === 'valid') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'invalid' || status === 'disposable') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (status === 'catch_all') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function renderLeadCell(
  columnId: LeadsColumnId,
  lead: LeadRow,
  opts: {
    onPatchLead: Props['onPatchLead'];
    onEnrichLead: Props['onEnrichLead'];
    enriching: boolean;
  },
) {
  switch (columnId) {
    case 'contact':
      return <ContactCell lead={lead} onEnrich={opts.onEnrichLead} enriching={opts.enriching} />;
    case 'email':
      return <EmailCell lead={lead} onEnrich={opts.onEnrichLead} enriching={opts.enriching} />;
    case 'role':
      return <span className="text-slate-700">{lead.contact?.role || '-'}</span>;
    case 'company':
      return (
        <div className="flex items-center gap-1 font-bold text-slate-800">
          <IconBuilding size={13} /> {lead.company?.name || 'Unknown'}
        </div>
      );
    case 'companyUrl':
      return (
        <CompanyUrlCell
          domain={lead.company?.domain}
          website={lead.company?.website}
          companyName={lead.company?.name}
        />
      );
    case 'industry':
      return <span className="text-slate-600">{lead.company?.industry || '-'}</span>;
    case 'size':
      return <span className="text-slate-600">{lead.company?.size || '-'}</span>;
    case 'stage':
      return (
        <select
          value={lead.pipelineStage}
          onChange={(event) => void opts.onPatchLead(lead.id, { pipelineStage: event.target.value })}
          className="max-w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-700 shadow-sm outline-none focus:border-blue-300"
        >
          {PIPELINE_STAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      );
    case 'status':
      return (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-bold capitalize text-slate-600">
          {lead.status}
        </span>
      );
    case 'enrichment': {
      const em = enrichmentStatusMeta(lead.enrichmentStatus);
      const block = enrichmentBlockReason(lead);
      return (
        <div className="flex flex-col gap-1">
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-1 font-bold text-[10px] ${em.tone} ${lead.enrichmentStatus === 'in_progress' ? 'animate-pulse' : ''}`}
            title={lead.enrichmentError ?? undefined}
          >
            {em.icon} {em.label}
          </span>
          {block && (
            <span
              className="inline-flex w-fit max-w-[180px] items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800"
              title={block}
            >
              ⚠ {block}
            </span>
          )}
        </div>
      );
    }
    case 'source':
      return <span className="capitalize">{apolloCategoryLabel(lead.apolloCategory) || lead.source}</span>;
    case 'category':
      return lead.category ? (
        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 font-bold text-slate-700">
          {lead.category.name}
        </span>
      ) : (
        '-'
      );
    case 'verify':
      return (
        <span
          className={`rounded-full border px-2 py-1 font-bold capitalize ${verificationTone(lead.contact?.emailVerificationStatus)}`}
        >
          {lead.contact?.emailVerificationStatus || 'unknown'}
        </span>
      );
    case 'icp':
      return <span className="font-black text-slate-800">{lead.icpScore ?? 0}%</span>;
    case 'intent':
      return <span className="font-black text-slate-800">{lead.intentScore ?? 0}%</span>;
    case 'confidence':
      return <span className="font-black text-slate-800">{lead.confidence ?? 0}%</span>;
    case 'priority':
      return (
        <span className={`rounded-full border px-2 py-1 font-bold capitalize ${priorityTone(lead.priority)}`}>
          {lead.priority}
        </span>
      );
    case 'created':
      return <span className="text-slate-600">{formatDate(lead.createdAt)}</span>;
    case 'notes':
      return (
        <span className="line-clamp-2 text-slate-600">{lead.notes || '-'}</span>
      );
    default:
      return null;
  }
}

export function LeadsTable(props: Props) {
  const {
    leads,
    selected,
    allSelected,
    someSelected,
    matchAll,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    onToggleLead,
    onToggleSelectAll,
    onLoadMore,
    onPatchLead,
    onEnrichLead,
    enriching,
    columnLayout,
    onColumnLayoutChange,
  } = props;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const headerCheckRef = useRef<HTMLInputElement | null>(null);
  const layout = useMemo(() => normalizeLeadsGridLayout(columnLayout), [columnLayout]);
  const [dragOverId, setDragOverId] = useState<LeadsColumnId | null>(null);
  const dragIdRef = useRef<LeadsColumnId | null>(null);
  const resizingRef = useRef<{ id: LeadsColumnId; startX: number; startWidth: number } | null>(null);

  const totalMinWidth = useMemo(() => {
    const dataWidth = layout.order.reduce((sum, id) => sum + getColumnWidth(layout, id), 0);
    return 48 + dataWidth + 120;
  }, [layout]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, leads.length]);

  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const active = resizingRef.current;
      if (!active) return;
      const col = LEADS_COLUMNS.find((c) => c.id === active.id);
      if (!col) return;
      const nextWidth = Math.max(col.minWidth, Math.min(800, active.startWidth + (event.clientX - active.startX)));
      onColumnLayoutChange({
        ...layout,
        widths: { ...layout.widths, [active.id]: nextWidth },
      });
    };
    const onUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [layout, onColumnLayoutChange]);

  const startResize = useCallback(
    (id: LeadsColumnId, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      resizingRef.current = {
        id,
        startX: event.clientX,
        startWidth: getColumnWidth(layout, id),
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [layout],
  );

  const onHeaderDragStart = (id: LeadsColumnId, event: React.DragEvent) => {
    dragIdRef.current = id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };

  const onHeaderDragOver = (id: LeadsColumnId, event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) setDragOverId(id);
  };

  const onHeaderDrop = (toId: LeadsColumnId, event: React.DragEvent) => {
    event.preventDefault();
    const fromId = (dragIdRef.current || event.dataTransfer.getData('text/plain')) as LeadsColumnId;
    setDragOverId(null);
    dragIdRef.current = null;
    if (!fromId || fromId === toId) return;
    onColumnLayoutChange({
      ...layout,
      order: reorderColumns(layout.order, fromId, toId),
    });
  };

  if (loading && leads.length === 0) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-48 skeleton" />
        <div className="h-48 skeleton" />
        <div className="h-48 skeleton" />
      </div>
    );
  }

  if (!loading && leads.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-sm font-bold text-slate-700">No leads match this view.</p>
        <p className="mt-1 text-xs text-slate-500">Import CSV leads, run provider sync, or adjust your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-sm font-black text-slate-950">Lead Data Grid</h2>
          <p className="text-xs text-slate-500">
            Loaded {leads.length.toLocaleString()} of {totalCount.toLocaleString()}
            {matchAll || allSelected
              ? ` · all ${totalCount.toLocaleString()} selected`
              : selected.size > 0
                ? ` · ${selected.size.toLocaleString()} selected`
                : ''}
            {' · '}
            header checkbox selects every lead (use filters to narrow)
          </p>
        </div>
      </div>
      <div className="max-h-[680px] overflow-auto thin-scrollbar">
        <table
          className="border-separate border-spacing-0 text-left text-xs"
          style={{ width: totalMinWidth, minWidth: '100%', tableLayout: 'fixed' }}
        >
          <colgroup>
            <col style={{ width: 48 }} />
            {layout.order.map((id) => (
              <col key={id} style={{ width: getColumnWidth(layout, id) }} />
            ))}
            <col style={{ width: 120 }} />
          </colgroup>
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-[10px] uppercase tracking-[0.12em] text-slate-500 backdrop-blur">
            <tr>
              <th className="sticky left-0 z-20 border-b border-slate-200 bg-slate-50 p-4">
                <input
                  ref={headerCheckRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  title={`Select all ${totalCount.toLocaleString()} leads (not just loaded rows)`}
                  aria-label={`Select all ${totalCount} leads`}
                />
              </th>
              {layout.order.map((id) => {
                const col = LEADS_COLUMNS.find((c) => c.id === id)!;
                const isStickyContact = id === 'contact' && layout.order[0] === 'contact';
                return (
                  <th
                    key={id}
                    draggable
                    onDragStart={(e) => onHeaderDragStart(id, e)}
                    onDragOver={(e) => onHeaderDragOver(id, e)}
                    onDragLeave={() => setDragOverId((cur) => (cur === id ? null : cur))}
                    onDrop={(e) => onHeaderDrop(id, e)}
                    onDragEnd={() => {
                      setDragOverId(null);
                      dragIdRef.current = null;
                    }}
                    className={`relative select-none border-b border-slate-200 bg-slate-50 p-0 ${
                      isStickyContact ? 'sticky left-[48px] z-20' : ''
                    } ${dragOverId === id ? 'bg-blue-100/80' : ''}`}
                    style={{ width: getColumnWidth(layout, id) }}
                  >
                    <div className="flex items-center gap-1 px-3 py-4 pr-4">
                      <IconGripVertical size={12} className="shrink-0 text-slate-300" />
                      <span className="truncate">{col.label}</span>
                    </div>
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      onMouseDown={(e) => startResize(id, e)}
                      className="absolute inset-y-0 right-0 z-30 w-1.5 cursor-col-resize hover:bg-blue-400/60"
                    />
                  </th>
                );
              })}
              <th className="sticky right-0 z-20 border-b border-slate-200 bg-slate-50 p-4 text-right">Case</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="group hover:bg-blue-50/35">
                <td className="sticky left-0 z-10 border-b border-slate-100 bg-white p-4 group-hover:bg-blue-50">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => onToggleLead(lead.id)}
                  />
                </td>
                {layout.order.map((id) => {
                  const isStickyContact = id === 'contact' && layout.order[0] === 'contact';
                  return (
                    <td
                      key={id}
                      className={`border-b border-slate-100 p-4 ${
                        isStickyContact
                          ? 'sticky left-[48px] z-10 bg-white group-hover:bg-blue-50'
                          : ''
                      }`}
                      style={{ width: getColumnWidth(layout, id), maxWidth: getColumnWidth(layout, id) }}
                    >
                      {renderLeadCell(id, lead, { onPatchLead, onEnrichLead, enriching })}
                    </td>
                  );
                })}
                <td className="sticky right-0 z-10 border-b border-slate-100 bg-white p-4 text-right group-hover:bg-blue-50">
                  <Link
                    href={`/dashboard/leads/${lead.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <IconEye size={14} /> Case
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div ref={sentinelRef} className="flex items-center justify-center py-4">
          {loadingMore ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <IconLoader2 size={14} className="animate-spin" /> Loading more…
            </span>
          ) : hasMore ? (
            <button
              type="button"
              onClick={onLoadMore}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Load more
            </button>
          ) : (
            <span className="text-[11px] font-semibold text-slate-400">All loaded</span>
          )}
        </div>
      </div>
    </div>
  );
}
