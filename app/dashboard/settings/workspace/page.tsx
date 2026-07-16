'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import { toast } from 'sonner';
import { IconCopy, IconSettings } from '@tabler/icons-react';
import { useAuth } from '../../../../context/AuthContext';

export default function WorkspaceSettingsPage() {
  const { activeWorkspaceId } = useAuth();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [updating, setUpdating] = useState(false);

  const workspaceUid = workspace?.id || activeWorkspaceId || '';

  const copyWorkspaceId = async () => {
    if (!workspaceUid) return;
    try {
      await navigator.clipboard.writeText(workspaceUid);
      toast.success('Workspace ID copied');
    } catch {
      toast.error('Could not copy Workspace ID');
    }
  };

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchWorkspace();
    }
  }, [activeWorkspaceId]);

  const fetchWorkspace = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/workspaces/${activeWorkspaceId}`);
      setWorkspace(res.data.data);
      setName(res.data.data?.name ?? '');
    } catch {
      toast.error('Failed to load workspace detail.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setUpdating(true);
    try {
      // Mock workspace detail update
      toast.success('Workspace settings updated.');
    } catch {
      toast.error('Failed to update workspace.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="h-40 skeleton max-w-2xl mx-auto" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in text-text">
      <div>
        <h1 className="text-2xl font-bold text-text-100 flex items-center space-x-2">
          <IconSettings className="text-primary" />
          <span>Workspace Settings</span>
        </h1>
        <p className="text-text-200 text-sm mt-1">
          Manage workspace profile, name, team members, and limits.
        </p>
      </div>

      <div className="bg-card p-6 border border-border rounded-xl shadow-input space-y-6">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="workspaceName" className="text-xs font-semibold text-text-200">Workspace Name</label>
            <input
              id="workspaceName"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-200 block">Workspace Slug</label>
            <span className="text-xs font-mono text-text-300 block p-2 bg-bg-300 border border-border rounded-lg select-all">
              {workspace?.slug}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-200 block">Workspace ID</label>
            <p className="text-[11px] text-text-300">
              Paste this UUID into LeadSniper → Settings → Integrations when connecting LeadHub Autopilot.
            </p>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs font-mono text-text-100 block p-2 bg-bg-300 border border-border rounded-lg select-all break-all">
                {workspaceUid || '—'}
              </span>
              <button
                type="button"
                onClick={() => void copyWorkspaceId()}
                disabled={!workspaceUid}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-bg-200 text-text-100 text-xs font-medium hover:bg-bg-300 disabled:opacity-50 cursor-pointer"
                title="Copy Workspace ID"
              >
                <IconCopy size={14} />
                Copy
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={updating}
            className="bg-primary hover:bg-primary-200 text-white font-semibold py-2 px-4 rounded-lg text-xs shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {updating ? 'Updating...' : 'Save Workspace Name'}
          </button>
        </form>
      </div>
    </div>
  );
}
