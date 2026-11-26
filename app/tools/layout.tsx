'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconMenu2 } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import { MainSidebar } from '../../components/layout/MainSidebar';
import LeadHubBrandLockup from '../../components/common/LeadHubBrandLockup';
import { spinnerClass } from '../../components/ui/styles';
import { AUTH_SIGNUP_UI } from '../../lib/features';

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, activeWorkspaceId, setActiveWorkspaceId } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-100">
        <div className={spinnerClass} />
      </div>
    );
  }

  // Logged-in user: proper workspace shell with MainSidebar
  if (user) {
    return (
      <div className="flex h-screen min-h-0 bg-bg-100">
        <MainSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          user={user}
          onLogout={logout}
          activeWorkspaceId={activeWorkspaceId}
          onWorkspaceChange={setActiveWorkspaceId}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex items-center border-b border-gray-200 bg-bg-200 px-4 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <IconMenu2 size={20} />
            </button>
            <span className="ml-2 text-sm font-semibold text-slate-800">Tools</span>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
        </div>
      </div>
    );
  }

  // Guest user: public chrome (no login required)
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#e8eef7_0%,_#f7f8fa_42%,_#eef1f5_100%)]">
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <LeadHubBrandLockup size={28} />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              Log in
            </Link>
            {AUTH_SIGNUP_UI ? (
              <Link
                href="/signup"
                className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Sign up
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
