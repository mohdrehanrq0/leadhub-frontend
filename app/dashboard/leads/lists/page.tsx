'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — Prospect Lists lives at /dashboard/prospect-lists. */
export default function LeadListsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/prospect-lists');
  }, [router]);
  return null;
}
