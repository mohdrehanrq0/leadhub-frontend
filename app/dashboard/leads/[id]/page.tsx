'use client';

import Link from 'next/link';
import { LeadDetailSkeleton } from '../../../../components/leads/detail/LeadDetailSkeleton';
import { LeadDetailView } from '../../../../components/leads/detail/LeadDetailView';
import { useLeadDetail } from '../../../../components/leads/detail/useLeadDetail';

export default function LeadDetailPage() {
  const page = useLeadDetail();

  if (page.loading) return <LeadDetailSkeleton />;

  if (!page.lead) {
    return (
      <div className="mx-auto max-w-[1120px] rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="text-sm font-semibold text-rose-700">Lead not found.</p>
        <Link href="/dashboard/leads" className="mt-3 inline-block text-sm font-medium text-violet-700 hover:underline">
          All leads
        </Link>
      </div>
    );
  }

  return <LeadDetailView page={{ ...page, lead: page.lead }} />;
}
