'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { btnPrimary, inputClass } from '@/components/ui/styles';
import {
  reportWrongPerson,
  type FindContactsCandidate,
  type RecipeRunBundle,
} from '@/lib/recipes-api';
import { cn } from '@/lib/utils';

const REASONS = [
  { value: 'wrong_department', label: 'Wrong department' },
  { value: 'too_junior', label: 'Too junior' },
  { value: 'not_at_company', label: 'Not at company' },
  { value: 'left_company', label: 'Left company' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'other', label: 'Other' },
];

export function ResultsTable({
  run,
  onUpdated,
}: {
  run: RecipeRunBundle;
  onUpdated?: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'strong' | 'closest' | 'not_found'>('strong');
  const [wrongRow, setWrongRow] = useState<FindContactsCandidate | null>(null);
  const [reason, setReason] = useState('wrong_department');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rows = useMemo(() => {
    const list = run.candidates ?? [];
    if (filter === 'strong') return list.filter((c) => c.billed || c.persona_match === 'strong');
    if (filter === 'closest') return list.filter((c) => c.persona_match === 'partial');
    if (filter === 'not_found') {
      return list.length ? [] : [{ name: null, title: null, linkedin_url: null, tier: 'unverified' as const, evidence: [], as_of: null, persona_match: 'none' as const, billed: false }];
    }
    return list;
  }, [run.candidates, filter]);

  const summary = run.summary;

  async function submitWrong() {
    if (!wrongRow) return;
    setSubmitting(true);
    try {
      const rowId =
        wrongRow.linkedin_url ??
        `${wrongRow.name ?? 'unknown'}:${wrongRow.title ?? ''}`;
      const result = await reportWrongPerson(run.runId, encodeURIComponent(rowId), {
        reason,
        note: note || undefined,
        person: {
          name: wrongRow.name,
          title: wrongRow.title,
          linkedin_url: wrongRow.linkedin_url,
        },
      });
      toast.success(result.message);
      setWrongRow(null);
      onUpdated?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit feedback');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600">
        <span>Found {summary?.found_strong ?? rows.filter((r) => r.billed).length}</span>
        <span>Closest only {summary?.found_partial ?? rows.filter((r) => r.persona_match === 'partial').length}</span>
        <span>Not found {summary?.not_found ?? 0}</span>
        <span>Failed {summary?.failed ?? 0}</span>
        <span className="font-medium text-zinc-900">
          Credits charged {summary?.credits_charged ?? rows.filter((r) => r.billed).length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['strong', 'Strong'],
            ['closest', 'Closest'],
            ['all', 'All'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium',
              filter === id ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700',
            )}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Person</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Match</th>
              <th className="px-3 py-2">Why</th>
              <th className="px-3 py-2">Billed</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.linkedin_url ?? row.name}-${i}`} className="border-t border-zinc-100">
                <td className="px-3 py-2 text-zinc-600">{row.company ?? '—'}</td>
                <td className="px-3 py-2">
                  {row.linkedin_url ? (
                    <Link
                      href={row.linkedin_url}
                      target="_blank"
                      className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                    >
                      {row.name ?? 'Unknown'}
                    </Link>
                  ) : (
                    row.name ?? '—'
                  )}
                </td>
                <td className="px-3 py-2">{row.title ?? '—'}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      row.persona_match === 'strong'
                        ? 'bg-emerald-50 text-emerald-700'
                        : row.persona_match === 'partial'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-zinc-100 text-zinc-600',
                    )}
                    title={
                      row.persona_match === 'partial'
                        ? 'This person does not match your persona, so it is free.'
                        : undefined
                    }
                  >
                    {row.persona_match === 'strong'
                      ? 'Strong'
                      : row.persona_match === 'partial'
                        ? 'Closest'
                        : 'None'}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-zinc-600">
                  {(row.matched_on ?? []).slice(0, 3).join(' · ') || '—'}
                </td>
                <td className="px-3 py-2">{row.billed ? 'yes' : 'no'}</td>
                <td className="px-3 py-2">
                  {row.billed ? (
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => setWrongRow(row)}
                    >
                      Wrong person
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  We could not confirm anyone matching this persona at this company. No credits used.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {wrongRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">Wrong person</h3>
            <p className="text-sm text-zinc-600">
              {wrongRow.name} · {wrongRow.title}. This credit will be returned when the reason is not
              Other.
            </p>
            <select className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <textarea
              className={inputClass}
              rows={3}
              placeholder="Optional note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="text-sm text-zinc-600" onClick={() => setWrongRow(null)}>
                Cancel
              </button>
              <button type="button" className={btnPrimary} disabled={submitting} onClick={submitWrong}>
                {submitting ? 'Submitting…' : 'Submit & refund'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
