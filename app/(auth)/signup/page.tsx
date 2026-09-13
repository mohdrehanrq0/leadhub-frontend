'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { AuthSplitLayout } from '../../../components/layout/AuthSplitLayout';
import { authFieldClass, btnPrimary, spinnerClass } from '../../../components/ui/styles';

export default function SignupPage() {
  const { user, loading, signup, onboardingStep, onboardingLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Automatically redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      if (!user.emailVerifiedAt) {
        router.replace(`/verify-email?email=${encodeURIComponent(user.email)}`);
      } else if (!onboardingLoading && onboardingStep && onboardingStep !== 'completed') {
        router.replace('/onboarding');
      } else if (!onboardingLoading) {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, onboardingLoading, onboardingStep, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signup(email, password, firstName, lastName);
      toast.success('Account created! Please enter the verification code sent to your email.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-100">
        <div className={spinnerClass} />
      </div>
    );
  }

  return (
    <AuthSplitLayout
      panelTitle="Start generating better leads"
      panelSubtitle="Create your LeadHub workspace and let AI find, enrich, and organize your pipeline."
      title="Create account"
      subtitle="Get started in a few minutes"
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="mb-1 block text-xs font-semibold text-gray-600">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={authFieldClass}
              placeholder="John"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1 block text-xs font-semibold text-gray-600">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={authFieldClass}
              placeholder="Doe"
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-semibold text-gray-600">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authFieldClass}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-semibold text-gray-600">
            Password (min. 8 characters)
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authFieldClass}
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={submitting} className={`${btnPrimary} w-full py-2 shadow-md`}>
          {submitting ? 'Creating account...' : 'Get started'}
        </button>
      </form>
      <p className="mt-4 text-center text-[11px] text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-main hover:underline">
          Sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
