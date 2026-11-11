'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Legacy route — Prospect Lists live at /dashboard/prospect-lists/[id]. */
export default function LeadListDetailRedirectPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  useEffect(() => {
    router.replace(`/dashboard/prospect-lists/${id}`);
  }, [router, id]);
  return null;
}
