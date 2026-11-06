'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Alias: /research/runs/:id → /research/jobs/:id */
export default function ResearchRunAliasPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  useEffect(() => {
    router.replace(`/research/jobs/${id}`);
  }, [id, router]);

  return null;
}
