'use client';

import React, { useState } from 'react';
import { IconLoader2, IconBuilding, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { btnNavy, btnOutline, inputClass } from '../ui/styles';
import { BodyPortal } from '../ui/BodyPortal';

export type IdentityCandidate = {
  name?: string;
  domain?: string;
  website?: string;
  linkedinUrl?: string;
  locationSnippet?: string;
  score: number;
  evidenceUrls?: string[];
};

type Props = {
  open: boolean;
  leadId: string;
  candidates: IdentityCandidate[];
  onClose: () => void;
  onConfirmed: () => void | Promise<void>;
};

export function IdentityConfirmModal({ open, leadId, candidates, onClose, onConfirmed }: Props) {
  const [selected, setSelected] = useState<number | 'manual'>(candidates.length ? 0 : 'manual');
  const [manualWebsite, setManualWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      const payload =
        selected === 'manual'
          ? { website: manualWebsite.trim() || undefined, domain: undefined }
          : { candidateIndex: selected };

      if (selected === 'manual' && !manualWebsite.trim()) {
        toast.error('Enter a company website or pick a candidate.');
        setSaving(false);
        return;
      }

      await api.post(`/api/leads/${leadId}/confirm-identity`, payload);
      toast.success('Company confirmed — enrichment resumed.');
      onClose();
      await onConfirmed();
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message ?? 'Could not confirm identity.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="flex max-h-[90vh] w-[560px] max-w-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <IconBuilding className="text-amber-600" size={18} /> Confirm company
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Multiple companies matched this name. Pick the right one so we do not attach the wrong
                data.
              </p>
            </div>
            <button type="button" onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-700">
              <IconX size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto py-4 thin-scrollbar">
            {candidates.map((c, i) => (
              <label
                key={`${c.domain ?? c.website ?? i}`}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${
                  selected === i ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="identity-candidate"
                  checked={selected === i}
                  onChange={() => setSelected(i)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {c.domain || c.website || c.name || `Candidate ${i + 1}`}
                  </p>
                  {c.website ? (
                    <p className="text-xs text-slate-500 truncate">{c.website}</p>
                  ) : null}
                  {c.locationSnippet ? (
                    <p className="text-[11px] text-slate-400 mt-0.5">{c.locationSnippet}</p>
                  ) : null}
                  <p className="text-[10px] font-bold text-slate-400 mt-1">Score {c.score}</p>
                </div>
              </label>
            ))}

            <label
              className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-3 ${
                selected === 'manual' ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="identity-candidate"
                  checked={selected === 'manual'}
                  onChange={() => setSelected('manual')}
                />
                <span className="text-sm font-bold text-slate-900">None of these — enter website</span>
              </div>
              {selected === 'manual' ? (
                <input
                  value={manualWebsite}
                  onChange={(e) => setManualWebsite(e.target.value)}
                  placeholder="https://example.com"
                  className={inputClass}
                />
              ) : null}
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className={btnOutline} disabled={saving}>
              Later
            </button>
            <button type="button" onClick={() => void handleConfirm()} className={btnNavy} disabled={saving}>
              {saving ? <IconLoader2 className="animate-spin" size={16} /> : null}
              Confirm & enrich
            </button>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}
