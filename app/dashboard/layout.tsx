'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconMenu2 } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { MainSidebar } from '../../components/layout/MainSidebar';
import { spinnerClass } from '../../components/ui/styles';

type Workspace = {
  id: string;
  name: string;
};

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return fallback;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, activeWorkspaceId, setActiveWorkspaceId, logout, onboardingStep, onboardingLoading } =
    useAuth();
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCreateWsModal, setShowCreateWsModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);

  async function fetchWorkspaces() {
    try {
      const res = await api.get('/api/workspaces');
      setWorkspaces(res.data.data ?? []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchWorkspaces();
    }
  }, [user]);

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

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setCreatingWs(true);
    try {
      const res = await api.post('/api/workspaces', { name: newWsName.trim() });
      const newWs = res.data.data as Workspace;
      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWorkspaceId(newWs.id);
      setNewWsName('');
      setShowCreateWsModal(false);
    } catch (err) {
      alert(errorMessage(err, 'Failed to create workspace.'));
    } finally {
      setCreatingWs(false);
    }
  };

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
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={setActiveWorkspaceId}
        onCreateWorkspace={() => setShowCreateWsModal(true)}
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

      {showCreateWsModal ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-text-100">Create new workspace</h3>
              <p className="mt-1 text-xs text-text-200">
                A workspace keeps company profiles, campaigns, and lead lists in a separate context.
              </p>
            </div>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-200">Workspace name</label>
                <input
                  type="text"
                  required
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. Acme Sales Team"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  disabled={creatingWs}
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateWsModal(false);
                    setNewWsName('');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={creatingWs}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-brand-main px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-main/80 disabled:opacity-50"
                  disabled={creatingWs || !newWsName.trim()}
                >
                  {creatingWs ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
