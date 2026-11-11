import { redirect } from 'next/navigation';

/** Engine list now lives at /research — keep this path as an alias. */
export default function RecipeEngineListRedirect() {
  redirect('/research');
}
