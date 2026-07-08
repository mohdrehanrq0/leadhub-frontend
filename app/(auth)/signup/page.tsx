'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

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
    } catch (err: any) {
      toast.error(err.message ?? 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-height-screen w-full flex items-center justify-center bg-background px-4 py-16 relative overflow-hidden text-text" style={{ minHeight: '100vh' }}>
      <div className="w-full max-w-md bg-card p-8 space-y-6 border border-border rounded-xl shadow-input relative z-10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">LeadHub</h1>
          <p className="text-text-200 text-sm">Create your account to start generating leads with AI</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="firstName" className="text-xs font-semibold text-text-200">First Name</label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
                placeholder="John"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="lastName" className="text-xs font-semibold text-text-200">Last Name</label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
                placeholder="Doe"
              />
            </div>
          </div>

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
            <label htmlFor="password" className="text-xs font-semibold text-text-200">Password</label>
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
            {loading ? 'Creating Account...' : 'Get Started'}
          </button>
        </form>

        <div className="text-center text-xs text-text-300">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
