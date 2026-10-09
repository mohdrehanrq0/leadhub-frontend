import type { EnrichmentFact, LinkedInSnapshot } from '../../enrichment/types';
import type {
  AiIntelligenceData,
  CanonicalLeadProfile,
  EnrichmentLog,
  FetchStats,
  LeadCategory,
  LeadList,
  LeadRow,
  ResearchActivity,
  ResearchQuery,
} from '../types';

export type LeadDetail = LeadRow & {
  rawData?: Record<string, unknown>;
  lists?: LeadList[];
  activities?: Array<{
    id: string;
    type: string;
    title: string;
    body?: string | null;
    createdAt: string;
  }>;
};

export type EmailEntry = {
  email: string;
  status: string | null;
  isPrimary: boolean;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  source?: string | null;
};

export type DetailTab = 'overview' | 'profile' | 'company' | 'outreach' | 'evidence';

export type LeadDetailData = {
  lead: LeadDetail;
  categories: LeadCategory[];
  lists: LeadList[];
  notes: string;
  saving: boolean;
  listToAdd: string;
  aiIntelligence: AiIntelligenceData | null;
  canonicalProfile: CanonicalLeadProfile | null;
  facts: EnrichmentFact[];
  linkedinSnapshot: LinkedInSnapshot | null;
  researchQueries: ResearchQuery[];
  researchActivities: ResearchActivity[];
  enrichmentLogs: EnrichmentLog[];
  fetchStats: FetchStats | null;
  draft: { subject: string; body: string; evidence: string[] } | null;
  isPlatformAdmin: boolean;
};
