export type BriefFieldStatus =
  | 'found'
  | 'uncertain'
  | 'not_found'
  | 'provider_error'
  | 'not_requested'
  | 'pending';

export interface BriefField<T = string> {
  value: T | null;
  status: BriefFieldStatus;
  sourceUrl?: string | null;
  evidenceText?: string | null;
  confidence?: number | null;
  lastCheckedAt?: string | null;
  reasonCode?: string | null;
  humanReason?: string | null;
}

export interface BriefDevelopment {
  title: string;
  summary: string;
  type?: string | null;
  sourceUrl?: string | null;
  publicationDate?: string | null;
  retrievedAt?: string | null;
  confidence?: number | null;
  status: BriefFieldStatus;
}

export interface BriefSource {
  fieldKey: string;
  label: string;
  url?: string | null;
  evidenceText?: string | null;
  retrievedAt?: string | null;
  confidence?: number | null;
  status: BriefFieldStatus;
  reasonCode?: string | null;
  humanReason?: string | null;
}

export type ResearchProgressStep =
  | 'resolving_identity'
  | 'collecting_sources'
  | 'verifying_findings'
  | 'preparing_brief';

export interface ResearchBrief {
  version: 'research-brief-v1';
  jobId: string;
  leadId: string;
  workspaceId: string;
  status: 'pending' | 'in_progress' | 'needs_identity_confirmation' | 'ready' | 'partial' | 'failed';
  progress: {
    currentStep: ResearchProgressStep;
    steps: Array<{
      id: ResearchProgressStep;
      label: string;
      state: 'pending' | 'active' | 'completed' | 'failed';
    }>;
    enrichmentStatus: string | null;
    jobStatus: string | null;
  };
  person: {
    name: BriefField;
    title: BriefField;
    profileUrl: BriefField;
    roleEvidence: BriefField;
    companyMatch: BriefField<boolean>;
  };
  company: {
    name: BriefField;
    website: BriefField;
    domain: BriefField;
    description: BriefField;
    productsServices: BriefField;
    industry: BriefField;
    businessModel: BriefField;
  };
  developments: BriefDevelopment[];
  email: {
    requested: boolean;
    address: BriefField;
    verificationStatus: BriefField;
  };
  sources: BriefSource[];
  customAnswers?: Array<{ question: string; answer: BriefField }>;
  personalizationNotes?: Array<{
    angle: string;
    evidence: string;
    sourceUrl?: string | null;
    confidence?: number | null;
  }>;
  icpMatch?: {
    score: BriefField<number>;
    rationale: BriefField;
    criteria: Array<{ label: string; met: boolean; evidence?: string | null }>;
  };
  stakeholders?: Array<{
    name: string;
    title: string;
    profileUrl?: string | null;
    roleType?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt: string | null;
  runOutcome?: string | null;
  runReasonCode?: string | null;
}

export interface ResearchJobListItem {
  id: string;
  status: string;
  prompt: string | null;
  leadId: string | null;
  recipeId?: string | null;
  recipeName?: string | null;
  creditsPerLead?: number | null;
  inputSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  error?: string | null;
  currentStage?: string | null;
}

export interface RecipeOpenerFields {
  opener: BriefField;
  closing: BriefField;
  whatYouSell: BriefField;
}

export const EXAMPLE_BRIEF: ResearchBrief = {
  version: 'research-brief-v1',
  jobId: 'example',
  leadId: 'example',
  workspaceId: 'example',
  status: 'ready',
  progress: {
    currentStep: 'preparing_brief',
    steps: [
      { id: 'resolving_identity', label: 'Resolving identity', state: 'completed' },
      { id: 'collecting_sources', label: 'Collecting sources', state: 'completed' },
      { id: 'verifying_findings', label: 'Verifying findings', state: 'completed' },
      { id: 'preparing_brief', label: 'Preparing research brief', state: 'completed' },
    ],
    enrichmentStatus: 'completed',
    jobStatus: 'completed',
  },
  person: {
    name: { value: 'Jordan Lee', status: 'found', sourceUrl: 'https://example.com/about' },
    title: { value: 'Head of Growth', status: 'found' },
    profileUrl: { value: 'https://www.linkedin.com/in/example', status: 'found' },
    roleEvidence: {
      value: 'Listed as Head of Growth on the company leadership page.',
      status: 'found',
      sourceUrl: 'https://example.com/about',
    },
    companyMatch: { value: true, status: 'found' },
  },
  company: {
    name: { value: 'Northbeam Analytics', status: 'found' },
    website: { value: 'https://northbeam.example', status: 'found' },
    domain: { value: 'northbeam.example', status: 'found' },
    description: {
      value: 'Attribution and marketing analytics for ecommerce brands.',
      status: 'found',
      sourceUrl: 'https://northbeam.example',
    },
    productsServices: {
      value: 'Multi-touch attribution, media mix modeling, and dashboards.',
      status: 'found',
    },
    industry: { value: 'Marketing technology', status: 'found' },
    businessModel: { value: 'B2B SaaS', status: 'found' },
  },
  developments: [
    {
      title: 'product_launch',
      summary: 'Announced a new media mix modeling add-on in March 2026.',
      type: 'product_launch',
      sourceUrl: 'https://northbeam.example/blog/mmm',
      publicationDate: '2026-03-12',
      retrievedAt: '2026-10-01',
      status: 'found',
      confidence: 0.82,
    },
  ],
  email: {
    requested: false,
    address: { value: null, status: 'not_requested' },
    verificationStatus: { value: null, status: 'not_requested' },
  },
  sources: [
    {
      fieldKey: 'company.description',
      label: 'Company overview',
      url: 'https://northbeam.example',
      status: 'found',
      retrievedAt: '2026-10-01',
    },
  ],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  lastCheckedAt: '2026-10-01T00:00:00.000Z',
};
