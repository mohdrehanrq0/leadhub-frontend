'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { MessageTemplateEditor } from '@/components/campaigns/MessageTemplateEditor';
import { PageHeader } from '@/components/layout/PageHeader';
import { btnOutline, btnPrimary, cardClass, inputClass } from '@/components/ui/styles';
import { DEFAULT_MESSAGE_TEMPLATE } from '@/lib/campaigns';
import { flushLinkedInOutbox } from '@/lib/flush-linkedin-outbox';
import type { LeadList } from '@/components/leads/types';

type Step = 'details' | 'leads' | 'message' | 'review';

const STEPS: Step[] = ['details', 'leads', 'message', 'review'];

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [dropTrackingDays, setDropTrackingDays] = useState(6);
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [lists, setLists] = useState<LeadList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setLoadingLists(true);
        const res = await api.get('/api/lists');
        setLists(res.data.data ?? []);
      } catch {
        toast.error('Failed to load prospect lists.');
      } finally {
        setLoadingLists(false);
      }
    })();
  }, []);

  const selectedLeads = useMemo(
    () =>
      lists
        .filter((list) => selectedListIds.includes(list.id))
        .reduce((sum, list) => sum + (list.leadCount ?? 0), 0),
    [lists, selectedListIds],
  );

  const stepIndex = STEPS.indexOf(step);

  function toggleList(id: string) {
    setSelectedListIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function canContinue() {
    if (step === 'details') return name.trim().length > 0;
    if (step === 'leads') return selectedListIds.length > 0 && selectedLeads > 0;
    if (step === 'message') return messageTemplate.trim().length > 0;
    return true;
  }

  async function createAndOptionallyStart(start: boolean) {
    setSubmitting(true);
    try {
      const created = await api.post('/api/campaigns', {
        name: name.trim(),
        messageTemplate,
        dropTrackingDays,
      });
      const campaignId = created.data.data.id as string;
      await api.post(`/api/campaigns/${campaignId}/leads`, { listIds: selectedListIds });
      if (start) {
        await api.post(`/api/campaigns/${campaignId}/start`);
        flushLinkedInOutbox();
        window.setTimeout(() => flushLinkedInOutbox(), 2_000);
        window.setTimeout(() => flushLinkedInOutbox(), 8_000);
        toast.success('Campaign started. Keep LinkedIn open — the LeadHub extension processes leads under daily caps.');
      } else {
        toast.success('Campaign saved as draft.');
      }
      router.push(`/dashboard/campaigns/${campaignId}`);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create campaign.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Campaigns"
        title="Create campaign"
        description="Pick leads, write one LinkedIn message, then start. No flow builder."
        actions={
          <Link href="/dashboard/campaigns" className={btnOutline}>
            <IconArrowLeft size={16} /> Back
          </Link>
        }
      />

      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 rounded-full px-3 py-1.5 text-center text-[11px] font-semibold capitalize ${
              i <= stepIndex ? 'bg-brand-main/10 text-brand-main' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      {step === 'details' && (
        <div className={`${cardClass} space-y-4`}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Campaign name</label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Founders from comment scrape"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Drop tracking after (days)</label>
            <input
              type="number"
              min={1}
              max={90}
              className={inputClass}
              value={dropTrackingDays}
              onChange={(e) => setDropTrackingDays(Number(e.target.value) || 6)}
            />
            <p className="text-xs text-slate-500">
              If a connection request is not accepted within this window, tracking stops (default 6).
            </p>
          </div>
        </div>
      )}

      {step === 'leads' && (
        <div className={`${cardClass} space-y-3`}>
          <p className="text-sm text-slate-600">
            Select prospect lists to enroll. {selectedLeads} lead{selectedLeads === 1 ? '' : 's'} selected.
          </p>
          {loadingLists ? (
            <div className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ) : lists.length === 0 ? (
            <p className="text-sm text-slate-500">
              No lists yet. Create one under{' '}
              <Link href="/dashboard/prospect-lists" className="font-semibold text-brand-main hover:underline">
                Prospect Lists
              </Link>
              .
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {lists.map((list) => {
                const selected = selectedListIds.includes(list.id);
                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => toggleList(list.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      selected
                        ? 'border-brand-main bg-brand-main/5'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{list.name}</div>
                      <div className="text-xs text-slate-500">{list.leadCount ?? 0} prospects</div>
                    </div>
                    {selected ? <IconCheck size={18} className="text-brand-main" /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 'message' && (
        <div className={cardClass}>
          <MessageTemplateEditor value={messageTemplate} onChange={setMessageTemplate} />
        </div>
      )}

      {step === 'review' && (
        <div className={`${cardClass} space-y-3 text-sm text-slate-700`}>
          <div>
            <span className="font-semibold">Name:</span> {name}
          </div>
          <div>
            <span className="font-semibold">Leads:</span> {selectedLeads} from {selectedListIds.length} list
            {selectedListIds.length === 1 ? '' : 's'}
          </div>
          <div>
            <span className="font-semibold">Drop tracking:</span> {dropTrackingDays} days
          </div>
          <div>
            <span className="font-semibold">Message:</span>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              {messageTemplate}
            </pre>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className={btnOutline}
          disabled={stepIndex === 0 || submitting}
          onClick={() => setStep(STEPS[stepIndex - 1]!)}
        >
          Back
        </button>
        {step !== 'review' ? (
          <button
            type="button"
            className={btnPrimary}
            disabled={!canContinue()}
            onClick={() => setStep(STEPS[stepIndex + 1]!)}
          >
            Continue
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              className={btnOutline}
              disabled={submitting}
              onClick={() => void createAndOptionallyStart(false)}
            >
              Save draft
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={submitting}
              onClick={() => void createAndOptionallyStart(true)}
            >
              {submitting ? 'Starting…' : 'Create & start'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
