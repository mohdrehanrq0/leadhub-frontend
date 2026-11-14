'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconCopy,
  IconMessage,
  IconPlayerPlay,
  IconPlayerStop,
  IconTrash,
  IconUserPlus,
  IconX,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { AddCampaignLeadsModal } from '@/components/campaigns/AddCampaignLeadsModal';
import { MessageTemplateEditor } from '@/components/campaigns/MessageTemplateEditor';
import { btnOutline, btnPrimary, cardClass, inputClass } from '@/components/ui/styles';
import {
  activitySummary,
  canAddCampaignLeads,
  canDeleteCampaign,
  canRemoveCampaignLeads,
  canStartCampaign,
  leadNextStep,
  statusDotClass,
  statusLabel,
  type CampaignActivity,
  type CampaignAnalytics,
  type CampaignDetail,
  type CampaignLeadRow,
} from '@/lib/campaigns';
import { toTemplateLead } from '@/lib/message-template';
import { flushLinkedInOutbox } from '@/lib/flush-linkedin-outbox';

type Tab = 'analytics' | 'leads' | 'activity' | 'settings';

const LEAD_FILTERS = ['all', 'completed', 'in_progress', 'waiting', 'queued', 'failed', 'skipped', 'dropped'] as const;

function activityAccent(summary: string) {
  const s = summary.toLowerCase();
  if (s.includes('failed') || s.includes('not sent') || s.includes('dropped')) {
    return { Icon: IconX, tone: 'bg-rose-50 text-rose-600 border-rose-100' };
  }
  if (s.includes('message sent')) {
    return { Icon: IconMessage, tone: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
  }
  if (s.includes('connection request sent') || s.includes('queued connection')) {
    return { Icon: IconUserPlus, tone: 'bg-blue-50 text-blue-600 border-blue-100' };
  }
  if (s.includes('waiting') || s.includes('checked') || s.includes('already sent')) {
    return { Icon: IconClock, tone: 'bg-amber-50 text-amber-700 border-amber-100' };
  }
  return { Icon: IconCheck, tone: 'bg-slate-50 text-slate-600 border-slate-200' };
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = String(params.id);
  const [tab, setTab] = useState<Tab>('analytics');
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [leads, setLeads] = useState<CampaignLeadRow[]>([]);
  const [templateLeads, setTemplateLeads] = useState<CampaignLeadRow[]>([]);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({ all: 0 });
  const [leadFilter, setLeadFilter] = useState<string>('all');
  const [leadQuery, setLeadQuery] = useState('');
  const [activity, setActivity] = useState<CampaignActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [template, setTemplate] = useState('');
  const [dropDays, setDropDays] = useState(6);
  const [name, setName] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [addLeadsOpen, setAddLeadsOpen] = useState(false);

  const isRunning = campaign?.status === 'active';
  const canEditLeads = campaign ? canRemoveCampaignLeads(campaign.status) : false;
  const canAddLeads = campaign ? canAddCampaignLeads(campaign.status) : false;

  const loadCampaign = useCallback(async () => {
    const res = await api.get(`/api/campaigns/${campaignId}`);
    const data = res.data.data as CampaignDetail;
    setCampaign(data);
    setTemplate(data.settings.messageTemplate);
    setDropDays(data.settings.dropTrackingDays);
    setName(data.name);
  }, [campaignId]);

  const loadAnalytics = useCallback(async () => {
    const res = await api.get(`/api/campaigns/${campaignId}/analytics`);
    setAnalytics(res.data.data);
  }, [campaignId]);

  const loadLeads = useCallback(async () => {
    const res = await api.get(`/api/campaigns/${campaignId}/leads`, {
      params: { status: leadFilter, q: leadQuery || undefined, limit: 100 },
    });
    setLeads(res.data.data?.leads ?? []);
    setLeadCounts(res.data.data?.counts ?? { all: 0 });
  }, [campaignId, leadFilter, leadQuery]);

  const loadTemplateLeads = useCallback(async () => {
    const res = await api.get(`/api/campaigns/${campaignId}/leads`, {
      params: { status: 'all', limit: 100 },
    });
    setTemplateLeads(res.data.data?.leads ?? []);
    setLeadCounts((prev) => ({ ...prev, ...(res.data.data?.counts ?? {}) }));
  }, [campaignId]);

  const loadActivity = useCallback(async () => {
    const res = await api.get(`/api/campaigns/${campaignId}/activity`);
    setActivity(res.data.data ?? []);
  }, [campaignId]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await loadCampaign();
        await Promise.all([loadAnalytics(), loadLeads(), loadActivity(), loadTemplateLeads()]);
      } catch {
        toast.error('Failed to load campaign.');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCampaign, loadAnalytics, loadLeads, loadActivity, loadTemplateLeads]);

  useEffect(() => {
    if (tab === 'leads') void loadLeads().catch(() => undefined);
  }, [tab, leadFilter, leadQuery, loadLeads]);

  useEffect(() => {
    if (!canEditLeads) setSelectedLeadIds([]);
  }, [canEditLeads]);

  useEffect(() => {
    if (tab === 'settings') void loadTemplateLeads().catch(() => undefined);
  }, [tab, loadTemplateLeads]);

  const editorLeads = useMemo(
    () => templateLeads.map((lead) => toTemplateLead(lead)),
    [templateLeads],
  );

  async function startCampaign() {
    setBusy(true);
    try {
      await api.post(`/api/campaigns/${campaignId}/start`);
      flushLinkedInOutbox(2500, campaignId);
      window.setTimeout(() => flushLinkedInOutbox(2500, campaignId), 2_000);
      window.setTimeout(() => flushLinkedInOutbox(2500, campaignId), 8_000);
      toast.success('Campaign started. The extension will process leads under today’s LinkedIn caps.');
      await loadCampaign();
      await loadAnalytics();
      await loadLeads();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not start.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function nudgeExtension() {
    const ok = await flushLinkedInOutbox(2500, campaignId);
    if (!ok) {
      toast.error(
        'LeadHub extension did not respond. Reload the unpacked extension from leadhub-extension/dist, stay on localhost:3000, and keep a LinkedIn tab open.',
      );
      return;
    }
    toast.success(
      campaign?.settings.mode === 'message_1st' && campaign.settings.source === 'people_search'
        ? 'Extension woke up — it should open your People Search and message 1st connections.'
        : 'Extension woke up — it should open the next LinkedIn profile shortly.',
    );
    window.setTimeout(() => {
      void loadLeads();
      void loadAnalytics();
      void loadActivity();
    }, 5_000);
    window.setTimeout(() => {
      void loadLeads();
      void loadActivity();
    }, 20_000);
  }

  async function stopCampaign() {
    setBusy(true);
    try {
      await api.post(`/api/campaigns/${campaignId}/stop`);
      toast.success('Campaign stopped.');
      await loadCampaign();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not stop.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function retryAllFailed() {
    setBusy(true);
    try {
      const res = await api.post(`/api/campaigns/${campaignId}/retry-failed`);
      const retried = Number(res.data.data?.retried ?? 0);
      if (retried === 0) {
        toast.message('No failed leads to retry.');
      } else {
        toast.success(`Re-queued ${retried} failed lead${retried === 1 ? '' : 's'}.`);
        flushLinkedInOutbox(2500, campaignId, 'retry');
        window.setTimeout(() => flushLinkedInOutbox(2500, campaignId, 'retry'), 2_000);
      }
      await loadCampaign();
      await loadAnalytics();
      await loadLeads();
      await loadActivity();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not retry failed leads.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeSelectedLeads() {
    if (!canEditLeads || selectedLeadIds.length === 0) return;
    const count = selectedLeadIds.length;
    if (
      !window.confirm(
        `Remove ${count} lead${count === 1 ? '' : 's'} from this campaign? They will also leave the send queue.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await api.delete(`/api/campaigns/${campaignId}/leads`, {
        data: { leadIds: selectedLeadIds },
      });
      const removed = Number(res.data.data?.removed ?? 0);
      setSelectedLeadIds([]);
      if (removed === 0) {
        toast.message('No leads were removed.');
      } else {
        toast.success(`Removed ${removed} lead${removed === 1 ? '' : 's'} from the campaign.`);
      }
      await loadCampaign();
      await loadAnalytics();
      await loadLeads();
      await loadActivity();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not remove leads.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeOneLead(leadId: string, leadName: string) {
    if (!canEditLeads) return;
    if (
      !window.confirm(
        `Remove ${leadName} from this campaign? They will also leave the send queue.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await api.delete(`/api/campaigns/${campaignId}/leads`, {
        data: { leadIds: [leadId] },
      });
      const removed = Number(res.data.data?.removed ?? 0);
      setSelectedLeadIds((prev) => prev.filter((id) => id !== leadId));
      if (removed === 0) {
        toast.message('Lead was not removed.');
      } else {
        toast.success(`Removed ${leadName} from the campaign.`);
      }
      await loadCampaign();
      await loadAnalytics();
      await loadLeads();
      await loadActivity();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not remove lead.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function recheckAllConnections() {
    setBusy(true);
    try {
      const res = await api.post(`/api/campaigns/${campaignId}/recheck-connections`);
      const rechecked = Number(res.data.data?.rechecked ?? 0);
      if (rechecked === 0) {
        toast.message('No waiting connection requests to recheck.');
      } else {
        toast.success(
          `Queued ${rechecked} connection status check${rechecked === 1 ? '' : 's'}. Keep LinkedIn open.`,
        );
        flushLinkedInOutbox(2500, campaignId, 'recheck');
        window.setTimeout(() => flushLinkedInOutbox(2500, campaignId, 'recheck'), 2_000);
      }
      await loadCampaign();
      await loadAnalytics();
      await loadLeads();
      await loadActivity();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not recheck connections.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveRename() {
    if (!name.trim() || name.trim() === campaign?.name) return;
    setBusy(true);
    try {
      await api.patch(`/api/campaigns/${campaignId}`, { name: name.trim() });
      toast.success('Campaign renamed.');
      await loadCampaign();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not rename.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    setBusy(true);
    try {
      if (isRunning || campaign?.status === 'completed') {
        await api.patch(`/api/campaigns/${campaignId}`, { name: name.trim() });
        toast.success(
          isRunning
            ? 'Name saved. Stop the campaign to edit the message template.'
            : 'Name saved.',
        );
      } else {
        await api.patch(`/api/campaigns/${campaignId}`, {
          name: name.trim(),
          messageTemplate: template,
          dropTrackingDays: dropDays,
        });
        toast.success('Settings saved.');
      }
      await loadCampaign();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not save.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function copyCampaign() {
    setBusy(true);
    try {
      const res = await api.post(`/api/campaigns/${campaignId}/duplicate`, { includeLeads: true });
      const copyId = res.data.data.id as string;
      toast.success('Campaign copied as draft.');
      router.push(`/dashboard/campaigns/${copyId}`);
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not copy campaign.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeCampaign() {
    if (!campaign || !canDeleteCampaign(campaign.status)) return;
    if (!window.confirm(`Delete “${campaign.name}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.delete(`/api/campaigns/${campaignId}`);
      toast.success('Campaign deleted.');
      router.push('/dashboard/campaigns');
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not delete campaign.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading || !campaign) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse space-y-4 py-8">
        <div className="h-10 rounded bg-slate-100" />
        <div className="h-40 rounded bg-slate-100" />
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'leads', label: `Leads ${leadCounts.all ?? 0}` },
    { id: 'activity', label: 'Activity' },
    { id: 'settings', label: 'Settings' },
  ];

  const waiting = analytics?.waiting ?? 0;
  const dropped = analytics?.dropped ?? 0;
  const completed = analytics?.completed ?? 0;
  const total = analytics?.total ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/dashboard/campaigns"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <IconArrowLeft size={14} /> Campaigns
          </Link>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(campaign.status)}`} />
            <h1 className="text-2xl font-semibold text-slate-900">{campaign.name}</h1>
            <span className="text-sm capitalize text-slate-500">{statusLabel(campaign.status)}</span>
          </div>
          <p className="text-sm text-slate-500">
            {campaign.settings.mode === 'message_1st' ? (
              <>
                Message 1st connections
                {campaign.settings.source === 'people_search' ? ' · People Search' : ' · Synced connections'}
                {' · '}
                {campaign.leadsCount} lead{campaign.leadsCount === 1 ? '' : 's'} · up to 100 msgs/day
              </>
            ) : (
              <>
                {campaign.leadsCount} lead{campaign.leadsCount === 1 ? '' : 's'} · drop after{' '}
                {campaign.settings.dropTrackingDays} days
              </>
            )}
          </p>
          {campaign.settings.mode === 'message_1st' && campaign.settings.source === 'people_search' ? (
            <p className="max-w-2xl text-xs text-slate-400">
              {[
                campaign.settings.searchQuery?.title && `Title: ${campaign.settings.searchQuery.title}`,
                campaign.settings.searchQuery?.location && `Location: ${campaign.settings.searchQuery.location}`,
                campaign.settings.searchQuery?.company && `Company: ${campaign.settings.searchQuery.company}`,
                campaign.settings.searchQuery?.keywords && `Keywords: ${campaign.settings.searchQuery.keywords}`,
              ]
                .filter(Boolean)
                .join(' · ') || 'People Search filters'}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnOutline} disabled={busy} onClick={() => void copyCampaign()}>
            <IconCopy size={16} /> Copy
          </button>
          {canDeleteCampaign(campaign.status) ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              disabled={busy}
              onClick={() => void removeCampaign()}
            >
              <IconTrash size={16} /> Delete
            </button>
          ) : null}
          {campaign.status === 'active' ? (
            <>
              <button type="button" className={btnOutline} disabled={busy} onClick={() => void nudgeExtension()}>
                {campaign.settings.mode === 'message_1st' && campaign.settings.source === 'people_search'
                  ? 'Process search messages'
                  : 'Process next lead'}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                disabled={busy}
                onClick={() => void stopCampaign()}
              >
                <IconPlayerStop size={16} /> Stop campaign
              </button>
            </>
          ) : canStartCampaign(campaign.status) ? (
            <button
              type="button"
              className={btnPrimary}
              disabled={busy}
              onClick={() => void startCampaign()}
            >
              <IconPlayerPlay size={16} /> {campaign.status === 'paused' ? 'Resume' : 'Start'} campaign
            </button>
          ) : campaign.status === 'completed' ? (
            <span className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
              Completed
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id ? 'border-brand-main text-brand-main' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'analytics' && analytics && (
        <div className="space-y-4">
          <div className={`${cardClass} space-y-3`}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Overall progress</div>
                <div className="mt-1 text-3xl font-semibold text-slate-900">{analytics.progress}%</div>
              </div>
              <div className="text-right text-sm text-slate-500">
                {completed} of {total} leads completed
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-main transition-all"
                style={{ width: `${Math.max(0, Math.min(100, analytics.progress))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {(campaign.settings.mode === 'message_1st'
              ? [
                  { label: 'Enrolled', value: String(total), hint: 'Harvested or listed' },
                  { label: 'Sent', value: String(campaign.sentCount), hint: 'Messages delivered' },
                  { label: 'Completed', value: String(completed), hint: 'Finished' },
                  { label: 'Failed', value: String(analytics.failed), hint: 'Needs attention' },
                  { label: 'Queued', value: String(Math.max(0, total - completed - (analytics.failed ?? 0))), hint: 'Waiting to send' },
                  { label: 'Actions', value: String(analytics.actions), hint: 'Extension events' },
                ]
              : [
                  { label: 'Accepted', value: String(analytics.accepted), hint: 'Connected on LinkedIn' },
                  { label: 'Waiting', value: String(waiting), hint: 'Invite pending' },
                  { label: 'Actions', value: String(analytics.actions), hint: 'Sends + checks' },
                  { label: 'Completed', value: String(completed), hint: 'Finished sequence' },
                  { label: 'Failed', value: String(analytics.failed), hint: 'Needs attention' },
                  { label: 'Dropped', value: String(dropped), hint: 'Tracking window ended' },
                ]
            ).map((card) => (
              <div key={card.label} className={cardClass}>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</div>
                <div className="mt-1 text-[11px] text-slate-400">{card.hint}</div>
              </div>
            ))}
          </div>

          <div className={cardClass}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-800">Daily actions</h3>
              <p className="text-xs text-slate-500">Extension sends and status checks by day</p>
            </div>
            {analytics.history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No actions yet. Start the campaign and keep the LeadHub execution tab open.
              </div>
            ) : (
              <div className="flex h-48 items-end gap-2">
                {analytics.history.map((point) => {
                  const max = Math.max(...analytics.history.map((h) => h.actions), 1);
                  const height = Math.max(10, Math.round((point.actions / max) * 140));
                  return (
                    <div key={point.date} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
                      <div className="text-[10px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">
                        {point.actions}
                      </div>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-brand-main to-brand-main/70"
                        style={{ height }}
                        title={`${point.date}: ${point.actions} actions`}
                      />
                      <span className="truncate text-[10px] text-slate-400">{point.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'leads' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {campaign.settings.mode === 'message_1st'
                ? 'Open profile → send message · Hover a next step for details'
                : 'Invite → check next day → send message if connected · Hover a next step for details'}
            </p>
            <div className="flex flex-wrap gap-2">
              {canAddLeads ? (
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={busy}
                  onClick={() => setAddLeadsOpen(true)}
                  title="Add prospects from lists or pick people individually"
                >
                  <IconUserPlus size={15} />
                  Add leads
                </button>
              ) : null}
              {canEditLeads && selectedLeadIds.length > 0 ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void removeSelectedLeads()}
                  title="Remove selected leads from this campaign and the send queue"
                >
                  <IconTrash size={15} />
                  Remove selected
                  <span className="ml-1 tabular-nums">{selectedLeadIds.length}</span>
                </button>
              ) : null}
              {(leadCounts.failed ?? 0) > 0 && campaign.status !== 'archived' ? (
                <button
                  type="button"
                  className={btnOutline}
                  disabled={busy}
                  onClick={() => void retryAllFailed()}
                  title="Re-queue every failed lead so the extension tries again"
                >
                  Retry all failed
                  <span className="ml-1 tabular-nums text-rose-600">{leadCounts.failed}</span>
                </button>
              ) : null}
              {(leadCounts.waiting ?? 0) > 0 &&
              campaign.status !== 'archived' &&
              campaign.settings.mode !== 'message_1st' ? (
                <button
                  type="button"
                  className={btnOutline}
                  disabled={busy}
                  onClick={() => void recheckAllConnections()}
                  title="Check LinkedIn now for pending invites instead of waiting until tomorrow"
                >
                  Recheck connections
                  <span className="ml-1 tabular-nums text-amber-700">{leadCounts.waiting}</span>
                </button>
              ) : null}
            </div>
          </div>
          {canAddLeads || canEditLeads ? (
            <p className="text-[11px] text-slate-400">
              Campaign is {statusLabel(campaign.status).toLowerCase()} — add leads from lists or pick
              prospects
              {canEditLeads ? ', or select rows to remove them from the campaign and send queue' : ''}.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5">
            {LEAD_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setLeadFilter(f)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium tracking-wide ${
                  leadFilter === f
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {statusLabel(f)}
                <span className="ml-1 tabular-nums opacity-70">{leadCounts[f] ?? 0}</span>
              </button>
            ))}
            <input
              className={`${inputClass} ml-auto h-8 max-w-[200px] text-xs`}
              placeholder="Search"
              value={leadQuery}
              onChange={(e) => setLeadQuery(e.target.value)}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  {canEditLeads ? (
                    <th className="w-10 px-3 py-2.5">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300"
                        checked={leads.length > 0 && leads.every((l) => selectedLeadIds.includes(l.leadId))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeadIds((prev) => [
                              ...new Set([...prev, ...leads.map((l) => l.leadId)]),
                            ]);
                          } else {
                            const visible = new Set(leads.map((l) => l.leadId));
                            setSelectedLeadIds((prev) => prev.filter((id) => !visible.has(id)));
                          }
                        }}
                        aria-label="Select all visible leads"
                      />
                    </th>
                  ) : null}
                  <th className={`${canEditLeads ? 'w-[32%]' : 'w-[36%]'} px-4 py-2.5`}>Lead</th>
                  <th className="w-[16%] px-4 py-2.5">Status</th>
                  <th className={`${canEditLeads ? 'w-[24%]' : 'w-[28%]'} px-4 py-2.5`}>Next</th>
                  <th className="w-[14%] px-4 py-2.5">Updated</th>
                  {canEditLeads ? <th className="w-[10%] px-3 py-2.5 text-right"> </th> : null}
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEditLeads ? 6 : 4}
                      className="px-4 py-10 text-center text-sm text-slate-400"
                    >
                      No leads in this filter.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const next = leadNextStep(lead);
                    const subtitle = [lead.title, lead.companyName].filter(Boolean).join(' · ');
                    const nextTone =
                      next.tone === 'message'
                        ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
                        : next.tone === 'wait'
                          ? 'bg-amber-50 text-amber-800 ring-amber-100'
                          : next.tone === 'danger'
                            ? 'bg-rose-50 text-rose-700 ring-rose-100'
                            : 'bg-slate-50 text-slate-700 ring-slate-100';
                    const checked = selectedLeadIds.includes(lead.leadId);
                    return (
                      <tr key={lead.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                        {canEditLeads ? (
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-slate-300"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedLeadIds((prev) =>
                                  e.target.checked
                                    ? [...new Set([...prev, lead.leadId])]
                                    : prev.filter((id) => id !== lead.leadId),
                                );
                              }}
                              aria-label={`Select ${lead.name}`}
                            />
                          </td>
                        ) : null}
                        <td className="px-4 py-2.5">
                          <div className="truncate font-medium text-slate-900" title={lead.name}>
                            {lead.name}
                          </div>
                          <div className="truncate text-xs text-slate-400" title={subtitle || undefined}>
                            {subtitle || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotClass(lead.status)}`} />
                            <span className="truncate text-sm text-slate-800">{statusLabel(lead.status)}</span>
                          </div>
                          {lead.lastError ? (
                            <div className="mt-0.5 truncate text-[11px] text-rose-600" title={lead.lastError}>
                              {lead.lastError}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex min-w-0 items-center gap-2" title={next.hint}>
                            <span
                              className={`inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${nextTone}`}
                            >
                              {next.label}
                            </span>
                            {next.meta ? (
                              <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{next.meta}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs tabular-nums text-slate-400">
                          {lead.sentAt || lead.lastEventAt
                            ? new Date(lead.sentAt || lead.lastEventAt!).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </td>
                        {canEditLeads ? (
                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                              disabled={busy}
                              title={`Remove ${lead.name}`}
                              onClick={() => void removeOneLead(lead.leadId, lead.name)}
                            >
                              <IconTrash size={14} />
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="space-y-3">
          {activity.length === 0 ? (
            <div className={`${cardClass} text-sm text-slate-500`}>
              No activity yet. When the extension sends invites or checks connections, the timeline will show here.
            </div>
          ) : (
            <div className={`${cardClass} !p-0`}>
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">Campaign log</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Connection checks, invites, waits, and messages from the LeadHub execution tab.
                </p>
              </div>
              <ol className="divide-y divide-slate-100">
                {activity.map((item) => {
                  const summary = activitySummary(item);
                  const { Icon, tone } = activityAccent(summary);
                  return (
                    <li key={item.id} className="flex items-start gap-3 px-5 py-4">
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${tone}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div className="text-sm font-semibold text-slate-900">{item.prospectName}</div>
                          <time className="shrink-0 text-xs text-slate-400">
                            {new Date(item.occurredAt).toLocaleString()}
                          </time>
                        </div>
                        <div className="mt-0.5 text-sm text-slate-700">{summary}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-4">
          {isRunning ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Running campaigns can be renamed anytime. Stop the campaign before changing the message
              template or other settings.
            </div>
          ) : null}

          <div className={`${cardClass} space-y-5`}>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Campaign details</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {campaign.settings.mode === 'message_1st'
                  ? 'Message-only 1st connections (no invite tracking).'
                  : 'Name and invite tracking window.'}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Campaign name</label>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={name}
                    disabled={campaign.status === 'archived'}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => {
                      if (
                        (isRunning || campaign.status === 'paused') &&
                        name.trim() &&
                        name.trim() !== campaign.name
                      ) {
                        void saveRename();
                      }
                    }}
                  />
                </div>
              </div>
              {campaign.settings.mode === 'message_1st' ? (
                <div className="space-y-1 md:col-span-1">
                  <label className="text-xs font-semibold text-slate-600">Mode</label>
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    Message 1st ·{' '}
                    {campaign.settings.source === 'people_search' ? 'People Search' : 'Synced connections'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Drop tracking after (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    className={inputClass}
                    value={dropDays}
                    disabled={isRunning || campaign.status === 'completed'}
                    onChange={(e) => setDropDays(Number(e.target.value) || 6)}
                  />
                </div>
              )}
            </div>
            {campaign.settings.mode === 'message_1st' && campaign.settings.source === 'people_search' ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">People Search filters</label>
                <ul className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <li>Network: 1st connections</li>
                  {campaign.settings.searchQuery?.title ? (
                    <li>Title: {campaign.settings.searchQuery.title}</li>
                  ) : null}
                  {campaign.settings.searchQuery?.location ? (
                    <li>Location: {campaign.settings.searchQuery.location}</li>
                  ) : null}
                  {campaign.settings.searchQuery?.company ? (
                    <li>Company: {campaign.settings.searchQuery.company}</li>
                  ) : null}
                  {campaign.settings.searchQuery?.keywords ? (
                    <li>Keywords: {campaign.settings.searchQuery.keywords}</li>
                  ) : null}
                </ul>
                {campaign.settings.searchUrl ? (
                  <p className="break-all text-[11px] text-slate-400" title={campaign.settings.searchUrl}>
                    Auto URL: {campaign.settings.searchUrl}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={`${cardClass} space-y-4`}>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Message template</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Variables and preview use your enrolled campaign leads only — no sample placeholder text.
              </p>
            </div>
            <MessageTemplateEditor
              value={template}
              onChange={setTemplate}
              disabled={isRunning || campaign.status === 'completed'}
              leads={editorLeads}
              onNeedLeads={() => setTab('leads')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={btnPrimary}
              disabled={
                busy ||
                !name.trim() ||
                campaign.status === 'archived' ||
                (isRunning && name.trim() === campaign.name)
              }
              onClick={() => void saveSettings()}
            >
              {isRunning ? 'Save name' : campaign.status === 'completed' ? 'Save name' : 'Save settings'}
            </button>
            {isRunning ? (
              <p className="text-xs text-amber-700">Only the name can be saved while running.</p>
            ) : null}
          </div>
        </div>
      )}

      {addLeadsOpen && canAddLeads ? (
        <AddCampaignLeadsModal
          campaignId={campaignId}
          onClose={() => setAddLeadsOpen(false)}
          onAdded={async () => {
            await Promise.all([loadCampaign(), loadAnalytics(), loadLeads(), loadTemplateLeads(), loadActivity()]);
          }}
        />
      ) : null}
    </div>
  );
}
