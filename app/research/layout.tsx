'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { IconMenu2 } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import { MainSidebar } from '../../components/layout/MainSidebar';
import { spinnerClass } from '../../components/ui/styles';
import { parkedRedirectFor } from '../../lib/parked-routes';

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, onboardingStep, onboardingLoading, activeWorkspaceId, setActiveWorkspaceId } =
    useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
    } else if (!loading && user && !user.emailVerifiedAt) {
      router.replace(`/verify-email?email=${encodeURIComponent(user.email)}`);
    }
  }, [user, loading, router, pathname]);

  useEffect(() => {
    if (!loading && !onboardingLoading && user && user.emailVerifiedAt && onboardingStep && onboardingStep !== 'completed') {
      router.replace('/onboarding');
    }
  }, [user, loading, onboardingLoading, onboardingStep, router]);

  useEffect(() => {
    if (loading || !user) return;
    const redirect = parkedRedirectFor(pathname);
    if (redirect) {
      router.replace(redirect);
    }
  }, [user, loading, pathname, router]);

  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (
    loading ||
    !user ||
    !user.emailVerifiedAt ||
    (onboardingLoading && !onboardingStep) ||
    (onboardingStep && onboardingStep !== 'completed')
  ) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-100">
        <div className={spinnerClass} />
      </div>
    );
  }

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
          <span className="ml-2 text-sm font-semibold text-slate-800">Recipes</span>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
