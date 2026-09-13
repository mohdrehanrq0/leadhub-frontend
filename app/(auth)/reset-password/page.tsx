'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { AuthSplitLayout } from '../../../components/layout/AuthSplitLayout';
import { authFieldClass, btnPrimary, spinnerClass } from '../../../components/ui/styles';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlEmail = searchParams.get('email') || '';
  const urlToken = searchParams.get('token') || '';

  const [email, setEmail] = useState(urlEmail);
  const [resetToken, setResetToken] = useState(urlToken);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);

  // Phase: 'code' (verifying 6-digit OTP) or 'password' (setting new password)
  const [step, setStep] = useState<'code' | 'password'>(urlToken ? 'password' : 'code');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (urlToken) {
      setResetToken(urlToken);
      setStep('password');
    }
  }, [urlToken]);

  useEffect(() => {
    if (!email && urlEmail) {
      setEmail(urlEmail);
    }
  }, [urlEmail, email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleDigitChange = (index: number, val: string) => {
    if (val.length > 1) {
      handlePaste(val, index);
      return;
    }

    const cleanVal = val.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);

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

    const nextIndex = Math.min(startIndex + numericChars.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = digits.join('');

    if (!email) {
      toast.error('Please enter your account email address.');
      return;
    }
    if (otp.length < 6) {
      toast.error('Please enter the full 6-digit reset code.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const res = await api.post('/api/auth/verify-reset-code', { email, otp });
      toast.success('Code verified! Please choose a new password.');
      setResetToken(res.data.resetToken);
      setStep('password');
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      const finalMsg = message ?? 'Invalid or expired code. Please request a new one.';
      setErrorMessage(finalMsg);
      toast.error(finalMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0 || resending) return;
    if (!email) {
      toast.error('Please provide your account email to receive a reset code.');
      return;
    }

    setResending(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email });
      toast.success(res.data.message || 'New reset code sent to your email.');
      setCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message ?? 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      await api.post('/api/auth/reset-password', {
        token: resetToken,
        password: newPassword,
      });
      toast.success('Password reset successfully!');
      router.push('/login?reset=1');
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      const finalMsg = message ?? 'Failed to reset password. Link or session may have expired.';
      setErrorMessage(finalMsg);
      toast.error(finalMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      panelTitle="Regain control of your pipeline"
      panelSubtitle="Update your password and continue closing deals with LeadHub."
      title="Reset Password"
      subtitle={
        step === 'code'
          ? 'Enter the 6-digit code sent to your email'
          : 'Choose a strong, secure new password'
      }
    >
      {step === 'code' ? (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="mb-1 block text-xs font-semibold text-gray-600">
              Account email address
            </label>
            <input
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authFieldClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
              6-Digit Reset Code
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
              Enter the 6-digit code sent to your email address. It is valid for 15 minutes.
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
            {submitting ? 'Verifying...' : 'Verify Code & Proceed'}
          </button>

          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={handleResendCode}
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
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-xs font-semibold text-gray-600">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={authFieldClass}
              placeholder="••••••••"
            />
            <p className="mt-1 text-[11px] text-gray-500">Minimum 8 characters.</p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-xs font-semibold text-gray-600">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={authFieldClass}
              placeholder="••••••••"
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-600">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !newPassword || !confirmPassword}
            className={`${btnPrimary} w-full py-2.5 shadow-md`}
          >
            {submitting ? 'Resetting password...' : 'Update Password'}
          </button>

          <div className="pt-1 text-center text-xs">
            <button
              type="button"
              onClick={() => setStep('code')}
              className="text-brand-main hover:underline"
            >
              Enter a different code
            </button>
          </div>
        </form>
      )}
    </AuthSplitLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-bg-100">
          <div className={spinnerClass} />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
