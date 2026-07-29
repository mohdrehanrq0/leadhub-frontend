'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import { IconArrowLeft, IconMail, IconBuilding, IconUser, IconCalendar, IconCopy } from '@tabler/icons-react';
import Link from 'next/link';

interface SignupLead {
  id: string;
  email: string;
  name?: string;
  companyName?: string;
  companyWebsite?: string;
  companyAddress?: string;
  status: string;
  enrichmentStatus: string;
  category: string;
  generatedEmailSubject?: string;
  generatedEmailBody?: string;
  generatedEmailBodyHtml?: string;
  emailGeneratedAt?: string;
  enrichmentCompletedAt?: string;
  createdAt: string;
  sourceApp: string;
}

export default function SignupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [signupLead, setSignupLead] = useState<SignupLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchSignupLead(params.id as string);
    }
  }, [params.id]);

  const fetchSignupLead = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/signups/${id}`);
      setSignupLead(res.data.data);
    } catch (error) {
      toast.error('Failed to load signup lead');
      router.push('/dashboard/signups');
    } finally {
      setLoading(false);
    }
  };

  const copyEmailToClipboard = async () => {
    if (!signupLead?.generatedEmailBody) return;
    try {
      await navigator.clipboard.writeText(signupLead.generatedEmailBody);
      toast.success('Email copied to clipboard');
    } catch {
      toast.error('Failed to copy email');
    }
  };

  if (loading) {
    return <div className="h-40 skeleton max-w-4xl mx-auto" />;
  }

  if (!signupLead) {
    return null;
  }

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

      {/* Header */}
      <div className="bg-card p-6 border border-border rounded-xl shadow-input">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-text-100">{signupLead.name || 'Anonymous User'}</h1>
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(
                  signupLead.category,
                )}`}
              >
                {signupLead.category}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-text-300">
              <div className="flex items-center space-x-1">
                <IconMail size={14} />
                <span>{signupLead.email}</span>
              </div>
              <div className="flex items-center space-x-1">
                <IconCalendar size={14} />
                <span>{new Date(signupLead.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
        <h2 className="text-lg font-semibold text-text-100 flex items-center space-x-2">
          <IconBuilding size={20} />
          <span>Company Information</span>
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-text-200">Company Name</label>
            <p className="text-sm text-text-100 mt-1">{signupLead.companyName || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-200">Website</label>
            {signupLead.companyWebsite ? (
              <a
                href={signupLead.companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline block mt-1"
              >
                {signupLead.companyWebsite}
              </a>
            ) : (
              <p className="text-sm text-text-300 mt-1">N/A</p>
            )}
          </div>
          {signupLead.companyAddress && (
            <div className="col-span-2">
              <label className="text-xs font-semibold text-text-200">Address</label>
              <p className="text-sm text-text-100 mt-1">{signupLead.companyAddress}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
        <h2 className="text-lg font-semibold text-text-100">Status</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-text-200">Overall Status</label>
            <p className="text-sm text-text-100 mt-1 capitalize">{signupLead.status}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-200">Enrichment Status</label>
            <p className="text-sm text-text-100 mt-1 capitalize">{signupLead.enrichmentStatus}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-200">Source Platform</label>
            <p className="text-sm text-text-100 mt-1 capitalize">{signupLead.sourceApp.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Generated Email */}
      {signupLead.generatedEmailSubject && (
        <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-100 flex items-center space-x-2">
              <IconMail size={20} />
              <span>Generated Onboarding Email</span>
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={copyEmailToClipboard}
                className="px-3 py-1.5 bg-bg-200 text-text-100 rounded-lg text-xs font-medium hover:bg-bg-300 transition-colors flex items-center space-x-1"
              >
                <IconCopy size={14} />
                <span>Copy</span>
              </button>
              <button
                onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-600 transition-colors"
              >
                {showHtmlPreview ? 'Show Plain Text' : 'Show HTML Preview'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-text-200">Subject</label>
              <p className="text-sm text-text-100 mt-1 font-medium">{signupLead.generatedEmailSubject}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-200">Body</label>
              {showHtmlPreview && signupLead.generatedEmailBodyHtml ? (
                <div
                  className="mt-2 p-4 bg-white text-black rounded-lg border border-border prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: signupLead.generatedEmailBodyHtml }}
                />
              ) : (
                <pre className="mt-2 p-4 bg-bg-200 rounded-lg text-sm text-text-100 whitespace-pre-wrap font-mono">
                  {signupLead.generatedEmailBody}
                </pre>
              )}
            </div>

            {signupLead.emailGeneratedAt && (
              <p className="text-xs text-text-300">
                Generated on {new Date(signupLead.emailGeneratedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
