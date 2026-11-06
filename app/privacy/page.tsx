import type { ReactNode } from 'react';
import Link from 'next/link';
import LeadHubBrandLockup from '../../components/common/LeadHubBrandLockup';

export const metadata = {
  title: 'Privacy — LeadHub',
  description: 'LeadHub privacy policy (draft)',
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy">
      <p className="text-sm text-slate-500">Last updated: 3 November 2026 · Draft for lawyer review</p>

      <Section title="What we store">
        <p>
          When you use LeadHub we may store account and workspace data, research jobs and run
          artifacts (briefs, steps, payloads), lead/prospect facts and company memory used for
          recipes, API keys metadata (not your BYOK secrets in plaintext), credit and billing
          records, and operational logs needed to run and debug the service.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          <strong>Delete anytime is the Week 5 guarantee.</strong> You can delete research runs from
          Runs / History in the product (and via <code className="text-xs">DELETE /api/v1/runs/:id</code>
          ). We retain workspace data until you delete it or close the account. An automated retention
          purge (for example a fixed window such as 90 days for run artifacts) is forthcoming; we do
          not currently promise automatic deletion on a calendar schedule.
        </p>
      </Section>

      <Section title="Processors and BYOK">
        <p>
          Enrichment and model calls may use third-party processors (search, crawl, email
          verification, LLM providers). If you bring your own API keys (BYOK), those keys remain
          yours; we store them encrypted for use on your behalf and do not use them for other
          customers.
        </p>
      </Section>

      <Section title="Data requests">
        <p>
          For access, export, or deletion requests related to your account, contact{' '}
          <a className="font-medium text-slate-900 underline" href="mailto:privacy@leadhub.io">
            privacy@leadhub.io
          </a>
          . Workspace owners can also delete individual runs from the product.
        </p>
      </Section>

      <Section title="Honesty note">
        <p>
          We do <em>not</em> claim that LeadHub “doesn’t store personal data.” Research facts,
          profiles, and company memory persist so recipes work. Prefer delete controls and clear
          retention language over absolute non-storage claims.
        </p>
      </Section>
    </LegalShell>
  );
}

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#e8eef7_0%,_#f7f8fa_50%,_#eef1f5_100%)]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/">
          <LeadHubBrandLockup size={28} />
        </Link>
        <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Home
        </Link>
      </header>
      <article className="mx-auto max-w-3xl px-6 pb-20 pt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <div className="mt-8 space-y-8 text-base leading-relaxed text-slate-700">{children}</div>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
