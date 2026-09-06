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
import {
  SettingsCard,
  SettingsField,
  SettingsPanel,
  settingsBtnPrimary,
  settingsBtnSecondary,
  settingsInputClass,
} from '@/components/settings/primitives';
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
    return <div className="mx-auto h-40 max-w-4xl skeleton" />;
  }

  return (
    <SettingsPanel>
      <SettingsCard
        icon={IconPlus}
        title="Create workspace"
        description="Spin up a separate space for a team or client. Switching scopes leads, enrichment, and credits."
      >
        <form onSubmit={(e) => void createWorkspace(e)} className="flex min-w-0 flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Acme Sales, Agency clients…"
            maxLength={255}
            className={settingsInputClass}
          />
          <button type="submit" disabled={creating || !newName.trim()} className={settingsBtnPrimary}>
            <IconPlus size={16} />
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      </SettingsCard>

      {active ? (
        <SettingsCard
          icon={IconBuilding}
          title="Active workspace"
          description={`${(active.leadCount ?? 0).toLocaleString()} leads · ${roleLabel(active.role)}`}
        >
          <p className="text-xl font-semibold tracking-tight text-slate-900">{active.name}</p>
          <SettingsField
            className="mt-4"
            label="Workspace ID"
            hint="Paste into LeadSniper → Settings → Integrations when connecting LeadHub Autopilot."
          >
            <div className="flex min-w-0 items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                {active.id}
              </code>
              <button type="button" onClick={() => void copyId(active.id)} className={settingsBtnSecondary}>
                <IconCopy size={14} />
                Copy
              </button>
            </div>
          </SettingsField>
        </SettingsCard>
      ) : null}

      <SettingsCard
        icon={IconUsers}
        title="Your workspaces"
        description="Switch from the sidebar dropdown, or set active here."
        padded={false}
      >
        <ul className="divide-y divide-slate-100">
          {workspaces.map((workspace) => {
            const isActive = workspace.id === activeWorkspaceId;
            const isEditing = editingId === workspace.id;
            const editable = canEditWorkspace(workspace.role);

            return (
              <li key={workspace.id} className="px-5 py-4">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={255}
                        className={`${settingsInputClass} max-w-md`}
                        autoFocus
                      />
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{workspace.name}</p>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            <IconCheck size={10} />
                            Active
                          </span>
                        ) : null}
                      </div>
                    )}
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <IconUsers size={12} />
                        {(workspace.leadCount ?? 0).toLocaleString()} leads
                      </span>
                      <span>{roleLabel(workspace.role)}</span>
                      {workspace.slug ? <span className="font-mono text-slate-400">{workspace.slug}</span> : null}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void saveEdit(workspace.id)}
                          disabled={savingId === workspace.id || !editName.trim()}
                          className={settingsBtnPrimary}
                        >
                          {savingId === workspace.id ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" onClick={cancelEdit} className={settingsBtnSecondary}>
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
                            className={settingsBtnSecondary}
                          >
                            Switch
                          </button>
                        ) : null}
                        {editable ? (
                          <button type="button" onClick={() => startEdit(workspace)} className={settingsBtnSecondary}>
                            <IconPencil size={14} />
                            Rename
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void copyId(workspace.id)}
                          className={settingsBtnSecondary}
                          title="Copy workspace ID"
                        >
                          <IconCopy size={14} />
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
          <p className="px-5 py-8 text-center text-sm text-slate-500">No workspaces yet. Create one above to get started.</p>
        ) : null}
      </SettingsCard>

      <p className="text-xs text-slate-400">
        Need a fresh pipeline?{' '}
        <Link href="/dashboard/leads/import" className="font-semibold text-settings-accent hover:underline">
          Import leads
        </Link>{' '}
        after switching to the right workspace.
      </p>
    </SettingsPanel>
  );
}
