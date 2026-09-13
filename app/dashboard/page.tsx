'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { spinnerClass } from '../../components/ui/styles';

export default function DashboardPage() {
  const { user, loading, onboardingStep, onboardingLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (!user.emailVerifiedAt) {
        router.replace(`/verify-email?email=${encodeURIComponent(user.email)}`);
      } else if (!onboardingLoading) {
        if (onboardingStep && onboardingStep !== 'completed') {
          router.replace('/onboarding');
        } else {
          router.replace('/dashboard/leads');
        }
      }
    }
  }, [user, loading, onboardingLoading, onboardingStep, router]);

  return (
    <div className="flex h-64 w-full items-center justify-center">
      <div className={spinnerClass} />
    </div>
  );
}
