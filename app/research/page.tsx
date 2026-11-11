'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IconHistory, IconLoader2, IconPlus, IconSearch } from '@tabler/icons-react';
import { RECIPE_ENGINE_V2 } from '@/lib/features';
import {
  createEngineRecipe,
  listEngineRecipes,
  type EngineRecipe,
} from '@/lib/recipe-engine-api';
import { spinnerClass } from '@/components/ui/styles';
import { cn } from '@/lib/utils';

export default function ResearchRecipesPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<EngineRecipe[]>([]);
  const [loading, setLoading] = useState(RECIPE_ENGINE_V2);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!RECIPE_ENGINE_V2) return;
    listEngineRecipes()
      .then(setRecipes)
      .catch(() => toast.error('Could not load recipes'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return recipes;
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        (r.description ?? '').toLowerCase().includes(query),
    );
  }, [recipes, q]);

  async function onCreate() {
    setCreating(true);
    try {
      const recipe = await createEngineRecipe({ name: 'Untitled recipe', steps: [] });
      router.push(`/research/engine/${recipe.id}`);
    } catch {
      toast.error('Could not create recipe');
      setCreating(false);
    }
  }

  if (!RECIPE_ENGINE_V2) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
        Recipe engine is disabled. Set <code className="rounded bg-slate-100 px-1 text-xs">NEXT_PUBLIC_RECIPE_ENGINE_V2=true</code> and backend{' '}
        <code className="rounded bg-slate-100 px-1 text-xs">RECIPE_ENGINE_V2=true</code>, then restart both servers.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
        <IconLoader2 className={spinnerClass} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Recipes</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Build lead workflows from registry nodes — URL lists, LinkedIn enrich, AI prompts, email waterfall, and outputs.
            Open a starter, edit the prompt/rubric, then run a test of 5 rows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/research/history"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <IconHistory className="h-4 w-4" />
            Runs
          </Link>
          <Link
            href="/dashboard/settings/extension"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Connect extension
          </Link>
          <button
            type="button"
            onClick={() => void onCreate()}
            disabled={creating}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <IconPlus size={16} />
            {creating ? 'Creating…' : 'New recipe'}
          </button>
        </div>
      </div>

      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          placeholder="Search recipes"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          {recipes.length === 0
            ? 'No recipes yet. Create one or refresh to load starters (Prospect brief, Clean list, Find contacts, Post commenters).'
            : 'No recipes match that search.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/research/engine/${recipe.id}`}
              className={cn(
                'block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">{recipe.name}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  v{recipe.version} · {recipe.steps.length} steps
                </span>
              </div>
              {recipe.description ? (
                <p className="mt-1 text-sm leading-6 text-slate-500">{recipe.description}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
