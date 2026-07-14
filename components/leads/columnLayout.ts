export type LeadsColumnId =
  | 'contact'
  | 'email'
  | 'role'
  | 'company'
  | 'companyUrl'
  | 'industry'
  | 'size'
  | 'stage'
  | 'status'
  | 'enrichment'
  | 'source'
  | 'category'
  | 'verify'
  | 'icp'
  | 'intent'
  | 'confidence'
  | 'priority'
  | 'created'
  | 'notes';

export type LeadsColumnDef = {
  id: LeadsColumnId;
  label: string;
  defaultWidth: number;
  minWidth: number;
};

export const LEADS_COLUMNS: LeadsColumnDef[] = [
  { id: 'contact', label: 'Contact', defaultWidth: 240, minWidth: 160 },
  { id: 'email', label: 'Email', defaultWidth: 160, minWidth: 120 },
  { id: 'role', label: 'Role', defaultWidth: 170, minWidth: 100 },
  { id: 'company', label: 'Company', defaultWidth: 180, minWidth: 120 },
  { id: 'companyUrl', label: 'Company URL', defaultWidth: 180, minWidth: 120 },
  { id: 'industry', label: 'Industry', defaultWidth: 140, minWidth: 90 },
  { id: 'size', label: 'Size', defaultWidth: 110, minWidth: 70 },
  { id: 'stage', label: 'Stage', defaultWidth: 155, minWidth: 120 },
  { id: 'status', label: 'Status', defaultWidth: 110, minWidth: 80 },
  { id: 'enrichment', label: 'Enrichment', defaultWidth: 130, minWidth: 100 },
  { id: 'source', label: 'Source', defaultWidth: 120, minWidth: 80 },
  { id: 'category', label: 'Category', defaultWidth: 130, minWidth: 90 },
  { id: 'verify', label: 'Verify', defaultWidth: 110, minWidth: 80 },
  { id: 'icp', label: 'ICP', defaultWidth: 90, minWidth: 60 },
  { id: 'intent', label: 'Intent', defaultWidth: 90, minWidth: 60 },
  { id: 'confidence', label: 'Confidence', defaultWidth: 110, minWidth: 80 },
  { id: 'priority', label: 'Priority', defaultWidth: 115, minWidth: 80 },
  { id: 'created', label: 'Created', defaultWidth: 130, minWidth: 100 },
  { id: 'notes', label: 'Notes', defaultWidth: 220, minWidth: 120 },
];

export const DEFAULT_LEADS_COLUMN_ORDER = LEADS_COLUMNS.map((c) => c.id);

export type LeadsGridLayout = {
  order: LeadsColumnId[];
  widths: Partial<Record<LeadsColumnId, number>>;
};

const COLUMN_IDS = new Set(LEADS_COLUMNS.map((c) => c.id));

export function normalizeLeadsGridLayout(raw: unknown): LeadsGridLayout {
  const order: LeadsColumnId[] = [];
  const seen = new Set<string>();

  if (raw && typeof raw === 'object' && Array.isArray((raw as LeadsGridLayout).order)) {
    for (const id of (raw as LeadsGridLayout).order) {
      if (typeof id === 'string' && COLUMN_IDS.has(id as LeadsColumnId) && !seen.has(id)) {
        order.push(id as LeadsColumnId);
        seen.add(id);
      }
    }
  }

  for (const id of DEFAULT_LEADS_COLUMN_ORDER) {
    if (!seen.has(id)) order.push(id);
  }

  const widths: Partial<Record<LeadsColumnId, number>> = {};
  const rawWidths =
    raw && typeof raw === 'object' && (raw as LeadsGridLayout).widths && typeof (raw as LeadsGridLayout).widths === 'object'
      ? (raw as LeadsGridLayout).widths
      : {};

  for (const col of LEADS_COLUMNS) {
    const w = rawWidths[col.id];
    if (typeof w === 'number' && Number.isFinite(w)) {
      widths[col.id] = Math.max(col.minWidth, Math.min(800, Math.round(w)));
    }
  }

  return { order, widths };
}

export function getColumnWidth(layout: LeadsGridLayout, id: LeadsColumnId): number {
  const col = LEADS_COLUMNS.find((c) => c.id === id)!;
  return layout.widths[id] ?? col.defaultWidth;
}

export function reorderColumns(
  order: LeadsColumnId[],
  fromId: LeadsColumnId,
  toId: LeadsColumnId,
): LeadsColumnId[] {
  if (fromId === toId) return order;
  const next = [...order];
  const fromIndex = next.indexOf(fromId);
  const toIndex = next.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0) return order;
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, fromId);
  return next;
}
