'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function RootIndex() {
  const { user, loading, onboardingStep, onboardingLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !onboardingLoading) {
      if (user) {
        if (onboardingStep === 'completed') {
          router.push('/dashboard/leads');
        } else if (onboardingStep) {
          router.push('/onboarding');
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, onboardingLoading, onboardingStep, router]);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
