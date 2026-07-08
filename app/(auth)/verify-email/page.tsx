'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import { toast } from 'sonner';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing.');
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/api/auth/verify-email?token=${token}`);
        setStatus('success');
        toast.success('Email verified successfully! You can now log in.');
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.response?.data?.message ?? 'Verification failed or link expired.');
      }
    };

    verify();
  }, [token]);

  return (
    <main className="min-height-screen w-full flex items-center justify-center bg-background px-4 py-16 relative overflow-hidden text-text" style={{ minHeight: '100vh' }}>
      <div className="w-full max-w-md bg-card p-8 space-y-6 text-center border border-border rounded-xl shadow-input relative z-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">LeadHub</h1>

        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-text-200 text-sm">Verifying your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-success/10 text-success border border-success/20 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <h2 className="text-xl font-bold text-text-100">Verification Complete</h2>
            <p className="text-text-200 text-sm">Your email has been verified. Welcome to LeadHub!</p>
            <Link
              href="/login"
              className="inline-block w-full bg-primary hover:bg-primary-200 text-white font-medium py-2 rounded-lg text-sm transition-all"
            >
              Log In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-12 h-12 bg-error/10 text-error border border-error/20 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
              ✕
            </div>
            <h2 className="text-xl font-bold text-text-100">Verification Failed</h2>
            <p className="text-error text-sm">{errorMessage}</p>
            <Link
              href="/signup"
              className="inline-block w-full bg-bg-300 border border-border hover:bg-bg-300/80 text-text-100 font-medium py-2 rounded-lg text-sm transition-all"
            >
              Back to Sign Up
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
