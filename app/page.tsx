'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import LeadHubBrandLockup from '../components/common/LeadHubBrandLockup';
import { SampleOutputs } from '../components/landing/SampleOutputs';
import { spinnerClass } from '../components/ui/styles';

const BETA_REQUEST_URL =
  process.env.NEXT_PUBLIC_BETA_REQUEST_URL ?? 'mailto:beta@leadhub.io?subject=LeadHub%20beta%20access';

export default function RootIndex() {
  const { user, loading, onboardingStep, onboardingLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!user.emailVerifiedAt) {
      router.replace(`/verify-email?email=${encodeURIComponent(user.email)}`);
      return;
    }
    if (!onboardingLoading) {
      if (onboardingStep && onboardingStep !== 'completed') {
        router.replace('/onboarding');
      } else {
        router.replace('/research');
      }
    }
  }, [user, loading, onboardingLoading, onboardingStep, router]);

  if (loading || user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-100">
        <div className={spinnerClass} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#e8eef7_0%,_#f7f8fa_42%,_#eef1f5_100%)]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <LeadHubBrandLockup size={32} />
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-8 pt-14 sm:pt-20">
        <p className="font-[family-name:var(--font-brand,ui-sans-serif)] text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
          LeadHub
        </p>
        <h1 className="mt-4 max-w-2xl text-xl font-medium leading-snug text-slate-800 sm:text-2xl">
          Research and draft. LeadSnipper sends.
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-600">
          Recipe library for prospect briefs and clean lists — run from the web, API, or n8n, then
          export CSV for outreach.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={BETA_REQUEST_URL}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Request beta access
          </a>
          <Link
            href="/signup"
            className="rounded-xl border border-slate-300 bg-white/80 px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-white"
          >
            Sign up
          </Link>
          <a
            href="#samples"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white/70"
          >
            See samples
          </a>
        </div>
      </main>

      <SampleOutputs />

      <section id="how" className="border-t border-slate-200/80 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">How it works</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Pick a recipe → start a run → use the web UI, REST API, or n8n community node → export CSV
            for LeadSnipper. LeadHub does research and drafting; sending stays in LeadSnipper.
          </p>
          <ol className="mt-8 space-y-4 text-sm text-slate-700">
            <li>
              <span className="font-semibold text-slate-900">1. Recipes</span> — Prospect brief or Clean
              list (more coming).
            </li>
            <li>
              <span className="font-semibold text-slate-900">2. Runs</span> — Track status, briefs, and
              history; delete anytime.
            </li>
            <li>
              <span className="font-semibold text-slate-900">3. API / n8n</span> — Automate with{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/v1</code> or the
              LeadHub n8n node.
            </li>
            <li>
              <span className="font-semibold text-slate-900">4. LeadSnipper</span> — CSV out for the send
              side of the house.
            </li>
          </ol>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 bg-white/50 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
          <LeadHubBrandLockup size={24} />
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Terms
            </Link>
            <Link href="/login" className="hover:text-slate-900">
              API docs
            </Link>
            <a href={BETA_REQUEST_URL} className="hover:text-slate-900">
              Request access
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
