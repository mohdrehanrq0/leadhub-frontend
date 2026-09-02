'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  IconBuilding,
  IconCheck,
  IconCopy,
  IconPencil,
  IconPlus,
  IconUsers,
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import type { WorkspaceSummary } from '@/lib/workspace';

function canEditWorkspace(role?: WorkspaceSummary['role']): boolean {
  return role === 'owner' || role === 'admin';
}

function roleLabel(role?: WorkspaceSummary['role']): string {
  if (role === 'owner') return 'Owner';
  if (role === 'admin') return 'Admin';
  return 'Member';
}

export default function WorkspaceSettingsPage() {
  const { activeWorkspaceId, setActiveWorkspaceId } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/workspaces');
      setWorkspaces(res.data.data ?? []);
    } catch {
      toast.error('Failed to load workspaces.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, activeWorkspaceId]);

  const active = workspaces.find((workspace) => workspace.id === activeWorkspaceId);

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const res = await api.post('/api/workspaces', { name });
      const created = res.data.data as WorkspaceSummary;
      toast.success(`Workspace "${created.name}" created.`);
      setNewName('');
      setActiveWorkspaceId(created.id);
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create workspace.';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(workspace: WorkspaceSummary) {
    setEditingId(workspace.id);
    setEditName(workspace.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
  }

  async function saveEdit(workspaceId: string) {
    const name = editName.trim();
    if (!name) return;

    setSavingId(workspaceId);
    try {
      await api.patch(`/api/workspaces/${workspaceId}`, { name });
      toast.success('Workspace updated.');
      cancelEdit();
      await load();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to update workspace.';
      toast.error(message);
    } finally {
      setSavingId(null);
    }
  }

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      toast.success('Workspace ID copied.');
    } catch {
      toast.error('Could not copy workspace ID.');
    }
  }

  if (loading) {
    return <div className="mx-auto h-40 max-w-3xl skeleton" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 animate-fade-in text-text">
      <PageHeader
        title="Workspaces"
        description="Create workspaces for separate teams or clients. Leads, enrichment, credits, and captures are scoped to the active workspace."
      />

      {/* Create */}
      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <IconPlus size={18} className="text-primary" />
          <h2 className="text-base font-semibold text-text-100">Create workspace</h2>
        </div>
        <form onSubmit={(e) => void createWorkspace(e)} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Acme Sales, Agency clients…"
            maxLength={255}
            className="flex-1 rounded-lg border border-border bg-bg-200 px-3 py-2.5 text-sm text-text-100 focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            <IconPlus size={16} />
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      </section>

      {/* Active workspace detail */}
      {active ? (
        <section className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <IconBuilding size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-text-100">Active workspace</h2>
          </div>
          <p className="text-lg font-bold text-text-100">{active.name}</p>
          <p className="mt-1 text-sm text-text-200">
            {(active.leadCount ?? 0).toLocaleString()} leads · {roleLabel(active.role)}
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-200">Workspace ID</p>
            <p className="text-xs text-text-200">
              Paste into LeadSniper → Settings → Integrations when connecting LeadHub Autopilot.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg border border-border bg-white px-3 py-2 text-xs text-text-100">
                {active.id}
              </code>
              <button
                type="button"
                onClick={() => void copyId(active.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-text-100 hover:bg-bg-200"
              >
                <IconCopy size={14} />
                Copy
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* All workspaces */}
      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-text-100">Your workspaces</h2>
          <p className="mt-1 text-sm text-text-200">
            Switch from the sidebar dropdown, or set active here.
          </p>
        </div>

        <ul className="divide-y divide-slate-100">
          {workspaces.map((workspace) => {
            const isActive = workspace.id === activeWorkspaceId;
            const isEditing = editingId === workspace.id;
            const editable = canEditWorkspace(workspace.role);

            return (
              <li key={workspace.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={255}
                        className="w-full max-w-md rounded-lg border border-border bg-bg-200 px-3 py-2 text-sm text-text-100 focus:border-primary focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-text-100">{workspace.name}</p>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            <IconCheck size={10} />
                            Active
                          </span>
                        ) : null}
                      </div>
                    )}
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-200">
                      <span className="inline-flex items-center gap-1">
                        <IconUsers size={12} />
                        {(workspace.leadCount ?? 0).toLocaleString()} leads
                      </span>
                      <span>{roleLabel(workspace.role)}</span>
                      {workspace.slug ? (
                        <span className="font-mono text-text-300">{workspace.slug}</span>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void saveEdit(workspace.id)}
                          disabled={savingId === workspace.id || !editName.trim()}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {savingId === workspace.id ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-200 hover:bg-bg-200"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveWorkspaceId(workspace.id);
                              toast.success(`Switched to "${workspace.name}".`);
                            }}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-100 hover:bg-bg-200"
                          >
                            Switch
                          </button>
                        ) : null}
                        {editable ? (
                          <button
                            type="button"
                            onClick={() => startEdit(workspace)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-100 hover:bg-bg-200"
                          >
                            <IconPencil size={12} />
                            Rename
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void copyId(workspace.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-200 hover:bg-bg-200"
                          title="Copy workspace ID"
                        >
                          <IconCopy size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {!workspaces.length ? (
          <p className="px-6 py-8 text-center text-sm text-text-200">
            No workspaces yet. Create one above to get started.
          </p>
        ) : null}
      </section>

      <p className="text-xs text-text-300">
        Need a fresh pipeline?{' '}
        <Link href="/dashboard/leads/import" className="font-semibold text-primary hover:underline">
          Import leads
        </Link>{' '}
        after switching to the right workspace.
      </p>
    </div>
  );
}
