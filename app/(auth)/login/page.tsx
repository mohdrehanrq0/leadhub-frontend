'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { AuthSplitLayout } from '../../../components/layout/AuthSplitLayout';
import { authFieldClass, btnPrimary, spinnerClass } from '../../../components/ui/styles';

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered')) {
      toast.success('Registration successful! Please check your email to verify your account.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      panelTitle="Welcome back!"
      panelSubtitle="Sign in to LeadHub to continue discovering and enriching high-quality leads."
      title="Sign In"
      subtitle="Access your account"
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
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
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-semibold text-gray-600">
              Password
            </label>
            <Link href="/forgot-password" className="text-[11px] text-brand-main hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authFieldClass}
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={loading} className={`${btnPrimary} w-full py-2 shadow-md`}>
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>
      <p className="mt-4 text-center text-[11px] text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-brand-main hover:underline">
          Sign up
        </Link>
      </p>
    </AuthSplitLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-bg-100">
          <div className={spinnerClass} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
