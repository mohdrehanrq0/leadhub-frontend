'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { AuthSplitLayout } from '../../../components/layout/AuthSplitLayout';
import { authFieldClass, btnPrimary } from '../../../components/ui/styles';

export default function SignupPage() {
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signup(email, password, firstName, lastName);
      toast.success('Registration successful! Please check your email to verify your account.');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

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
            Password
          </label>
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
          {loading ? 'Creating account...' : 'Get started'}
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
