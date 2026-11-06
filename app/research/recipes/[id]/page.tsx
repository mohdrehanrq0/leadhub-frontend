'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { IconArrowLeft, IconLoader2 } from '@tabler/icons-react';
import { PersonaBuilder } from '@/components/recipes/PersonaBuilder';
import { CleanListForm } from '@/components/recipes/CleanListForm';
import { btnPrimary, inputClass, spinnerClass } from '@/components/ui/styles';
import {
  draftPersona,
  estimateRecipeCredits,
  fetchCreditBalance,
  getRecipe,
  listMyRecipes,
  listPersonaPresetsApi,
  saveMyRecipe,
  startRecipeRun,
  type RecipeDefinition,
} from '@/lib/recipes-api';
import {
  buildPersonaPreview,
  newEmptyPersona,
  type PersonaPreset,
  type PersonaSpec,
} from '@/lib/persona-types';
import { cn } from '@/lib/utils';

const PEOPLE_FINDING = new Set(['find-contacts']);

type OpenerTone = 'professional' | 'casual' | 'direct';

type BriefSections = {
  developments: boolean;
  email: boolean;
  hiring: boolean;
};

const DEFAULT_SECTIONS: BriefSections = {
  developments: true,
  email: false,
  hiring: false,
};

export default function RecipePage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const recipeId = params.id;

  const [recipe, setRecipe] = useState<RecipeDefinition | null>(null);
  const [presets, setPresets] = useState<PersonaPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  const [motive, setMotive] = useState('');
  const [persona, setPersona] = useState<PersonaSpec>(newEmptyPersona());
  const [confirmed, setConfirmed] = useState(false);
  const [companyMode, setCompanyMode] = useState<'one' | 'list'>('one');
  const [companyUrl, setCompanyUrl] = useState('');
  const [companyList, setCompanyList] = useState('');
  const [maxResults, setMaxResults] = useState(1);
  const [showClosest, setShowClosest] = useState(true);
  const [personUrl, setPersonUrl] = useState('');
  const [whatYouSell, setWhatYouSell] = useState('');
  const [briefSections, setBriefSections] = useState<BriefSections>(DEFAULT_SECTIONS);
  const [openerTone, setOpenerTone] = useState<OpenerTone>('professional');
  const [customInstruction, setCustomInstruction] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const needsPersona = PEOPLE_FINDING.has(recipeId);
  const isProspect = recipeId === 'prospect-brief';
  const isClean = recipeId === 'clean-list';
  const modeParam = search.get('mode');
  const myId = search.get('my');
  const isCustomize =
    isProspect && (modeParam === 'customize' || (Boolean(myId) && modeParam !== 'run'));

  useEffect(() => {
    Promise.all([
      getRecipe(recipeId),
      listPersonaPresetsApi().catch(() => []),
      fetchCreditBalance(),
      listMyRecipes().catch(() => []),
    ])
      .then(([r, p, bal, mine]) => {
        setRecipe(r);
        setPresets(p);
        setCreditBalance(bal);
        if (myId) {
          const saved = mine.find((m) => m.id === myId);
          const spec = (saved?.spec ?? {}) as {
            persona?: PersonaSpec;
            maxResults?: number;
            showClosest?: boolean;
            motive?: string;
            sellStatement?: string;
            briefSections?: Partial<BriefSections>;
            openerTone?: OpenerTone;
            customInstruction?: string;
          };
          if (spec?.persona) {
            setPersona({ ...spec.persona, confirmedAt: new Date().toISOString() });
            setConfirmed(true);
          }
          if (spec?.maxResults) setMaxResults(spec.maxResults);
          if (typeof spec?.showClosest === 'boolean') setShowClosest(spec.showClosest);
          if (spec?.motive) setMotive(spec.motive);
          if (spec?.sellStatement) setWhatYouSell(spec.sellStatement);
          else if (spec?.motive && recipeId === 'prospect-brief') setWhatYouSell(spec.motive);
          if (spec?.briefSections) {
            setBriefSections({
              developments: spec.briefSections.developments !== false,
              email: Boolean(spec.briefSections.email),
              hiring: Boolean(spec.briefSections.hiring),
            });
          }
          if (
            spec?.openerTone === 'casual' ||
            spec?.openerTone === 'direct' ||
            spec?.openerTone === 'professional'
          ) {
            setOpenerTone(spec.openerTone);
          }
          if (spec?.customInstruction) setCustomInstruction(spec.customInstruction);
          if (saved?.name) setSaveName(saved.name);
        } else if (p[0]) {
          setPersona({ ...p[0].persona });
        }
      })
      .catch(() => toast.error('Could not load recipe'))
      .finally(() => setLoading(false));
  }, [recipeId, search, myId]);

  const companyCount = useMemo(() => {
    if (companyMode === 'one') return companyUrl.trim() ? 1 : 0;
    return companyList
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean).length;
  }, [companyMode, companyUrl, companyList]);

  const preview = useMemo(
    () =>
      buildPersonaPreview({
        persona,
        companyCount: Math.max(1, companyCount),
        maxResults,
      }),
    [persona, companyCount, maxResults],
  );

  const prospectOptionalSteps = useMemo(() => {
    const steps: string[] = [];
    if (briefSections.email) steps.push('email_find', 'email_verify');
    if (briefSections.hiring) steps.push('hiring');
    return steps;
  }, [briefSections]);

  const prospectCredits = useMemo(() => {
    if (!recipe || !isProspect) return 10;
    return estimateRecipeCredits(recipe, isCustomize ? prospectOptionalSteps : []);
  }, [recipe, isProspect, isCustomize, prospectOptionalSteps]);

  const canRun =
    !submitting &&
    (!needsPersona || confirmed) &&
    (isProspect
      ? Boolean(personUrl.trim())
      : isClean
        ? true
        : companyCount > 0 && confirmed);

  async function onDraft() {
    if (!motive.trim()) {
      toast.error('Write your goal first');
      return;
    }
    setDrafting(true);
    try {
      const result = await draftPersona({ motive, recipeId });
      if (!result.ok) {
        toast.message(result.message);
        if (result.presets?.length) setPresets(result.presets);
        return;
      }
      setPersona(result.persona);
      setConfirmed(false);
      toast.success('Persona drafted — review and confirm');
    } catch {
      toast.error('Draft failed — pick a preset');
    } finally {
      setDrafting(false);
    }
  }

  async function onRunProspect() {
    if (!personUrl.trim()) {
      toast.error(
        'Company-only brief cannot auto-pick. Paste a person URL, or run Find contacts first.',
      );
      return;
    }
    setSubmitting(true);
    try {
      const inputs: Record<string, unknown> = {
        person_url: personUrl.trim(),
        what_you_sell: whatYouSell.trim() || undefined,
      };
      if (isCustomize) {
        inputs.brief_sections = briefSections;
        inputs.opener_tone = openerTone;
        if (customInstruction.trim()) {
          inputs.custom_instruction = customInstruction.trim().slice(0, 500);
        }
      }
      const result = await startRecipeRun('prospect-brief', {
        inputs,
        optional_steps: isCustomize ? prospectOptionalSteps : [],
      });
      toast.success(`Run started · ${result.creditsReserved} credits reserved`);
      router.push(`/research/runs/${result.runId}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not start run';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onRun() {
    if (isProspect) {
      await onRunProspect();
      return;
    }
    if (needsPersona && !confirmed) {
      toast.error('Confirm the persona before running');
      return;
    }
    setSubmitting(true);
    try {
      const inputs: Record<string, unknown> = {
        persona: { ...persona, confirmedAt: persona.confirmedAt ?? new Date().toISOString() },
        max_results: maxResults,
        show_closest: showClosest,
      };
      if (companyMode === 'one') {
        inputs.company_url = companyUrl.trim();
      } else {
        inputs.companies = companyList
          .split(/\r?\n|,/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      const result = await startRecipeRun(recipeId, { inputs });
      if (result.status === 'needs_domain_confirmation') {
        toast.message(result.message ?? 'Confirm the domain');
        return;
      }
      toast.success(`Run started · ${result.creditsReserved} credits reserved`);
      router.push(`/research/runs/${result.runId ?? result.batchId}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string; code?: string } } })?.response?.data
          ?.message || 'Could not start run';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveMine() {
    if (!saveName.trim()) {
      toast.error('Name required');
      return;
    }
    try {
      if (isProspect) {
        await saveMyRecipe({
          name: saveName.trim(),
          base_recipe_id: 'prospect-brief',
          description: whatYouSell.slice(0, 140) || undefined,
          spec: {
            sellStatement: whatYouSell,
            briefSections,
            openerTone,
            customInstruction: customInstruction.trim().slice(0, 500) || undefined,
          },
        });
      } else {
        await saveMyRecipe({
          name: saveName.trim(),
          base_recipe_id: recipeId,
          description: motive.slice(0, 140) || undefined,
          spec: {
            persona,
            maxResults,
            showClosest,
            motive,
          },
        });
      }
      toast.success('Saved as my recipe');
      setSaveOpen(false);
    } catch {
      toast.error('Could not save');
    }
  }

  if (loading || !recipe) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <IconLoader2 className={spinnerClass} />
      </div>
    );
  }

  if (isClean) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Link href="/research" className="inline-flex items-center gap-1 text-sm text-zinc-600">
          <IconArrowLeft className="h-4 w-4" /> Recipes
        </Link>
        <h1 className="text-2xl font-semibold">{recipe.name}</h1>
        <p className="text-sm text-zinc-500">
          Paste a CSV → get a cleaned list with emails · 2 credits per resolved row
        </p>
        <CleanListForm
          recipe={recipe}
          creditBalance={creditBalance}
          submitting={submitting}
          onSubmit={async (payload) => {
            setSubmitting(true);
            try {
              const result = await startRecipeRun('clean-list', payload);
              router.push(`/research/runs/${result.runId}`);
            } finally {
              setSubmitting(false);
            }
          }}
        />
      </div>
    );
  }

  if (isProspect) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/research" className="inline-flex items-center gap-1 text-sm text-zinc-600">
              <IconArrowLeft className="h-4 w-4" /> Recipes
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{recipe.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Paste a LinkedIn profile → get a research brief and opener
            </p>
          </div>
          {isCustomize ? (
            <button
              type="button"
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm"
              onClick={() => setSaveOpen(true)}
            >
              Save as my recipe
            </button>
          ) : null}
        </div>

        <div className="flex gap-2 text-xs">
          <Link
            href={`/research/recipes/prospect-brief${myId ? `?my=${myId}&mode=run` : ''}`}
            className={cn(
              'rounded-md px-3 py-1.5 font-medium',
              !isCustomize ? 'bg-zinc-900 text-white' : 'border border-zinc-200 text-zinc-700',
            )}
          >
            Run
          </Link>
          <Link
            href={`/research/recipes/prospect-brief?mode=customize${myId ? `&my=${myId}` : ''}`}
            className={cn(
              'rounded-md px-3 py-1.5 font-medium',
              isCustomize ? 'bg-zinc-900 text-white' : 'border border-zinc-200 text-zinc-700',
            )}
          >
            Customize
          </Link>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900">Person LinkedIn URL</h2>
          <p className="text-xs text-zinc-500">
            Required. Company-only runs are blocked — find contacts first, then paste the person
            URL here.
          </p>
          <input
            className={inputClass}
            placeholder="https://linkedin.com/in/…"
            value={personUrl}
            onChange={(e) => setPersonUrl(e.target.value)}
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900">What you sell</h2>
          <p className="text-xs text-zinc-500">
            Used for the opener. Leave blank to use your workspace product description.
          </p>
          <textarea
            className={inputClass}
            rows={2}
            placeholder="Outbound email infrastructure for B2B sales teams"
            value={whatYouSell}
            onChange={(e) => setWhatYouSell(e.target.value)}
          />
        </section>

        {isCustomize ? (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-900">Sections to include</h2>
              <p className="text-xs text-zinc-500">
                Person and company identity always run. Optional sections below.
              </p>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input type="checkbox" checked disabled />
                Person + company identity (required)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={briefSections.developments}
                  onChange={(e) =>
                    setBriefSections((s) => ({ ...s, developments: e.target.checked }))
                  }
                />
                Why-now / recent developments
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={briefSections.email}
                  onChange={(e) => setBriefSections((s) => ({ ...s, email: e.target.checked }))}
                />
                Find + verify email (+2 credits)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={briefSections.hiring}
                  onChange={(e) => setBriefSections((s) => ({ ...s, hiring: e.target.checked }))}
                />
                Hiring signals (+2 credits)
              </label>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-zinc-900">Opener tone</h2>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['professional', 'Professional'],
                    ['casual', 'Casual'],
                    ['direct', 'Direct'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-sm',
                      openerTone === value
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50',
                    )}
                    onClick={() => setOpenerTone(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-zinc-900">Custom instruction</h2>
              <p className="text-xs text-zinc-500">
                Appended to research guidance. Identity and source rules stay locked. Max 500
                characters.
              </p>
              <textarea
                className={inputClass}
                rows={3}
                maxLength={500}
                placeholder="Focus on pipeline tooling and mid-market SaaS; mention Series A if present."
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
              />
              <p className="text-right text-[11px] text-zinc-400">
                {customInstruction.length}/500
              </p>
            </section>
          </>
        ) : (
          <p className="text-sm text-zinc-600">
            Want email, hiring signals, opener tone, or a custom instruction?{' '}
            <Link
              href={`/research/recipes/prospect-brief?mode=customize${myId ? `&my=${myId}` : ''}`}
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              Customize this recipe
            </Link>
          </p>
        )}

        <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm text-zinc-800">
            <span className="font-semibold">{prospectCredits} credits</span>
            {isCustomize && prospectOptionalSteps.length
              ? ' with selected options'
              : ' per brief'}
            {creditBalance !== null ? ` · Balance: ${creditBalance}` : null}
          </p>
          <button
            type="button"
            className={btnPrimary}
            disabled={!canRun}
            onClick={onRunProspect}
          >
            {submitting ? 'Starting…' : 'Run'}
          </button>
        </section>

        {saveOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5">
              <h3 className="font-semibold">Save as my recipe</h3>
              <p className="text-xs text-zinc-500">
                Saves sections, opener tone, custom instruction, and what you sell.
              </p>
              <input
                className={inputClass}
                placeholder="My prospect brief"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setSaveOpen(false)}>
                  Cancel
                </button>
                <button type="button" className={btnPrimary} onClick={onSaveMine}>
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/research" className="inline-flex items-center gap-1 text-sm text-zinc-600">
            <IconArrowLeft className="h-4 w-4" /> Recipes
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{recipe.name}</h1>
          <p className="text-sm text-zinc-500">
            Give companies + who you want → get strong matches · 15 credits per strong match
          </p>
        </div>
        {needsPersona ? (
          <button
            type="button"
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm"
            onClick={() => setSaveOpen(true)}
          >
            Save as my recipe
          </button>
        ) : null}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900">1. Your goal</h2>
        <textarea
          className={inputClass}
          rows={3}
          placeholder="I sell payroll software and want the HR head at each company…"
          value={motive}
          onChange={(e) => setMotive(e.target.value)}
        />
        {needsPersona ? (
          <button
            type="button"
            className="text-sm text-zinc-700 underline-offset-2 hover:underline"
            onClick={onDraft}
            disabled={drafting}
          >
            {drafting ? 'Drafting…' : 'Draft my persona'}
          </button>
        ) : null}
      </section>

      {needsPersona ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold">2. Who are we looking for?</h2>
          <PersonaBuilder
            persona={persona}
            presets={presets}
            confirmed={confirmed}
            drafting={drafting}
            onChange={(p) => {
              setPersona(p);
              setConfirmed(false);
            }}
            onConfirm={() => {
              setPersona((p) => ({ ...p, confirmedAt: new Date().toISOString() }));
              setConfirmed(true);
            }}
            onPickPreset={(preset) => {
              setPersona({ ...preset.persona });
              setConfirmed(true);
            }}
            onDraft={onDraft}
          />
        </section>
      ) : null}

      {needsPersona ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">3. Companies</h2>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={companyMode === 'one'}
                onChange={() => setCompanyMode('one')}
              />
              One company
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={companyMode === 'list'}
                onChange={() => setCompanyMode('list')}
              />
              Paste list
            </label>
          </div>
          {companyMode === 'one' ? (
            <input
              className={inputClass}
              placeholder="acme.com"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
            />
          ) : (
            <textarea
              className={inputClass}
              rows={6}
              placeholder="One domain or company per line (up to 100)"
              value={companyList}
              onChange={(e) => setCompanyList(e.target.value)}
            />
          )}
        </section>
      ) : null}

      {needsPersona ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">4. Options</h2>
          <label className="flex items-center gap-2 text-sm">
            Results per company
            <select
              className={inputClass}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showClosest}
              onChange={(e) => setShowClosest(e.target.checked)}
            />
            Show closest matches (free)
          </label>
        </section>
      ) : null}

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <h2 className="text-sm font-semibold">5. Preview</h2>
        <p className="text-sm text-zinc-700">{preview}</p>
        {creditBalance !== null ? (
          <p className="text-xs text-zinc-500">Balance: {creditBalance} credits</p>
        ) : null}
        <button type="button" className={btnPrimary} disabled={!canRun} onClick={onRun}>
          {submitting ? 'Starting…' : 'Run recipe'}
        </button>
      </section>

      {saveOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5">
            <h3 className="font-semibold">Save as my recipe</h3>
            <input
              className={inputClass}
              placeholder="My HR finder"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSaveOpen(false)}>
                Cancel
              </button>
              <button type="button" className={btnPrimary} onClick={onSaveMine}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
