'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { AuthSplitLayout } from '../../../components/layout/AuthSplitLayout';
import { authFieldClass, btnPrimary } from '../../../components/ui/styles';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email });
      toast.success(res.data.message || 'Reset code sent! Check your inbox.');
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message ?? 'Failed to send reset code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      panelTitle="Never lose access to your pipeline"
      panelSubtitle="Reset your LeadHub password securely and get back to finding high-value leads."
      title="Forgot Password"
      subtitle="Enter your email to receive a password reset code"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="forgot-email" className="mb-1 block text-xs font-semibold text-gray-600">
            Account email address
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authFieldClass}
            placeholder="you@example.com"
          />
          <p className="mt-1.5 text-[11px] text-gray-500">
            We will email you a 6-digit code to verify your identity and reset your password.
          </p>
        </div>

        <button type="submit" disabled={submitting} className={`${btnPrimary} w-full py-2.5 shadow-md`}>
          {submitting ? 'Sending reset code...' : 'Send Reset Code'}
        </button>

        <p className="mt-4 text-center text-xs text-gray-500">
          Remember your password?{' '}
          <Link href="/login" className="text-brand-main font-semibold hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}
