'use client';

import { IconMail, IconShieldCheck, IconUserCircle } from '@tabler/icons-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/context/AuthContext';

export default function ProfileSettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return <div className="mx-auto h-40 max-w-2xl skeleton" />;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
  const isVerified = Boolean(user.emailVerifiedAt);

  return (
    <div className="mx-auto max-w-2xl space-y-6 text-text">
      <PageHeader
        title="Profile"
        description="Your LeadHub account details."
      />

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-main/15 ring-2 ring-brand-main/20">
            <span className="text-xl font-bold text-brand-main">
              {user.firstName?.slice(0, 1) ?? user.email.slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-text-100">{fullName}</p>
            <p className="text-sm text-text-200">{user.email}</p>
          </div>
        </div>

        <dl className="divide-y divide-slate-100">
          <div className="flex items-start gap-3 px-6 py-4">
            <IconUserCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</dt>
              <dd className="mt-0.5 text-sm text-text-100">{fullName}</dd>
            </div>
          </div>

          <div className="flex items-start gap-3 px-6 py-4">
            <IconMail className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-0.5 text-sm text-text-100">{user.email}</dd>
            </div>
          </div>

          <div className="flex items-start gap-3 px-6 py-4">
            <IconShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email verification</dt>
              <dd className="mt-0.5">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {isVerified ? 'Verified' : 'Pending verification'}
                </span>
              </dd>
            </div>
          </div>
        </dl>
      </section>
    </div>
  );
}
