'use client';

import React, { useMemo, useState } from 'react';
import { IconLoader2, IconPlus, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { btnNavy, btnOutline, inputClass } from '../ui/styles';
import { BodyPortal } from '../ui/BodyPortal';
import CreatableSelect from '../common/CreatableSelect';
import { companyDomainFromEmail } from '../../lib/lead-field-mapping';
import { PIPELINE_STAGES, PRIORITIES, type LeadCategory, type LeadList, type PipelineStage, type Priority } from './types';

type SelectOption = { id: string; name: string; color?: string };

type AddLeadModalProps = {
  open: boolean;
  onClose: () => void;
  categories: LeadCategory[];
  lists: LeadList[];
  onCreated: () => void | Promise<void>;
  onListCreated?: (list: LeadList) => void;
  onCategoryCreated?: (category: LeadCategory) => void;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone: string;
  linkedinUrl: string;
  contactLocation: string;
  companyName: string;
  domain: string;
  companyLinkedin: string;
  industry: string;
  companyLocation: string;
  notes: string;
  priority: Priority;
  pipelineStage: PipelineStage;
  categoryId: string;
  listId: string;
};

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  role: '',
  phone: '',
  linkedinUrl: '',
  contactLocation: '',
  companyName: '',
  domain: '',
  companyLinkedin: '',
  industry: '',
  companyLocation: '',
  notes: '',
  priority: 'unknown',
  pipelineStage: 'new',
  categoryId: '',
  listId: '',
};

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

function trimOrUndefined(value: string) {
  const next = value.trim();
  return next ? next : undefined;
}

