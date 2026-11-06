'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { IconHistory, IconLoader2, IconSearch } from '@tabler/icons-react';
import {
  deleteMyRecipe,
  fetchCreditBalance,
  listMyRecipes,
  listRecipes,
  type MyRecipe,
  type RecipeDefinition,
} from '@/lib/recipes-api';
import { mineRecipeHref, recipeCardCopy } from '@/lib/recipe-card-copy';
import { cn } from '@/lib/utils';
import { spinnerClass } from '@/components/ui/styles';
import { RecipeSamplePreview } from '@/components/recipes/RecipeSamplePreview';

type ListFilter = 'all' | 'mine';

type CardRow = {
  key: string;
  kind: 'builtin' | 'mine';
  id: string;
  name: string;
  plainLine: string;
  io: string;
  cost: string;
  costDetail?: string;
  runHref: string;
  customizeHref?: string;
  sampleRecipeId: string;
  myId?: string;
};

function builtinCard(r: RecipeDefinition): CardRow {
  const copy = recipeCardCopy(r.id);
  return {
    key: r.id,
    kind: 'builtin',
    id: r.id,
    name: r.name,
    plainLine: copy.plainLine,
    io: copy.io,
    cost: copy.cost,
    costDetail: copy.costDetail,
    runHref: `/research/recipes/${r.id}`,
    customizeHref:
      r.id === 'prospect-brief' ? `/research/recipes/prospect-brief?mode=customize` : undefined,
    sampleRecipeId: r.id,
  };
}

function mineCard(m: MyRecipe): CardRow {
  const copy = recipeCardCopy(m.baseRecipeId);
  return {
    key: m.id,
    kind: 'mine',
    id: m.id,
    name: m.name,
    plainLine: m.description?.trim() || copy.plainLine,
    io: copy.io,
    cost: copy.cost,
    costDetail: copy.costDetail,
    runHref:
      m.baseRecipeId === 'prospect-brief'
        ? `/research/recipes/prospect-brief?mode=run&my=${m.id}`
        : mineRecipeHref(m.baseRecipeId, m.id),
    customizeHref:
      m.baseRecipeId === 'prospect-brief'
        ? mineRecipeHref(m.baseRecipeId, m.id)
        : undefined,
    sampleRecipeId: m.baseRecipeId,
    myId: m.id,
  };
}

export default function ResearchWorkspacePage() {
  const [recipes, setRecipes] = useState<RecipeDefinition[]>([]);
  const [mine, setMine] = useState<MyRecipe[]>([]);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ListFilter>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    Promise.all([listRecipes(), listMyRecipes().catch(() => []), fetchCreditBalance()])
      .then(([list, my, balance]) => {
        setRecipes(list);
        setMine(my);
        setCreditBalance(balance);
      })
      .catch(() => toast.error('Could not load recipes'))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const builtIn = recipes.map(builtinCard);
    const saved = mine.map(mineCard);
    const all = filter === 'mine' ? saved : [...builtIn, ...saved];
    const query = q.trim().toLowerCase();
    if (!query) return all;
    return all.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.plainLine.toLowerCase().includes(query) ||
        r.io.toLowerCase().includes(query),
    );
  }, [recipes, mine, filter, q]);

  async function onDeleteMine(id: string) {
    try {
      await deleteMyRecipe(id);
      setMine((prev) => prev.filter((m) => m.id !== id));
      toast.success('Deleted');
    } catch {
      toast.error('Could not delete');
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
        <IconLoader2 className={spinnerClass} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Recipes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Give an input, get a clear result. Credits shown up front.
            {creditBalance !== null ? ` · ${creditBalance} credits` : null}
          </p>
        </div>
        <Link
          href="/research/history"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <IconHistory className="h-4 w-4" />
          Runs
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-zinc-400"
            placeholder="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg border border-zinc-200 p-0.5 text-xs">
          {(['all', 'mine'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={cn(
                'rounded-md px-3 py-1.5 capitalize',
                filter === f ? 'bg-zinc-900 text-white' : 'text-zinc-600',
              )}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : 'Mine'}
            </button>
          ))}
        </div>
      </div>

      {rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <article
              key={row.key}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">
                    {row.name}
                    {row.kind === 'mine' ? (
                      <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
                        Mine
                      </span>
                    ) : null}
                  </h2>
                  <p className="mt-1.5 text-sm text-zinc-600">{row.plainLine}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span>{row.io}</span>
                <span>
                  <span className="font-medium text-zinc-800">{row.cost}</span>
                  {row.costDetail ? ` · ${row.costDetail}` : null}
                </span>
              </div>

              <RecipeSamplePreview recipeId={row.sampleRecipeId} />

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  href={row.runHref}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                >
                  Run
                </Link>
                {row.customizeHref ? (
                  <Link
                    href={row.customizeHref}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Customize
                  </Link>
                ) : null}
                {row.kind === 'mine' && row.myId ? (
                  <button
                    type="button"
                    className="ml-auto text-xs text-red-600 hover:underline"
                    onClick={() => onDeleteMine(row.myId!)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-12 text-center text-sm text-zinc-500">
          {filter === 'mine' ? (
            <>
              No saved recipes yet.{' '}
              <Link
                href="/research/recipes/prospect-brief?mode=customize"
                className="underline"
              >
                Customize Prospect brief
              </Link>{' '}
              or{' '}
              <Link href="/research/recipes/find-contacts" className="underline">
                Find contacts
              </Link>
            </>
          ) : (
            'No recipes found.'
          )}
        </div>
      )}
    </div>
  );
}
