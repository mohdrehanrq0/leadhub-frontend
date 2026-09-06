'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import {
  IconBrandLinkedin,
  IconBrandWhatsapp,
  IconCalendar,
  IconMail,
  IconUser,
  IconWorldWww,
} from '@tabler/icons-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  SettingsCard,
  SettingsField,
  SettingsPanel,
  settingsBtnPrimary,
  settingsInputClass,
} from '@/components/settings/primitives';

interface FounderProfile {
  founderName?: string;
  founderEmail?: string;
  founderCalendarLink?: string;
  founderWhatsapp?: string;
  founderLinkedin?: string;
  founderSocialLinks?: Record<string, string>;
}

export default function FounderProfilePage() {
  const { activeWorkspaceId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FounderProfile>({
    founderName: '',
    founderEmail: '',
    founderCalendarLink: '',
    founderWhatsapp: '',
    founderLinkedin: '',
    founderSocialLinks: {},
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
        setFormData({
          founderName: res.data.data.founderName || '',
          founderEmail: res.data.data.founderEmail || '',
          founderCalendarLink: res.data.data.founderCalendarLink || '',
          founderWhatsapp: res.data.data.founderWhatsapp || '',
          founderLinkedin: res.data.data.founderLinkedin || '',
          founderSocialLinks: res.data.data.founderSocialLinks || {},
        });
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
      await api.post('/api/onboarding/founder-profile', formData);
      toast.success('Founder profile saved successfully.');
    } catch {
      toast.error('Failed to save founder profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof FounderProfile, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      founderSocialLinks: {
        ...prev.founderSocialLinks,
        [platform]: value,
      },
    }));
  };

  if (loading) {
    return <div className="mx-auto h-40 max-w-4xl skeleton" />;
  }

  return (
    <SettingsPanel>
      <form onSubmit={handleSubmit} className="space-y-5">
        <SettingsCard
          icon={IconUser}
          title="Identity"
          description="Name and email that appear in onboarding messages."
        >
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <SettingsField label="Founder name" htmlFor="founderName" hint="Shown as the sender in onboarding emails.">
              <span className="relative block">
                <IconUser className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="founderName"
                  type="text"
                  value={formData.founderName}
                  onChange={(e) => handleChange('founderName', e.target.value)}
                  placeholder="Jane Doe"
                  className={`${settingsInputClass} pl-9`}
                />
              </span>
            </SettingsField>
            <SettingsField label="Founder email" htmlFor="founderEmail" hint="Where sign-up users can reach you.">
              <span className="relative block">
                <IconMail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="founderEmail"
                  type="email"
                  value={formData.founderEmail}
                  onChange={(e) => handleChange('founderEmail', e.target.value)}
                  placeholder="jane@company.com"
                  className={`${settingsInputClass} pl-9`}
                />
              </span>
            </SettingsField>
          </div>
        </SettingsCard>

        <SettingsCard icon={IconCalendar} title="Booking & chat" description="Optional links included in outreach emails.">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <SettingsField label="Calendar link" htmlFor="founderCalendarLink" hint="Calendly, Cal.com, or any scheduling URL.">
              <span className="relative block">
                <IconCalendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="founderCalendarLink"
                  type="url"
                  value={formData.founderCalendarLink}
                  onChange={(e) => handleChange('founderCalendarLink', e.target.value)}
                  placeholder="https://calendly.com/jane/30min"
                  className={`${settingsInputClass} pl-9`}
                />
              </span>
            </SettingsField>
            <SettingsField label="WhatsApp number" htmlFor="founderWhatsapp" hint="Include country code, e.g. +1 for US.">
              <span className="relative block">
                <IconBrandWhatsapp className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="founderWhatsapp"
                  type="tel"
                  value={formData.founderWhatsapp}
                  onChange={(e) => handleChange('founderWhatsapp', e.target.value)}
                  placeholder="+1234567890"
                  className={`${settingsInputClass} pl-9`}
                />
              </span>
            </SettingsField>
          </div>
        </SettingsCard>

        <SettingsCard icon={IconWorldWww} title="Social" description="LinkedIn and optional extra profiles.">
          <div className="space-y-4">
            <SettingsField label="LinkedIn profile" htmlFor="founderLinkedin">
              <span className="relative block">
                <IconBrandLinkedin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="founderLinkedin"
                  type="url"
                  value={formData.founderLinkedin}
                  onChange={(e) => handleChange('founderLinkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/janedoe"
                  className={`${settingsInputClass} pl-9`}
                />
              </span>
            </SettingsField>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Additional links</p>
              {['Twitter', 'Facebook', 'Instagram'].map((platform) => (
                <div key={platform} className="flex min-w-0 items-center gap-3">
                  <span className="w-20 shrink-0 text-xs text-slate-500">{platform}</span>
                  <input
                    type="url"
                    value={formData.founderSocialLinks?.[platform.toLowerCase()] || ''}
                    onChange={(e) => handleSocialLinkChange(platform.toLowerCase(), e.target.value)}
                    placeholder={`https://${platform.toLowerCase()}.com/...`}
                    className={settingsInputClass}
                  />
                </div>
              ))}
            </div>
          </div>
        </SettingsCard>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className={settingsBtnPrimary}>
            {saving ? 'Saving…' : 'Save founder profile'}
          </button>
        </div>
      </form>
    </SettingsPanel>
  );
}
