'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { IconFilter, IconRefresh, IconFileText, IconLink } from '@tabler/icons-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { btnOutline, btnPrimary } from '../../../components/ui/styles';
import EmailPromptModal from '../../../components/signups/EmailPromptModal';
import ResourceLinksModal from '../../../components/signups/ResourceLinksModal';

interface SignupLead {
  id: string;
  email: string;
  name?: string;
  companyName?: string;
  companyWebsite?: string;
  status: string;
  enrichmentStatus: string;
  category: string;
  emailGeneratedAt?: string;
  createdAt: string;
}

export default function SignupsPage() {
  const [signupLeads, setSignupLeads] = useState<SignupLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    status?: string;
    category?: string;
  }>({});
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showResourceLinksModal, setShowResourceLinksModal] = useState(false);

  useEffect(() => {
    fetchSignupLeads();
  }, [filter]);

  const fetchSignupLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.category) params.append('category', filter.category);
      
      const res = await api.get(`/api/signups?${params.toString()}`);
      setSignupLeads(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load signup leads');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'hot':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'warm':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'cold':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ready':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'enriching':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'pending':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      case 'sent':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  if (loading) {
    return <div className="h-40 skeleton max-w-7xl mx-auto" />;
  }

  return (
    <>
      <EmailPromptModal isOpen={showPromptModal} onClose={() => setShowPromptModal(false)} />
      <ResourceLinksModal isOpen={showResourceLinksModal} onClose={() => setShowResourceLinksModal(false)} />
      <div className="mx-auto max-w-7xl animate-fade-in space-y-4 text-text">
      <PageHeader
        eyebrow="Inbound"
        title="Sign-up leads"
        description="External platform sign-ups with AI-generated onboarding emails."
        actions={
          <>
            <button type="button" onClick={fetchSignupLeads} className={btnOutline}>
              <IconRefresh size={16} /> Refresh
            </button>
            <button type="button" onClick={() => setShowResourceLinksModal(true)} className={btnOutline}>
              <IconLink size={16} /> Resources
            </button>
            <button type="button" onClick={() => setShowPromptModal(true)} className={btnOutline}>
              <IconFileText size={16} /> Email prompt
            </button>
            <Link href="/dashboard/signups/api-docs" className={btnOutline}>
              API docs
            </Link>
            <Link href="/dashboard/signups/categories" className={btnPrimary}>
              Manage categories
            </Link>
          </>
        }
      />

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-xs text-text-300">
          💡 All signup leads are automatically organized in a dedicated system list. 
          This list is managed automatically and only contains leads pushed via the API. 
          Filter them here by category to import into Lead Sniper.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <IconFilter size={16} className="text-text-300" />
            <span className="text-xs font-semibold text-text-200">Filters:</span>
          </div>
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            className="px-3 py-1.5 bg-bg-200 border border-border rounded-lg text-sm text-text-100 focus:outline-none focus:border-primary"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="enriching">Enriching</option>
            <option value="ready">Ready</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={filter.category || ''}
            onChange={(e) => setFilter({ ...filter, category: e.target.value || undefined })}
            className="px-3 py-1.5 bg-bg-200 border border-border rounded-lg text-sm text-text-100 focus:outline-none focus:border-primary"
          >
            <option value="">All Categories</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">Sign-up user</th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {signupLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-text-300">
                    No signup leads found
                  </td>
                </tr>
              ) : (
                signupLeads.map((signup) => (
                  <tr key={signup.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-text-100">{signup.name || 'N/A'}</div>
                        <div className="text-xs text-text-300">{signup.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-text-100">{signup.companyName || 'N/A'}</div>
                      {signup.companyWebsite && (
                        <a
                          href={signup.companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          {signup.companyWebsite}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getCategoryColor(
                          signup.category,
                        )}`}
                      >
                        {signup.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(
                          signup.status,
                        )}`}
                      >
                        {signup.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {signup.emailGeneratedAt ? (
                        <span className="text-xs text-green-500">✓ Generated</span>
                      ) : (
                        <span className="text-xs text-text-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-300">
                        {new Date(signup.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/signups/${signup.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </>
  );
}
