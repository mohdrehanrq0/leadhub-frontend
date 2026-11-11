export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type LinkedInCampaignSettings = {
  channel: 'linkedin';
  messageTemplate: string;
  dropTrackingDays: number;
};

export type CampaignSummary = {
  id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  settings: LinkedInCampaignSettings;
  leadsCount: number;
  sentCount: number;
  completedCount: number;
  waitingCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CampaignDetail = CampaignSummary & {
  variables?: Array<{ key: string; label: string; example: string }>;
};

export type CampaignLeadRow = {
  id: string;
  leadId: string;
  name: string;
  title: string | null;
  companyName: string | null;
  location: string | null;
  linkedinUrl: string | null;
  status: string;
  relationshipStatus: string;
  flowStep: string | null;
  reply: string;
  lastError: string | null;
  lastEventAt: string | null;
  sentAt: string | null;
  stopReason: string | null;
};

export type CampaignAnalytics = {
  progress: number;
  accepted: number;
  replied: number;
  repliedPct: number;
  actions: number;
  failed: number;
  dropped: number;
  waiting: number;
  completed: number;
  total: number;
  history: Array<{ date: string; actions: number }>;
};

export type CampaignActivity = {
  id: string;
  eventType: string;
  proposedAction: string | null;
  resultStatus: string | null;
  reasonCode: string | null;
  errorCode: string | null;
  occurredAt: string;
  sequenceId: string | null;
  prospectName: string;
  summary?: string;
};

export const DEFAULT_MESSAGE_TEMPLATE =
  '{Hi|Hey|Hello} {{firstName|there}}, saw your work at {{companyName|your company}} and wanted to connect.';

export function statusLabel(status: string) {
  switch (status) {
    case 'queued':
      return 'Queued';
    case 'in_progress':
      return 'Sending';
    case 'waiting':
      return 'Waiting for connection';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    case 'dropped':
      return 'Dropped';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function relationshipLabel(status: string) {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'pending':
      return 'Connection request already sent';
    case 'not_connected':
      return 'Not connected';
    default:
      return null;
  }
}

export function activitySummary(item: CampaignActivity) {
  if (item.summary?.trim()) return item.summary;
  return [item.eventType, item.proposedAction, item.resultStatus].filter(Boolean).join(' · ');
}

export function statusDotClass(status: string) {
  switch (status) {
    case 'active':
    case 'completed':
      return 'bg-emerald-500';
    case 'waiting':
    case 'queued':
    case 'in_progress':
      return 'bg-amber-400';
    case 'failed':
    case 'dropped':
      return 'bg-rose-500';
    case 'paused':
    case 'skipped':
      return 'bg-slate-400';
    default:
      return 'bg-slate-300';
  }
}
