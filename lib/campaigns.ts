export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type PeopleSearchQuery = {
  title?: string;
  location?: string;
  company?: string;
  keywords?: string;
};

export type LinkedInCampaignSettings = {
  channel: 'linkedin';
  mode?: 'invite_then_message' | 'message_1st';
  source?: 'people_search' | 'prospect_list';
  messageTemplate: string;
  dropTrackingDays: number;
  searchQuery?: PeopleSearchQuery;
  searchUrl?: string;
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
  firstName?: string | null;
  lastName?: string | null;
  title: string | null;
  companyName: string | null;
  location: string | null;
  linkedinUrl: string | null;
  status: string;
  relationshipStatus: string;
  flowStep: string | null;
  sequenceStatus?: string | null;
  currentStep?: string | null;
  nextActionAt?: string | null;
  reply: string;
  lastError: string | null;
  lastEventAt: string | null;
  sentAt: string | null;
  stopReason: string | null;
  vars?: {
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    companyName?: string | null;
    title?: string | null;
    location?: string | null;
  };
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
    case 'draft':
      return 'Draft';
    case 'active':
      return 'Running';
    case 'paused':
      return 'Stopped';
    case 'archived':
      return 'Archived';
    case 'queued':
      return 'Queued';
    case 'in_progress':
      return 'Sending';
    case 'waiting':
      return 'Waiting';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    case 'dropped':
      return 'Dropped';
    case 'all':
      return 'All';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function canDeleteCampaign(status: CampaignStatus) {
  return status === 'draft' || status === 'paused' || status === 'completed' || status === 'archived';
}

export function canStartCampaign(status: CampaignStatus) {
  return status === 'draft' || status === 'paused';
}

/** Leads can be removed from the campaign only before/while it is stopped. */
export function canRemoveCampaignLeads(status: CampaignStatus) {
  return status === 'draft' || status === 'paused';
}

/** Leads can be added from lists / custom pick while draft or stopped. */
export function canAddCampaignLeads(status: CampaignStatus) {
  return status === 'draft' || status === 'paused';
}

export function relationshipLabel(status: string) {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'pending':
      return 'Invite sent';
    case 'not_connected':
      return 'Not connected';
    default:
      return null;
  }
}

