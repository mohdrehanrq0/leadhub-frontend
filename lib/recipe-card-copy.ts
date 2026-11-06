/** Plain-language card copy for the Recipes library. */

export type RecipeCardCopy = {
  plainLine: string;
  io: string;
  cost: string;
  costDetail?: string;
};

const COPY: Record<string, RecipeCardCopy> = {
  'prospect-brief': {
    plainLine: 'Paste a LinkedIn profile → get a research brief and opener',
    io: 'LinkedIn URL → Brief + opener',
    cost: '10 credits',
    costDetail: '+2 email · +2 hiring',
  },
  'find-contacts': {
    plainLine: 'Give companies + who you want → get strong matches',
    io: 'Companies → People',
    cost: '15 credits',
    costDetail: 'per strong match',
  },
  'clean-list': {
    plainLine: 'Paste a CSV → get a cleaned list with emails',
    io: 'CSV → Clean CSV',
    cost: '2 credits',
    costDetail: 'per resolved row',
  },
};

export function recipeCardCopy(recipeId: string): RecipeCardCopy {
  return (
    COPY[recipeId] ?? {
      plainLine: 'Run this recipe',
      io: 'Input → Output',
      cost: 'Credits vary',
    }
  );
}

export function mineRecipeHref(baseRecipeId: string, myId: string): string {
  if (baseRecipeId === 'prospect-brief') {
    return `/research/recipes/prospect-brief?mode=customize&my=${myId}`;
  }
  return `/research/recipes/${baseRecipeId}?my=${myId}`;
}
