'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconPlus } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { btnPrimary, cardClass } from '@/components/ui/styles';
import {
  statusDotClass,
  statusLabel,
  type CampaignSummary,
} from '@/lib/campaigns';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/campaigns');
        setCampaigns(res.data.data ?? []);
      } catch {
        toast.error('Failed to load campaigns.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Outreach"
        title="Campaigns"
        description="Send personalized LinkedIn messages to prospect lists. Connect when needed, message after they accept."
        actions={
          <Link href="/dashboard/campaigns/new" className={btnPrimary}>
            <IconPlus size={16} /> Create campaign
          </Link>
        }
      />

      {loading ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      ) : campaigns.length === 0 ? (
        <div className={`${cardClass} text-center text-sm text-slate-500`}>
          No campaigns yet.{' '}
          <Link href="/dashboard/campaigns/new" className="font-semibold text-brand-main hover:underline">
            Create your first campaign
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/campaigns/${c.id}`}
              className={`${cardClass} flex items-center justify-between gap-4 transition hover:border-brand-main/40`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusDotClass(c.status)}`} />
                  <h3 className="truncate text-sm font-semibold text-slate-900">{c.name}</h3>
                  <span className="text-xs capitalize text-slate-500">{statusLabel(c.status)}</span>
                </div>
                <p className="truncate text-xs text-slate-500">
                  {c.leadsCount} lead{c.leadsCount === 1 ? '' : 's'} · {c.sentCount} sent · {c.waitingCount} waiting
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-brand-main">Open →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
