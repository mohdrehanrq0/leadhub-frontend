'use client';

import { IconPlus, IconTrash } from '@tabler/icons-react';
import { MessageTemplateEditor } from '@/components/campaigns/MessageTemplateEditor';
import { inputClass } from '@/components/ui/styles';
import type { TemplateLead } from '@/lib/message-template';
import {
  MAX_SEQUENCE_STEPS,
  type CampaignSequence,
  type CampaignSequenceStep,
  type ReactionType,
  type SequenceSendIf,
  type SequenceStepKind,
  defaultInviteThenMessageSequence,
  defaultMessage1stSequence,
} from '@/lib/campaigns';

type SequenceBuilderProps = {
  value: CampaignSequence;
  onChange: (sequence: CampaignSequence) => void;
  mode: 'invite_then_message' | 'message_1st';
  disabled?: boolean;
  leads?: TemplateLead[];
  onNeedLeads?: () => void;
};

const SEND_IF_OPTIONS: Array<{ value: SequenceSendIf; label: string }> = [
  { value: 'always', label: 'Always' },
  { value: 'if_no_reply', label: 'If no reply' },
  { value: 'if_reply', label: 'If replied' },
];

const ADDABLE_KINDS: Array<{ kind: SequenceStepKind; label: string }> = [
  { kind: 'message', label: 'Message' },
  { kind: 'follow', label: 'Follow' },
  { kind: 'visit', label: 'Visit profile' },
  { kind: 'react', label: 'React to latest post' },
  { kind: 'comment', label: 'Comment on latest post' },
  { kind: 'like_profile_posts', label: 'Like profile posts' },
  { kind: 'contact_info', label: 'Find contact info' },
];

const REACTION_OPTIONS: Array<{ value: ReactionType; label: string }> = [
  { value: 'LIKE', label: 'Like' },
  { value: 'PRAISE', label: 'Celebrate' },
  { value: 'EMPATHY', label: 'Love' },
  { value: 'APPRECIATION', label: 'Support' },
  { value: 'INTEREST', label: 'Insightful' },
  { value: 'ENTERTAINMENT', label: 'Funny' },
  { value: 'RANDOM', label: 'Random' },
];

function newId() {
  return crypto.randomUUID();
}

function updateStep(
  sequence: CampaignSequence,
  stepId: string,
  patch: Partial<CampaignSequenceStep>,
): CampaignSequence {
  return {
    ...sequence,
    steps: sequence.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
  };
}

/** Always keep a linear next-pointer chain so delays stay relative to the previous step. */
function rewireLinear(steps: CampaignSequenceStep[]): CampaignSequenceStep[] {
  return steps.map((step, i) => ({
    ...step,
    onNoReply: steps[i + 1]?.id ?? null,
    onReply: steps[i + 1]?.id ?? null,
  }));
}

/** Cumulative calendar day from sequence start if every prior wait runs as configured. */
export function cumulativeDayAt(steps: CampaignSequenceStep[], index: number): number {
  let day = 0;
  for (let i = 0; i <= index && i < steps.length; i += 1) {
    day += Math.max(0, steps[i]?.delayDays ?? 0);
  }
  return day;
}

function delaySummary(delayDays: number, index: number): string {
  if (index === 0 || delayDays <= 0) return 'Runs immediately when this step is reached';
  if (delayDays === 1) return 'Waits 1 day after the previous step succeeds';
  return `Waits ${delayDays} days after the previous step succeeds`;
}

function defaultLabel(kind: SequenceStepKind): string {
  switch (kind) {
    case 'invitation':
      return 'Send invite';
    case 'check_connection':
      return 'Check connection';
    case 'message':
      return 'Message';
    case 'follow':
      return 'Follow';
    case 'visit':
      return 'Visit profile';
    case 'react':
      return 'React to latest post';
    case 'comment':
      return 'Comment on latest post';
    case 'like_profile_posts':
      return 'Like profile posts';
    case 'contact_info':
      return 'Find contact info';
    default:
      return kind;
  }
}

