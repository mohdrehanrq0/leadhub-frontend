'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconLoader2,
  IconMail,
  IconRefresh,
  IconSparkles,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../lib/api';

export type OutreachRunMessage = {
  id: string;
  subject: string | null;
  body: string | null;
  stepNumber?: number;
  sendAfterDays?: number;
  qualityScore: number | null;
  evidenceScore: number | null;
  confidence: number | null;
  status: string;
  claimsJson?: Array<{ text: string; evidenceId: string }>;
  validationJson?: {
    passed?: boolean;
    unsupportedClaims?: number;
    wordCount?: number;
    issues?: string[];
    scores?: {
      evidenceCoverage?: number;
      personalization?: string;
      rulesPassed?: number;
      rulesTotal?: number;
      qualityScore?: number;
    };
    selectedType?: string;
    selectionReason?: string;
  };
};

export type OutreachRunRow = {
  id: string;
  leadId: string;
  status: string;
  templateId?: string | null;
  model?: string | null;
  error?: string | null;
  createdAt: string;
  completedAt?: string | null;
  message?: OutreachRunMessage | null;
  /** All messages in the run (sequence steps), ordered by stepNumber */
  messages?: OutreachRunMessage[];
};

export type OutreachIntelligence = {
  recommendedAngle?: string;
  primaryTrigger?: {
    type: string;
    summary: string;
    date?: string;
    confidence: number;
  } | null;
  secondaryTriggers?: Array<{ type: string; summary: string; confidence: number }>;
  relevantPainPoints?: string[];
  recommendedEvidence?: string[];
  objections?: string[];
  recommendedTemplateTypes?: string[];
};

type Props = {
  leadId: string;
  enrichmentStatus?: string | null;
  outreachIntelligence?: OutreachIntelligence | null;
  /** Fallback subject/body from lead.rawData when runs API is empty */
  fallbackSubject?: string | null;
  fallbackBody?: string | null;
  onGenerated?: () => void;
};

/** Step label descriptions for sequence steps. */
const STEP_META: Record<number, { label: string; desc: string }> = {
  1: { label: 'Initial outreach', desc: 'Personalized first touch based on research' },
  2: { label: 'Value-add follow-up', desc: 'Share new insight without repeating the pitch' },
  3: { label: 'Breakup email', desc: 'Short final touch, give them a graceful out' },
  4: { label: 'Re-engagement', desc: 'New trigger since last contact' },
  5: { label: 'Final touch', desc: 'Ultra-short, zero pressure' },
};

