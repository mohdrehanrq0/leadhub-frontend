'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
  IconBuilding,
  IconTarget,
  IconGridPattern,
  IconHierarchy,
  IconPlug,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconSparkles,
  IconLoader2,
  IconChevronRight,
  IconPlus,
} from '@tabler/icons-react';

export default function OnboardingWizard() {
  const { activeWorkspaceId, setActiveWorkspaceId, refreshOnboardingStatus } = useAuth();
  const router = useRouter();

  // Workspaces state
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);

  // ICP Editor State
  const [icpCompanySizes, setIcpCompanySizes] = useState<string[]>([]);
  const [icpTargetRoles, setIcpTargetRoles] = useState<string[]>([]);
  const [icpIndustries, setIcpIndustries] = useState<string[]>([]);
  const [icpGeography, setIcpGeography] = useState<string[]>([]);
  const [icpPainPoints, setIcpPainPoints] = useState<string[]>([]);
  const [icpExclusions, setIcpExclusions] = useState<string[]>([]);

  // Temp inputs for adding ICP fields
  const [newSize, setNewSize] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newGeo, setNewGeo] = useState('');
  const [newPain, setNewPain] = useState('');
  const [newExclusion, setNewExclusion] = useState('');
  const [savingIcp, setSavingIcp] = useState(false);

  // Niche Editing States
  const [editingNicheId, setEditingNicheId] = useState<string | null>(null);
  const [editingNicheName, setEditingNicheName] = useState('');
  const [customNicheName, setCustomNicheName] = useState('');
  const [addingNiche, setAddingNiche] = useState(false);

  // Sub-Niche Editing States
  const [editingSubNicheId, setEditingSubNicheId] = useState<string | null>(null);
  const [editingSubNicheName, setEditingSubNicheName] = useState('');
  const [customSubNicheNames, setCustomSubNicheNames] = useState<Record<string, string>>({});

  // Wizard state
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(false);

  // Step 1: Company Profile
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [teamSize, setTeamSize] = useState('11-50');
  const [country, setCountry] = useState('United States');
  const [description, setDescription] = useState('');
  const [products, setProducts] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [newProduct, setNewProduct] = useState('');
  const [newService, setNewService] = useState('');

  // Step 2: ICP
  const [icp, setIcp] = useState<any>(null);
  const [generatingIcp, setGeneratingIcp] = useState(false);

  // Step 3: Niches
  const [niches, setNiches] = useState<any[]>([]);
  const [generatingNiches, setGeneratingNiches] = useState(false);

  // Step 4: Sub-Niches
  const [subNicheMap, setSubNicheMap] = useState<Record<string, any[]>>({});
  const [generatingSubNichesId, setGeneratingSubNichesId] = useState<string | null>(null);

  // Step 5: API Keys / Integrations
  const [apolloKey, setApolloKey] = useState('');
  const [apifyKey, setApifyKey] = useState('');
  const [savingKeys, setSavingKeys] = useState(false);

  // Workspaces fetching
  const fetchWorkspaces = async () => {
    try {
      const res = await api.get('/api/workspaces');
      setWorkspaces(res.data.data ?? []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setCreatingWs(true);
    try {
      const res = await api.post('/api/workspaces', { name: newWsName.trim() });
      const newWs = res.data.data;
      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWorkspaceId(newWs.id);
      setNewWsName('');
      setShowCreateWsModal(false);
      toast.success(`Workspace "${newWs.name}" created!`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create workspace.');
    } finally {
      setCreatingWs(false);
    }
  };

  // Load ICP data
  const loadICP = async () => {
    try {
      const res = await api.get('/api/icp');
      if (res.data.data) {
        setIcp(res.data.data);
      }
    } catch {
      // Ignore
    }
  };

  // Load Niches & Sub-Niches data
  const loadNiches = async () => {
    try {
      const res = await api.get('/api/niches');
      const data = res.data.data ?? [];
      setNiches(data);

      const map: Record<string, any[]> = {};
      data.forEach((n: any) => {
        if (n.subNiches && n.subNiches.length > 0) {
          map[n.id] = n.subNiches;
        }
      });
      setSubNicheMap((prev) => ({ ...prev, ...map }));
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (activeWorkspaceId && step >= 2) {
      loadICP();
    }
  }, [activeWorkspaceId, step]);

  useEffect(() => {
    if (activeWorkspaceId && step >= 3) {
      loadNiches();
    }
  }, [activeWorkspaceId, step]);

  useEffect(() => {
    if (icp) {
      setIcpCompanySizes(icp.companySizes ?? []);
      setIcpTargetRoles(icp.targetRoles ?? []);
      setIcpIndustries(icp.industries ?? []);
      setIcpGeography(icp.geography ?? []);
      setIcpPainPoints(icp.painPoints ?? []);
      setIcpExclusions(icp.exclusions ?? []);
    }
  }, [icp]);

  const handleSaveIcp = async () => {
    if (!icp) return;
    setSavingIcp(true);
    try {
      await api.patch(`/api/icp/${icp.id}`, {
        companySizes: icpCompanySizes,
        targetRoles: icpTargetRoles,
        industries: icpIndustries,
        geography: icpGeography,
        painPoints: icpPainPoints,
        exclusions: icpExclusions,
      });
      toast.success('ICP updated successfully!');
      setStep(3);
    } catch {
      toast.error('Failed to save ICP changes.');
    } finally {
      setSavingIcp(false);
    }
  };

  const handleRenameNiche = async (id: string) => {
    if (!editingNicheName.trim()) return;
    try {
      await api.patch(`/api/niches/${id}`, { name: editingNicheName.trim() });
      setNiches((prev) =>
        prev.map((n) => (n.id === id ? { ...n, name: editingNicheName.trim() } : n))
      );
      setEditingNicheId(null);
      toast.success('Niche renamed successfully!');
    } catch {
      toast.error('Failed to rename niche.');
    }
  };

  const handleDeleteNiche = async (id: string) => {
    try {
      await api.delete(`/api/niches/${id}`);
      setNiches((prev) => prev.filter((n) => n.id !== id));
      toast.success('Niche deleted.');
    } catch {
      toast.error('Failed to delete niche.');
    }
  };

  const handleAddCustomNiche = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNicheName.trim()) return;
    setAddingNiche(true);
    try {
      const res = await api.post('/api/niches', { name: customNicheName.trim() });
      setNiches((prev) => [...prev, res.data.data]);
      setCustomNicheName('');
      toast.success('Custom niche added and selected!');
    } catch {
      toast.error('Failed to add niche.');
    } finally {
      setAddingNiche(false);
    }
  };

  const handleRenameSubNiche = async (parentId: string, subNicheId: string) => {
    if (!editingSubNicheName.trim()) return;
    try {
      await api.patch(`/api/niches/${subNicheId}`, { name: editingSubNicheName.trim() });
      setSubNicheMap((prev) => ({
        ...prev,
        [parentId]: prev[parentId].map((s) => (s.id === subNicheId ? { ...s, name: editingSubNicheName.trim() } : s)),
      }));
      setEditingSubNicheId(null);
      toast.success('Sub-niche renamed successfully!');
    } catch {
      toast.error('Failed to rename sub-niche.');
    }
  };

  const handleDeleteSubNiche = async (parentId: string, subNicheId: string) => {
    try {
      await api.delete(`/api/niches/${subNicheId}`);
      setSubNicheMap((prev) => ({
        ...prev,
        [parentId]: prev[parentId].filter((s) => s.id !== subNicheId),
      }));
      toast.success('Sub-niche deleted.');
    } catch {
      toast.error('Failed to delete sub-niche.');
    }
  };

  const handleAddCustomSubNiche = async (nicheId: string, e: React.FormEvent) => {
    e.preventDefault();
    const name = customSubNicheNames[nicheId]?.trim();
    if (!name) return;
    try {
      const res = await api.post(`/api/niches/${nicheId}/custom-sub-niche`, { name });
      setSubNicheMap((prev) => ({
        ...prev,
        [nicheId]: [...(prev[nicheId] ?? []), res.data.data],
      }));
      setCustomSubNicheNames((prev) => ({ ...prev, [nicheId]: '' }));
      toast.success('Custom sub-niche added!');
    } catch {
      toast.error('Failed to add custom sub-niche.');
    }
  };

  useEffect(() => {
    if (activeWorkspaceId) {
      loadExistingProfile();
    }
  }, [activeWorkspaceId]);

  const loadExistingProfile = async () => {
    try {
      const res = await api.get('/api/onboarding');
      const profile = res.data.data;
      if (profile) {
        setCompanyName(profile.companyName ?? '');
        setWebsite(profile.website ?? '');
        setIndustry(profile.industry ?? '');
        setTeamSize(profile.teamSize ?? '11-50');
        setCountry(profile.country ?? 'United States');
        setDescription(profile.description ?? '');
        setProducts(profile.products ?? []);
        setServices(profile.services ?? []);

        if (profile.onboardingStep === 'icp') setStep(2);
        if (profile.onboardingStep === 'niches') setStep(3);
        if (profile.onboardingStep === 'sub_niches') setStep(4);
        if (profile.onboardingStep === 'integrations') setStep(5);
        if (profile.onboardingStep === 'completed') {
          router.push('/dashboard/search');
        }
      }
    } catch {
      // Ignore
    }
  };

  // ─── TinyFish Prefill ──────────────────────────────────────────
  const handlePrefill = async () => {
    if (!website) {
      toast.error('Please enter a website URL.');
      return;
    }
    setPrefilling(true);
    try {
      const res = await api.post('/api/onboarding/prefill', { website });
      const data = res.data.data;
      if (data && Object.keys(data).length > 0) {
        setCompanyName(data.name ?? companyName);
        setDescription(data.description ?? description);
        setIndustry(data.industry ?? industry);
        setProducts(data.products ?? products);
        setServices(data.services ?? services);
        toast.success('Company context prefilled from TinyFish!');
      } else {
        toast.error('Could not retrieve company profile. Please fill manually.');
      }
    } catch {
      toast.error('Prefill service unavailable.');
    } finally {
      setPrefilling(false);
    }
  };

  // ─── Step 1 Save ──────────────────────────────────────────────
  const handleSaveCompany = async () => {
    if (!companyName) {
      toast.error('Company Name is required.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/onboarding/company', {
        companyName,
        website,
        industry,
        teamSize,
        country,
        description,
        products,
        services,
      });
      toast.success('Company context saved.');
      setStep(2);
    } catch {
      toast.error('Failed to save company profile.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2 Generate ICP ──────────────────────────────────────
  const handleGenerateIcp = async () => {
    setGeneratingIcp(true);
    try {
      const res = await api.post('/api/icp/generate');
      setIcp(res.data.data);
      toast.success('Ideal Customer Profile generated by AI! Please review and customize.');
    } catch {
      toast.error('Failed to generate ICP.');
    } finally {
      setGeneratingIcp(false);
    }
  };

  // ─── Step 3 Generate Niches ───────────────────────────────────
  const handleGenerateNiches = async () => {
    setGeneratingNiches(true);
    try {
      await api.post('/api/niches/generate');
      const res = await api.get('/api/niches');
      setNiches(res.data.data ?? []);
      toast.success('15 AI Market Niches discovered!');
    } catch {
      toast.error('Failed to discover niches.');
    } finally {
      setGeneratingNiches(false);
    }
  };

  const toggleNiche = async (id: string, isSelected: boolean) => {
    try {
      await api.patch(`/api/niches/${id}/select`, { isSelected });
      setNiches((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isSelected } : n))
      );
    } catch {
      toast.error('Failed to toggle selection.');
    }
  };

  // ─── Step 4 Sub-Niches ─────────────────────────────────────────
  const handleGenerateSubNiches = async (nicheId: string) => {
    setGeneratingSubNichesId(nicheId);
    try {
      const res = await api.post(`/api/niches/${nicheId}/sub-niches`);
      setSubNicheMap((prev) => ({
        ...prev,
        [nicheId]: res.data.data ?? [],
      }));
      toast.success('Target sub-niches mapped out!');
    } catch {
      toast.error('Failed to generate sub-niches.');
    } finally {
      setGeneratingSubNichesId(null);
    }
  };

  // ─── Step 5 Integrations ───────────────────────────────────────
  const handleSaveKeys = async () => {
    setSavingKeys(true);
    try {
      if (apolloKey) {
        await api.post('/api/api-keys', { provider: 'apollo', key: apolloKey });
      }
      if (apifyKey) {
        await api.post('/api/api-keys', { provider: 'apify', key: apifyKey });
      }
      await api.post('/api/onboarding/complete');
      await refreshOnboardingStatus();
      toast.success('Onboarding complete! Welcome to LeadHub.');
      router.push('/dashboard/search');
    } catch {
      toast.error('Failed to complete onboarding.');
    } finally {
      setSavingKeys(false);
    }
  };

  // ─── Products / Services helpers ──────────────────────────────
  const addProduct = () => {
    if (newProduct && !products.includes(newProduct)) {
      setProducts([...products, newProduct]);
      setNewProduct('');
    }
  };

  const addService = () => {
    if (newService && !services.includes(newService)) {
      setServices([...services, newService]);
      setNewService('');
    }
  };

  return (
    <main className="min-h-screen bg-background text-text flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ minHeight: '100vh' }}>
      {/* Stepper Header */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 z-10">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold tracking-tight text-primary">LeadHub Onboarding</h1>
          
          {/* Workspace Switcher */}
          <div className="flex items-center space-x-2 bg-card border border-border px-3 py-1.5 rounded-lg text-xs">
            <span className="text-text-300">Workspace:</span>
            <select
              value={activeWorkspaceId ?? ''}
              onChange={async (e) => {
                const val = e.target.value;
                if (val === '__new__') {
                  setShowCreateWsModal(true);
                } else if (val) {
                  setActiveWorkspaceId(val);
                }
              }}
              className="bg-transparent text-text-100 font-semibold focus:outline-none cursor-pointer"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id} className="bg-card text-text-100">
                  {ws.name}
                </option>
              ))}
              <option value="__new__" className="bg-card text-primary font-semibold">
                + Create New Workspace
              </option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
                step === s
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : step > s
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-bg-300 text-text-300 border-border'
              }`}
            >
              {step > s ? <IconCheck size={14} /> : s}
            </div>
          ))}
        </div>
      </div>

      {/* Main wizard card */}
      <div className="w-full max-w-4xl bg-card p-8 min-h-[500px] flex flex-col justify-between relative z-10 border border-border rounded-xl shadow-input">
        
        {/* ─── Step 1: Company context ───────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <IconBuilding className="text-primary" />
                <span>Tell us about your company</span>
              </h2>
              <p className="text-text-200 text-sm mt-1">
                Enter your website URL to instantly fetch profile details or describe your company manually.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-200">Website URL</label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-text-100"
                    />
                    <button
                      type="button"
                      onClick={handlePrefill}
                      disabled={prefilling}
                      className="bg-primary hover:bg-primary-200 text-white px-3 rounded-lg text-xs font-medium flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
                    >
                      {prefilling ? <IconLoader2 size={14} className="animate-spin" /> : <IconSparkles size={14} />}
                      <span>{prefilling ? 'Fetching...' : 'Prefill'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-200">Company Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Example Corp"
                    className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-text-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-200">Industry</label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="SaaS / Fintech"
                      className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-text-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-200">Team Size</label>
                    <select
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm text-text-100"
                    >
                      <option>1-10</option>
                      <option>11-50</option>
                      <option>51-200</option>
                      <option>201-500</option>
                      <option>500+</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-200">Describe what you do</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="We build B2B workflow software that saves recruiters time..."
                    className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm h-[84px] focus:outline-none focus:border-primary text-text-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-200">Products Offered</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newProduct}
                      onChange={(e) => setNewProduct(e.target.value)}
                      placeholder="Product A"
                      className="flex-1 bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-text-100"
                    />
                    <button
                      type="button"
                      onClick={addProduct}
                      className="bg-bg-300 hover:bg-bg-300/80 px-3 rounded-lg text-xs border border-border text-text-100"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {products.map((p, idx) => (
                      <span key={idx} className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 border border-primary/20 rounded-full flex items-center">
                        {p}
                        <button type="button" onClick={() => setProducts(products.filter((pr) => pr !== p))} className="ml-1 text-text-300 hover:text-error">✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="button"
                onClick={handleSaveCompany}
                disabled={loading}
                className="bg-primary hover:bg-primary-200 text-white font-medium py-2 px-6 rounded-lg text-sm flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <span>{loading ? 'Saving...' : 'Save & Continue'}</span>
                <IconChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Ideal Customer Profile ────────────────────── */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            {!icp ? (
              <div className="space-y-6 text-center py-8">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                    <IconTarget size={32} />
                  </div>
                  <h2 className="text-2xl font-bold">Build Your ICP Model</h2>
                  <p className="text-text-200 text-sm">
                    We'll analyze your products, descriptions, and industry to build a multi-parameter Ideal Customer Profile.
                  </p>

                  <button
                    type="button"
                    onClick={handleGenerateIcp}
                    disabled={generatingIcp}
                    className="w-full bg-primary hover:bg-primary-200 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {generatingIcp ? (
                      <>
                        <IconLoader2 className="animate-spin" size={18} />
                        <span>Analyzing & Modeling...</span>
                      </>
                    ) : (
                      <>
                        <IconSparkles size={18} />
                        <span>Generate AI Target Persona</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-bold flex items-center space-x-2">
                    <IconTarget className="text-primary" />
                    <span>Review & Edit ICP Model</span>
                  </h2>
                  <p className="text-text-200 text-sm mt-1">
                    Below is the AI-generated Target Persona. Customize the fields to perfectly match your Ideal Customer Profile.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[380px] overflow-y-auto pr-2">
                  {/* Card: Target Roles */}
                  <div className="bg-bg-300 p-4 border border-border rounded-xl space-y-2">
                    <label className="text-xs font-bold text-primary">Target Roles</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        placeholder="e.g. VP of Sales"
                        className="flex-1 bg-bg-200 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-100"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newRole.trim() && !icpTargetRoles.includes(newRole.trim())) {
                              setIcpTargetRoles([...icpTargetRoles, newRole.trim()]);
                              setNewRole('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newRole.trim() && !icpTargetRoles.includes(newRole.trim())) {
                            setIcpTargetRoles([...icpTargetRoles, newRole.trim()]);
                            setNewRole('');
                          }
                        }}
                        className="bg-bg-200 border border-border px-3 py-1.5 text-xs rounded-lg text-text-100 hover:bg-bg-300"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {icpTargetRoles.map((r, i) => (
                        <span key={i} className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 border border-primary/20 rounded-full flex items-center">
                          {r}
                          <button type="button" onClick={() => setIcpTargetRoles(icpTargetRoles.filter((item) => item !== r))} className="ml-1 text-text-300 hover:text-error">✕</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card: Target Industries */}
                  <div className="bg-bg-300 p-4 border border-border rounded-xl space-y-2">
                    <label className="text-xs font-bold text-primary">Target Industries</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newIndustry}
                        onChange={(e) => setNewIndustry(e.target.value)}
                        placeholder="e.g. Fintech"
                        className="flex-1 bg-bg-200 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-100"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newIndustry.trim() && !icpIndustries.includes(newIndustry.trim())) {
                              setIcpIndustries([...icpIndustries, newIndustry.trim()]);
                              setNewIndustry('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newIndustry.trim() && !icpIndustries.includes(newIndustry.trim())) {
                            setIcpIndustries([...icpIndustries, newIndustry.trim()]);
                            setNewIndustry('');
                          }
                        }}
                        className="bg-bg-200 border border-border px-3 py-1.5 text-xs rounded-lg text-text-100 hover:bg-bg-300"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {icpIndustries.map((ind, i) => (
                        <span key={i} className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 border border-primary/20 rounded-full flex items-center">
                          {ind}
                          <button type="button" onClick={() => setIcpIndustries(icpIndustries.filter((item) => item !== ind))} className="ml-1 text-text-300 hover:text-error">✕</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card: Company Sizes */}
                  <div className="bg-bg-300 p-4 border border-border rounded-xl space-y-2">
                    <label className="text-xs font-bold text-primary">Company Sizes</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newSize}
                        onChange={(e) => setNewSize(e.target.value)}
                        placeholder="e.g. 11-50"
                        className="flex-1 bg-bg-200 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-100"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newSize.trim() && !icpCompanySizes.includes(newSize.trim())) {
                              setIcpCompanySizes([...icpCompanySizes, newSize.trim()]);
                              setNewSize('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSize.trim() && !icpCompanySizes.includes(newSize.trim())) {
                            setIcpCompanySizes([...icpCompanySizes, newSize.trim()]);
                            setNewSize('');
                          }
                        }}
                        className="bg-bg-200 border border-border px-3 py-1.5 text-xs rounded-lg text-text-100 hover:bg-bg-300"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {icpCompanySizes.map((s, i) => (
                        <span key={i} className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 border border-primary/20 rounded-full flex items-center">
                          {s}
                          <button type="button" onClick={() => setIcpCompanySizes(icpCompanySizes.filter((item) => item !== s))} className="ml-1 text-text-300 hover:text-error">✕</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card: Geography */}
                  <div className="bg-bg-300 p-4 border border-border rounded-xl space-y-2">
                    <label className="text-xs font-bold text-primary">Geography</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newGeo}
                        onChange={(e) => setNewGeo(e.target.value)}
                        placeholder="e.g. United States"
                        className="flex-1 bg-bg-200 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-100"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newGeo.trim() && !icpGeography.includes(newGeo.trim())) {
                              setIcpGeography([...icpGeography, newGeo.trim()]);
                              setNewGeo('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newGeo.trim() && !icpGeography.includes(newGeo.trim())) {
                            setIcpGeography([...icpGeography, newGeo.trim()]);
                            setNewGeo('');
                          }
                        }}
                        className="bg-bg-200 border border-border px-3 py-1.5 text-xs rounded-lg text-text-100 hover:bg-bg-300"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {icpGeography.map((g, i) => (
                        <span key={i} className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 border border-primary/20 rounded-full flex items-center">
                          {g}
                          <button type="button" onClick={() => setIcpGeography(icpGeography.filter((item) => item !== g))} className="ml-1 text-text-300 hover:text-error">✕</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card: Pain Points */}
                  <div className="bg-bg-300 p-4 border border-border rounded-xl space-y-2">
                    <label className="text-xs font-bold text-primary">Pain Points Solved</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newPain}
                        onChange={(e) => setNewPain(e.target.value)}
                        placeholder="e.g. Low response rates"
                        className="flex-1 bg-bg-200 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-100"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newPain.trim() && !icpPainPoints.includes(newPain.trim())) {
                              setIcpPainPoints([...icpPainPoints, newPain.trim()]);
                              setNewPain('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newPain.trim() && !icpPainPoints.includes(newPain.trim())) {
                            setIcpPainPoints([...icpPainPoints, newPain.trim()]);
                            setNewPain('');
                          }
                        }}
                        className="bg-bg-200 border border-border px-3 py-1.5 text-xs rounded-lg text-text-100 hover:bg-bg-300"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {icpPainPoints.map((p, i) => (
                        <span key={i} className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 border border-primary/20 rounded-full flex items-center">
                          {p}
                          <button type="button" onClick={() => setIcpPainPoints(icpPainPoints.filter((item) => item !== p))} className="ml-1 text-text-300 hover:text-error">✕</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card: Exclusions */}
                  <div className="bg-bg-300 p-4 border border-border rounded-xl space-y-2">
                    <label className="text-xs font-bold text-primary">Target Exclusions</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newExclusion}
                        onChange={(e) => setNewExclusion(e.target.value)}
                        placeholder="e.g. Agencies"
                        className="flex-1 bg-bg-200 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-100"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newExclusion.trim() && !icpExclusions.includes(newExclusion.trim())) {
                              setIcpExclusions([...icpExclusions, newExclusion.trim()]);
                              setNewExclusion('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newExclusion.trim() && !icpExclusions.includes(newExclusion.trim())) {
                            setIcpExclusions([...icpExclusions, newExclusion.trim()]);
                            setNewExclusion('');
                          }
                        }}
                        className="bg-bg-200 border border-border px-3 py-1.5 text-xs rounded-lg text-text-100 hover:bg-bg-300"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {icpExclusions.map((ex, i) => (
                        <span key={i} className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 border border-primary/20 rounded-full flex items-center">
                          {ex}
                          <button type="button" onClick={() => setIcpExclusions(icpExclusions.filter((item) => item !== ex))} className="ml-1 text-text-300 hover:text-error">✕</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIcp(null)}
                    className="flex items-center space-x-1.5 text-text-200 hover:text-text-100 text-sm cursor-pointer"
                  >
                    <IconArrowLeft size={16} />
                    <span>Back to Builder</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveIcp}
                    disabled={savingIcp}
                    className="bg-primary hover:bg-primary-200 text-white font-medium py-2 px-6 rounded-lg text-sm flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  >
                    <span>{savingIcp ? 'Saving Persona...' : 'Save & Continue'}</span>
                    <IconChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Niche Discovery ───────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <IconGridPattern className="text-primary" />
                <span>Niche Discovery Strategy</span>
              </h2>
              <p className="text-text-200 text-sm mt-1">
                Generate market niches suitable for lead targeting. Select, rename, or delete niches to fit your exact targets.
              </p>
            </div>

            {niches.length === 0 ? (
              <div className="py-12 text-center max-w-sm mx-auto space-y-4">
                <button
                  type="button"
                  onClick={handleGenerateNiches}
                  disabled={generatingNiches}
                  className="w-full bg-primary hover:bg-primary-200 text-white py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {generatingNiches ? (
                    <>
                      <IconLoader2 className="animate-spin" size={18} />
                      <span>Discovering...</span>
                    </>
                  ) : (
                    <>
                      <IconSparkles size={18} />
                      <span>Discover 15 Target Niches</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
                  {niches.map((n) => {
                    const isEditing = editingNicheId === n.id;
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!isEditing) {
                            toggleNiche(n.id, !n.isSelected);
                          }
                        }}
                        className={`p-3 border rounded-xl flex flex-col justify-between transition-all relative overflow-hidden cursor-pointer min-h-[80px] ${
                          n.isSelected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border bg-bg-200 hover:border-border text-text-200'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center space-x-1.5 w-full z-10" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingNicheName}
                              onChange={(e) => setEditingNicheName(e.target.value)}
                              className="flex-1 bg-bg-300 border border-border rounded px-2 py-1 text-xs text-text-100 focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameNiche(n.id);
                                if (e.key === 'Escape') setEditingNicheId(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameNiche(n.id)}
                              className="bg-primary hover:bg-primary-200 text-white text-[10px] px-2 py-1 rounded"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs font-semibold pr-6 z-10">{n.name}</p>
                        )}

                        <div className="flex justify-end space-x-1.5 mt-2 z-10" onClick={(e) => e.stopPropagation()}>
                          {!isEditing && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNicheId(n.id);
                                  setEditingNicheName(n.name);
                                }}
                                className="text-text-300 hover:text-primary transition-colors p-1"
                                title="Rename Niche"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteNiche(n.id)}
                                className="text-text-300 hover:text-error transition-colors p-1"
                                title="Delete Niche"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>

                        {n.isSelected && !isEditing && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-[10px]">
                            ✓
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Custom Niche Form */}
                <form onSubmit={handleAddCustomNiche} className="flex space-x-2 border-t border-border pt-4">
                  <input
                    type="text"
                    value={customNicheName}
                    onChange={(e) => setCustomNicheName(e.target.value)}
                    placeholder="Create a custom target niche..."
                    className="flex-1 bg-bg-200 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-text-100"
                    disabled={addingNiche}
                  />
                  <button
                    type="submit"
                    disabled={addingNiche || !customNicheName.trim()}
                    className="bg-primary hover:bg-primary-200 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {addingNiche ? <IconLoader2 size={12} className="animate-spin" /> : <IconPlus size={12} />}
                    <span>Add Niche</span>
                  </button>
                </form>

                <div className="flex justify-between pt-6 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center space-x-1.5 text-text-200 hover:text-text-100 text-sm cursor-pointer"
                  >
                    <IconArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="bg-primary hover:bg-primary-200 text-white font-medium py-2 px-6 rounded-lg text-sm flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  >
                    <span>Next: Map Sub-Niches</span>
                    <IconChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 4: Sub-Niches ────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <IconHierarchy className="text-primary" />
                <span>Micro-Niche Mapping</span>
              </h2>
              <p className="text-text-200 text-sm mt-1">
                Drill down into chosen niches to build granular micro-targeting directories. Rename, delete, or add custom sub-niches.
              </p>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {niches.filter((n) => n.isSelected).map((n) => {
                const subs = subNicheMap[n.id] ?? [];
                return (
                  <div key={n.id} className="bg-bg-300 p-4 border border-border rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-primary">{n.name}</span>
                      {subs.length === 0 && (
                        <button
                          onClick={() => handleGenerateSubNiches(n.id)}
                          disabled={generatingSubNichesId === n.id}
                          className="bg-bg-200 hover:bg-bg-300 border border-border text-text-100 text-[10px] px-2.5 py-1.5 rounded-md flex items-center space-x-1 disabled:opacity-50 cursor-pointer"
                        >
                          {generatingSubNichesId === n.id ? (
                            <IconLoader2 size={12} className="animate-spin" />
                          ) : (
                            <IconSparkles size={12} />
                          )}
                          <span>Generate Sub-Niches</span>
                        </button>
                      )}
                    </div>
                    
                    {/* Render sub-niches */}
                    <div className="flex flex-wrap gap-1.5">
                      {subs.map((s) => {
                        const isEditing = editingSubNicheId === s.id;
                        return (
                          <span
                            key={s.id}
                            className="bg-bg-200 border border-border text-text-100 text-[10px] px-2.5 py-1 rounded-full flex items-center space-x-1.5"
                          >
                            {isEditing ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  value={editingSubNicheName}
                                  onChange={(e) => setEditingSubNicheName(e.target.value)}
                                  className="bg-bg-300 border border-border rounded px-1.5 py-0.5 text-[10px] text-text-100 focus:outline-none w-24"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameSubNiche(n.id, s.id);
                                    if (e.key === 'Escape') setEditingSubNicheId(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRenameSubNiche(n.id, s.id)}
                                  className="text-primary hover:text-primary-200 font-bold"
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <>
                                <span>{s.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubNicheId(s.id);
                                    setEditingSubNicheName(s.name);
                                  }}
                                  className="text-text-300 hover:text-primary"
                                  title="Rename Sub-niche"
                                >
                                  ✎
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubNiche(n.id, s.id)}
                                  className="text-text-300 hover:text-error font-bold"
                                  title="Delete Sub-niche"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </span>
                        );
                      })}
                    </div>

                    {/* Add Custom Sub-Niche Form */}
                    <form
                      onSubmit={(e) => handleAddCustomSubNiche(n.id, e)}
                      className="flex space-x-2 pt-2 border-t border-border/50"
                    >
                      <input
                        type="text"
                        value={customSubNicheNames[n.id] ?? ''}
                        onChange={(e) =>
                          setCustomSubNicheNames((prev) => ({
                            ...prev,
                            [n.id]: e.target.value,
                          }))
                        }
                        placeholder="Add custom sub-niche..."
                        className="flex-1 bg-bg-200 border border-border rounded-lg px-2.5 py-1 text-[10px] focus:outline-none focus:border-primary text-text-100"
                      />
                      <button
                        type="submit"
                        disabled={!(customSubNicheNames[n.id] ?? '').trim()}
                        className="bg-bg-200 hover:bg-bg-300 border border-border text-text-100 text-[10px] px-2.5 py-1 rounded-md"
                      >
                        + Add
                      </button>
                    </form>

                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center space-x-1.5 text-text-200 hover:text-text-100 text-sm cursor-pointer"
              >
                <IconArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="bg-primary hover:bg-primary-200 text-white font-medium py-2 px-6 rounded-lg text-sm flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <span>Next: Setup Integrations</span>
                <IconChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 5: Integrations Setup ────────────────────────── */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-bold flex items-center space-x-2">
                <IconPlug className="text-primary" />
                <span>Connect API Platforms</span>
              </h2>
              <p className="text-text-200 text-sm mt-1">
                Paste credentials to authorize lead collection. You can test and configure additional platforms inside Settings.
              </p>
            </div>

            <div className="space-y-4 max-w-lg">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-200">Apollo API Key</label>
                <input
                  type="password"
                  value={apolloKey}
                  onChange={(e) => setApolloKey(e.target.value)}
                  placeholder="Paste Apollo key here..."
                  className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-text-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-200">Apify API Token</label>
                <input
                  type="password"
                  value={apifyKey}
                  onChange={(e) => setApifyKey(e.target.value)}
                  placeholder="Paste Apify token here..."
                  className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-text-100"
                />
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center space-x-1.5 text-text-200 hover:text-text-100 text-sm cursor-pointer"
              >
                <IconArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleSaveKeys}
                disabled={savingKeys}
                className="bg-primary hover:bg-primary-200 text-white font-medium py-2 px-6 rounded-lg text-sm flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <span>{savingKeys ? 'Finalizing Setup...' : 'Complete Onboarding'}</span>
                <IconChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ─── Create Workspace Modal ────────────────────────────────── */}
      {showCreateWsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 animate-scale-up space-y-4">
            <div>
              <h3 className="text-lg font-bold text-text-100">Create New Workspace</h3>
              <p className="text-text-300 text-xs mt-1">
                A workspace represents a separate context for company profiles, campaigns, and lead generation lists.
              </p>
            </div>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-200">Workspace Name</label>
                <input
                  type="text"
                  required
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. Acme Sales Team"
                  className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-text-100"
                  disabled={creatingWs}
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateWsModal(false);
                    setNewWsName('');
                  }}
                  className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-text-200 hover:bg-bg-300 transition-colors"
                  disabled={creatingWs}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-200 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                  disabled={creatingWs || !newWsName.trim()}
                >
                  {creatingWs ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
