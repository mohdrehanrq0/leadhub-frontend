'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { EnrichmentFact, LinkedInSnapshot } from './types';

/**
 * Cached LinkedIn detail for a lead or a capture.
 *
 * Both resources expose the same `/linkedin` shape, so the caller passes the
 * base path and gets the same result either way. Failures resolve to an empty
 * snapshot rather than an error state: this is supplementary detail, and a
 * missing cache row must not break the page around it.
 */
export function useLinkedInSnapshot(basePath: string | null) {
  const [snapshot, setSnapshot] = useState<LinkedInSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!basePath) return;
    setLoading(true);
    try {
      const res = await api.get(`${basePath}/linkedin`);
      setSnapshot((res.data?.data as LinkedInSnapshot) ?? null);
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    void load();
  }, [load]);

  return { snapshot, loading, reload: load };
}

/** Evidence facts for a lead. Lead-scoped only — captures have no facts yet. */
export function useEnrichmentFacts(leadId: string | null) {
  const [facts, setFacts] = useState<EnrichmentFact[] | null>(null);

  const load = useCallback(async () => {
    if (!leadId) return;
    try {
      const res = await api.get(`/api/leads/${leadId}/facts`);
      setFacts((res.data?.data as EnrichmentFact[]) ?? []);
    } catch {
      setFacts(null);
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { facts, reload: load };
}
