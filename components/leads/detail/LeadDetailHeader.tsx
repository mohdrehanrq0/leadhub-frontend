'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconDots, IconMail, IconSparkles, IconTrash } from '@tabler/icons-react';
import { EnrichmentAgentPicker } from '../EnrichmentAgentPicker';
import { LinkedInLink } from '../LinkedInLink';
import { ClampText, GenericInboxTag } from './primitives';
import { isGenericInbox, statusChips, type AgentRef } from './model';
import type { EmailEntry, LeadDetail } from './types';

export function LeadDetailHeader({
  lead,
  name,
  title,
  company,
  email,
  personLinkedIn,
  companyLinkedIn,
  agentId,
  onAgentChange,
  onAgentPicked,
  mission,
  onReEnrich,
  reEnriching,
  canEnrich,
  enrichDisabled,
  onDelete,
  deleting,
  enriching,
  onFindEmail,
}: {
  lead: LeadDetail;
  name: string;
  title: string;
  company: string;
  email: EmailEntry | null;
  personLinkedIn: string | null;
  companyLinkedIn: string | null;
  agentId: string;
  onAgentChange: (id: string) => void;
  onAgentPicked: (agent: AgentRef) => void;
  mission: string;
  onReEnrich: () => void;
  reEnriching: boolean;
  canEnrich: boolean;
  enrichDisabled?: string | null;
  onDelete: () => void;
  deleting: boolean;
  enriching: boolean;
  onFindEmail: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMission, setShowMission] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const chips = statusChips(lead);
  const generic = email ? isGenericInbox(email.email) : false;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="min-w-0">
      <Link
        href="/dashboard/leads"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
      >
        <IconArrowLeft size={14} /> All leads
      </Link>
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-linear-to-br from-blue-600 via-indigo-600 to-violet-600 text-lg font-semibold text-white">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-950">{name}</h1>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {[title || 'No title', company || 'No company'].join(' · ')}
              </p>
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                {email ? (
                  <a
                    href={`mailto:${email.email}`}
                    title={email.email}
                    className="inline-flex h-6 max-w-[240px] min-w-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700 hover:border-slate-300"
                  >
                    <IconMail size={12} className="shrink-0 text-slate-400" />
                    <span className="truncate">{email.email}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={onFindEmail}
                    disabled={enriching || !canEnrich}
                    title={enrichDisabled ?? 'Look up an email'}
                    className="inline-flex h-6 items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 text-xs font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50"
                  >
                    <IconMail size={12} /> Find email
                  </button>
                )}
                {generic ? <GenericInboxTag /> : null}
                {personLinkedIn ? (
                  <LinkedInLink url={personLinkedIn} kind="person" label="Person" compact className="h-6 rounded-full px-2.5 py-0" />
                ) : null}
                {companyLinkedIn ? (
                  <LinkedInLink url={companyLinkedIn} kind="company" label="Company" compact className="h-6 rounded-full px-2.5 py-0" />
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {chips.map((chip) => (
                  <span
                    key={chip.key}
                    className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${chip.tone}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onReEnrich}
              disabled={!canEnrich || reEnriching || deleting || enriching}
              title={canEnrich ? undefined : (enrichDisabled ?? undefined)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <IconSparkles size={15} className={reEnriching || enriching ? 'animate-pulse' : ''} />
              {enriching ? 'Enriching' : reEnriching ? 'Starting' : 'Re-enrich'}
            </button>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="More actions"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                <IconDots size={16} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-72 min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                  <p className="text-[11px] uppercase tracking-[0.05em] text-slate-400">Agent</p>
                  <div className="mt-2 min-w-0">
                    <EnrichmentAgentPicker
                      value={agentId}
                      onChange={onAgentChange}
                      onSelectedAgentChange={onAgentPicked}
                      fluid
                      hideLabel
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMission((open) => !open)}
                    className="mt-3 text-sm font-medium text-slate-800 hover:text-violet-700"
                  >
                    {showMission ? 'Hide mission' : 'View mission'}
                  </button>
                  {showMission ? (
                    <div className="mt-2">
                      {mission ? (
                        <ClampText text={mission} lines={2} />
                      ) : (
                        <p className="text-sm text-slate-500">This agent has no mission prompt.</p>
                      )}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={deleting || enriching}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                  >
                    <IconTrash size={14} /> Delete lead
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
