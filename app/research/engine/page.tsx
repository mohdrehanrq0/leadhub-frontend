'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { IconLoader2, IconPlus } from '@tabler/icons-react';
import { RECIPE_ENGINE_V2 } from '@/lib/features';
import {
  createEngineRecipe,
  listEngineRecipes,
  type EngineRecipe,
} from '@/lib/recipe-engine-api';
import { spinnerClass } from '@/components/ui/styles';

export default function RecipeEngineListPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<EngineRecipe[]>([]);
  const [loading, setLoading] = useState(RECIPE_ENGINE_V2);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!RECIPE_ENGINE_V2) return;
    listEngineRecipes()
      .then(setRecipes)
      .catch(() => toast.error('Could not load engine recipes'))
      .finally(() => setLoading(false));
  }, []);

  if (!RECIPE_ENGINE_V2) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Recipe engine is disabled. Set NEXT_PUBLIC_RECIPE_ENGINE_V2=true (and backend RECIPE_ENGINE_V2=true) to enable it.</div>;
  }
  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-zinc-500"><IconLoader2 className={spinnerClass} /></div>;
  }

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

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Recipe engine</h1>
          <p className="text-sm text-slate-500">Data recipes built from registry nodes. Every save is a new version.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/settings/extension" className="text-sm font-medium text-blue-600 hover:text-blue-800">Connect browser extension</Link>
          <button type="button" onClick={onCreate} disabled={creating} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            <IconPlus size={16} /> New recipe
          </button>
        </div>
      </div>
      {recipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No engine recipes yet.</div>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/research/engine/${recipe.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">{recipe.name}</span>
                <span className="text-xs text-slate-400">v{recipe.version} · {recipe.steps.length} steps</span>
              </div>
              {recipe.description ? <p className="mt-1 text-sm text-slate-500">{recipe.description}</p> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