function formatNextCheckShort(nextActionAt: string | null | undefined): string | null {
  if (!nextActionAt) return null;
  const when = new Date(nextActionAt);
  if (Number.isNaN(when.getTime())) return null;
  // Due-after timestamp: once 8am next day has passed, show "Due now" until the extension wakes.
  if (when.getTime() <= Date.now()) return 'Due now';
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startWhen = new Date(when.getFullYear(), when.getMonth(), when.getDate());
  const dayDiff = Math.round((startWhen.getTime() - startToday.getTime()) / 86_400_000);
  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Tomorrow';
  return when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Compact next-step for the Leads table. Full explanation lives in `hint` (tooltip).
 */
export function leadNextStep(lead: CampaignLeadRow): {
  label: string;
  meta: string | null;
  tone: 'neutral' | 'message' | 'wait' | 'danger';
  hint: string;
} {
  const check = formatNextCheckShort(lead.nextActionAt);
  const seq = lead.sequenceStatus ?? '';
  const step = lead.currentStep ?? lead.flowStep ?? '';

  if (lead.status === 'dropped' || lead.stopReason === 'drop_tracking') {
    return {
      label: 'Dropped',
      meta: null,
      tone: 'danger',
      hint: 'Invite tracking ended before they accepted. No message will be sent.',
    };
  }
  if (lead.status === 'failed') {
    return {
      label: 'Failed',
      meta: null,
      tone: 'danger',
      hint: lead.lastError || 'Last LinkedIn action failed.',
    };
  }
  // Only trust "Message sent" when a real DM was recorded — not completed+profile_changed.
  const messageReallySent =
    seq === 'message_sent' ||
    (Boolean(lead.sentAt) &&
      lead.stopReason !== 'profile_changed' &&
      (lead.status === 'completed' || seq === 'completed'));
  if (messageReallySent) {
    return {
      label: 'Message sent',
      meta: lead.sentAt ? new Date(lead.sentAt).toLocaleDateString() : null,
      tone: 'message',
      hint: 'Campaign message was sent.',
    };
  }
  // False complete from mid-send profile re-scrape — show LinkedIn-accurate next step.
  if (seq === 'completed' && lead.stopReason === 'profile_changed') {
    if (lead.relationshipStatus === 'connected') {
      return {
        label: 'Waiting to message',
        meta: check ?? 'Next',
        tone: 'wait',
        hint: 'Connected on LinkedIn. Campaign message has not been sent yet.',
      };
    }
    if (lead.relationshipStatus === 'pending') {
      return {
        label: 'Check connection',
        meta: !check ? 'Next day' : check === 'Due now' ? 'Due now' : `Next ${check.toLowerCase()}`,
        tone: 'wait',
        hint:
          'Pending invite. Due from 8 AM next day; the extension catches up automatically when it wakes.',
      };
    }
    return {
      label: 'Send invite',
      meta: check,
      tone: 'neutral',
      hint: 'Invite was interrupted. Next step is the connection request.',
    };
  }
  if (lead.status === 'completed' && seq === 'completed') {
    return {
      label: 'Message sent',
      meta: lead.sentAt ? new Date(lead.sentAt).toLocaleDateString() : null,
      tone: 'message',
      hint: 'Campaign message was sent.',
    };
  }
  if (seq === 'message_pending' || (lead.status === 'in_progress' && step === 'message')) {
    return {
      label: 'Waiting to message',
      meta: check ?? 'Next',
      tone: 'wait',
      hint: 'Connected. Next action is your campaign message — not another invite. Not sent yet.',
    };
  }
  if (seq === 'extension_sending') {
    if (step === 'message' || step === 'follow_up') {
      return {
        label: 'Sending message',
        meta: 'Now',
        tone: 'message',
        hint: 'Sending your campaign message in the LeadHub execution tab.',
      };
    }
    return {
      label: 'Sending invite',
      meta: 'Now',
      tone: 'neutral',
      hint: 'Sending a blank connection request in the LeadHub execution tab.',
    };
  }
  if (lead.status === 'waiting' || seq === 'invitation_sent' || seq === 'needs_review') {
    if (lead.relationshipStatus === 'not_connected' || lead.relationshipStatus === 'unknown') {
      return {
        label: 'Send invite',
        meta: check,
        tone: 'neutral',
        hint: 'LinkedIn does not show a pending invitation. The next step is to send the connection request.',
      };
    }
    return {
      label: 'Check connection',
      meta: !check ? 'Next day' : check === 'Due now' ? 'Due now' : `Next ${check.toLowerCase()}`,
      tone: 'wait',
      hint:
        'Pending invite. Due from 8 AM next day (workspace time). The extension checks automatically whenever Chrome is awake after that — not only at exactly 8 AM. Use Recheck to run now.',
    };
  }
  if (lead.status === 'queued' || seq === 'invitation_pending') {
    return {
      label: 'Send invite',
      meta: check,
      tone: 'neutral',
      hint: 'Blank connection request first. After it sends, we check again the next day, then send your message if connected.',
    };
  }
  if (lead.status === 'in_progress') {
    return {
      label: 'Processing',
      meta: 'Now',
      tone: 'neutral',
      hint: 'LeadHub is processing this lead in the execution tab.',
    };
  }
  if (lead.status === 'skipped') {
    return {
      label: 'Skipped',
      meta: null,
      tone: 'neutral',
      hint: lead.stopReason || 'Skipped for this campaign.',
    };
  }
  return {
    label: statusLabel(lead.status),
    meta: relationshipLabel(lead.relationshipStatus),
    tone: 'neutral',
    hint: '',
  };
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
    case 'draft':
    case 'archived':
    case 'skipped':
      return 'bg-slate-400';
    default:
      return 'bg-slate-300';
  }
}
