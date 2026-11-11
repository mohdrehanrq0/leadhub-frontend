'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  IconArrowLeft,
  IconBrandLinkedin,
  IconBuilding,
  IconDotsVertical,
  IconMail,
  IconMapPin,
  IconPencil,
  IconPhone,
  IconStack2,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { LeadList, LeadRow } from '@/components/leads/types';
import {
  errorMessage,
  formatListDate,
  linkedInHostPath,
  prospectCompany,
  prospectDisplayName,
  prospectEmail,
  prospectInitials,
  prospectLocationLabel,
  prospectTitle,
} from '@/components/prospects/utils';

type Tab = 'details' | 'activity' | 'notes';
type EditableField =
  | 'firstName'
  | 'lastName'
  | 'linkedinUrl'
  | 'company'
  | 'role'
  | 'email'
  | 'phone'
  | 'location';

export default function ProspectFullPage() {
  const { id: listId, leadId } = useParams() as { id: string; leadId: string };
  const [lead, setLead] = useState<LeadRow | null>(null);
  const [list, setList] = useState<LeadList | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('details');
  const [notesDraft, setNotesDraft] = useState('');
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [leadRes, listsRes] = await Promise.all([
        api.get(`/api/leads/${leadId}`),
        api.get('/api/lists'),
      ]);
      const leadData = leadRes.data.data as LeadRow;
      setLead(leadData);
      setNotesDraft(leadData.notes ?? '');
      const found = ((listsRes.data.data ?? []) as LeadList[]).find((item) => item.id === listId) ?? null;
      setList(found);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load prospect.'));
    } finally {
      setLoading(false);
    }
  }, [leadId, listId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveField = async (field: EditableField) => {
    if (!lead) return;
    setSaving(true);
    try {
      const payload =
        field === 'company'
          ? { company: { name: draft.trim() || undefined } }
          : { contact: { [field]: draft.trim() } };
      const res = await api.patch(`/api/leads/${lead.id}`, payload);
      setLead(res.data.data ?? lead);
      setEditing(null);
      toast.success('Prospect updated.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update prospect.'));
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await api.patch(`/api/leads/${lead.id}`, { notes: notesDraft });
      setLead(res.data.data ?? { ...lead, notes: notesDraft });
      toast.success('Notes saved.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save notes.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="h-8 w-40 skeleton" />
        <div className="h-36 skeleton rounded-2xl" />
        <div className="h-72 skeleton rounded-2xl" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="animate-fade-in space-y-4">
        <Link
          href={`/dashboard/prospect-lists/${listId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
        >
          <IconArrowLeft size={14} /> Back to list
        </Link>
        <p className="text-sm text-slate-600">Prospect not found.</p>
      </div>
    );
  }

  const name = prospectDisplayName(lead);
  const title = prospectTitle(lead);
  const company = prospectCompany(lead);
  const email = prospectEmail(lead);
  const phone = lead.contact?.phone?.trim() || '';
  const location = prospectLocationLabel(lead);
  const linkedin = lead.contact?.linkedinUrl?.trim() || '';

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/dashboard/prospect-lists/${listId}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
        >
          <IconArrowLeft size={14} /> Back to prospects
        </Link>
        <div className="flex items-center gap-1">
          {linkedin ? (
            <a
              href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0A66C2]"
              aria-label="Open LinkedIn"
            >
              <IconBrandLinkedin size={18} />
            </a>
          ) : null}
          <span className="rounded-lg p-2 text-slate-300">
            <IconDotsVertical size={18} />
          </span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(0,0.7fr))]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-main/10 text-sm font-bold text-brand-main">
              {prospectInitials(lead)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-950">{name}</h1>
              <p className="mt-1 text-sm leading-5 text-slate-500">{title === '—' ? 'No title' : title}</p>
            </div>
          </div>
        </div>
        <SummaryCard icon={<IconBuilding size={15} />} label="Company" value={company} />
        <SummaryCard icon={<IconMail size={15} />} label="Email" value={email || '—'} />
        <SummaryCard icon={<IconPhone size={15} />} label="Phone" value={phone || '—'} />
        <SummaryCard
          icon={<IconStack2 size={15} />}
          label="Lists"
          value={list ? `1 list · Added ${formatListDate(list.createdAt)}` : '—'}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-1 border-b border-slate-200 px-5">
          {(
            [
              ['details', 'Details'],
              ['activity', 'Activity'],
              ['notes', 'Notes'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`border-b-2 px-3 py-3.5 text-sm font-semibold transition-colors ${
                tab === id
                  ? 'border-brand-main text-brand-main'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-5 py-2">
          {tab === 'details' ? (
            <div>
              <FieldRow
                label="First name"
                value={lead.contact?.firstName ?? ''}
                editing={editing === 'firstName'}
                draft={draft}
                onEdit={() => {
                  setEditing('firstName');
                  setDraft(lead.contact?.firstName ?? '');
                }}
                onChange={setDraft}
                onSave={() => void saveField('firstName')}
                onCancel={() => setEditing(null)}
              />
              <FieldRow
                label="Last name"
                value={lead.contact?.lastName ?? ''}
                editing={editing === 'lastName'}
                draft={draft}
                onEdit={() => {
                  setEditing('lastName');
                  setDraft(lead.contact?.lastName ?? '');
                }}
                onChange={setDraft}
                onSave={() => void saveField('lastName')}
                onCancel={() => setEditing(null)}
              />
              <FieldRow
                label="LinkedIn"
                value={linkedInHostPath(linkedin)}
                editing={editing === 'linkedinUrl'}
                draft={draft}
                onEdit={() => {
                  setEditing('linkedinUrl');
                  setDraft(linkedin);
                }}
                onChange={setDraft}
                onSave={() => void saveField('linkedinUrl')}
                onCancel={() => setEditing(null)}
              />
              <FieldRow
                label="Company"
                value={company === '—' ? '' : company}
                editing={editing === 'company'}
                draft={draft}
                onEdit={() => {
                  setEditing('company');
                  setDraft(company === '—' ? '' : company);
                }}
                onChange={setDraft}
                onSave={() => void saveField('company')}
                onCancel={() => setEditing(null)}
              />
              <FieldRow
                label="Title"
                value={title === '—' ? '' : title}
                editing={editing === 'role'}
                draft={draft}
                onEdit={() => {
                  setEditing('role');
                  setDraft(title === '—' ? '' : title);
                }}
                onChange={setDraft}
                onSave={() => void saveField('role')}
                onCancel={() => setEditing(null)}
                multiline
              />
              <FieldRow
                label="Email"
                value={email}
                editing={editing === 'email'}
                draft={draft}
                onEdit={() => {
                  setEditing('email');
                  setDraft(email);
                }}
                onChange={setDraft}
                onSave={() => void saveField('email')}
                onCancel={() => setEditing(null)}
              />
              <FieldRow
                label="Phone"
                value={phone}
                editing={editing === 'phone'}
                draft={draft}
                onEdit={() => {
                  setEditing('phone');
                  setDraft(phone);
                }}
                onChange={setDraft}
                onSave={() => void saveField('phone')}
                onCancel={() => setEditing(null)}
              />
              <div className="border-b border-slate-100 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Lists</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {list ? (
                    <Link
                      href={`/dashboard/prospect-lists/${list.id}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-brand-main"
                    >
                      {list.name}
                    </Link>
                  ) : (
                    <span className="text-sm text-slate-500">—</span>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2 py-4 text-sm text-slate-600">
                <IconMapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                <span>{location}</span>
              </div>
            </div>
          ) : null}

          {tab === 'activity' ? (
            <div className="space-y-3 py-4">
              <InfoBlock label="Added" value={formatListDate(lead.createdAt)} />
              <InfoBlock label="Source" value={lead.source?.replace(/_/g, ' ') || '—'} />
              <InfoBlock label="Pipeline" value={lead.pipelineStage?.replace(/_/g, ' ') || '—'} />
              <InfoBlock
                label="Enrichment"
                value={lead.enrichmentStatus?.replace(/_/g, ' ') || 'Not enriched'}
              />
            </div>
          ) : null}

          {tab === 'notes' ? (
            <div className="py-4">
              <textarea
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                rows={12}
                placeholder="Add notes about this prospect…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-blue-300 focus:bg-white"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={saving || notesDraft === (lead.notes ?? '')}
                  onClick={() => void saveNotes()}
                  className="h-10 rounded-xl bg-brand-main px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save notes'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function FieldRow({
  label,
  value,
  editing,
  draft,
  onEdit,
  onChange,
  onSave,
  onCancel,
  multiline,
}: {
  label: string;
  value: string;
  editing: boolean;
  draft: string;
  onEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  multiline?: boolean;
}) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          {editing ? (
            multiline ? (
              <textarea
                autoFocus
                value={draft}
                onChange={(event) => onChange(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm outline-none focus:border-blue-300 focus:bg-white"
              />
            ) : (
              <input
                autoFocus
                value={draft}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm outline-none focus:border-blue-300 focus:bg-white"
              />
            )
          ) : (
            <p className="mt-1 break-words text-sm font-medium text-slate-900">{value || '—'}</p>
          )}
        </div>
        {editing ? (
          <div className="flex shrink-0 gap-1.5 pt-5">
            <button type="button" onClick={onSave} className="rounded-lg bg-brand-main px-2.5 py-1.5 text-xs font-semibold text-white">
              Save
            </button>
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <IconPencil size={13} /> Edit
          </button>
        )}
      </div>
    </div>
  );
}
