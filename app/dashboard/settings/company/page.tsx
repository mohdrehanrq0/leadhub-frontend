'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import {
  IconBuilding,
  IconBuildingSkyscraper,
  IconWorld,
  IconUsers,
  IconCategory,
  IconMapPin,
  IconFileText,
  IconPackage,
  IconTool,
  IconCode,
  IconTarget,
  IconPlus,
  IconX,
  IconCheck,
  IconTrash,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandGithub,
  IconBrandYoutube,
  IconExternalLink,
  IconRefresh,
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

interface CompanyData {
  companyName: string;
  website: string;
  teamSize: string;
  industry: string;
  country: string;
  description: string;
  products: string[];
  services: string[];
  technologies: string[];
  socialLinks: Record<string, string>;
}

interface ICPData {
  id?: string;
  targetRoles: string[];
  companySizes: string[];
  industries: string[];
  geography: string[];
  painPoints: string[];
  exclusions: string[];
}

interface NicheItem {
  id: string;
  name: string;
  type: 'niche' | 'sub_niche';
  parentId?: string | null;
  isSelected?: boolean;
  aiGenerated?: boolean;
  subNiches?: NicheItem[];
}

// ─── Tag Input Component ──────────────────────────────────────────────
function TagInput({
  tags,
  onChange,
  placeholder = 'Type and press Enter…',
  badgeColor = 'bg-primary/10 text-primary border-primary/20',
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  badgeColor?: string;
}) {
  const [inputVal, setInputVal] = useState('');

  const addTag = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[38px] p-1.5 rounded-lg border border-settings-line bg-settings-canvas">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${badgeColor} transition-all`}
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:opacity-75 focus:outline-none"
              title={`Remove ${tag}`}
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputVal.trim()) addTag(inputVal);
          }}
          placeholder={tags.length === 0 ? placeholder : 'Add more…'}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-settings-ink placeholder:text-settings-faint outline-none px-1.5 py-0.5"
        />
      </div>
      <p className="text-[11px] text-settings-faint">Press <kbd className="px-1 py-0.5 rounded bg-settings-soft text-[10px] font-mono border border-settings-line">Enter</kbd> or comma to add</p>
    </div>
  );
}

