'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  IconBrandLinkedin,
  IconDotsVertical,
  IconMail,
  IconTrash,
} from '@tabler/icons-react';
import type { LeadRow } from '@/components/leads/types';
import {
  commentText,
  formatListDate,
  isFromComments,
  prospectAvatarTone,
  prospectAvatarUrl,
  prospectCompany,
  prospectDisplayName,
  prospectEmail,
  prospectInitials,
  prospectLocationLabel,
  prospectTitle,
  sourcePostAuthor,
  sourcePostSnippet,
} from './utils';

type ProspectMembersTableProps = {
  listId: string;
  leads: LeadRow[];
  checked: Set<string>;
  selectedId: string | null;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: string, checked: boolean) => void;
  onSelect: (id: string) => void;
  onRemove: (ids: string[]) => void;
};

export function ProspectMembersTable({
  listId,
  leads,
  checked,
  selectedId,
  onToggleAll,
  onToggleOne,
  onSelect,
  onRemove,
}: ProspectMembersTableProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const allChecked = leads.length > 0 && leads.every((lead) => checked.has(lead.id));

  useEffect(() => {
    if (!menuOpenId) return;
    const onDoc = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpenId]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-11" />
          <col className="w-[24%]" />
          <col className="w-[14%]" />
          <col className="w-[13%]" />
          <col className="w-[18%]" />
          <col className="w-[16%]" />
          <col className="w-12" />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <th className="px-3 py-2.5">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(event) => onToggleAll(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-brand-main"
                aria-label="Select all"
              />
            </th>
            <th className="px-3 py-2.5 font-semibold">Prospect</th>
            <th className="px-3 py-2.5 font-semibold">Company</th>
            <th className="px-3 py-2.5 font-semibold">Location</th>
            <th className="px-3 py-2.5 font-semibold">Source</th>
            <th className="px-3 py-2.5 font-semibold">Contact</th>
            <th className="px-2 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const name = prospectDisplayName(lead);
            const title = prospectTitle(lead);
            const company = prospectCompany(lead);
            const location = prospectLocationLabel(lead);
            const email = prospectEmail(lead);
            const linkedin = lead.contact?.linkedinUrl?.trim() || '';
            const avatarUrl = prospectAvatarUrl(lead);
            const open = menuOpenId === lead.id;
            const selected = selectedId === lead.id;

            return (
              <tr
                key={lead.id}
                className={`group border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50 ${
                  selected ? 'bg-blue-50/60 hover:bg-blue-50/80' : 'bg-white'
                }`}
                onClick={() => onSelect(lead.id)}
              >
                <td className="px-3 py-2.5 align-middle" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={checked.has(lead.id)}
                    onChange={(event) => onToggleOne(lead.id, event.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-brand-main"
                    aria-label={`Select ${name}`}
                  />
                </td>

                <td className="px-3 py-2.5 align-middle">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${prospectAvatarTone(lead.id || name)}`}
                      >
                        {prospectInitials(lead)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold leading-5 text-slate-900">{name}</p>
                      <p
                        className="truncate text-xs leading-4 text-slate-500"
                        title={title === '—' ? undefined : title}
                      >
                        {title === '—' ? 'No title' : title}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-3 py-2.5 align-middle">
                  <p className="truncate text-[13px] text-slate-700" title={company === '—' ? undefined : company}>
                    {company}
                  </p>
                </td>

                <td className="px-3 py-2.5 align-middle">
                  <p className="truncate text-[13px] text-slate-600" title={location === '—' ? undefined : location}>
                    {location}
                  </p>
                </td>

                <td className="px-3 py-2.5 align-middle">
                  {isFromComments(lead) ? (
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold leading-4 text-slate-800">
                        Comment{commentText(lead) ? `: “${commentText(lead).slice(0, 28)}${commentText(lead).length > 28 ? '…' : ''}”` : ''}
                      </p>
                      <p
                        className="truncate text-[11px] leading-4 text-slate-500"
                        title={[sourcePostAuthor(lead), sourcePostSnippet(lead, 120)].filter(Boolean).join(' · ')}
                      >
                        {sourcePostAuthor(lead)
                          ? `Post by ${sourcePostAuthor(lead)}`
                          : 'From post comments'}
                        {sourcePostSnippet(lead) ? ` · ${sourcePostSnippet(lead, 40)}` : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium leading-4 text-slate-800">In list</p>
                        <p className="truncate text-[11px] leading-4 text-slate-500">
                          {formatListDate(lead.createdAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </td>

                <td className="px-3 py-2.5 align-middle">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {email ? (
                      <span
                        className="inline-flex min-w-0 items-center gap-1 truncate text-[12px] font-medium text-slate-700"
                        title={email}
                      >
                        <IconMail size={13} className="shrink-0 text-slate-400" />
                        <span className="truncate">{email}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[12px] text-slate-400">
                        <IconMail size={13} />
                        No email
                      </span>
                    )}
                    {linkedin ? (
                      <a
                        href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="shrink-0 rounded p-0.5 text-[#0A66C2] hover:bg-blue-50"
                        aria-label="Open LinkedIn"
                        title="Open LinkedIn"
                      >
                        <IconBrandLinkedin size={15} />
                      </a>
                    ) : null}
                  </div>
                </td>

                <td
                  className="relative px-2 py-2.5 text-right align-middle"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setMenuOpenId(open ? null : lead.id)}
                    className={`rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 ${
                      open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                    }`}
                    aria-label="Row actions"
                  >
                    <IconDotsVertical size={15} />
                  </button>
                  {open ? (
                    <div
                      ref={menuRef}
                      className="absolute right-2 top-9 z-30 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
                    >
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          onSelect(lead.id);
                          setMenuOpenId(null);
                        }}
                      >
                        View details
                      </button>
                      <Link
                        href={`/dashboard/prospect-lists/${listId}/prospects/${lead.id}`}
                        className="block w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        onClick={() => setMenuOpenId(null)}
                      >
                        Open full page
                      </Link>
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                        onClick={() => {
                          setMenuOpenId(null);
                          onRemove([lead.id]);
                        }}
                      >
                        <IconTrash size={13} />
                        Remove from list
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
