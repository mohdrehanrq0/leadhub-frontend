'use client';

import { OutreachEmailPanel } from '../OutreachEmailPanel';
import { ClampText, CappedChips, DetailCard, SectionLabel } from './primitives';
import { lowFit, type SignalModel } from './model';
import type { AiIntelligenceData } from '../types';

export function OutreachTab({
  leadId,
  enrichmentStatus,
  ai,
  signal,
  linkedinUrl,
  fallbackSubject,
  fallbackBody,
  evidence,
  onOpenEvidence,
  onGenerated,
}: {
  leadId: string;
  enrichmentStatus?: string | null;
  ai: AiIntelligenceData | null;
  signal: SignalModel;
  linkedinUrl: string | null;
  fallbackSubject: string | null;
  fallbackBody: string | null;
  evidence: string[];
  onOpenEvidence: () => void;
  onGenerated: () => void;
}) {
  const why =
    ai?.enrichmentProfile?.salesIntelligence?.whyNow ||
    ai?.whyNow?.[0]?.description ||
    ai?.outreachIntelligence?.recommendedAngle ||
    ai?.productFit?.value ||
    signal.reason;
  const connect =
    ai?.outreachIntelligence?.primaryTrigger?.summary ||
    (linkedinUrl
      ? 'Open their LinkedIn profile and lead with one specific observation.'
      : 'No LinkedIn profile is on file yet.');
  const communicate =
    ai?.recommendedOutreachAngle?.value ||
    ai?.outreachIntelligence?.recommendedAngle ||
    ai?.suggestedCta?.value ||
    'Keep the note short and tied to a real signal. Skip the pitch if the fit stays weak.';

  return (
    <div className="space-y-4">
      <DetailCard>
        <SectionLabel>Why this fit</SectionLabel>
        <div className="mt-2">
          <ClampText text={why || 'No outreach angle yet.'} lines={2} />
        </div>
      </DetailCard>
      <DetailCard>
        <SectionLabel>How to connect</SectionLabel>
        <div className="mt-2">
          <ClampText text={connect} lines={2} />
        </div>
        {linkedinUrl ? (
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex text-sm font-medium text-violet-700 hover:underline"
          >
            Open LinkedIn ↗
          </a>
        ) : null}
      </DetailCard>
      <DetailCard>
        <SectionLabel>How to communicate</SectionLabel>
        <div className="mt-2">
          <ClampText text={communicate} lines={2} />
        </div>
      </DetailCard>

      {lowFit(signal.verdict) ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Low fit. Consider skipping this lead.
        </div>
      ) : null}

      <OutreachEmailPanel
        leadId={leadId}
        enrichmentStatus={enrichmentStatus}
        outreachIntelligence={ai?.outreachIntelligence}
        fallbackSubject={fallbackSubject}
        fallbackBody={fallbackBody}
        onGenerated={onGenerated}
        hideIntelligence
      />

      {evidence.length ? (
        <DetailCard>
          <SectionLabel>Evidence used</SectionLabel>
          <div className="mt-2">
            <CappedChips items={evidence} max={6} onChip={() => onOpenEvidence()} />
          </div>
        </DetailCard>
      ) : null}
    </div>
  );
}
