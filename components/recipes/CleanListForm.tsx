'use client';

import { useMemo, useState } from 'react';
import { IconLoader2, IconSparkles } from '@tabler/icons-react';
import { btnPrimary, inputClass } from '@/components/ui/styles';
import {
  estimateRecipeCredits,
  parseCleanListCsv,
  type RecipeDefinition,
} from '@/lib/recipes-api';

export function CleanListForm({
  recipe,
  creditBalance,
  submitting,
  onSubmit,
}: {
  recipe: RecipeDefinition;
  creditBalance: number | null;
  submitting: boolean;
  onSubmit: (payload: { rows: Array<Record<string, string>> }) => void | Promise<void>;
}) {
  const [csvText, setCsvText] = useState('');
  const rows = useMemo(() => parseCleanListCsv(csvText), [csvText]);
  const creditsPerRow = estimateRecipeCredits(recipe, ['email_find']);
  const creditsNeeded = rows.length * creditsPerRow;
  const insufficient = creditBalance !== null && creditsNeeded > creditBalance;
  const overLimit = rows.length > (recipe.limits?.max_rows ?? 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rows.length) return;
    await onSubmit({ rows });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Recipe</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">{recipe.name}</h2>
        {recipe.description ? (
          <p className="mt-1 text-sm text-slate-600">{recipe.description}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-800">
          Paste CSV or TSV rows
        </label>
        <textarea
          className={`${inputClass} min-h-[180px] py-3 font-mono text-xs`}
          placeholder={`full_name,company_name,company_url,role_hint\nJane Doe,Acme Inc,https://acme.com,CEO`}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Header optional. Max {recipe.limits?.max_rows ?? 100} rows. Email find+verify is always on
          (+{creditsPerRow} credits/row).
        </p>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Parsed <span className="font-semibold">{rows.length}</span> row
        {rows.length === 1 ? '' : 's'} ·{' '}
        <span className="font-semibold">{creditsNeeded}</span> credit
        {creditsNeeded === 1 ? '' : 's'}
        {creditBalance !== null ? (
          <>
            {' '}
            (balance: <span className="font-semibold">{creditBalance}</span>)
          </>
        ) : null}
        .
        {overLimit ? (
          <span className="mt-1 block text-rose-700">Too many rows for one run.</span>
        ) : null}
        {insufficient ? (
          <span className="mt-1 block text-rose-700">Not enough credits.</span>
        ) : null}
      </div>

      <button
        type="submit"
        className={`${btnPrimary} w-full sm:w-auto`}
        disabled={submitting || !rows.length || insufficient || overLimit}
      >
        {submitting ? <IconLoader2 className="animate-spin" size={18} /> : <IconSparkles size={18} />}
        Clean {rows.length || ''} row{rows.length === 1 ? '' : 's'}
      </button>
    </form>
  );
}
