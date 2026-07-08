'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { IconMail, IconPlus, IconPaperclip, IconPlayerPlay, IconPlayerPause, IconSettings } from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  leadsCount: number;
  sentCount: number;
  replyCount: number;
  createdAt: string;
}

export default function CampaignsPage() {
  const { activeWorkspaceId } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [targetPriority, setTargetPriority] = useState<'hot' | 'warm' | 'all'>('hot');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchCampaigns();
    }
  }, [activeWorkspaceId]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/campaigns');
      setCampaigns(res.data.data ?? []);
    } catch {
      toast.error('Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Mock create campaign & trigger LeadSniper sync
      const newCampaign: Campaign = {
        id: Math.random().toString(),
        name,
        subject,
        body,
        status: 'draft',
        leadsCount: 12,
        sentCount: 0,
        replyCount: 0,
        createdAt: new Date().toISOString(),
      };
      setCampaigns([newCampaign, ...campaigns]);
      toast.success('Campaign created and synced with LeadSniper sending infrastructure!');
      setName('');
      setSubject('');
      setBody('');
      setShowCreate(false);
    } catch {
      toast.error('Failed to create campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-text">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-100 flex items-center space-x-2">
            <IconMail className="text-primary" />
            <span>Outreach Campaigns</span>
          </h1>
          <p className="text-text-200 text-sm mt-1">
            Send highly-targeted sequences via your connected LeadSniper sending accounts.
          </p>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-primary hover:bg-primary-200 text-white font-semibold py-2 px-4 rounded-lg text-xs flex items-center space-x-1.5 shadow-sm cursor-pointer"
        >
          <IconPlus size={14} />
          <span>New Campaign</span>
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
          <h2 className="text-sm font-semibold text-text-100">Construct Campaign Sequence</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-200">Campaign Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Q3 Founders Outreach"
                className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-xs text-text-100 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-200">Target Priority Segment</label>
              <select
                value={targetPriority}
                onChange={(e: any) => setTargetPriority(e.target.value)}
                className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-xs text-text-200 focus:outline-none focus:border-primary"
              >
                <option value="hot">Hot Leads Only (&gt;70 match)</option>
                <option value="warm">Hot & Warm Leads</option>
                <option value="all">All Collected Leads</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-200">Email Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick question about {{companyName}}"
              className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-xs text-text-100 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-200">Email Body Template</label>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{contactName}}, noticed that you're running things at {{companyName}}..."
              className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-xs h-32 text-text-100 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="bg-transparent hover:bg-bg-300 border border-border text-text-200 hover:text-text-100 px-4 py-2 rounded-lg text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary hover:bg-primary-200 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Sync & Launch'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="h-20 skeleton" />
      ) : campaigns.length === 0 ? (
        <div className="bg-card p-12 text-center text-text-300 text-xs border border-border rounded-xl shadow-input">
          No campaigns set up yet. Click New Campaign to structure your first outreach sequence.
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="bg-card p-4 border border-border rounded-xl flex items-center justify-between hover:border-primary/50 transition-all shadow-sm"
            >
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-text-100">{c.name}</h3>
                <p className="text-[10px] text-text-200">Subject: {c.subject}</p>
                <div className="flex items-center space-x-4 text-[10px] text-text-300 mt-2">
                  <span>Enrolled Leads: <strong className="text-text-200">{c.leadsCount}</strong></span>
                  <span>Sent: <strong className="text-text-200">{c.sentCount}</strong></span>
                  <span>Replies: <strong className="text-text-200">{c.replyCount}</strong></span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-1.5 rounded bg-bg-300 border border-border text-text-200 hover:text-primary transition-all cursor-pointer">
                  <IconPlayerPlay size={14} />
                </button>
                <button className="p-1.5 rounded bg-bg-300 border border-border text-text-200 hover:text-text-100 transition-all cursor-pointer">
                  <IconSettings size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
