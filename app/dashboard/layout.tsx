'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconMenu2 } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import { MainSidebar } from '../../components/layout/MainSidebar';
import { spinnerClass } from '../../components/ui/styles';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, onboardingStep, onboardingLoading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && !onboardingLoading && user && onboardingStep && onboardingStep !== 'completed') {
      router.push('/onboarding');
    }
  }, [user, loading, onboardingLoading, onboardingStep, router]);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading || onboardingLoading || !user || !onboardingStep || onboardingStep !== 'completed') {
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
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center border-b border-gray-200 bg-bg-200 px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="rounded-lg p-2 text-text-200 hover:bg-gray-100"
            aria-label="Open menu"
          >
            <IconMenu2 className="h-5 w-5" />
          </button>
          <span className="ml-3 font-semibold text-text-100">LeadHub</span>
        </header>
        <main className="thin-scrollbar min-w-0 flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
