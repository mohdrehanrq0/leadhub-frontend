'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { AuthSplitLayout } from '../../../components/layout/AuthSplitLayout';
import { btnOutline, btnPrimary, spinnerClass } from '../../../components/ui/styles';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error');
      setErrorMessage('Verification token is missing.');
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/api/auth/verify-email?token=${token}`);
        setStatus('success');
        toast.success('Email verified successfully! You can now log in.');
      } catch (err: unknown) {
        setStatus('error');
        const message =
          typeof err === 'object' && err && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setErrorMessage(message ?? 'Verification failed or link expired.');
      }
    };

    void verify();
  }, [token]);

  return (
    <AuthSplitLayout
      panelTitle="Verify your email"
      panelSubtitle="Confirm your address to unlock LeadHub search, enrichment, and CRM."
      title="Email verification"
      subtitle="Confirming your account"
    >
      <div className="text-center">
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className={`${spinnerClass} mx-auto`} />
            <p className="text-sm text-gray-600">Verifying your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-xl font-bold text-emerald-700">
              ✓
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Verification complete</h2>
            <p className="text-sm text-gray-600">Your email has been verified. Welcome to LeadHub!</p>
            <Link href="/login" className={`${btnPrimary} w-full py-2`}>
              Sign in
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-xl font-bold text-rose-600">
              ✕
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Verification failed</h2>
            <p className="text-sm text-rose-600">{errorMessage}</p>
            <Link href="/signup" className={`${btnOutline} w-full py-2`}>
              Back to sign up
            </Link>
          </div>
        )}
      </div>
    </AuthSplitLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-bg-100">
          <div className={spinnerClass} />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
