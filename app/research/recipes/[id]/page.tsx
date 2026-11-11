import { redirect } from 'next/navigation';

/** Legacy built-in recipe runner retired — Research is the recipe engine. */
export default function LegacyRecipeRedirect() {
  redirect('/research');
}