function isRemovable(step: CampaignSequenceStep, steps: CampaignSequenceStep[]): boolean {
  if (step.kind === 'invitation' || step.kind === 'check_connection') return false;
  if (step.kind === 'message') {
    return steps.filter((s) => s.kind === 'message').length > 1;
  }
  return true;
}

export function SequenceBuilder({
  value,
  onChange,
  mode,
  disabled,
  leads,
  onNeedLeads,
}: SequenceBuilderProps) {
  const steps = value.steps;

  const commit = (nextSteps: CampaignSequenceStep[]) => {
    onChange({ version: 1, steps: rewireLinear(nextSteps) });
  };

  const setSteps = (next: CampaignSequenceStep[]) => {
    commit(next);
  };

  const patchStep = (stepId: string, patch: Partial<CampaignSequenceStep>) => {
    commit(updateStep(value, stepId, patch).steps);
  };

  const addStep = (kind: SequenceStepKind) => {
    if (disabled || steps.length >= MAX_SEQUENCE_STEPS) return;
    const id = newId();
    const n =
      kind === 'message'
        ? steps.filter((s) => s.kind === 'message').length + 1
        : steps.filter((s) => s.kind === kind).length + 1;
    const prev = steps[steps.length - 1];
    const nextSteps: CampaignSequenceStep[] = [
      ...steps,
      {
        id,
        kind,
        label: kind === 'message' ? `Message ${n}` : defaultLabel(kind),
        bodyTemplate: kind === 'message' || kind === 'comment' ? '' : undefined,
        delayDays: prev?.kind === 'message' || prev?.kind === 'comment' ? 3 : 0,
        sendIf: kind === 'message' || kind === 'comment' ? 'if_no_reply' : 'always',
        onNoReply: null,
        onReply: null,
        reactionType:
          kind === 'react' || kind === 'like_profile_posts' ? 'LIKE' : undefined,
        postResolve: kind === 'react' || kind === 'comment' ? 'latest' : undefined,
        postCount: kind === 'like_profile_posts' ? 5 : undefined,
      },
    ];
    setSteps(nextSteps);
  };

  const removeStep = (stepId: string) => {
    if (disabled) return;
    const step = steps.find((s) => s.id === stepId);
    if (!step || !isRemovable(step, steps)) return;
    setSteps(steps.filter((s) => s.id !== stepId));
  };

  const resetDefault = () => {
    if (disabled) return;
    const firstMsg = steps.find((s) => s.kind === 'message')?.bodyTemplate ?? '';
    onChange(
      mode === 'message_1st'
        ? defaultMessage1stSequence(firstMsg)
        : defaultInviteThenMessageSequence(firstMsg),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Sequence</h3>
          <p className="mt-0.5 max-w-xl text-xs text-slate-500">
            Each delay starts when the previous step finishes — not from day 0. Day labels below
            are the earliest calendar day if every wait runs as set.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            disabled={disabled}
            onClick={resetDefault}
          >
            Reset default
          </button>
          {ADDABLE_KINDS.map((item) => (
            <button
              key={item.kind}
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={disabled || steps.length >= MAX_SEQUENCE_STEPS}
              onClick={() => addStep(item.kind)}
            >
              <IconPlus size={14} /> {item.label}
            </button>
          ))}
        </div>
      </div>

      <ol className="space-y-0">
        {steps.map((step, index) => {
          const canRemove = isRemovable(step, steps);
          const day = cumulativeDayAt(steps, index);
          const prevLabel =
            index > 0
              ? steps[index - 1]?.label?.trim() || defaultLabel(steps[index - 1]!.kind)
              : null;
          return (
            <li key={step.id}>
              {index > 0 ? (
                <div className="flex items-center gap-3 py-2 pl-3">
                  <div className="flex h-8 w-6 flex-col items-center">
                    <div className="h-full w-px bg-slate-200" />
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {step.delayDays <= 0
                      ? 'Then immediately'
                      : step.delayDays === 1
                        ? 'Wait 1 day after previous'
                        : `Wait ${step.delayDays} days after previous`}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className={`${inputClass} max-w-[220px] py-1 text-sm font-semibold`}
                          value={step.label ?? ''}
                          disabled={disabled}
                          placeholder={defaultLabel(step.kind)}
                          onChange={(e) => patchStep(step.id, { label: e.target.value })}
                        />
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
                          Day {day}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">
                        {step.kind.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                  {canRemove ? (
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      disabled={disabled}
                      aria-label="Remove step"
                      onClick={() => removeStep(step.id)}
                    >
                      <IconTrash size={16} />
                    </button>
                  ) : null}
                </div>

                <div className="mb-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-slate-600">
                    Wait after previous step (days)
                    <input
                      type="number"
                      min={0}
                      max={90}
                      className={`${inputClass} mt-1`}
                      value={step.delayDays}
                      disabled={disabled || index === 0}
                    onChange={(e) =>
                      patchStep(step.id, {
                        delayDays: Math.max(0, Math.min(90, Number(e.target.value) || 0)),
                      })
                    }
                    />
                    <span className="mt-1 block text-[11px] font-normal text-slate-500">
                      {index === 0
                        ? 'First step has no wait.'
                        : delaySummary(step.delayDays, index) +
                          (prevLabel ? ` (after “${prevLabel}”).` : '.')}
                    </span>
                  </label>
                  <label className="block text-xs font-medium text-slate-600">
                    Send if
                    <select
                      className={`${inputClass} mt-1`}
                      value={step.sendIf}
                      disabled={disabled}
                    onChange={(e) =>
                      patchStep(step.id, { sendIf: e.target.value as SequenceSendIf })
                    }
                    >
                      {SEND_IF_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {step.kind === 'message' || step.kind === 'comment' ? (
                  <MessageTemplateEditor
                    value={step.bodyTemplate ?? ''}
                    onChange={(bodyTemplate) => patchStep(step.id, { bodyTemplate })}
                    disabled={disabled}
                    leads={leads}
                    onNeedLeads={onNeedLeads}
                  />
                ) : step.kind === 'react' || step.kind === 'like_profile_posts' ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-slate-600">
                      Reaction
                      <select
                        className={`${inputClass} mt-1`}
                        value={step.reactionType ?? 'LIKE'}
                        disabled={disabled}
                        onChange={(e) =>
                          patchStep(step.id, { reactionType: e.target.value as ReactionType })
                        }
                      >
                        {REACTION_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {step.kind === 'like_profile_posts' ? (
                      <label className="block text-xs font-medium text-slate-600">
                        Number of posts
                        <input
                          type="number"
                          min={1}
                          max={20}
                          className={`${inputClass} mt-1`}
                          value={step.postCount ?? 5}
                          disabled={disabled}
                          onChange={(e) =>
                            patchStep(step.id, {
                              postCount: Math.max(1, Math.min(20, Number(e.target.value) || 5)),
                            })
                          }
                        />
                      </label>
                    ) : (
                      <p className="self-end text-xs text-slate-500">
                        Uses the prospect&apos;s latest post.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    {step.kind === 'invitation'
                      ? 'Blank connection request (no note).'
                      : step.kind === 'check_connection'
                        ? 'Checks whether they accepted before messaging.'
                        : step.kind === 'follow'
                          ? 'Follows the prospect (does not send a connection request).'
                          : step.kind === 'visit'
                            ? 'Opens the profile to register a view.'
                            : step.kind === 'contact_info'
                              ? 'Scrapes email/phone from LinkedIn contact info when visible.'
                              : null}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ensureSequence(
  sequence: CampaignSequence | undefined,
  mode: 'invite_then_message' | 'message_1st',
  messageTemplate: string,
): CampaignSequence {
  if (sequence?.steps?.length) return sequence;
  return mode === 'message_1st'
    ? defaultMessage1stSequence(messageTemplate)
    : defaultInviteThenMessageSequence(messageTemplate);
}
