'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  IconBrandLinkedin,
  IconBuilding,
  IconExternalLink,
  IconMail,
  IconMapPin,
  IconPencil,
  IconPhone,
  IconStack2,
  IconX,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { LeadList, LeadRow } from '@/components/leads/types';
import { BodyPortal } from '@/components/ui/BodyPortal';
import {
  errorMessage,
  formatListDate,
  linkedInHostPath,
  prospectAvatarUrl,
  prospectCompany,
  prospectDisplayName,
  prospectEmail,
  prospectInitials,
  prospectLocationLabel,
  prospectTitle,
} from './utils';

type DrawerTab = 'details' | 'activity' | 'notes';

type EditableField =
  | 'firstName'
  | 'lastName'
  | 'linkedinUrl'
  | 'company'
  | 'role'
  | 'email'
  | 'phone'
  | 'location';

type ProspectDrawerProps = {
  open: boolean;
  lead: LeadRow | null;
  list?: LeadList | null;
  lists?: LeadList[];
  onClose: () => void;
  onUpdated: (lead: LeadRow) => void;
  fullPageHref?: string;
};

function DetailRow({
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
    <div className="border-b border-slate-100 py-3.5 last:border-b-0">
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
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
              />
            ) : (
              <input
                autoFocus
                value={draft}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-900 outline-none focus:border-blue-300 focus:bg-white"
              />
            )
          ) : (
            <p className="mt-1 break-words text-sm font-medium text-slate-900">{value || '—'}</p>
          )}
        </div>
        {editing ? (
          <div className="flex shrink-0 gap-1.5 pt-5">
            <button
              type="button"
              onClick={onSave}
              className="rounded-lg bg-brand-main px-2.5 py-1.5 text-xs font-semibold text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600"
            >
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

export function ProspectDrawer({
  open,
  lead,
  list,
  lists = [],
  onClose,
  onUpdated,
  fullPageHref,
}: ProspectDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('details');
  const [saving, setSaving] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!open) return;
    setTab('details');
    setEditing(null);
    setNotesDraft(lead?.notes ?? '');
  }, [open, lead?.id, lead?.notes]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const memberships = useMemo(() => {
    if (!lead) return [];
    if (list) return [list];
    return lists;
  }, [lead, list, lists]);

  if (!open || !lead) return null;

  const name = prospectDisplayName(lead);
  const title = prospectTitle(lead);
  const company = prospectCompany(lead);
  const email = prospectEmail(lead);
  const location = prospectLocationLabel(lead);
  const linkedin = lead.contact?.linkedinUrl?.trim() || '';
  const phone = lead.contact?.phone?.trim() || '';
  const avatarUrl = prospectAvatarUrl(lead);

  const startEdit = (field: EditableField, value: string) => {
    setEditing(field);
    setDraft(value);
  };

  const saveField = async (field: EditableField) => {
    setSaving(true);
    try {
      const payload =
        field === 'company'
          ? { company: { name: draft.trim() || undefined } }
          : {
              contact: {
                [field]: draft.trim(),
              },
            };
      const res = await api.patch(`/api/leads/${lead.id}`, payload);
      const updated = (res.data.data ?? { ...lead }) as LeadRow;
      onUpdated(updated);
      setEditing(null);
      toast.success('Prospect updated.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update prospect.'));
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/api/leads/${lead.id}`, { notes: notesDraft });
      const updated = (res.data.data ?? { ...lead, notes: notesDraft }) as LeadRow;
      onUpdated(updated);
      toast.success('Notes saved.');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save notes.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onClick={onClose}>
        <aside
          role="dialog"
          aria-label="Prospect details"
          className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-main/10 text-sm font-bold text-brand-main">
                    {prospectInitials(lead)}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-slate-950">{name}</h2>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{title === '—' ? 'No title' : title}</p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
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
              {fullPageHref ? (
                <Link
                  href={fullPageHref}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  aria-label="Open full page"
                >
                  <IconExternalLink size={18} />
                </Link>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <IconX size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-200 px-5 py-3 sm:grid-cols-4">
            <SummaryChip icon={<IconBuilding size={14} />} label="Company" value={company} />
            <SummaryChip icon={<IconMail size={14} />} label="Email" value={email || '—'} />
            <SummaryChip icon={<IconPhone size={14} />} label="Phone" value={phone || '—'} />
            <SummaryChip
              icon={<IconStack2 size={14} />}
              label="Lists"
              value={memberships.length ? `${memberships.length} list${memberships.length === 1 ? '' : 's'}` : '—'}
            />
          </div>

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
                className={`border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
                  tab === id
                    ? 'border-brand-main text-brand-main'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
            {tab === 'details' ? (
              <div>
                <DetailRow
                  label="First name"
                  value={lead.contact?.firstName ?? ''}
                  editing={editing === 'firstName'}
                  draft={draft}
                  onEdit={() => startEdit('firstName', lead.contact?.firstName ?? '')}
                  onChange={setDraft}
                  onSave={() => void saveField('firstName')}
                  onCancel={() => setEditing(null)}
                />
                <DetailRow
                  label="Last name"
                  value={lead.contact?.lastName ?? ''}
                  editing={editing === 'lastName'}
                  draft={draft}
                  onEdit={() => startEdit('lastName', lead.contact?.lastName ?? '')}
                  onChange={setDraft}
                  onSave={() => void saveField('lastName')}
                  onCancel={() => setEditing(null)}
                />
                <DetailRow
                  label="LinkedIn"
                  value={linkedInHostPath(linkedin)}
                  editing={editing === 'linkedinUrl'}
                  draft={draft}
                  onEdit={() => startEdit('linkedinUrl', linkedin)}
                  onChange={setDraft}
                  onSave={() => void saveField('linkedinUrl')}
                  onCancel={() => setEditing(null)}
                />
                <DetailRow
                  label="Company"
                  value={company === '—' ? '' : company}
                  editing={editing === 'company'}
                  draft={draft}
                  onEdit={() => startEdit('company', company === '—' ? '' : company)}
                  onChange={setDraft}
                  onSave={() => void saveField('company')}
                  onCancel={() => setEditing(null)}
                />
                <DetailRow
                  label="Title"
                  value={title === '—' ? '' : title}
                  editing={editing === 'role'}
                  draft={draft}
                  onEdit={() => startEdit('role', title === '—' ? '' : title)}
                  onChange={setDraft}
                  onSave={() => void saveField('role')}
                  onCancel={() => setEditing(null)}
                  multiline
                />
                <DetailRow
                  label="Email"
                  value={email}
                  editing={editing === 'email'}
                  draft={draft}
                  onEdit={() => startEdit('email', email)}
                  onChange={setDraft}
                  onSave={() => void saveField('email')}
                  onCancel={() => setEditing(null)}
                />
                <DetailRow
                  label="Phone"
                  value={phone}
                  editing={editing === 'phone'}
                  draft={draft}
                  onEdit={() => startEdit('phone', phone)}
                  onChange={setDraft}
                  onSave={() => void saveField('phone')}
                  onCancel={() => setEditing(null)}
                />
                <div className="border-b border-slate-100 py-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Lists</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {memberships.length === 0 ? (
                      <span className="text-sm text-slate-500">—</span>
                    ) : (
                      memberships.map((item) => (
                        <Link
                          key={item.id}
                          href={`/dashboard/prospect-lists/${item.id}`}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-brand-main"
                        >
                          {item.name}
                        </Link>
                      ))
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
              <div className="space-y-3 py-3">
                <ActivityRow
                  label="Added"
                  detail={formatListDate(lead.createdAt)}
                />
                <ActivityRow
                  label="Source"
                  detail={lead.source?.replace(/_/g, ' ') || '—'}
                />
                <ActivityRow
                  label="Pipeline"
                  detail={lead.pipelineStage?.replace(/_/g, ' ') || '—'}
                />
                <ActivityRow
                  label="Enrichment"
                  detail={lead.enrichmentStatus?.replace(/_/g, ' ') || 'Not enriched'}
                />
                {lead.notes ? <ActivityRow label="Latest note" detail={lead.notes} /> : null}
              </div>
            ) : null}

            {tab === 'notes' ? (
              <div className="py-3">
                <textarea
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  rows={10}
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
        </aside>
      </div>
    </BodyPortal>
  );
}

function SummaryChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ActivityRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{detail}</p>
    </div>
  );
}
