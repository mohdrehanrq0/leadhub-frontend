'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import {
  IconArrowLeft,
  IconBuilding,
  IconUser,
  IconCheck,
  IconAlertTriangle,
  IconActivity,
  IconList,
  IconCpu,
  IconBulb,
  IconEye,
  IconRefresh,
} from '@tabler/icons-react';
import { useAuth } from '../../../../context/AuthContext';

interface LeadDetail {
  id: string;
  status: string;
  priority: 'hot' | 'warm' | 'cold' | 'unknown';
  icpScore: number;
  intentScore: number;
  confidence: number;
  rawData: any;
  createdAt: string;
  company: {
    id: string;
    name: string;
    domain: string;
    description?: string;
    industry?: string;
    size?: string;
    products?: string[];
    services?: string[];
    socialLinks?: Record<string, string>;
    technologies?: string[];
    location?: { country?: string; city?: string };
  };
  contact: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    linkedinUrl?: string;
    emailVerificationStatus?: 'valid' | 'invalid' | 'catch_all' | 'disposable' | 'unknown';
  };
}

export default function LeadDetailPage() {
  const { activeWorkspaceId } = useAuth();
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [research, setResearch] = useState<any>(null);
  const [loadingResearch, setLoadingResearch] = useState(false);

  useEffect(() => {
    if (activeWorkspaceId && id) {
      fetchLeadDetail();
    }
  }, [activeWorkspaceId, id]);

  const fetchLeadDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/leads/${id}`);
      setLead(res.data.data);
      if (res.data.data?.company?.id) {
        fetchCompanyResearch(res.data.data.company.id);
      }
    } catch {
      toast.error('Failed to load lead details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyResearch = async (companyId: string) => {
    setLoadingResearch(true);
    try {
      // Fetch company memory research cache
      // Mock call to mimic fetching company memory cache from research table
      setResearch({
        summary: lead?.company?.description ?? 'No summary available.',
        buyingSignals: [
          'Company shows growth hiring indicators in sales & engineering.',
          'Active technology stack updates in developer tools category.',
        ],
        painPoints: [
          'Integrating disparate APIs takes significant development resources.',
          'Data compliance over borders and regions.',
        ],
        outreachInsights: [
          `personalize around company's size of ${lead?.company?.size ?? '11-50'} and location of ${lead?.company?.location?.city ?? 'SF'}.`,
        ],
      });
    } catch {
      // Ignore
    } finally {
      setLoadingResearch(false);
    }
  };

  if (loading) {
    return <div className="h-96 skeleton max-w-4xl mx-auto" />;
  }

  if (!lead) {
    return (
      <div className="text-center py-12 text-text-300">
        Lead not found or access denied.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-text">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/leads')}
        className="flex items-center space-x-1.5 text-text-300 hover:text-text-100 text-xs transition-colors cursor-pointer"
      >
        <IconArrowLeft size={14} />
        <span>Back to Leads</span>
      </button>

      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-card p-6 border border-border rounded-xl shadow-input flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-text-100">
              {lead.contact.firstName} {lead.contact.lastName}
            </h1>
            <p className="text-xs text-text-200">
              {lead.contact.role} at <span className="font-semibold text-primary">{lead.company.name}</span>
            </p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-semibold border capitalize ${
              lead.priority === 'hot'
                ? 'bg-error/10 text-error border-error/20'
                : lead.priority === 'warm'
                ? 'bg-warning/10 text-warning border-warning/20'
                : 'bg-bg-300 text-text-200 border-border'
            }`}
          >
            {lead.priority} Priority
          </span>
        </div>

        <div className="bg-card p-6 border border-border rounded-xl shadow-input flex flex-col justify-center text-center">
          <span className="text-[10px] font-semibold text-text-300 uppercase tracking-wider">AI ICP Match Score</span>
          <p className="text-3xl font-extrabold text-primary mt-1">{lead.icpScore}%</p>
          <div className="w-full bg-bg-300 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-primary h-full" style={{ width: `${lead.icpScore}%` }} />
          </div>
        </div>
      </div>

      {/* Main grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Company profiles */}
        <div className="space-y-6">
          <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
            <h2 className="text-sm font-semibold text-text-100 flex items-center space-x-2">
              <IconUser className="text-primary" size={16} />
              <span>Contact Details</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-text-300">Email</span>
                <span className="font-mono text-text-100 select-all">{lead.contact.email ?? 'Not found'}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-text-300">Verification Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${
                    lead.contact.emailVerificationStatus === 'valid'
                      ? 'bg-success/10 text-success border-success/20'
                      : 'bg-warning/10 text-warning border-warning/20'
                  }`}
                >
                  {lead.contact.emailVerificationStatus ?? 'unverified'}
                </span>
              </div>
              {lead.contact.linkedinUrl && (
                <div className="flex justify-between pt-1">
                  <span className="text-text-300">LinkedIn Profile</span>
                  <a
                    href={lead.contact.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center space-x-0.5"
                  >
                    <span>Visit Profile</span>
                    <IconEye size={12} />
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
            <h2 className="text-sm font-semibold text-text-100 flex items-center space-x-2">
              <IconBuilding className="text-primary" size={16} />
              <span>Company Memory Cache</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-text-300">Industry</span>
                <span className="text-text-100">{lead.company.industry ?? 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-text-300">Employee Size</span>
                <span className="text-text-100">{lead.company.size ?? 'N/A'}</span>
              </div>
              {lead.company.location && (
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-text-300">Geography</span>
                  <span className="text-text-100">
                    {lead.company.location.city}, {lead.company.location.country}
                  </span>
                </div>
              )}
              {lead.company.technologies && lead.company.technologies.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-text-300 block">Technologies Used</span>
                  <div className="flex flex-wrap gap-1">
                    {lead.company.technologies.map((t, idx) => (
                      <span key={idx} className="bg-bg-300 border border-border text-text-200 text-[10px] px-2 py-0.5 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI research cache details */}
        <div className="space-y-6">
          <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
            <h2 className="text-sm font-semibold text-text-100 flex items-center space-x-2">
              <IconActivity className="text-primary" size={16} />
              <span>Deep AI Intelligence</span>
            </h2>

            {loadingResearch ? (
              <div className="h-32 skeleton" />
            ) : research ? (
              <div className="space-y-4 text-xs">
                {research.summary && (
                  <div className="space-y-1">
                    <span className="text-text-300 font-semibold uppercase text-[9px] tracking-wider block">Company Abstract</span>
                    <p className="text-text-200 leading-relaxed">{research.summary}</p>
                  </div>
                )}

                {research.buyingSignals && research.buyingSignals.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-text-300 font-semibold uppercase text-[9px] tracking-wider block">Buying Signals</span>
                    <ul className="list-disc list-inside text-text-200 space-y-1">
                      {research.buyingSignals.map((s: string, idx: number) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {research.painPoints && research.painPoints.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-text-300 font-semibold uppercase text-[9px] tracking-wider block">Identified Pain Points</span>
                    <ul className="list-disc list-inside text-text-200 space-y-1">
                      {research.painPoints.map((p: string, idx: number) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {research.outreachInsights && research.outreachInsights.length > 0 && (
                  <div className="space-y-1.5 p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <span className="font-semibold text-[9px] uppercase tracking-wider block">AI Personalization Hook</span>
                    <p className="mt-1 leading-relaxed italic">"{research.outreachInsights[0]}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-text-300">AI Deep research data not generated.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
