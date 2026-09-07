'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import {
  IconBrandLinkedin,
  IconBrandWhatsapp,
  IconCalendar,
  IconMail,
  IconUser,
  IconWorldWww,
  IconBuildingSkyscraper,
  IconExternalLink,
  IconCheck,
  IconAlertTriangle,
  IconSparkles,
  IconArrowRight,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  SettingsCard,
  SettingsField,
  SettingsPanel,
  settingsBtnPrimary,
  settingsBtnSecondary,
  settingsInputClass,
} from '@/components/settings/primitives';

interface CompositeFounderProfile {
  // Founder Identity
  founderName?: string;
  founderEmail?: string;
  founderCalendarLink?: string;
  founderWhatsapp?: string;
  founderLinkedin?: string;
  founderSocialLinks?: Record<string, string>;

  // Onboarding Company Context (composite mixture)
  companyName?: string;
  companyWebsite?: string;
  companyDescription?: string;
  companyIndustry?: string;
  companyCountry?: string;
  companyTeamSize?: string;
  companyProducts?: string[];
  companyServices?: string[];

  // Outreach persona & templates
  signupEmailPromptTemplate?: string;
  signupEmailGuidelines?: string;

  // Completeness status
  isComplete?: boolean;
  missingFields?: string[];
  completenessPercentage?: number;
}

