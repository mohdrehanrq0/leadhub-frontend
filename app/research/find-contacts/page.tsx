import { redirect } from 'next/navigation';

/** Legacy find-contacts UI retired — open the Find contacts engine recipe instead. */
export default function FindContactsRedirect() {
  redirect('/research');
}
