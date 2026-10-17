'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { CaptureSourceCard } from '@/components/captures/CaptureSourceCard';
import { LeadDetailSkeleton } from '@/components/leads/detail/LeadDetailSkeleton';
import { LeadDetailView } from '@/components/leads/detail/LeadDetailView';
import { useLeadDetail } from '@/components/leads/detail/useLeadDetail';
import { isEnrichmentPending, type CaptureDetail } from '@/lib/captures';
import { IconArrowLeft, IconSparkles } from '@tabler/icons-react';

const POLL_INTERVAL_MS = 5000;

export default function CaptureDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const captureId = params.id;

  const [capture, setCapture] = useState<CaptureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [addingCrm, setAddingCrm] = useState(false);
  const leadPage = useLeadDetail(capture?.leadId ?? null);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const res = await api.get(`/api/captures/${captureId}`);
        setCapture(res.data?.data as CaptureDetail);
      } catch {
        if (!opts.silent) toast.error('Capture not found.');
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [captureId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const pending = capture ? isEnrichmentPending(capture) : false;
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void load({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pending, load]);

  async function enrich() {
    setEnriching(true);
    try {
      const res = await api.post(`/api/captures/${captureId}/enrich`);
      toast.success(
        res.data?.data?.skippedEnrichment
          ? 'Already in CRM and enriched.'
          : 'Enrichment started.',
      );
      await load({ silent: true });
      await leadPage.reload();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? 'Could not start enrichment.');
    } finally {
      setEnriching(false);
    }
  }

  async function addToCrm() {
    setAddingCrm(true);
    try {
      const res = await api.post(`/api/captures/${captureId}/add-to-crm`, { enrich: false });
      toast.success(res.data?.message ?? 'Added to CRM.');
      await load({ silent: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ?? 'Could not add to CRM.');
    } finally {
      setAddingCrm(false);
    }
  }

  if (loading) return <LeadDetailSkeleton />;

  if (!capture) {
    return (
      <div className="mx-auto max-w-[1120px] rounded-xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">This capture no longer exists.</p>
        <button type="button" onClick={() => router.push('/dashboard/captures')} className="mt-4 text-sm font-semibold text-violet-700">
          Back to captures
        </button>
      </div>
    );
  }

  const authorMissing = capture.error === 'author_unresolved' || capture.deadLead;

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/captures" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-violet-700">
          <IconArrowLeft size={15} />
          Captures
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void addToCrm()}
            disabled={addingCrm || authorMissing}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            {addingCrm ? 'Adding…' : capture.leadId ? 'Update in CRM' : 'Add to CRM'}
          </button>
          <button
            type="button"
            onClick={() => void enrich()}
            disabled={enriching || capture.status === 'enriching' || authorMissing}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <IconSparkles size={15} />
            {capture.status === 'enriching' ? 'Enriching…' : 'Enrich'}
          </button>
        </div>
      </div>

      <CaptureSourceCard capture={capture} />

      {capture.deadLead || authorMissing ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">Dead lead.</p>
      ) : null}

      {capture.leadId && leadPage.loading ? <LeadDetailSkeleton /> : null}
      {capture.leadId && leadPage.lead ? (
        <LeadDetailView page={{ ...leadPage, lead: leadPage.lead }} initialTab="overview" />
      ) : null}
      {!capture.leadId && !authorMissing ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Add this profile to CRM to open the lead view, including the outreach sequence.
        </p>
      ) : null}
    </div>
  );
}
