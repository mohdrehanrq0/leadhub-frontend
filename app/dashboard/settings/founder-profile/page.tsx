'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { IconUser, IconMail, IconCalendar, IconBrandWhatsapp, IconBrandLinkedin, IconWorldWww } from '@tabler/icons-react';
import { useAuth } from '../../../../context/AuthContext';

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
      fetchFounderProfile();
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
    } catch (error) {
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
    } catch (error) {
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
    return <div className="h-40 skeleton max-w-2xl mx-auto" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in text-text">
      <PageHeader
        eyebrow="Settings"
        title="Founder profile"
        description="Contact details used in personalized sign-up onboarding emails."
      />

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Founder Name */}
          <div className="space-y-1">
            <label htmlFor="founderName" className="text-xs font-semibold text-text-200 flex items-center space-x-1">
              <IconUser size={14} />
              <span>Founder Name</span>
            </label>
            <input
              id="founderName"
              type="text"
              value={formData.founderName}
              onChange={(e) => handleChange('founderName', e.target.value)}
              placeholder="John Doe"
              className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
            />
            <p className="text-[11px] text-text-300">Your name that will appear in onboarding emails.</p>
          </div>

          {/* Founder Email */}
          <div className="space-y-1">
            <label htmlFor="founderEmail" className="text-xs font-semibold text-text-200 flex items-center space-x-1">
              <IconMail size={14} />
              <span>Founder Email</span>
            </label>
            <input
              id="founderEmail"
              type="email"
              value={formData.founderEmail}
              onChange={(e) => handleChange('founderEmail', e.target.value)}
              placeholder="john@company.com"
              className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
            />
            <p className="text-[11px] text-text-300">Contact email for sign-up users to reach you.</p>
          </div>

          {/* Calendar Link */}
          <div className="space-y-1">
            <label htmlFor="founderCalendarLink" className="text-xs font-semibold text-text-200 flex items-center space-x-1">
              <IconCalendar size={14} />
              <span>Calendar Link</span>
            </label>
            <input
              id="founderCalendarLink"
              type="url"
              value={formData.founderCalendarLink}
              onChange={(e) => handleChange('founderCalendarLink', e.target.value)}
              placeholder="https://calendly.com/johndoe/30min"
              className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
            />
            <p className="text-[11px] text-text-300">Calendly, Cal.com, or any scheduling link.</p>
          </div>

          {/* WhatsApp */}
          <div className="space-y-1">
            <label htmlFor="founderWhatsapp" className="text-xs font-semibold text-text-200 flex items-center space-x-1">
              <IconBrandWhatsapp size={14} />
              <span>WhatsApp Number</span>
            </label>
            <input
              id="founderWhatsapp"
              type="tel"
              value={formData.founderWhatsapp}
              onChange={(e) => handleChange('founderWhatsapp', e.target.value)}
              placeholder="+1234567890"
              className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
            />
            <p className="text-[11px] text-text-300">Include country code (e.g., +1 for US).</p>
          </div>

          {/* LinkedIn */}
          <div className="space-y-1">
            <label htmlFor="founderLinkedin" className="text-xs font-semibold text-text-200 flex items-center space-x-1">
              <IconBrandLinkedin size={14} />
              <span>LinkedIn Profile</span>
            </label>
            <input
              id="founderLinkedin"
              type="url"
              value={formData.founderLinkedin}
              onChange={(e) => handleChange('founderLinkedin', e.target.value)}
              placeholder="https://linkedin.com/in/johndoe"
              className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
            />
            <p className="text-[11px] text-text-300">Your LinkedIn profile URL.</p>
          </div>

          {/* Additional Social Links */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-200 flex items-center space-x-1">
              <IconWorldWww size={14} />
              <span>Additional Social Links (Optional)</span>
            </label>
            <div className="space-y-2">
              {['Twitter', 'Facebook', 'Instagram'].map((platform) => (
                <div key={platform} className="flex items-center space-x-2">
                  <span className="text-xs text-text-300 w-20">{platform}</span>
                  <input
                    type="url"
                    value={formData.founderSocialLinks?.[platform.toLowerCase()] || ''}
                    onChange={(e) => handleSocialLinkChange(platform.toLowerCase(), e.target.value)}
                    placeholder={`https://${platform.toLowerCase()}.com/...`}
                    className="flex-1 bg-bg-200 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-text-300">Optional social media links to include in emails.</p>
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex items-center space-x-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Founder Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
