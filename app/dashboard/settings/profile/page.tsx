'use client';

import { IconMail, IconShieldCheck, IconUserCircle } from '@tabler/icons-react';
import { SettingsCard, SettingsPanel } from '@/components/settings/primitives';
import { useAuth } from '@/context/AuthContext';

export default function ProfileSettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return <div className="mx-auto h-40 max-w-4xl skeleton" />;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
  const isVerified = Boolean(user.emailVerifiedAt);
  const initial = user.firstName?.slice(0, 1) ?? user.email.slice(0, 1).toUpperCase();

  return (
    <SettingsPanel>
      <SettingsCard padded={false}>
        <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-settings-mid text-lg font-semibold text-settings-accent">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold tracking-tight text-settings-ink">{fullName}</p>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        <dl className="divide-y divide-slate-100">
          <div className="flex items-start gap-3 px-5 py-4">
            <IconUserCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Full name</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{fullName}</dd>
            </div>
          </div>

          <div className="flex items-start gap-3 px-5 py-4">
            <IconMail className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Email</dt>
              <dd className="mt-0.5 text-sm text-slate-900">{user.email}</dd>
            </div>
          </div>

          <div className="flex items-start gap-3 px-5 py-4">
            <IconShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Email verification
              </dt>
              <dd className="mt-1">
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
      </SettingsCard>
    </SettingsPanel>
  );
}
