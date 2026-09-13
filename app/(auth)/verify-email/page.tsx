'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { AuthSplitLayout } from '../../../components/layout/AuthSplitLayout';
import { authFieldClass, btnOutline, btnPrimary, spinnerClass } from '../../../components/ui/styles';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, verifyEmailOtp, resendVerificationOtp, refreshUser, refreshOnboardingStatus, onboardingStep } =
    useAuth();

  const queryEmail = searchParams.get('email') || user?.email || '';
  const token = searchParams.get('token');

  const [email, setEmail] = useState(queryEmail);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Keep email in sync if user loads later
  useEffect(() => {
    if (!email && (user?.email || queryEmail)) {
      setEmail(user?.email || queryEmail);
    }
  }, [user, queryEmail, email]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Direct 1-click token verification if token param is present
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const verifyToken = async () => {
      try {
        setTokenStatus('verifying');
        await api.get(`/api/auth/verify-email?token=${token}`);
        if (!isMounted) return;
        setTokenStatus('success');
        toast.success('Email verified successfully!');
        await refreshUser();
        await refreshOnboardingStatus();
        setTimeout(() => {
          if (onboardingStep === 'completed') {
            router.replace('/dashboard/leads');
          } else {
            router.replace('/onboarding');
          }
        }, 1200);
      } catch (err: unknown) {
        if (!isMounted) return;
        setTokenStatus('error');
        const message =
          typeof err === 'object' && err && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setErrorMessage(message ?? 'Verification link is invalid or has expired.');
      }
    };

    void verifyToken();
    return () => {
      isMounted = false;
    };
  }, [token, router, refreshUser, refreshOnboardingStatus, onboardingStep]);

  // Handle individual digit input
  const handleDigitChange = (index: number, val: string) => {
    // If multiple characters pasted
    if (val.length > 1) {
      handlePaste(val, index);
      return;
    }

    const cleanVal = val.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);

    // Auto-advance to next input if filled
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (pastedText: string, startIndex = 0) => {
    const numericChars = pastedText.replace(/\D/g, '').slice(0, 6);
    if (!numericChars) return;

    const newDigits = [...digits];
    for (let i = 0; i < numericChars.length; i++) {
      if (startIndex + i < 6) {
        newDigits[startIndex + i] = numericChars[i];
      }
    }
    setDigits(newDigits);

    // Focus on next available box or the last box
    const nextIndex = Math.min(startIndex + numericChars.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = digits.join('');
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }
    if (otp.length < 6) {
      toast.error('Please enter the complete 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      await verifyEmailOtp(email, otp);
      toast.success('Email verified successfully! Welcome to LeadHub.');
      // verifyEmailOtp in AuthContext handles navigation to /onboarding or /dashboard
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid verification code.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    if (!email) {
      toast.error('Please enter your email address to receive a code.');
      return;
    }

    setResending(true);
    try {
      const msg = await resendVerificationOtp(email);
      toast.success(msg || 'New verification code sent to your email.');
      setCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  // If token is verifying or completed via token
  if (token && tokenStatus === 'verifying') {
    return (
      <AuthSplitLayout
        panelTitle="Verifying your account"
        panelSubtitle="Confirming your address to unlock LeadHub search, enrichment, and CRM."
        title="Email Verification"
        subtitle="Confirming your credentials..."
      >
        <div className="py-8 text-center">
          <div className={`${spinnerClass} mx-auto mb-4`} />
          <p className="text-sm font-medium text-gray-700">Verifying your token...</p>
          <p className="mt-1 text-xs text-gray-500">You will be redirected momentarily.</p>
        </div>
      </AuthSplitLayout>
    );
  }

  if (token && tokenStatus === 'success') {
    return (
      <AuthSplitLayout
        panelTitle="Verification complete"
        panelSubtitle="Your email is confirmed. Getting your workspace ready..."
        title="Email Verified"
        subtitle="Welcome to LeadHub"
      >
        <div className="py-6 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-2xl font-bold text-emerald-600 shadow-sm">
            ✓
          </div>
          <h2 className="text-base font-semibold text-gray-900">Email Verified Successfully</h2>
          <p className="text-xs text-gray-600">Redirecting you to complete your onboarding...</p>
          <div className={`${spinnerClass} mx-auto mt-2 h-6 w-6 border-2`} />
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      panelTitle="Verify your email"
      panelSubtitle="Enter the 6-digit verification code sent to your email to unlock LeadHub."
      title="Verify Email"
      subtitle="Enter your 6-digit verification code"
    >
      <form onSubmit={handleSubmitOtp} className="space-y-4">
        {/* Email display / edit */}
        <div>
          <label htmlFor="verify-email-input" className="mb-1 block text-xs font-semibold text-gray-600">
            Email address
          </label>
          <input
            id="verify-email-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authFieldClass}
            placeholder="you@example.com"
          />
        </div>

        {/* 6-Digit OTP input boxes */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-600">
            6-Digit Verification Code
          </label>
          <div className="flex items-center justify-between gap-2 sm:gap-2.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={(e) => {
                  e.preventDefault();
                  handlePaste(e.clipboardData.getData('text'), idx);
                }}
                className="h-12 w-full text-center text-lg font-bold text-gray-900 rounded-lg border border-gray-300 bg-gray-100 transition-all duration-200 focus:border-brand-main focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-main/20"
                aria-label={`Digit ${idx + 1}`}
              />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-500">
            Check your inbox and spam folder for the code. It expires in 15 minutes.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-600">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || digits.join('').length < 6}
          className={`${btnPrimary} w-full py-2.5 shadow-md`}
        >
          {submitting ? 'Verifying...' : 'Verify & Continue'}
        </button>

        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="font-medium text-brand-main hover:underline disabled:pointer-events-none disabled:text-gray-400"
          >
            {resending
              ? 'Sending code...'
              : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : 'Resend code'}
          </button>

          <Link href="/login" className="text-gray-500 hover:text-gray-800 hover:underline">
            Back to sign in
          </Link>
        </div>
      </form>
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
      <VerifyEmailContent />
    </Suspense>
  );
}