export default function CompanySettingsPage() {
  const { activeWorkspaceId } = useAuth();
  const [activeTab, setActiveTab] = useState<'company' | 'icp' | 'niches'>('company');
  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingICP, setSavingICP] = useState(false);

  // Company profile state
  const [company, setCompany] = useState<CompanyData>({
    companyName: '',
    website: '',
    teamSize: '',
    industry: '',
    country: '',
    description: '',
    products: [],
    services: [],
    technologies: [],
    socialLinks: {},
  });

  // ICP state
  const [icp, setIcp] = useState<ICPData>({
    targetRoles: [],
    companySizes: [],
    industries: [],
    geography: [],
    painPoints: [],
    exclusions: [],
  });
  const [icpId, setIcpId] = useState<string | null>(null);

  // Niches state
  const [niches, setNiches] = useState<NicheItem[]>([]);
  const [newNicheName, setNewNicheName] = useState('');
  const [creatingNiche, setCreatingNiche] = useState(false);

  useEffect(() => {
    if (activeWorkspaceId) {
      void loadAllData();
    }
  }, [activeWorkspaceId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [onboardingRes, icpRes, nichesRes] = await Promise.allSettled([
        api.get('/api/onboarding'),
        api.get('/api/icp'),
        api.get('/api/niches'),
      ]);

      if (onboardingRes.status === 'fulfilled' && onboardingRes.value.data.success && onboardingRes.value.data.data) {
        const d = onboardingRes.value.data.data;
        setCompany({
          companyName: d.companyName || '',
          website: d.website || '',
          teamSize: d.teamSize || '',
          industry: d.industry || '',
          country: d.country || '',
          description: d.description || '',
          products: Array.isArray(d.products) ? d.products : [],
          services: Array.isArray(d.services) ? d.services : [],
          technologies: Array.isArray(d.technologies) ? d.technologies : [],
          socialLinks: d.socialLinks || {},
        });
      }

      if (icpRes.status === 'fulfilled' && icpRes.value.data.success && icpRes.value.data.data) {
        const icpData = icpRes.value.data.data;
        setIcpId(icpData.id || null);
        setIcp({
          targetRoles: Array.isArray(icpData.targetRoles) ? icpData.targetRoles : [],
          companySizes: Array.isArray(icpData.companySizes) ? icpData.companySizes : [],
          industries: Array.isArray(icpData.industries) ? icpData.industries : [],
          geography: Array.isArray(icpData.geography) ? icpData.geography : [],
          painPoints: Array.isArray(icpData.painPoints) ? icpData.painPoints : [],
          exclusions: Array.isArray(icpData.exclusions) ? icpData.exclusions : [],
        });
      }

      if (nichesRes.status === 'fulfilled' && nichesRes.value.data.success && nichesRes.value.data.data) {
        const rawNiches = nichesRes.value.data.data;
        setNiches(Array.isArray(rawNiches) ? rawNiches : []);
      }
    } catch {
      toast.error('Failed to load company profile information.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Company Save ───────────────────────────────────────────────────
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      const res = await api.put('/api/onboarding/company', company);
      if (res.data.success) {
        toast.success('Company profile updated successfully.');
      } else {
        toast.error(res.data.message || 'Failed to update company profile.');
      }
    } catch (err: unknown) {
      const errMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(errMessage || 'Error saving company profile.');
    } finally {
      setSavingCompany(false);
    }
  };

  // ─── ICP Save ───────────────────────────────────────────────────────
  const handleSaveICP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!icpId) {
      toast.error('No active ICP found to update. Complete onboarding ICP generation first.');
      return;
    }
    setSavingICP(true);
    try {
      const res = await api.patch(`/api/icp/${icpId}`, icp);
      if (res.data.success) {
        toast.success('ICP criteria saved successfully.');
      } else {
        toast.error(res.data.message || 'Failed to update ICP criteria.');
      }
    } catch (err: unknown) {
      const errMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(errMessage || 'Error saving ICP criteria.');
    } finally {
      setSavingICP(false);
    }
  };

  // ─── Niche Actions ──────────────────────────────────────────────────
  const toggleNiche = async (nicheId: string, currentSelected: boolean) => {
    try {
      await api.patch(`/api/niches/${nicheId}/select`, { isSelected: !currentSelected });
      setNiches((prev) =>
        prev.map((n) => (n.id === nicheId ? { ...n, isSelected: !currentSelected } : n))
      );
      toast.success(currentSelected ? 'Niche deselected' : 'Niche marked active');
    } catch {
      toast.error('Failed to update niche selection.');
    }
  };

  const handleAddCustomNiche = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNicheName.trim()) return;
    setCreatingNiche(true);
    try {
      const res = await api.post('/api/niches', { name: newNicheName.trim() });
      if (res.data.success && res.data.data) {
        setNiches((prev) => [res.data.data, ...prev]);
        setNewNicheName('');
        toast.success(`Target niche "${res.data.data.name}" added.`);
      }
    } catch {
      toast.error('Failed to add custom niche.');
    } finally {
      setCreatingNiche(false);
    }
  };

  const handleDeleteNiche = async (nicheId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}"?`)) return;
    try {
      await api.delete(`/api/niches/${nicheId}`);
      setNiches((prev) => prev.filter((n) => n.id !== nicheId));
      toast.success(`Removed "${name}".`);
    } catch {
      toast.error('Failed to remove niche.');
    }
  };

  if (loading) {
    return <div className="mx-auto h-64 max-w-4xl skeleton rounded-2xl" />;
  }

  return (
    <SettingsPanel wide>
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-settings-line pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-settings-ink flex items-center gap-2.5">
            <IconBuildingSkyscraper className="h-6 w-6 text-settings-accent" />
            Company & Market Profile
          </h1>
          <p className="mt-1 text-sm text-settings-muted">
            View, edit, or extend all company identity, tech offerings, Ideal Customer Profile, and niches configured during onboarding.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadAllData()}
            className={settingsBtnSecondary}
            title="Refresh data"
          >
            <IconRefresh className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-settings-line">
        <button
          type="button"
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'company'
              ? 'border-settings-accent text-settings-accent'
              : 'border-transparent text-settings-muted hover:text-settings-ink'
          }`}
        >
          <IconBuilding className="h-4 w-4" />
          <span>Identity & Offerings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('icp')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'icp'
              ? 'border-settings-accent text-settings-accent'
              : 'border-transparent text-settings-muted hover:text-settings-ink'
          }`}
        >
          <IconTarget className="h-4 w-4" />
          <span>Ideal Customer Profile (ICP)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('niches')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'niches'
              ? 'border-settings-accent text-settings-accent'
              : 'border-transparent text-settings-muted hover:text-settings-ink'
          }`}
        >
          <IconCategory className="h-4 w-4" />
          <span>Target Niches ({niches.filter((n) => n.isSelected).length} active)</span>
        </button>
      </div>

      {/* ─── TAB 1: COMPANY IDENTITY & OFFERINGS ──────────────────────── */}
      {activeTab === 'company' && (
        <form onSubmit={handleSaveCompany} className="space-y-6">
          <SettingsCard
            icon={IconBuilding}
            title="Company Identity"
            description="Core corporate details synced across lead scoring, enrichment, and outreach personas."
          >
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <SettingsField label="Company Name *" htmlFor="companyName">
                <input
                  id="companyName"
                  type="text"
                  required
                  value={company.companyName}
                  onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                  placeholder="Acme Inc."
                  className={settingsInputClass}
                />
              </SettingsField>

              <SettingsField label="Website URL" htmlFor="website">
                <div className="relative">
                  <IconWorld className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="website"
                    type="text"
                    value={company.website}
                    onChange={(e) => setCompany({ ...company, website: e.target.value })}
                    placeholder="https://acme.com"
                    className={`${settingsInputClass} pl-9`}
                  />
                </div>
              </SettingsField>

              <SettingsField label="Industry / Sector" htmlFor="industry">
                <div className="relative">
                  <IconCategory className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="industry"
                    type="text"
                    value={company.industry}
                    onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                    placeholder="B2B SaaS, FinTech, Cybersecurity…"
                    className={`${settingsInputClass} pl-9`}
                  />
                </div>
              </SettingsField>

              <SettingsField label="Team Size" htmlFor="teamSize">
                <div className="relative">
                  <IconUsers className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="teamSize"
                    type="text"
                    value={company.teamSize}
                    onChange={(e) => setCompany({ ...company, teamSize: e.target.value })}
                    placeholder="1-10, 11-50, 51-200, 201-500, 500+…"
                    className={`${settingsInputClass} pl-9`}
                  />
                </div>
              </SettingsField>

              <SettingsField label="Headquarters Country" htmlFor="country">
                <div className="relative">
                  <IconMapPin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="country"
                    type="text"
                    value={company.country}
                    onChange={(e) => setCompany({ ...company, country: e.target.value })}
                    placeholder="United States, United Kingdom, India…"
                    className={`${settingsInputClass} pl-9`}
                  />
                </div>
              </SettingsField>

              <div className="sm:col-span-2">
                <SettingsField label="Company Overview / Description" htmlFor="description">
                  <div className="relative">
                    <textarea
                      id="description"
                      rows={3}
                      value={company.description}
                      onChange={(e) => setCompany({ ...company, description: e.target.value })}
                      placeholder="Brief summary of what your company builds, who you serve, and your core value proposition."
                      className="w-full rounded-lg border border-settings-line bg-settings-canvas p-3 text-sm text-settings-ink placeholder:text-settings-faint outline-none focus:border-settings-accent focus:bg-settings-surface focus:ring-[3px] focus:ring-settings-accent/20"
                    />
                  </div>
                </SettingsField>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            icon={IconPackage}
            title="Offerings & Capabilities"
            description="Products and services you offer to clients. Used by AI agents to synthesize value angles."
          >
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-settings-muted mb-1.5">
                  Products
                </label>
                <TagInput
                  tags={company.products}
                  onChange={(products) => setCompany({ ...company, products })}
                  placeholder="e.g. CRM Extension, Lead Scraper, Automated Outreach API…"
                  badgeColor="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-settings-muted mb-1.5">
                  Services
                </label>
                <TagInput
                  tags={company.services}
                  onChange={(services) => setCompany({ ...company, services })}
                  placeholder="e.g. Lead Pipeline Auditing, Custom Enrichment Setup, Growth Consulting…"
                  badgeColor="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-settings-muted mb-1.5">
                  Technologies / Tech Stack
                </label>
                <TagInput
                  tags={company.technologies}
                  onChange={(technologies) => setCompany({ ...company, technologies })}
                  placeholder="e.g. Next.js, Node.js, PostgreSQL, OpenAI, Stripe…"
                  badgeColor="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20"
                />
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            icon={IconWorld}
            title="Company Social Links"
            description="Public presence profiles used across outbound outreach signatures and enrichment matching."
          >
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <SettingsField label="LinkedIn Company Page">
                <div className="relative">
                  <IconBrandLinkedin className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={company.socialLinks?.linkedin || ''}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        socialLinks: { ...company.socialLinks, linkedin: e.target.value },
                      })
                    }
                    placeholder="https://linkedin.com/company/acme"
                    className={`${settingsInputClass} pl-9`}
                  />
                </div>
              </SettingsField>

              <SettingsField label="Twitter / X">
                <div className="relative">
                  <IconBrandTwitter className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={company.socialLinks?.twitter || ''}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        socialLinks: { ...company.socialLinks, twitter: e.target.value },
                      })
                    }
                    placeholder="https://x.com/acme"
                    className={`${settingsInputClass} pl-9`}
                  />
                </div>
              </SettingsField>

              <SettingsField label="GitHub Organization">
                <div className="relative">
                  <IconBrandGithub className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={company.socialLinks?.github || ''}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        socialLinks: { ...company.socialLinks, github: e.target.value },
                      })
                    }
                    placeholder="https://github.com/acme"
                    className={`${settingsInputClass} pl-9`}
                  />
                </div>
              </SettingsField>

              <SettingsField label="YouTube Channel">
                <div className="relative">
                  <IconBrandYoutube className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    value={company.socialLinks?.youtube || ''}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        socialLinks: { ...company.socialLinks, youtube: e.target.value },
                      })
                    }
                    placeholder="https://youtube.com/@acme"
                    className={`${settingsInputClass} pl-9`}
                  />
                </div>
              </SettingsField>
            </div>
          </SettingsCard>

          <div className="flex justify-end gap-3 pt-2">
            <button type="submit" disabled={savingCompany} className={settingsBtnPrimary}>
              {savingCompany ? 'Saving Changes…' : 'Save Company Profile'}
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB 2: IDEAL CUSTOMER PROFILE (ICP) ─────────────────────── */}
      {activeTab === 'icp' && (
        <form onSubmit={handleSaveICP} className="space-y-6">
          <SettingsCard
            icon={IconTarget}
            title="Target Persona & Roles"
            description="Key decision-makers and job titles your company prioritizes."
          >
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-settings-muted mb-1.5">
                  Target Decision Maker Roles
                </label>
                <TagInput
                  tags={icp.targetRoles}
                  onChange={(targetRoles) => setIcp({ ...icp, targetRoles })}
                  placeholder="e.g. VP of Sales, Head of Growth, CEO, Founder, Director of Revenue Ops…"
                  badgeColor="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-settings-muted mb-1.5">
                  Core Pain Points & Challenges
                </label>
                <TagInput
                  tags={icp.painPoints}
                  onChange={(painPoints) => setIcp({ ...icp, painPoints })}
                  placeholder="e.g. Low response rates, Inaccurate B2B contact data, Manual CRM data entry…"
                  badgeColor="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                />
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            icon={IconBuilding}
            title="Firmographic Fit"
            description="Company sizes, industries, and geographies that qualify for high ICP fit scores."
          >
            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-settings-muted mb-1.5">
                  Target Company Sizes
                </label>
                <TagInput
                  tags={icp.companySizes}
                  onChange={(companySizes) => setIcp({ ...icp, companySizes })}
                  placeholder="e.g. 11-50, 51-200, 201-500…"
                  badgeColor="bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-settings-muted mb-1.5">
                  Target Industries
                </label>
                <TagInput
                  tags={icp.industries}
                  onChange={(industries) => setIcp({ ...icp, industries })}
                  placeholder="e.g. SaaS, E-commerce, Marketing Agencies, Logistics…"
                  badgeColor="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-settings-muted mb-1.5">
                  Target Geography / Regions
                </label>
                <TagInput
                  tags={icp.geography}
                  onChange={(geography) => setIcp({ ...icp, geography })}
                  placeholder="e.g. United States, North America, EMEA, DACH, India…"
                  badgeColor="bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-settings-muted mb-1.5">
                  Exclusions & Negative Signals (Disqualifiers)
                </label>
                <TagInput
                  tags={icp.exclusions}
                  onChange={(exclusions) => setIcp({ ...icp, exclusions })}
                  placeholder="e.g. Students, Interns, Non-profit, Crypto/Gambling, < 5 employees…"
                  badgeColor="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                />
              </div>
            </div>
          </SettingsCard>

          <div className="flex justify-end gap-3 pt-2">
            <button type="submit" disabled={savingICP} className={settingsBtnPrimary}>
              {savingICP ? 'Saving ICP…' : 'Save ICP Criteria'}
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB 3: TARGET NICHES ────────────────────────────────────── */}
      {activeTab === 'niches' && (
        <div className="space-y-6">
          <SettingsCard
            icon={IconCategory}
            title="Market Niches & Segments"
            description="Manage specific vertical niches discovered during onboarding or add custom target markets."
          >
            {/* Quick add custom niche */}
            <form onSubmit={handleAddCustomNiche} className="mb-6 flex gap-2">
              <input
                type="text"
                value={newNicheName}
                onChange={(e) => setNewNicheName(e.target.value)}
                placeholder="Add custom niche (e.g. High-ticket B2B agencies, Remote design studios)…"
                className={settingsInputClass}
              />
              <button
                type="submit"
                disabled={creatingNiche || !newNicheName.trim()}
                className={settingsBtnPrimary}
              >
                <IconPlus className="h-4 w-4" />
                <span>Add Niche</span>
              </button>
            </form>

            {niches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-settings-line p-8 text-center text-sm text-settings-muted">
                No niches configured yet. Add your first niche above or re-run the onboarding wizard to auto-generate segments.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {niches.map((niche) => {
                  const isSelected = Boolean(niche.isSelected);
                  return (
                    <div
                      key={niche.id}
                      className={`relative flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-settings-accent/50 bg-settings-accent/5 dark:bg-settings-accent/10 shadow-sm'
                          : 'border-settings-line bg-settings-canvas opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => void toggleNiche(niche.id, isSelected)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            isSelected
                              ? 'border-settings-accent bg-settings-accent text-white'
                              : 'border-settings-line bg-settings-surface hover:border-settings-accent/60'
                          }`}
                          title={isSelected ? 'Active niche (click to disable)' : 'Inactive niche (click to activate)'}
                        >
                          {isSelected && <IconCheck className="h-3.5 w-3.5 stroke-[2.5]" />}
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-settings-ink truncate">{niche.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-settings-faint uppercase">
                              {niche.aiGenerated ? 'AI Generated' : 'Custom'}
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                Active Target
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleDeleteNiche(niche.id, niche.name)}
                        className="p-1.5 text-settings-muted hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Remove niche"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </SettingsCard>
        </div>
      )}
    </SettingsPanel>
  );
}