function qualityBadge(status: string, qualityScore: number | null) {
  const isGood = status === 'validated' && (qualityScore == null || qualityScore >= 60);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        isGood
          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200/80'
          : status === 'rejected'
            ? 'bg-amber-100 text-amber-800 border border-amber-200/80'
            : 'bg-slate-100 text-slate-600 border border-slate-200/80'
      }`}
    >
      {isGood ? (
        <>
          <IconCheck size={10} /> Quality verified
        </>
      ) : status === 'rejected' ? (
        'Needs review'
      ) : (
        status
      )}
    </span>
  );
}

/** Single email step card — used both standalone and in sequence view. */
function EmailStepCard({
  step,
  totalSteps,
  subject,
  body,
  sendAfterDays,
  status,
  qualityScore,
  defaultExpanded,
}: {
  step: number;
  totalSteps: number;
  subject: string;
  body: string;
  sendAfterDays: number;
  status: string;
  qualityScore: number | null;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState<'subject' | 'body' | 'all' | null>(null);

  const copyText = async (kind: 'subject' | 'body' | 'all', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  const stepMeta = STEP_META[step] ?? { label: `Step ${step}`, desc: '' };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-violet-50/60 to-white px-4 py-3"
      >
        <div className="flex items-center gap-3">
          {totalSteps > 1 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">
              {step}
            </span>
          )}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {totalSteps > 1 ? stepMeta.label : 'Personalized outreach email'}
              </span>
              {qualityBadge(status, qualityScore)}
            </div>
            {totalSteps > 1 && (
              <p className="text-[11px] text-slate-500">
                {sendAfterDays === 0 ? 'Day 0' : `Day ${sendAfterDays}`}
                {stepMeta.desc ? ` · ${stepMeta.desc}` : ''}
              </p>
            )}
          </div>
        </div>
        {expanded ? <IconChevronUp size={16} className="text-slate-400" /> : <IconChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="space-y-0">
          {/* Subject */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject</div>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{subject || '—'}</p>
            </div>
            {subject && (
              <button
                type="button"
                onClick={() => void copyText('subject', subject)}
                className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50"
              >
                {copied === 'subject' ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-4 py-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Body</div>
              <div className="flex gap-2">
                {body && (
                  <>
                    <button
                      type="button"
                      onClick={() => void copyText('body', body)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase text-slate-600 hover:bg-slate-50"
                    >
                      <IconCopy size={12} />
                      {copied === 'body' ? 'Copied' : 'Copy body'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void copyText(
                          'all',
                          subject ? `Subject: ${subject}\n\n${body}` : body,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase text-violet-800 hover:bg-violet-100"
                    >
                      <IconCheck size={12} />
                      {copied === 'all' ? 'Copied' : 'Copy email'}
                    </button>
                  </>
                )}
              </div>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-slate-800">
              {body || '—'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function OutreachEmailPanel({
  leadId,
  enrichmentStatus,
  outreachIntelligence,
  fallbackSubject,
  fallbackBody,
  onGenerated,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [runs, setRuns] = useState<OutreachRunRow[]>([]);

  const loadRuns = useCallback(async () => {
    if (!leadId) return;
    try {
      const res = await api.get(`/api/outreach/runs/${leadId}`);
      setRuns(res.data.data ?? []);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  // After enrichment finishes, outreach runs on a separate queue — poll briefly.
  useEffect(() => {
    if (enrichmentStatus !== 'completed' && enrichmentStatus !== 'partial') return;
    const latest = runs[0];
    if (latest?.status === 'completed' && latest.message?.body) return;

    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      void loadRuns();
      if (attempts >= 12) clearInterval(timer);
    }, 2500);
    return () => clearInterval(timer);
  }, [enrichmentStatus, leadId, loadRuns, runs]);

  const latest = runs[0] ?? null;
  const messages = latest?.messages ?? (latest?.message ? [latest.message] : []);
  const sortedMessages = [...messages].sort(
    (a, b) => (a.stepNumber ?? 1) - (b.stepNumber ?? 1),
  );
  const firstMessage = sortedMessages[0] ?? null;
  const subject = firstMessage?.subject || fallbackSubject || '';
  const body = firstMessage?.body || fallbackBody || '';
  const hasEmail = Boolean(subject.trim() || body.trim());
  const selectedType =
    firstMessage?.validationJson?.selectedType ||
    outreachIntelligence?.recommendedTemplateTypes?.[0];

  const generate = async (regenerate = false) => {
    setGenerating(true);
    try {
      const res = await api.post(`/api/leads/${leadId}/outreach`, {
        regenerate: true,
      });
      const data = res.data.data;
      if (data?.status === 'abstained') {
        toast.error(data.abstainReason || 'Outreach abstained — missing required evidence.');
      } else if (data?.status === 'failed') {
        toast.error(data.error || 'Outreach generation failed.');
      } else {
        const stepCount = data?.messages?.length ?? 1;
        toast.success(
          regenerate
            ? `Outreach regenerated${stepCount > 1 ? ` (${stepCount} emails)` : ''}.`
            : `Outreach email ready${stepCount > 1 ? ` — ${stepCount}-step sequence generated` : ''}.`,
        );
      }
      await loadRuns();
      onGenerated?.();
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message ?? 'Could not generate outreach.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        <IconLoader2 size={16} className="animate-spin" />
        Loading outreach email…
      </div>
    );
  }

  if (latest?.status === 'queued' || latest?.status === 'running') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 text-sm font-semibold text-violet-800">
        <IconLoader2 size={16} className="animate-spin" />
        Outreach Engine is writing personalized emails…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Intelligence strip */}
      {(outreachIntelligence?.recommendedAngle ||
        outreachIntelligence?.primaryTrigger ||
        (outreachIntelligence?.relevantPainPoints?.length ?? 0) > 0) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <IconSparkles size={14} />
            Outreach intelligence
          </div>
          {outreachIntelligence?.primaryTrigger ? (
            <p className="text-sm text-slate-800">
              <span className="font-semibold capitalize">
                {outreachIntelligence.primaryTrigger.type.replace(/_/g, ' ')}
              </span>
              {' — '}
              {outreachIntelligence.primaryTrigger.summary}
              {outreachIntelligence.primaryTrigger.date
                ? ` · ${outreachIntelligence.primaryTrigger.date}`
                : ''}
            </p>
          ) : null}
          {outreachIntelligence?.recommendedAngle ? (
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-semibold">Angle: </span>
              {outreachIntelligence.recommendedAngle}
            </p>
          ) : null}
          {(outreachIntelligence?.relevantPainPoints?.length ?? 0) > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
              {outreachIntelligence!.relevantPainPoints!.slice(0, 3).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}
          {selectedType ? (
            <p className="mt-2 text-xs text-slate-500">
              Template type:{' '}
              <span className="font-semibold text-violet-700">
                {String(selectedType).replace(/_/g, ' ')}
              </span>
              {' · '}
              <Link
                href="/dashboard/settings/outreach-templates"
                className="font-semibold text-violet-700 underline"
              >
                Manage templates
              </Link>
            </p>
          ) : null}
        </div>
      )}

      {/* Header with actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconMail size={16} className="text-violet-700" />
          <span className="text-sm font-bold text-slate-900">
            {sortedMessages.length > 1
              ? `${sortedMessages.length}-Step Outreach Sequence`
              : 'Personalized Outreach Email'}
          </span>
        </div>
        <button
          type="button"
          disabled={generating}
          onClick={() => void generate(hasEmail)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-xs"
        >
          {generating ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconRefresh size={13} />
          )}
          {hasEmail ? 'Regenerate' : 'Generate email'}
        </button>
      </div>

      {/* Error / abstain state */}
      {(latest?.status === 'abstained' || latest?.status === 'failed') && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {latest.error ||
            (latest.status === 'abstained'
              ? 'Outreach abstained — required evidence was missing for the selected template.'
              : 'Outreach generation failed.')}
          <button
            type="button"
            className="ml-2 font-semibold text-violet-700 underline"
            onClick={() => void generate(true)}
          >
            Try again
          </button>
        </div>
      )}

      {/* Email content */}
      {hasEmail ? (
        <div className="space-y-3">
          {sortedMessages.length > 1 ? (
            // Multi-step sequence view
            sortedMessages.map((msg, idx) => (
              <EmailStepCard
                key={msg.id}
                step={msg.stepNumber ?? idx + 1}
                totalSteps={sortedMessages.length}
                subject={msg.subject ?? ''}
                body={msg.body ?? ''}
                sendAfterDays={msg.sendAfterDays ?? 0}
                status={msg.status}
                qualityScore={msg.qualityScore}
                defaultExpanded={idx === 0}
              />
            ))
          ) : (
            // Single email view (backward compatible)
            <EmailStepCard
              step={1}
              totalSteps={1}
              subject={subject}
              body={body}
              sendAfterDays={0}
              status={firstMessage?.status ?? 'generated'}
              qualityScore={firstMessage?.qualityScore ?? null}
              defaultExpanded={true}
            />
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-700">
            No personalized email yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Enrichment finds the reason to contact. Click Generate to run the Outreach Engine with
            a signal-specific template.
          </p>
          <button
            type="button"
            disabled={generating || enrichmentStatus === 'in_progress'}
            onClick={() => void generate(false)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {generating ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconMail size={14} />
            )}
            Generate outreach email
          </button>
        </div>
      )}
    </div>
  );
}
