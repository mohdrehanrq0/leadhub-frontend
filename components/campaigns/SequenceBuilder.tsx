'use client';

import { IconPlus, IconTrash } from '@tabler/icons-react';
import { MessageTemplateEditor } from '@/components/campaigns/MessageTemplateEditor';
import { inputClass } from '@/components/ui/styles';
import type { TemplateLead } from '@/lib/message-template';
import {
  MAX_SEQUENCE_STEPS,
  type CampaignSequence,
  type CampaignSequenceStep,
  type SequenceSendIf,
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

function rewireLinear(steps: CampaignSequenceStep[]): CampaignSequenceStep[] {
  return steps.map((step, i) => ({
    ...step,
    onNoReply: step.onNoReply === undefined ? (steps[i + 1]?.id ?? null) : step.onNoReply,
    onReply: step.onReply === undefined ? (steps[i + 1]?.id ?? null) : step.onReply,
  }));
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

  const setSteps = (next: CampaignSequenceStep[]) => {
    onChange({ version: 1, steps: rewireLinear(next) });
  };

  const addMessage = () => {
    if (disabled || steps.length >= MAX_SEQUENCE_STEPS) return;
    const id = newId();
    const n = steps.filter((s) => s.kind === 'message').length + 1;
    const prev = steps[steps.length - 1];
    const nextSteps = [
      ...steps.map((s, i) =>
        i === steps.length - 1
          ? { ...s, onNoReply: s.onNoReply ?? id, onReply: s.onReply ?? id }
          : s,
      ),
      {
        id,
        kind: 'message' as const,
        label: `Message ${n}`,
        bodyTemplate: '',
        delayDays: prev?.kind === 'message' ? 3 : 0,
        sendIf: 'if_no_reply' as const,
        onNoReply: null,
        onReply: null,
      },
    ];
    setSteps(nextSteps);
  };

  const removeStep = (stepId: string) => {
    if (disabled) return;
    const step = steps.find((s) => s.id === stepId);
    if (!step || step.kind !== 'message') return;
    const messages = steps.filter((s) => s.kind === 'message');
    if (messages.length <= 1) return;
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
          <p className="mt-0.5 text-xs text-slate-500">
            Ordered steps with delays and reply conditions. New leads get this graph when the
            campaign starts.
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
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={disabled || steps.length >= MAX_SEQUENCE_STEPS}
            onClick={addMessage}
          >
            <IconPlus size={14} /> Add message
          </button>
        </div>
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => {
          const canRemove =
            step.kind === 'message' && steps.filter((s) => s.kind === 'message').length > 1;
          return (
            <li
              key={step.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {index + 1}
                  </span>
                  <div>
                    <input
                      className={`${inputClass} max-w-[220px] py-1 text-sm font-semibold`}
                      value={step.label ?? ''}
                      disabled={disabled}
                      placeholder={
                        step.kind === 'invitation'
                          ? 'Send invite'
                          : step.kind === 'check_connection'
                            ? 'Check connection'
                            : 'Message'
                      }
                      onChange={(e) =>
                        onChange(updateStep(value, step.id, { label: e.target.value }))
                      }
                    />
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
                  Delay (days after previous)
                  <input
                    type="number"
                    min={0}
                    max={90}
                    className={`${inputClass} mt-1`}
                    value={step.delayDays}
                    disabled={disabled || index === 0}
                    onChange={(e) =>
                      onChange(
                        updateStep(value, step.id, {
                          delayDays: Math.max(0, Math.min(90, Number(e.target.value) || 0)),
                        }),
                      )
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Send if
                  <select
                    className={`${inputClass} mt-1`}
                    value={step.sendIf}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange(
                        updateStep(value, step.id, {
                          sendIf: e.target.value as SequenceSendIf,
                        }),
                      )
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

              {step.kind === 'message' ? (
                <MessageTemplateEditor
                  value={step.bodyTemplate ?? ''}
                  onChange={(bodyTemplate) =>
                    onChange(updateStep(value, step.id, { bodyTemplate }))
                  }
                  disabled={disabled}
                  leads={leads}
                  onNeedLeads={onNeedLeads}
                />
              ) : (
                <p className="text-xs text-slate-500">
                  {step.kind === 'invitation'
                    ? 'Blank connection request (no note).'
                    : 'Checks whether they accepted before messaging.'}
                </p>
              )}
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
