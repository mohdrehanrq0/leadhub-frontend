'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { btnPrimary } from '../../../../components/ui/styles';
import { IconArrowLeft, IconPlus, IconRocket, IconToggleLeft, IconToggleRight } from '@tabler/icons-react';

interface SignupCampaign {
  id: string;
  name: string;
  sourcePlatform: string;
  isActive: boolean;
  categoryId?: string;
  createdAt: string;
}

export default function SignupCampaignsPage() {
  const [campaigns, setCampaigns] = useState<SignupCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      // Mock data for now - implement backend endpoint later
      setCampaigns([
        {
          id: '1',
          name: 'Lead Sniper Onboarding',
          sourcePlatform: 'lead_sniper',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaign = async (id: string, currentStatus: boolean) => {
    try {
      // Mock toggle - implement backend endpoint later
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !currentStatus } : c))
      );
      toast.success(`Campaign ${currentStatus ? 'paused' : 'activated'}`);
    } catch (error) {
      toast.error('Failed to toggle campaign');
    }
  };

  if (loading) {
    return <div className="h-40 skeleton max-w-4xl mx-auto" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-text">
      {/* Back Button */}
      <Link
        href="/dashboard/signups"
        className="inline-flex items-center space-x-2 text-sm text-text-200 hover:text-primary transition-colors"
      >
        <IconArrowLeft size={16} />
        <span>Back to Sign-ups</span>
      </Link>

      <PageHeader
        eyebrow="Sign-ups"
        title="Signup campaigns"
        description="Always-on campaigns for different source platforms."
        actions={
          <button type="button" onClick={() => toast.info('Campaign creation coming soon')} className={btnPrimary}>
            <IconPlus size={16} /> New campaign
          </button>
        }
      />

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div className="bg-card p-12 border border-border rounded-xl shadow-input text-center">
            <IconRocket size={48} className="mx-auto text-text-300 mb-4" />
            <h3 className="text-lg font-semibold text-text-100 mb-2">No campaigns yet</h3>
            <p className="text-sm text-text-300 mb-4">
              Create a campaign to start receiving sign-ups from external platforms
            </p>
            <button
              onClick={() => toast.info('Campaign creation coming soon')}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              Create Your First Campaign
            </button>
          </div>
        ) : (
          campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-card p-6 border border-border rounded-xl shadow-input hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-text-100">{campaign.name}</h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                        campaign.isActive
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                      }`}
                    >
                      {campaign.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-4 text-sm text-text-300">
                      <span className="flex items-center space-x-1">
                        <span className="font-semibold">Platform:</span>
                        <span className="capitalize">{campaign.sourcePlatform.replace('_', ' ')}</span>
                      </span>
                    </div>
                    <div className="text-xs text-text-300">
                      Created on {new Date(campaign.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleCampaign(campaign.id, campaign.isActive)}
                    className="px-3 py-1.5 bg-bg-200 text-text-100 rounded-lg text-xs font-medium hover:bg-bg-300 transition-colors flex items-center space-x-1"
                  >
                    {campaign.isActive ? (
                      <>
                        <IconToggleRight size={16} />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <IconToggleLeft size={16} />
                        <span>Activate</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => toast.info('Edit campaign coming soon')}
                    className="px-3 py-1.5 bg-bg-200 text-text-100 rounded-lg text-xs font-medium hover:bg-bg-300 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-blue-500 mb-2">How Signup Campaigns Work</h4>
        <p className="text-xs text-text-300">
          Signup campaigns are always-on integrations with external platforms like Lead Sniper. When someone signs up
          on your platform, their data is pushed to Lead Hub, automatically enriched, and a personalized onboarding
          email is generated. Lead Sniper can then pull these enriched leads with their emails based on category.
        </p>
      </div>
    </div>
  );
}
