'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconCopy, IconPlus, IconTrash } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { btnOutline, btnPrimary, cardClass } from '@/components/ui/styles';
import {
  canDeleteCampaign,
  statusDotClass,
  statusLabel,
  type CampaignSummary,
} from '@/lib/campaigns';

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadCampaigns() {
    const res = await api.get('/api/campaigns');
    setCampaigns(res.data.data ?? []);
  }

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await loadCampaigns();
      } catch {
        toast.error('Failed to load campaigns.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function copyCampaign(id: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusyId(id);
    try {
      const res = await api.post(`/api/campaigns/${id}/duplicate`, { includeLeads: true });
      const copyId = res.data.data.id as string;
      toast.success('Campaign copied as draft.');
      router.push(`/dashboard/campaigns/${copyId}`);
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not copy campaign.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeCampaign(id: string, name: string, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      await api.delete(`/api/campaigns/${id}`);
      toast.success('Campaign deleted.');
      await loadCampaigns();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not delete campaign.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Outreach"
        title="Campaigns"
        description="Invite then message from lists, or message 1st connections from People Search or synced lists."
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
            <div
              key={c.id}
              className={`${cardClass} flex items-center justify-between gap-4 transition hover:border-brand-main/40`}
            >
              <Link href={`/dashboard/campaigns/${c.id}`} className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusDotClass(c.status)}`} />
                  <h3 className="truncate text-sm font-semibold text-slate-900">{c.name}</h3>
                  <span className="text-xs capitalize text-slate-500">{statusLabel(c.status)}</span>
                </div>
                <p className="truncate text-xs text-slate-500">
                  {c.settings.mode === 'message_1st' ? 'Message 1st · ' : ''}
                  {c.leadsCount} lead{c.leadsCount === 1 ? '' : 's'} · {c.sentCount} sent
                  {c.settings.mode === 'message_1st' ? '' : ` · ${c.waitingCount} waiting`}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className={btnOutline}
                  disabled={busyId === c.id}
                  title="Copy as draft"
                  onClick={(e) => void copyCampaign(c.id, e)}
                >
                  <IconCopy size={14} />
                  <span className="hidden sm:inline">Copy</span>
                </button>
                {canDeleteCampaign(c.status) ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    disabled={busyId === c.id}
                    title="Delete campaign"
                    onClick={(e) => void removeCampaign(c.id, c.name, e)}
                  >
                    <IconTrash size={14} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                ) : null}
                <Link
                  href={`/dashboard/campaigns/${c.id}`}
                  className="text-xs font-medium text-brand-main hover:underline"
                >
                  Open →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
