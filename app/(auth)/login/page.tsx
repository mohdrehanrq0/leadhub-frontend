'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

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
    } catch (err: any) {
      toast.error(err.message ?? 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-height-screen w-full flex items-center justify-center bg-background px-4 py-16 relative overflow-hidden text-text" style={{ minHeight: '100vh' }}>
      <div className="w-full max-w-md bg-card p-8 space-y-6 border border-border rounded-xl shadow-input relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">LeadHub</h1>
          <p className="text-text-200 text-sm">Welcome back! Log in to manage your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-xs font-semibold text-text-200">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-xs font-semibold text-text-200">Password</label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-200 text-white font-medium py-2 rounded-lg text-sm shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-text-300">
          Don't have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
