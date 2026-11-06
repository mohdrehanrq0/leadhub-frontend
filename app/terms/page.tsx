import Link from 'next/link';
import LeadHubBrandLockup from '../../components/common/LeadHubBrandLockup';

export const metadata = {
  title: 'Terms — LeadHub',
  description: 'LeadHub terms of service (draft)',
};

export default function TermsPage() {
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
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Terms of service</h1>
        <p className="mt-2 text-sm text-slate-500">
          Last updated: 3 November 2026 · Draft for lawyer review — not legal advice
        </p>

        <div className="mt-8 space-y-8 text-base leading-relaxed text-slate-700">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Service</h2>
            <p className="mt-2">
              LeadHub provides research and drafting recipes (web, API, and n8n). Outreach sending is
              handled by LeadSnipper or your own tools. Private beta access may be limited to
              allowlisted emails.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Accounts</h2>
            <p className="mt-2">
              You are responsible for credentials, API keys, and lawful use of prospect data you
              research. Do not use the service to violate third-party terms, spam laws, or privacy
              regulations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Credits and billing</h2>
            <p className="mt-2">
              Recipe runs consume credits as shown in-product. Unused promotional credits may expire.
              Paid plans, refunds, and invoices are governed by the checkout terms presented at
              purchase.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Data and deletion</h2>
            <p className="mt-2">
              See our{' '}
              <Link href="/privacy" className="font-medium text-slate-900 underline">
                Privacy
              </Link>{' '}
              page. You may delete research runs from History or via the API. We do not claim that we
              never store research data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Disclaimer</h2>
            <p className="mt-2">
              Research output may be incomplete or incorrect. You are responsible for verifying
              facts before outreach. The service is provided “as is” during beta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">Contact</h2>
            <p className="mt-2">
              Questions:{' '}
              <a className="font-medium text-slate-900 underline" href="mailto:legal@leadhub.io">
                legal@leadhub.io
              </a>
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
