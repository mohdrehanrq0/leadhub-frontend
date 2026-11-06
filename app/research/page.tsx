'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { cn } from '@/lib/utils';
import { spinnerClass } from '@/components/ui/styles';

type ListFilter = 'all' | 'mine';

function costLabel(recipe: RecipeDefinition): string {
  const per = recipe.credits.per_confirmed_candidate;
  if (typeof per === 'number' && per > 0) {
    return `${per} per strong match`;
  }
  return `${recipe.credits.base || 1} per brief`;
}

function ioLabel(recipe: RecipeDefinition): string {
  if (recipe.id === 'find-contacts') return 'Companies → People';
  if (recipe.id === 'clean-list') return 'CSV → Clean CSV';
  return 'Person/Company → Brief';
}

export default function ResearchWorkspacePage() {
  const router = useRouter();
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
    const builtIn = recipes.map((r) => ({
      key: r.id,
      kind: 'builtin' as const,
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      io: ioLabel(r),
      cost: costLabel(r),
      href: `/research/recipes/${r.id}`,
    }));
    const saved = mine.map((m) => ({
      key: m.id,
      kind: 'mine' as const,
      id: m.id,
      name: m.name,
      description: m.description ?? `Saved from ${m.baseRecipeId}`,
      io: 'Companies → People',
      cost: '1 per strong match',
      href: `/research/recipes/${m.baseRecipeId}?my=${m.id}`,
      myId: m.id,
    }));
    const all = filter === 'mine' ? saved : [...builtIn, ...saved];
    const query = q.trim().toLowerCase();
    if (!query) return all;
    return all.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query),
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
            Pick a recipe, confirm who you want, then run. Charged only for strong matches.
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
        <div className="relative flex-1 min-w-[200px]">
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

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">What it does</th>
              <th className="px-4 py-3">Input → Output</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                onClick={() => router.push(row.href)}
              >
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {row.name}
                  {row.kind === 'mine' ? (
                    <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
                      Mine
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-zinc-600">{row.description || '—'}</td>
                <td className="px-4 py-3 text-zinc-600">{row.io}</td>
                <td className="px-4 py-3 text-zinc-600">{row.cost}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <Link
                      href={row.href}
                      className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white"
                    >
                      Run
                    </Link>
                    <Link
                      href={`${row.href}${row.href.includes('?') ? '&' : '?'}edit=1`}
                      className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs"
                    >
                      Edit
                    </Link>
                    {row.kind === 'mine' && 'myId' in row ? (
                      <button
                        type="button"
                        className="text-xs text-red-600"
                        onClick={() => onDeleteMine(row.myId!)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                  {filter === 'mine' ? (
                    <>
                      No saved recipes yet.{' '}
                      <Link href="/research/recipes/find-contacts" className="underline">
                        Create from Find contacts
                      </Link>
                    </>
                  ) : (
                    'No recipes found.'
                  )}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
