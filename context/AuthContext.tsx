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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Initial check
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('leadhub_workspace_id');
      setActiveWorkspaceIdState(storedId);
    }
    refreshUser();
  }, []);

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

  const refreshUser = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/auth/me');
      setUser(res.data.data);

      // Auto-set workspace if none active
      const storedId = localStorage.getItem('leadhub_workspace_id');
      if (!storedId) {
        const wRes = await api.get('/api/workspaces');
        if (wRes.data.data?.length > 0) {
          setActiveWorkspaceId(wRes.data.data[0].id);
        }
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password: pass });
      setUser(res.data.data.user);

      // Fetch workspaces and set active
      const wRes = await api.get('/api/workspaces');
      if (wRes.data.data?.length > 0) {
        setActiveWorkspaceId(wRes.data.data[0].id);
      }
      router.push('/dashboard');
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
