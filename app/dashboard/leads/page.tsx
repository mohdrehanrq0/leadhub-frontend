'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import { toast } from 'sonner';
import {
  IconUsers,
  IconBuilding,
  IconEye,
  IconCheck,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';

interface Lead {
  id: string;
  status: string;
  priority: 'hot' | 'warm' | 'cold' | 'unknown';
  icpScore: number;
  intentScore: number;
  createdAt: string;
  company: {
    name: string;
    domain: string;
    industry?: string;
    size?: string;
  };
  contact: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    emailVerificationStatus?: 'valid' | 'invalid' | 'catch_all' | 'disposable' | 'unknown';
  };
}

export default function LeadsPage() {
  const { activeWorkspaceId } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchLeads();
    }
  }, [activeWorkspaceId]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/leads');
      setLeads(res.data.data ?? []);
    } catch {
      toast.error('Failed to load leads.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    if (filter === 'all') return true;
    return lead.priority === filter;
  });

  return (
    <div className="space-y-6 animate-fade-in text-text">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-100 flex items-center space-x-2">
            <IconUsers className="text-primary" />
            <span>Target Leads</span>
          </h1>
          <p className="text-text-200 text-sm mt-1">
            Browse and inspect verified leads collected by your AI GTM agents.
          </p>
        </div>

        {/* Priority Filter */}
        <div className="flex bg-bg-300 border border-border rounded-lg p-1 space-x-1">
          {(['all', 'hot', 'warm', 'cold'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-all cursor-pointer ${
                filter === opt ? 'bg-primary text-white shadow-sm' : 'text-text-200 hover:text-text-100'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 skeleton" />
          <div className="h-16 skeleton" />
          <div className="h-16 skeleton" />
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-card p-12 text-center text-text-300 text-sm border border-border rounded-xl shadow-input">
          No matching leads found. Run a Lead Search to generate leads.
        </div>
      ) : (
        <div className="bg-card overflow-hidden border border-border rounded-xl shadow-input">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg-300/40 text-xs font-semibold text-text-200">
                  <th className="p-4">Contact</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Verification</th>
                  <th className="p-4">ICP Score</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-bg-300/20 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-text-100">
                        {lead.contact.firstName} {lead.contact.lastName}
                      </div>
                      <div className="text-[10px] text-text-300">{lead.contact.role}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-text-100 flex items-center space-x-1">
                        <IconBuilding size={12} className="text-text-300" />
                        <span>{lead.company.name}</span>
                      </div>
                      <div className="text-[10px] text-text-300">{lead.company.domain}</div>
                    </td>
                    <td className="p-4">
                      {lead.contact.email ? (
                        <div className="space-y-1">
                          <span className="font-mono text-text-100">{lead.contact.email}</span>
                          <div className="flex">
                            <span
                              className={`text-[8px] px-1.5 py-0.5 rounded-full border ${
                                lead.contact.emailVerificationStatus === 'valid'
                                  ? 'bg-success/10 text-success border-success/20'
                                  : lead.contact.emailVerificationStatus === 'invalid'
                                  ? 'bg-error/10 text-error border-error/20'
                                  : 'bg-warning/10 text-warning border-warning/20'
                              }`}
                            >
                              {lead.contact.emailVerificationStatus ?? 'unverified'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-300">No Email</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 bg-bg-300 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              lead.icpScore > 70
                                ? 'bg-success'
                                : lead.icpScore > 40
                                ? 'bg-warning'
                                : 'bg-error'
                            }`}
                            style={{ width: `${lead.icpScore}%` }}
                          />
                        </div>
                        <span className="font-semibold text-text-100">{lead.icpScore}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border capitalize ${
                          lead.priority === 'hot'
                            ? 'bg-error/10 text-error border-error/20'
                            : lead.priority === 'warm'
                            ? 'bg-warning/10 text-warning border-warning/20'
                            : 'bg-bg-300 text-text-200 border-border'
                        }`}
                      >
                        {lead.priority}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="inline-flex items-center space-x-1 bg-bg-300 hover:bg-bg-300/80 text-text-100 px-3 py-1.5 rounded-lg border border-border transition-all font-semibold cursor-pointer"
                      >
                        <IconEye size={12} />
                        <span>Inspect</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
