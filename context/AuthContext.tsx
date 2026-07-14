'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerifiedAt?: string;
  /** LeadHub product/platform admin — not workspace admin. */
  isPlatformAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  onboardingStep: string | null;
  onboardingLoading: boolean;
  refreshOnboardingStatus: () => Promise<void>;
}

const POST_ONBOARDING_ROUTE = '/dashboard/leads';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<string | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Initial check
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('leadhub_workspace_id');
      setActiveWorkspaceIdState(storedId);
    }
    refreshUser();
  }, []);

  useEffect(() => {
    if (user && activeWorkspaceId) {
      setOnboardingStep(null);
      void refreshOnboardingStatus();
    } else {
      setOnboardingStep(null);
      setOnboardingLoading(false);
    }
  }, [activeWorkspaceId, user]);

  const setActiveWorkspaceId = (id: string | null) => {
    setActiveWorkspaceIdState(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('leadhub_workspace_id', id);
      } else {
        localStorage.removeItem('leadhub_workspace_id');
      }
    }
  };

  const refreshOnboardingStatus = async () => {
    setOnboardingLoading(true);
    try {
      const res = await api.get('/api/onboarding');
      setOnboardingStep(res.data.data?.onboardingStep ?? 'company');
    } catch {
      // Avoid treating fetch failures as incomplete onboarding for completed workspaces.
      setOnboardingStep(null);
    } finally {
      setOnboardingLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/auth/me');
      const currentUser = res.data.data;
      setUser(currentUser);

      // Auto-set workspace if none active
      let storedId = localStorage.getItem('leadhub_workspace_id');
      if (!storedId) {
        const wRes = await api.get('/api/workspaces');
        if (wRes.data.data?.length > 0) {
          storedId = wRes.data.data[0].id;
          setActiveWorkspaceId(storedId);
        }
      }

      if (currentUser && storedId) {
        setOnboardingLoading(true);
        try {
          const obRes = await api.get('/api/onboarding', {
            headers: { 'X-Workspace-ID': storedId }
          });
          setOnboardingStep(obRes.data.data?.onboardingStep ?? 'company');
        } catch {
          setOnboardingStep(null);
        } finally {
          setOnboardingLoading(false);
        }
      } else {
        setOnboardingStep(null);
        setOnboardingLoading(false);
      }
    } catch {
      setUser(null);
      setOnboardingStep(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password: pass });
      const loggedInUser = res.data.data.user;
      setUser(loggedInUser);

      // Fetch workspaces and set active
      const wRes = await api.get('/api/workspaces');
      let workspaceId = null;
      if (wRes.data.data?.length > 0) {
        workspaceId = wRes.data.data[0].id;
        setActiveWorkspaceId(workspaceId);
      }

      if (workspaceId) {
        setOnboardingLoading(true);
        try {
          const obRes = await api.get('/api/onboarding', {
            headers: { 'X-Workspace-ID': workspaceId }
          });
          const profile = obRes.data.data;
          const step = profile?.onboardingStep ?? 'company';
          setOnboardingStep(step);

          if (step === 'completed') {
            router.push(POST_ONBOARDING_ROUTE);
          } else {
            router.push('/onboarding');
          }
        } catch {
          setOnboardingStep(null);
          router.push('/onboarding');
        } finally {
          setOnboardingLoading(false);
        }
      } else {
        setOnboardingStep('company');
        setOnboardingLoading(false);
        router.push('/onboarding');
      }
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, pass: string, firstName?: string, lastName?: string) => {
    setLoading(true);
    try {
      await api.post('/api/auth/signup', { email, password: pass, firstName, lastName });
      router.push('/login?registered=1');
    } catch (err: any) {
      throw new Error(err.response?.data?.message ?? 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
      setActiveWorkspaceId(null);
      setOnboardingStep(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeWorkspaceId,
        setActiveWorkspaceId,
        login,
        signup,
        logout,
        refreshUser,
        onboardingStep,
        onboardingLoading,
        refreshOnboardingStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
