'use client';

import { useMemo, useState } from 'react';
import { IconLoader2, IconSparkles } from '@tabler/icons-react';
import { btnPrimary, inputClass } from '@/components/ui/styles';
import {
  estimateRecipeCredits,
  type RecipeDefinition,
  type RecipeInputDef,
} from '@/lib/recipes-api';
import { RoleListInput } from '@/components/recipes/RoleListInput';

const OPTIONAL_STEP_LABELS: Record<string, string> = {
  email_find: 'Find and verify email (+1 credit)',
  email_verify: 'Verify email',
  hiring: 'Include hiring / open roles',
};

/** Internal confirm-flow fields — not shown until the API asks for domain confirm. */
const HIDDEN_INPUT_KEYS = new Set(['confirm_domain', 'proposed_domain']);

/** Steps shown as toggles; email_verify is bundled under email_find. */
function visibleOptionalSteps(recipe: RecipeDefinition): string[] {
  return recipe.optional_steps.filter((s) => s !== 'email_verify');
}

function visibleInputs(recipe: RecipeDefinition): RecipeInputDef[] {
  return recipe.inputs.filter((input) => !HIDDEN_INPUT_KEYS.has(input.key));
}

export function RecipeRunForm({
  recipe,
  creditBalance,
  submitting,
  onSubmit,
}: {
  recipe: RecipeDefinition;
  creditBalance: number | null;
  submitting: boolean;
  onSubmit: (payload: {
    inputs: Record<string, string | boolean | undefined>;
    optional_steps: string[];
  }) => void | Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [optional, setOptional] = useState<Record<string, boolean>>({});

  const selectedOptional = useMemo(() => {
    const steps: string[] = [];
    for (const [key, on] of Object.entries(optional)) {
      if (!on) continue;
      steps.push(key);
      if (key === 'email_find') steps.push('email_verify');
    }
    return [...new Set(steps)];
  }, [optional]);

  const formInputs = visibleInputs(recipe);
  const maxResultsRaw = values.max_results ?? values.maxResults;
  const maxResultsNum = Math.min(
    5,
    Math.max(1, Number(maxResultsRaw || recipe.inputs.find((i) => i.key === 'max_results')?.default || 3) || 3),
  );
  const creditsNeeded = estimateRecipeCredits(recipe, selectedOptional, {
    maxResults: maxResultsNum,
  });
  const insufficient =
    creditBalance !== null && creditBalance < creditsNeeded;

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const roleInput = formInputs.find((i) => i.type === 'role_list');
    if (roleInput?.required) {
      const roles = (values[roleInput.key] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!roles.length) return;
    }
    const inputs: Record<string, string | boolean | undefined> = {};
    for (const input of formInputs) {
      const raw = values[input.key]?.trim();
      if (input.type === 'boolean') {
        inputs[input.key] = raw === 'true' || raw === '1';
        continue;
      }
      if (input.type === 'number') {
        inputs[input.key] = raw || String(input.default ?? '');
        continue;
      }
      inputs[input.key] = raw || undefined;
    }
    for (const step of selectedOptional) {
      inputs[step] = true;
    }
    await onSubmit({ inputs, optional_steps: selectedOptional });
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

      {formInputs.map((input) => (
        <div key={input.key}>
          <label className="mb-1.5 block text-sm font-medium text-slate-800">
            {input.type === 'role_list'
              ? (input.label ?? 'Target position / role')
              : (input.label ?? input.key)}
            {input.required ? <span className="text-red-500"> *</span> : (
              <span className="font-normal text-slate-500"> (optional)</span>
            )}
          </label>
          {input.type === 'role_list' ? (
            <RoleListInput
              value={values[input.key] ?? ''}
              onChange={(next) => setValue(input.key, next)}
              required={input.required}
              description={input.description}
            />
          ) : input.type === 'number' ? (
            <input
              className={inputClass}
              type="number"
              min={1}
              max={input.key === 'max_results' ? 5 : undefined}
              placeholder={input.description ?? ''}
              value={values[input.key] ?? String(input.default ?? '')}
              onChange={(e) => setValue(input.key, e.target.value)}
              required={input.required}
            />
          ) : input.type === 'boolean' ? (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={values[input.key] === 'true'}
                onChange={(e) => setValue(input.key, e.target.checked ? 'true' : '')}
              />
              {input.description ?? input.label ?? input.key}
            </label>
          ) : input.type === 'text' && input.key === 'what_you_sell' ? (
            <textarea
              className={`${inputClass} min-h-[72px] py-3`}
              placeholder={input.description ?? ''}
              value={values[input.key] ?? ''}
              onChange={(e) => setValue(input.key, e.target.value)}
              required={input.required}
            />
          ) : (
            <input
              className={inputClass}
              type={input.type === 'url' || input.type === 'linkedin_person_url' ? 'url' : 'text'}
              placeholder={input.description ?? ''}
              value={values[input.key] ?? ''}
              onChange={(e) => setValue(input.key, e.target.value)}
              required={input.required}
            />
          )}
        </div>
      ))}

      {visibleOptionalSteps(recipe).length ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-800">Optional steps</legend>
          <div className="space-y-2">
            {visibleOptionalSteps(recipe).map((step) => (
              <label key={step} className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={Boolean(optional[step])}
                  onChange={(e) =>
                    setOptional((prev) => ({ ...prev, [step]: e.target.checked }))
                  }
                />
                {OPTIONAL_STEP_LABELS[step] ?? step}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        This run uses <span className="font-semibold">{creditsNeeded}</span> credit
        {creditsNeeded === 1 ? '' : 's'}
        {creditBalance !== null ? (
          <>
            {' '}
            (balance: <span className="font-semibold">{creditBalance}</span>)
          </>
        ) : null}
        .
        {insufficient ? (
          <span className="mt-1 block text-rose-700">
            Not enough credits. Add more in Billing before starting.
          </span>
        ) : null}
      </div>

      <button
        type="submit"
        className={`${btnPrimary} w-full sm:w-auto`}
        disabled={submitting || insufficient}
      >
        {submitting ? <IconLoader2 className="animate-spin" size={18} /> : <IconSparkles size={18} />}
        Run recipe
      </button>
    </form>
  );
}
