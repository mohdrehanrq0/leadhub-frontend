'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DeleteLeadsDialog } from '../DeleteLeadsDialog';
import { EnrichmentAgentPicker } from '../EnrichmentAgentPicker';
import { IdentityConfirmModal, type IdentityCandidate } from '../IdentityConfirmModal';
import { pickLinkedInUrl } from '../LinkedInLink';
import { CompanyTab } from './CompanyTab';
import { EvidenceTab } from './EvidenceTab';
import { LeadDetailHeader } from './LeadDetailHeader';
import {
  collectEmails,
  companyPhone,
  companySnapshot,
  dataGaps,
  deriveSignal,
  personSnapshot,
  researchLogStats,
  visibleFacts,
  type AgentRef,
} from './model';
import { CompanySnapshot, OutreachPreview, PersonSnapshot } from './OverviewPanels';
import { OutreachTab } from './OutreachTab';
import { ProfileTab } from './ProfileTab';
import { RightRail } from './RightRail';
import { SearchDrawer } from './SearchDrawer';
import { SignalCard } from './SignalCard';
import type { DetailTab } from './types';
import type { LeadDetailController } from './useLeadDetail';

const TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'profile', label: 'Profile' },
  { id: 'company', label: 'Company' },
  { id: 'outreach', label: 'Outreach' },
  { id: 'evidence', label: 'Evidence' },
];