export default function FounderProfilePage() {
  const { activeWorkspaceId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<CompositeFounderProfile>({
    founderName: '',
    founderEmail: '',
    founderCalendarLink: '',
    founderWhatsapp: '',
    founderLinkedin: '',
    founderSocialLinks: {},
    signupEmailPromptTemplate: '',
    signupEmailGuidelines: '',
    isComplete: false,
    missingFields: [],
    completenessPercentage: 0,
  });

  useEffect(() => {
    if (activeWorkspaceId) {
      void fetchFounderProfile();
    }
  }, [activeWorkspaceId]);

  const fetchFounderProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/onboarding/founder-profile');
      if (res.data.success && res.data.data) {
        setData(res.data.data);
      }
    } catch {
      toast.error('Failed to load founder profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        founderName: data.founderName,
        founderEmail: data.founderEmail,
        founderCalendarLink: data.founderCalendarLink,
        founderWhatsapp: data.founderWhatsapp,
        founderLinkedin: data.founderLinkedin,
        founderSocialLinks: data.founderSocialLinks || {},
        signupEmailPromptTemplate: data.signupEmailPromptTemplate,
        signupEmailGuidelines: data.signupEmailGuidelines,
      };

      const res = await api.post('/api/onboarding/founder-profile', payload);
      if (res.data.success && res.data.data) {
        setData(res.data.data);
        toast.success('Founder profile & outreach persona saved.');
      } else {
        toast.error(res.data.message || 'Failed to save founder profile.');
      }
    } catch {
      toast.error('Failed to save founder profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof CompositeFounderProfile, val: string) => {
    setData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setData((prev) => ({
      ...prev,
      founderSocialLinks: {
        ...prev.founderSocialLinks,
        [platform]: value,
      },
    }));
  };

  if (loading) {
    return <div className="mx-auto h-48 max-w-4xl skeleton rounded-2xl" />;
  }

  const isReadyForSignups = Boolean(data.isComplete);
  const missing = data.missingFields || [];
  const percentage = data.completenessPercentage || 0;

  return (
    <SettingsPanel wide>
      {/* Top Banner / Feature Status */}
      <div className="rounded-2xl border border-settings-line bg-gradient-to-br from-settings-surface via-settings-canvas to-settings-surface p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-settings-soft text-settings-ink border border-settings-line">
                <IconSparkles className="h-3.5 w-3.5 text-settings-accent" />
                Composite Founder Persona
              </span>
              <span className="text-xs text-settings-muted">
                (Optional for CRM, <strong className="text-settings-ink font-semibold">Strictly Required</strong> for Sign-up Outreach)
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-settings-ink">
              Founder Profile & Outreach Identity
            </h1>
            <p className="text-sm text-settings-muted leading-relaxed">
              Sign-up automation merges your personal founder presence with your onboarding company context to craft authentic 1-on-1 welcome emails.
            </p>
          </div>

          {/* Readiness Meter */}
          <div className="w-full lg:w-72 shrink-0 p-4 rounded-xl border border-settings-line bg-settings-surface shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-settings-muted uppercase tracking-wider text-[11px]">Sign-up Readiness</span>
              <span className={isReadyForSignups ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                {percentage}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-settings-soft rounded-full h-2 overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isReadyForSignups ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center gap-2">
              {isReadyForSignups ? (
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <IconCheck className="h-4 w-4" />
                  <span>Ready for automated outreach</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <IconAlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{missing.length} field{missing.length === 1 ? '' : 's'} remaining</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Missing fields alert if incomplete */}
        {!isReadyForSignups && missing.length > 0 && (
          <div className="mt-5 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2">
              <IconInfoCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Required for Sign-up Emails: </span>
                <span>Please complete: {missing.join(', ')}.</span>
              </div>
            </div>
            {missing.some((m) => m.toLowerCase().includes('company')) && (
              <Link
                href="/dashboard/settings/company"
                className="shrink-0 inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 hover:underline"
              >
                <span>Edit Company Onboarding Data</span>
                <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Synced Onboarding Company Mixture (Preview & Sync) */}
        <SettingsCard
          icon={IconBuildingSkyscraper}
          title="Onboarding Company Context"
          description="Company data automatically infused into founder emails. Managed in Company Profile settings."
          actions={
            <Link
              href="/dashboard/settings/company"
              className={settingsBtnSecondary}
            >
              <IconBuildingSkyscraper className="h-4 w-4" />
              <span>Manage Company Profile</span>
              <IconExternalLink className="h-3.5 w-3.5 opacity-60" />
            </Link>
          }
        >
          <div className="grid gap-4 sm:grid-cols-3 p-1 rounded-xl bg-settings-canvas/50">
            <div className="p-3 rounded-lg border border-settings-line/70 bg-settings-surface">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-settings-faint">Company Name</p>
              <p className="mt-1 text-sm font-semibold text-settings-ink truncate">
                {data.companyName || <span className="text-amber-500 italic">Not set in onboarding</span>}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-settings-line/70 bg-settings-surface">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-settings-faint">Website</p>
              <p className="mt-1 text-sm text-settings-ink truncate">
                {data.companyWebsite ? (
                  <a
                    href={data.companyWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="text-settings-accent hover:underline flex items-center gap-1"
                  >
                    <span>{data.companyWebsite.replace(/^https?:\/\//i, '')}</span>
                    <IconExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-amber-500 italic">Not set in onboarding</span>
                )}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-settings-line/70 bg-settings-surface">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-settings-faint">Industry & HQ</p>
              <p className="mt-1 text-sm text-settings-ink truncate">
                {data.companyIndustry || 'General B2B'} {data.companyCountry ? `• ${data.companyCountry}` : ''}
              </p>
            </div>

            <div className="sm:col-span-3 p-3 rounded-lg border border-settings-line/70 bg-settings-surface">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-settings-faint mb-1">
                Value Proposition & Offerings
              </p>
              <p className="text-xs text-settings-muted line-clamp-2">
                {data.companyDescription || 'No company overview entered yet.'}
              </p>
              {Array.isArray(data.companyProducts) && data.companyProducts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {data.companyProducts.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded text-[11px] bg-settings-soft text-settings-muted border border-settings-line">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SettingsCard>

        {/* Section 1: Founder Identity */}
        <SettingsCard
          icon={IconUser}
          title="Founder Identity & Persona"
          description="Your personal identity as the sender representing your company."
        >
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <SettingsField
              label="Founder Full Name *"
              htmlFor="founderName"
              hint="Shown as the email sender (e.g., Alex Vance from LeadHub)."
            >
              <div className="relative">
                <IconUser className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="founderName"
                  type="text"
                  value={data.founderName || ''}
                  onChange={(e) => handleFieldChange('founderName', e.target.value)}
                  placeholder="Alex Vance"
                  className={`${settingsInputClass} pl-9`}
                />
              </div>
            </SettingsField>

            <SettingsField
              label="Founder Direct Email *"
              htmlFor="founderEmail"
              hint="Direct reply-to address for leads and new signups."
            >
              <div className="relative">
                <IconMail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="founderEmail"
                  type="email"
                  value={data.founderEmail || ''}
                  onChange={(e) => handleFieldChange('founderEmail', e.target.value)}
                  placeholder="alex@leadhub.com"
                  className={`${settingsInputClass} pl-9`}
                />
              </div>
            </SettingsField>
          </div>
        </SettingsCard>

        {/* Section 2: Direct Contact & Booking Channels */}
        <SettingsCard
          icon={IconCalendar}
          title="Booking & Direct Channels"
          description="Scheduling link or WhatsApp number included in your call-to-action."
        >
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <SettingsField
              label="Booking / Calendar Link"
              htmlFor="founderCalendarLink"
              hint="Calendly, Cal.com, or booking URL (Required if WhatsApp not provided)."
            >
              <div className="relative">
                <IconCalendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="founderCalendarLink"
                  type="url"
                  value={data.founderCalendarLink || ''}
                  onChange={(e) => handleFieldChange('founderCalendarLink', e.target.value)}
                  placeholder="https://cal.com/alex/15min"
                  className={`${settingsInputClass} pl-9`}
                />
              </div>
            </SettingsField>

            <SettingsField
              label="WhatsApp Business Direct Number"
              htmlFor="founderWhatsapp"
              hint="International format with country code (e.g. +14155552671)."
            >
              <div className="relative">
                <IconBrandWhatsapp className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="founderWhatsapp"
                  type="tel"
                  value={data.founderWhatsapp || ''}
                  onChange={(e) => handleFieldChange('founderWhatsapp', e.target.value)}
                  placeholder="+14155552671"
                  className={`${settingsInputClass} pl-9`}
                />
              </div>
            </SettingsField>
          </div>
        </SettingsCard>

        {/* Section 3: Social Proof & Founder LinkedIn */}
        <SettingsCard
          icon={IconWorldWww}
          title="Social & Profile Links"
          description="LinkedIn profile link enables signups to verify your founder authenticity."
        >
          <div className="space-y-4">
            <SettingsField
              label="Founder LinkedIn Profile *"
              htmlFor="founderLinkedin"
              hint="Required for building trust and authentic credibility in signup onboarding emails."
            >
              <div className="relative">
                <IconBrandLinkedin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="founderLinkedin"
                  type="url"
                  value={data.founderLinkedin || ''}
                  onChange={(e) => handleFieldChange('founderLinkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/alexvance"
                  className={`${settingsInputClass} pl-9`}
                />
              </div>
            </SettingsField>

            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Additional Social Profiles (Optional)
              </p>
              {['Twitter', 'GitHub', 'Substack'].map((platform) => (
                <div key={platform} className="flex min-w-0 items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-slate-500 font-medium">{platform}</span>
                  <input
                    type="url"
                    value={data.founderSocialLinks?.[platform.toLowerCase()] || ''}
                    onChange={(e) => handleSocialLinkChange(platform.toLowerCase(), e.target.value)}
                    placeholder={`https://${platform.toLowerCase()}.com/...`}
                    className={settingsInputClass}
                  />
                </div>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* Section 4: Outreach Guidelines & Tone Settings */}
        <SettingsCard
          icon={IconSparkles}
          title="Sign-up Email Persona & Guidelines"
          description="Customize the tone, writing style, and key messaging principles for automated signup emails."
        >
          <div className="space-y-4">
            <SettingsField
              label="Custom Outreach Prompt / Style Instructions"
              htmlFor="signupEmailPromptTemplate"
              hint="Tell the AI how you like to communicate (e.g. 'Warm, punchy, concise, no corporate fluff')."
            >
              <textarea
                id="signupEmailPromptTemplate"
                rows={3}
                value={data.signupEmailPromptTemplate || ''}
                onChange={(e) => handleFieldChange('signupEmailPromptTemplate', e.target.value)}
                placeholder="e.g. Write like a friendly peer founder. Keep paragraphs under 2 sentences. Focus on solving their immediate pipeline bottlenecks."
                className="w-full rounded-lg border border-settings-line bg-settings-canvas p-3 text-sm text-settings-ink placeholder:text-settings-faint outline-none focus:border-settings-accent focus:bg-settings-surface focus:ring-[3px] focus:ring-settings-accent/20"
              />
            </SettingsField>

            <SettingsField
              label="Key Talking Points & Strategic Guidelines"
              htmlFor="signupEmailGuidelines"
              hint="Important points to mention or offer (e.g., 'Offer free onboarding call, invite to Slack community')."
            >
              <textarea
                id="signupEmailGuidelines"
                rows={2}
                value={data.signupEmailGuidelines || ''}
                onChange={(e) => handleFieldChange('signupEmailGuidelines', e.target.value)}
                placeholder="e.g. Invite them to join our private Discord, mention our 14-day pipeline guarantee."
                className="w-full rounded-lg border border-settings-line bg-settings-canvas p-3 text-sm text-settings-ink placeholder:text-settings-faint outline-none focus:border-settings-accent focus:bg-settings-surface focus:ring-[3px] focus:ring-settings-accent/20"
              />
            </SettingsField>
          </div>
        </SettingsCard>

        <div className="flex justify-end gap-3 pt-2">
          <button type="submit" disabled={saving} className={settingsBtnPrimary}>
            {saving ? 'Saving Founder Persona…' : 'Save Founder Profile'}
          </button>
        </div>
      </form>
    </SettingsPanel>
  );
}
