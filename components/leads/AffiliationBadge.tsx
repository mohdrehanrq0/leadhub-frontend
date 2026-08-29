import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';

const SIGNAL_LABELS: Record<string, string> = {
  linkedin_company_employee: 'listed by LinkedIn as a current employee',
  intake_seed: 'provided at intake',
  linkedin_employer_match: 'LinkedIn employer matches',
  company_site_mention: 'named on company website',
  company_domain_email: 'company-domain email matches name',
  company_in_serp_text: 'company named in search result',
  company_linkedin_slug: 'LinkedIn URL matches company',
};

export function describeAffiliationSignals(signals: string[] | null | undefined): string {
  if (!signals?.length) return '';
  return signals.map((s) => SIGNAL_LABELS[s] ?? s.replace(/_/g, ' ')).join(' · ');
}

/**
 * Shows whether a person was proven to work at the company or is only a guess,
 * so unverified SERP matches are never presented as confirmed contacts.
 */
export function AffiliationBadge({
  strength,
  signals,
}: {
  strength?: 'confirmed' | 'weak' | null;
  signals?: string[] | null;
}) {
  if (!strength) return null;

  const detail = describeAffiliationSignals(signals);

  if (strength === 'confirmed') {
    return (
      <span
        title={detail ? `Confirmed: ${detail}` : 'Affiliation confirmed'}
        className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700"
      >
        <IconCircleCheck size={11} stroke={2} />
        Confirmed
      </span>
    );
  }

  return (
    <span
      title={
        detail
          ? `Not confirmed — circumstantial evidence only: ${detail}`
          : 'Not confirmed — no direct evidence this person works here'
      }
      className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700"
    >
      <IconAlertTriangle size={11} stroke={2} />
      Unconfirmed
    </span>
  );
}
