'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** LinkedIn outreach now lives on each prospect. */
export default function OutreachQueueRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/captures');
  }, [router]);
  return <p className="p-6 text-sm text-slate-500">Opening LinkedIn prospects…</p>;
}