export function AddLeadModal({
  open,
  onClose,
  categories,
  lists,
  onCreated,
  onListCreated,
  onCategoryCreated,
}: AddLeadModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [extraLists, setExtraLists] = useState<SelectOption[]>([]);
  const [extraCategories, setExtraCategories] = useState<SelectOption[]>([]);
  const [creatingList, setCreatingList] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const listOptions = useMemo(() => {
    const byId = new Map<string, SelectOption>();
    for (const list of lists) byId.set(list.id, { id: list.id, name: list.name });
    for (const opt of extraLists) byId.set(opt.id, opt);
    return Array.from(byId.values());
  }, [lists, extraLists]);

  const categoryOptions = useMemo(() => {
    const byId = new Map<string, SelectOption>();
    for (const cat of categories) {
      byId.set(cat.id, { id: cat.id, name: cat.name, color: cat.color });
    }
    for (const opt of extraCategories) byId.set(opt.id, opt);
    return Array.from(byId.values());
  }, [categories, extraCategories]);

  const selectedList = form.listId ? listOptions.filter((item) => item.id === form.listId) : [];
  const selectedCategory = form.categoryId
    ? categoryOptions.filter((item) => item.id === form.categoryId)
    : [];

  if (!open) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateList = async (name: string): Promise<SelectOption> => {
    setCreatingList(true);
    try {
      const res = await api.post('/api/lists', { name });
      const created = res.data.data as LeadList;
      const option = { id: created.id, name: created.name };
      setExtraLists((prev) => (prev.some((item) => item.id === created.id) ? prev : [...prev, option]));
      onListCreated?.(created);
      toast.success(`List "${created.name}" created`);
      return option;
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create list'));
      throw err;
    } finally {
      setCreatingList(false);
    }
  };

  const handleCreateCategory = async (name: string): Promise<SelectOption> => {
    setCreatingCategory(true);
    try {
      const res = await api.post('/api/categories', { name, color: '#3b82f6' });
      const created = res.data.data as LeadCategory;
      const option = { id: created.id, name: created.name, color: created.color };
      setExtraCategories((prev) =>
        prev.some((item) => item.id === created.id) ? prev : [...prev, option],
      );
      onCategoryCreated?.(created);
      toast.success(`Category "${created.name}" created`);
      return option;
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create category'));
      throw err;
    } finally {
      setCreatingCategory(false);
    }
  };

  const resetAndClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const companyName = trimOrUndefined(form.companyName);
    const email = trimOrUndefined(form.email);
    const firstName = trimOrUndefined(form.firstName);
    const lastName = trimOrUndefined(form.lastName);
    const domain = trimOrUndefined(form.domain);
    const location =
      trimOrUndefined(form.contactLocation) || trimOrUndefined(form.companyLocation);

    const companyLinkedin = trimOrUndefined(form.companyLinkedin);

    // A lead has to name a company somehow, or enrichment has nothing to
    // research. A contact name or a location on its own is not enough.
    if (!companyName && !domain && !companyLinkedin && !companyDomainFromEmail(email)) {
      toast.error(
        'Add a company website, company name, or company LinkedIn URL — a contact name alone cannot be enriched.',
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        source: 'manual' as const,
        notes: trimOrUndefined(form.notes) ?? null,
        priority: form.priority,
        pipelineStage: form.pipelineStage,
        categoryId: form.categoryId || null,
        company: {
          name: companyName,
          domain,
          linkedin: companyLinkedin,
          industry: trimOrUndefined(form.industry),
          location: trimOrUndefined(form.companyLocation) || location,
        },
        contact: {
          firstName,
          lastName,
          email: email ?? '',
          role: trimOrUndefined(form.role),
          phone: trimOrUndefined(form.phone),
          linkedinUrl: trimOrUndefined(form.linkedinUrl),
          location: trimOrUndefined(form.contactLocation) || location,
        },
      };

      const res = await api.post('/api/leads', payload);
      const leadId: string | undefined = res.data.data?.id;

      if (leadId && form.listId) {
        await api.post(`/api/leads/${leadId}/lists`, { listId: form.listId });
      }

      toast.success('Lead added.');
      setForm(EMPTY_FORM);
      onClose();
      await onCreated();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not add lead.'));
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, children: React.ReactNode) => (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex max-h-[90vh] w-[640px] max-w-full flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        >
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                <IconPlus className="text-brand-main" size={18} /> Add lead
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Create a single manual lead. Company name or contact details are enough to start.
              </p>
            </div>
            <button
              type="button"
              onClick={resetAndClose}
              className="cursor-pointer text-slate-400 transition hover:text-slate-650"
            >
              <IconX size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto py-4 pr-1 thin-scrollbar">
            <section className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Contact</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {field(
                  'First name',
                  <input
                    value={form.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    className={inputClass}
                    placeholder="Alex"
                    autoFocus
                  />,
                )}
                {field(
                  'Last name',
                  <input
                    value={form.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    className={inputClass}
                    placeholder="Rivera"
                  />,
                )}
                {field(
                  'Email',
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className={inputClass}
                    placeholder="alex@acme.com"
                  />,
                )}
                {field(
                  'Title / role',
                  <input
                    value={form.role}
                    onChange={(e) => update('role', e.target.value)}
                    className={inputClass}
                    placeholder="VP Sales"
                  />,
                )}
                {field(
                  'Phone',
                  <input
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    className={inputClass}
                    placeholder="+1 555 0100"
                  />,
                )}
                {field(
                  'LinkedIn URL',
                  <input
                    value={form.linkedinUrl}
                    onChange={(e) => update('linkedinUrl', e.target.value)}
                    className={inputClass}
                    placeholder="https://linkedin.com/in/…"
                  />,
                )}
                <div className="sm:col-span-2">
                  {field(
                    'Contact location',
                    <input
                      value={form.contactLocation}
                      onChange={(e) => update('contactLocation', e.target.value)}
                      className={inputClass}
                      placeholder="Austin, TX"
                    />,
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-3 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Company</h4>
              <p className="text-xs leading-5 text-slate-500">
                The website is the single most useful field — with it, enrichment looks the
                company up directly instead of guessing from the name.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {field(
                  'Website / domain',
                  <input
                    value={form.domain}
                    onChange={(e) => update('domain', e.target.value)}
                    className={inputClass}
                    placeholder="acme.com"
                  />,
                )}
                {field(
                  'Company name',
                  <input
                    value={form.companyName}
                    onChange={(e) => update('companyName', e.target.value)}
                    className={inputClass}
                    placeholder="Acme Inc"
                  />,
                )}
                {field(
                  'Company LinkedIn',
                  <input
                    value={form.companyLinkedin}
                    onChange={(e) => update('companyLinkedin', e.target.value)}
                    className={inputClass}
                    placeholder="linkedin.com/company/acme-inc"
                  />,
                )}
                {field(
                  'Industry',
                  <input
                    value={form.industry}
                    onChange={(e) => update('industry', e.target.value)}
                    className={inputClass}
                    placeholder="SaaS"
                  />,
                )}
                {field(
                  'Company location',
                  <input
                    value={form.companyLocation}
                    onChange={(e) => update('companyLocation', e.target.value)}
                    className={inputClass}
                    placeholder="San Francisco, CA"
                  />,
                )}
              </div>
            </section>

            <section className="space-y-3 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Organize</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {field(
                  'Pipeline stage',
                  <select
                    value={form.pipelineStage}
                    onChange={(e) => update('pipelineStage', e.target.value as PipelineStage)}
                    className={inputClass}
                  >
                    {PIPELINE_STAGES.map((stage) => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>,
                )}
                {field(
                  'Priority',
                  <select
                    value={form.priority}
                    onChange={(e) => update('priority', e.target.value as Priority)}
                    className={inputClass}
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </option>
                    ))}
                  </select>,
                )}
                {field(
                  'Category',
                  <CreatableSelect
                    options={categoryOptions}
                    value={selectedCategory}
                    onChange={(selected) => update('categoryId', selected[0]?.id ?? '')}
                    onCreateNew={handleCreateCategory}
                    isMulti={false}
                    isLoading={creatingCategory}
                    placeholder="Select or create category"
                  />,
                )}
                {field(
                  'List',
                  <CreatableSelect
                    options={listOptions}
                    value={selectedList}
                    onChange={(selected) => update('listId', selected[0]?.id ?? '')}
                    onCreateNew={handleCreateList}
                    isMulti={false}
                    isLoading={creatingList}
                    placeholder="Select or create list"
                  />,
                )}
                <div className="sm:col-span-2">
                  {field(
                    'Notes',
                    <textarea
                      value={form.notes}
                      onChange={(e) => update('notes', e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Context for outreach…"
                    />,
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={resetAndClose} className={btnOutline} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={btnNavy} disabled={saving}>
              {saving ? <IconLoader2 className="animate-spin" size={16} /> : <IconPlus size={16} />}
              {saving ? 'Saving…' : 'Add lead'}
            </button>
          </div>
        </form>
      </div>
    </BodyPortal>
  );
}
