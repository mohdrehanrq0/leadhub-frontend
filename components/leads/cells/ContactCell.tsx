'use client';

import { IconPlayerPlay, IconUser } from '@tabler/icons-react';
import { canEnrichLead, leadName, type LeadRow } from '../types';

type Props = {
  lead: LeadRow;
  onEnrich?: (lead: LeadRow) => void;
  enriching?: boolean;
};

export function ContactCell({ lead, onEnrich, enriching }: Props) {
  const enrichable = canEnrichLead(lead) && lead.enrichmentStatus !== 'completed' && lead.enrichmentStatus !== 'in_progress';

  return (
    <div className="flex items-center gap-2 min-w-0">
      {onEnrich && (
        <button
          type="button"
          title={enrichable ? 'Enrich this lead' : 'Enrichment unavailable'}
          disabled={!enrichable || enriching}
          onClick={(e) => {
            e.stopPropagation();
            onEnrich(lead);
          }}
          className="opacity-0 group-hover:opacity-100 shrink-0 grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-30"
        >
          <IconPlayerPlay size={12} />
        </button>
      )}
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
        <IconUser size={14} />
      </span>
      <div className="min-w-0">
        <div className="truncate font-semibold text-slate-900">{leadName(lead)}</div>
        <div className="truncate text-[11px] text-slate-500">
          {lead.contact?.phone || lead.contact?.linkedinUrl || 'No phone / LinkedIn'}
        </div>
      </div>
    </div>
  );
}
