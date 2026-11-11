'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { IconArrowLeft, IconPlayerPlay, IconPlayerStop } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { MessageTemplateEditor } from '@/components/campaigns/MessageTemplateEditor';
import { btnOutline, btnPrimary, cardClass, inputClass } from '@/components/ui/styles';
import {
  activitySummary,
  relationshipLabel,
  statusDotClass,
  statusLabel,
  type CampaignActivity,
  type CampaignAnalytics,
  type CampaignDetail,
  type CampaignLeadRow,
} from '@/lib/campaigns';
import { flushLinkedInOutbox } from '@/lib/flush-linkedin-outbox';

type Tab = 'analytics' | 'leads' | 'activity' | 'settings';

const LEAD_FILTERS = ['all', 'completed', 'in_progress', 'waiting', 'queued', 'failed', 'skipped', 'dropped'] as const;

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = String(params.id);
  const [tab, setTab] = useState<Tab>('analytics');
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [leads, setLeads] = useState<CampaignLeadRow[]>([]);
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({ all: 0 });
  const [leadFilter, setLeadFilter] = useState<string>('all');
  const [leadQuery, setLeadQuery] = useState('');
  const [activity, setActivity] = useState<CampaignActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [template, setTemplate] = useState('');
  const [dropDays, setDropDays] = useState(6);
  const [name, setName] = useState('');

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
      params: { status: leadFilter, q: leadQuery || undefined },
    });
    setLeads(res.data.data?.leads ?? []);
    setLeadCounts(res.data.data?.counts ?? { all: 0 });
  }, [campaignId, leadFilter, leadQuery]);

  const loadActivity = useCallback(async () => {
    const res = await api.get(`/api/campaigns/${campaignId}/activity`);
    setActivity(res.data.data ?? []);
  }, [campaignId]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await loadCampaign();
        await Promise.all([loadAnalytics(), loadLeads(), loadActivity()]);
      } catch {
        toast.error('Failed to load campaign.');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCampaign, loadAnalytics, loadLeads, loadActivity]);

  useEffect(() => {
    if (tab === 'leads') void loadLeads().catch(() => undefined);
  }, [tab, leadFilter, leadQuery, loadLeads]);

  async function startCampaign() {
    setBusy(true);
    try {
      await api.post(`/api/campaigns/${campaignId}/start`);
      // Wake the extension outbox immediately (alarm alone can take up to ~1 min).
      flushLinkedInOutbox();
      window.setTimeout(() => flushLinkedInOutbox(), 2_000);
      window.setTimeout(() => flushLinkedInOutbox(), 8_000);
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
    const ok = await flushLinkedInOutbox();
    if (!ok) {
      toast.error(
        'LeadHub extension did not respond. Reload the unpacked extension from leadhub-extension/dist, stay on localhost:3000, and keep a LinkedIn tab open.',
      );
      return;
    }
    toast.success('Extension woke up — it should open the next LinkedIn profile shortly.');
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

  async function saveSettings() {
    setBusy(true);
    try {
      await api.patch(`/api/campaigns/${campaignId}`, {
        name: name.trim(),
        messageTemplate: template,
        dropTrackingDays: dropDays,
      });
      toast.success('Settings saved.');
      await loadCampaign();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not save.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading || !campaign) {
    return <div className="mx-auto max-w-5xl animate-pulse space-y-4 py-8"><div className="h-10 rounded bg-slate-100" /><div className="h-40 rounded bg-slate-100" /></div>;
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'analytics', label: 'Analytics' },
    { id: 'leads', label: `Leads ${leadCounts.all ?? 0}` },
    { id: 'activity', label: 'Activity' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href="/dashboard/campaigns" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
            <IconArrowLeft size={14} /> Campaigns
          </Link>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusDotClass(campaign.status)}`} />
            <h1 className="text-2xl font-semibold text-slate-900">{campaign.name}</h1>
            <span className="text-sm capitalize text-slate-500">{statusLabel(campaign.status)}</span>
          </div>
          <p className="text-sm text-slate-500">
            {campaign.leadsCount} lead{campaign.leadsCount === 1 ? '' : 's'} · drop after {campaign.settings.dropTrackingDays} days
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.status === 'active' ? (
            <>
              <button type="button" className={btnOutline} disabled={busy} onClick={() => void nudgeExtension()}>
                Process next lead
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50" disabled={busy} onClick={() => void stopCampaign()}>
                <IconPlayerStop size={16} /> Stop campaign
              </button>
            </>
          ) : (
            <button type="button" className={btnPrimary} disabled={busy || campaign.status === 'archived'} onClick={() => void startCampaign()}>
              <IconPlayerPlay size={16} /> {campaign.status === 'paused' ? 'Resume' : 'Start'} campaign
            </button>
          )}
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              { label: 'Progress', value: `${analytics.progress}%` },
              { label: 'Accepted', value: String(analytics.accepted) },
              { label: 'Replied', value: `${analytics.replied} · ${analytics.repliedPct}%` },
              { label: 'Actions', value: String(analytics.actions) },
              { label: 'Failed', value: String(analytics.failed) },
            ].map((card) => (
              <div key={card.label} className={cardClass}>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{card.value}</div>
              </div>
            ))}
          </div>
          <div className={cardClass}>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Campaign history</h3>
            {analytics.history.length === 0 ? (
              <p className="text-sm text-slate-500">No actions yet.</p>
            ) : (
              <div className="flex h-40 items-end gap-2">
                {analytics.history.map((point) => {
                  const max = Math.max(...analytics.history.map((h) => h.actions), 1);
                  const height = Math.max(8, Math.round((point.actions / max) * 120));
                  return (
                    <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
                      <div className="w-full rounded-t bg-brand-main/80" style={{ height }} title={`${point.actions} actions`} />
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
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {LEAD_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setLeadFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  leadFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {statusLabel(f)} ({leadCounts[f] ?? 0})
              </button>
            ))}
            <input
              className={`${inputClass} ml-auto h-9 max-w-xs`}
              placeholder="Search leads, companies, or titles"
              value={leadQuery}
              onChange={(e) => setLeadQuery(e.target.value)}
            />
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Lead</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Step</th>
                  <th className="px-4 py-3 font-semibold">Reply</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No leads in this filter.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{lead.name}</div>
                        <div className="text-xs text-slate-500">
                          {[lead.title, lead.companyName].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{lead.location || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${statusDotClass(lead.status)}`} />
                          <span>{statusLabel(lead.status)}</span>
                        </div>
                        {relationshipLabel(lead.relationshipStatus) ? (
                          <div className="text-xs text-slate-500">{relationshipLabel(lead.relationshipStatus)}</div>
                        ) : null}
                        {lead.sentAt ? (
                          <div className="text-xs text-slate-400">
                            Last action {new Date(lead.sentAt).toLocaleString()}
                          </div>
                        ) : null}
                        {lead.lastError ? <div className="text-xs text-rose-600">{lead.lastError}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{lead.flowStep || '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{lead.reply}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className={`${cardClass} space-y-3`}>
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="text-sm font-medium text-slate-900">{item.prospectName}</div>
                  <div className="text-sm text-slate-700">{activitySummary(item)}</div>
                </div>
                <time className="shrink-0 text-xs text-slate-400">
                  {new Date(item.occurredAt).toLocaleString()}
                </time>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-4">
          <div className={`${cardClass} space-y-4`}>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Campaign name</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Drop tracking after (days)</label>
              <input
                type="number"
                min={1}
                max={90}
                className={inputClass}
                value={dropDays}
                onChange={(e) => setDropDays(Number(e.target.value) || 6)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600">Message template</label>
              <MessageTemplateEditor
                value={template}
                onChange={setTemplate}
                disabled={campaign.status === 'active'}
              />
            </div>
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => void saveSettings()}>
              Save settings
            </button>
            {campaign.status === 'active' ? (
              <p className="text-xs text-amber-700">Stop the campaign to edit the message template.</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