export function LeadDetailView({
  page,
  initialTab = 'overview',
}: {
  page: LeadDetailController;
  initialTab?: DetailTab;
}) {
  const { lead } = page;
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tab, setTab] = useState<DetailTab>(initialTab);
  const [searchesOpen, setSearchesOpen] = useState(false);
  const [pickedAgent, setPickedAgent] = useState<AgentRef>(lead.enrichmentAgent ?? null);
  const [showWebsite, setShowWebsite] = useState(false);

  const emails = useMemo(() => collectEmails(lead), [lead]);
  const queryRows = useMemo(
    () =>
      page.researchQueries.map((query, index) => ({
        n: index + 1,
        query: query.query,
        detail: [query.category, query.status].filter(Boolean).join(' · '),
      })),
    [page.researchQueries],
  );
  const agent = pickedAgent ?? lead.enrichmentAgent ?? null;
  const signal = useMemo(
    () => deriveSignal(lead, page.aiIntelligence, agent, queryRows),
    [lead, page.aiIntelligence, agent, queryRows],
  );
  const person = personSnapshot(lead, page.linkedinSnapshot, emails);
  const company = companySnapshot(lead, page.aiIntelligence, page.linkedinSnapshot);
  const facts = visibleFacts(page.facts);
  const gaps = dataGaps(lead, page.aiIntelligence);
  const stats = researchLogStats(lead, page.researchQueries.length, page.fetchStats);
  const personLinkedIn = pickLinkedInUrl(
    lead.contact?.linkedinUrl,
    page.linkedinSnapshot?.person?.linkedinUrl,
    lead.enrichmentProfile?.buyer?.linkedin,
    page.aiIntelligence?.enrichmentProfile?.buyer?.linkedin,
  );
  const companyLinkedIn = pickLinkedInUrl(
    lead.company?.socialLinks?.linkedin,
    page.linkedinSnapshot?.company?.linkedinUrl,
    lead.enrichmentProfile?.identity?.linkedin,
    page.aiIntelligence?.enrichmentProfile?.identity?.linkedin,
  );
  const name =
    page.linkedinSnapshot?.person?.fullName ||
    [lead.contact?.firstName, lead.contact?.lastName].filter(Boolean).join(' ') ||
    emails[0]?.email ||
    'Unnamed';
  const linkedInPerson = page.linkedinSnapshot?.person;
  const linkedInCompany = page.linkedinSnapshot?.company;
  const crmCompany = lead.company?.name ?? '';
  const companyLabel =
    linkedInCompany?.name || (crmCompany.includes('employer TBD') ? '' : crmCompany);
  const enrichmentStatus = lead.enrichmentStatus;
  const incomplete = enrichmentStatus === 'partial' || enrichmentStatus === 'failed';
  const draftSubject = page.draft?.subject ?? '';
  const draftBody = page.draft?.body ?? '';
  const snapshot = {
    enrichmentStatus: lead.enrichmentStatus,
    company: lead.company ?? null,
    contact: lead.contact ?? null,
    profile: lead.enrichmentProfile ?? page.aiIntelligence?.enrichmentProfile ?? null,
    fields: page.canonicalProfile?.fields ?? null,
    research: lead.researchSuggestions ?? null,
  };

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4">
      <LeadDetailHeader
        lead={lead}
        name={name}
        title={linkedInPerson?.headline || lead.contact?.role || ''}
        company={companyLabel}
        email={emails[0] ?? null}
        personLinkedIn={personLinkedIn}
        companyLinkedIn={companyLinkedIn}
        agentId={page.enrichmentAgentId}
        onAgentChange={page.setEnrichmentAgentId}
        onAgentPicked={setPickedAgent}
        mission={signal.mission}
        onReEnrich={() => void page.reEnrich()}
        reEnriching={page.reEnriching}
        canEnrich={page.canRunEnrich}
        enrichDisabled={page.enrichDisabled}
        onDelete={() => {
          if (lead.enrichmentStatus === 'in_progress') {
            toast.error('Wait for enrichment to finish before deleting.');
            return;
          }
          setDeleteOpen(true);
        }}
        deleting={deleteOpen}
        enriching={lead.enrichmentStatus === 'in_progress'}
        onFindEmail={() => void page.reEnrich()}
      />

      <DeleteLeadsDialog
        open={deleteOpen}
        request={{ leadIds: [lead.id], leadLabel: name }}
        lists={page.lists}
        categories={page.categories}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => router.push('/dashboard/leads')}
      />

      {incomplete || page.enrichBlock || page.identityHeadline ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="min-w-0 truncate">
            {page.identityHeadline || page.enrichBlock || 'Some data missing'}
            <span className="text-amber-700"> · Re-enrich</span>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {page.suggestedDomain ? (
              <button
                type="button"
                onClick={() => void page.saveWebsite(page.suggestedDomain!)}
                className="text-sm font-medium text-amber-900 underline"
              >
                Use {page.suggestedDomain}
              </button>
            ) : null}
            {page.enrichBlock ? (
              showWebsite ? (
                <form
                  className="flex items-center gap-1.5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    void page.saveWebsite(String(data.get('website') ?? ''));
                  }}
                >
                  <input
                    name="website"
                    defaultValue={page.suggestedDomain ?? ''}
                    placeholder="company.com"
                    className="h-8 w-36 rounded-lg border border-amber-300 bg-white px-2 text-sm"
                  />
                  <button type="submit" className="text-sm font-medium text-amber-900">
                    Save
                  </button>
                </form>
              ) : (
                <button type="button" onClick={() => setShowWebsite(true)} className="text-sm font-medium text-amber-900 underline">
                  Add website
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => void page.reEnrich()}
                disabled={!page.canRunEnrich}
                className="text-sm font-medium text-amber-900 underline disabled:opacity-40"
              >
                Re-enrich
              </button>
            )}
          </div>
        </div>
      ) : null}

      {lead.researchSuggestions &&
      typeof lead.researchSuggestions === 'object' &&
      (lead.researchSuggestions as { companyConflict?: boolean }).companyConflict ? (
        <p className="truncate rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
          Contact email belongs to a different company. Research stays on the intake company.
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-1" role="tablist">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`h-9 rounded-full px-3.5 text-sm font-medium transition ${
                  tab === item.id ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'overview' ? (
            <div className="space-y-4">
              <SignalCard
                signal={signal}
                onViewSearches={() => setSearchesOpen(true)}
                agentControl={
                  <EnrichmentAgentPicker
                    value={page.enrichmentAgentId}
                    onChange={page.setEnrichmentAgentId}
                    onSelectedAgentChange={setPickedAgent}
                    fluid
                    hideLabel
                  />
                }
              />
              {linkedInPerson ? <ProfileTab person={linkedInPerson} /> : <PersonSnapshot {...person} />}
              {linkedInCompany || company.industry || company.does || company.domain ? (
                <CompanySnapshot {...company} />
              ) : linkedInPerson ? (
                <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  No company profile was found. The LinkedIn profile above is saved.
                </p>
              ) : (
                <CompanySnapshot {...company} />
              )}
              <OutreachPreview
                subject={draftSubject}
                body={draftBody}
                onOpen={() => setTab('outreach')}
              />
            </div>
          ) : null}

          {tab === 'profile' ? <ProfileTab person={page.linkedinSnapshot?.person} /> : null}
          {tab === 'company' ? (
            <CompanyTab
              lead={lead}
              linkedin={page.linkedinSnapshot?.company}
              colleagues={page.linkedinSnapshot?.colleagues ?? []}
              phone={companyPhone(page.linkedinSnapshot)}
            />
          ) : null}
          {tab === 'outreach' ? (
            <OutreachTab
              leadId={lead.id}
              enrichmentStatus={lead.enrichmentStatus}
              ai={page.aiIntelligence}
              signal={signal}
              linkedinUrl={personLinkedIn}
              fallbackSubject={draftSubject || null}
              fallbackBody={draftBody || null}
              evidence={page.draft?.evidence ?? []}
              onOpenEvidence={() => setTab('evidence')}
              onGenerated={() => void page.reload()}
            />
          ) : null}
          {tab === 'evidence' ? (
            <EvidenceTab
              kept={facts.kept}
              rejected={facts.rejected}
              gaps={gaps}
              stats={stats}
              snapshot={snapshot}
              activities={page.researchActivities}
              showActivities={page.isPlatformAdmin}
            />
          ) : null}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-6">
          <RightRail
            lead={lead}
            signal={signal}
            hasDraft={Boolean(draftSubject.trim() || draftBody.trim())}
            categories={page.categories}
            lists={page.lists}
            notes={page.notes}
            setNotes={page.setNotes}
            saving={page.saving}
            listToAdd={page.listToAdd}
            setListToAdd={page.setListToAdd}
            formatDate={page.formatDate}
            onPatch={(payload) => void page.patch(payload)}
            onSaveNotes={() => void page.saveNotes()}
            onAddToList={() => void page.addToList()}
            onGenerate={() => setTab('outreach')}
            onReview={() => setTab('outreach')}
            onSkip={() => void page.patch({ pipelineStage: 'lost' })}
            onConfirmIdentity={page.openIdentity}
          />
        </aside>
      </div>

      <SearchDrawer open={searchesOpen} rows={signal.searches} onClose={() => setSearchesOpen(false)} />

      <IdentityConfirmModal
        open={page.identityOpen}
        leadId={lead.id}
        candidates={(lead.identityCandidates ?? []) as IdentityCandidate[]}
        onClose={page.closeIdentity}
        onConfirmed={async () => {
          page.closeIdentity();
          await page.reload();
        }}
      />
    </div>
  );
}
