'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconBuilding, IconChevronDown, IconCheck } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { type WorkspaceSummary } from '@/lib/workspace';

type WorkspaceSwitcherProps = {
  activeWorkspaceId: string | null;
  onWorkspaceChange: (id: string) => void;
  compact?: boolean;
};

export function WorkspaceSwitcher({
  activeWorkspaceId,
  onWorkspaceChange,
  compact = false,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/workspaces');
      setWorkspaces(res.data.data ?? []);
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, activeWorkspaceId]);

  const active = workspaces.find((workspace) => workspace.id === activeWorkspaceId);

  if (loading) {
    return (
      <div
        className={cn(
          'rounded-lg border border-sidebar-border bg-sidebar-bg/60',
          compact ? 'h-9 animate-pulse' : 'h-11 animate-pulse',
        )}
      />
    );
  }

  if (!workspaces.length) return null;

  function switchWorkspace(id: string) {
    if (id === activeWorkspaceId) {
      setOpen(false);
      return;
    }
    onWorkspaceChange(id);
    setOpen(false);
    toast.success('Workspace switched');
    router.refresh();
  }

  if (workspaces.length === 1) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-bg/60 text-sidebar-text',
          compact ? 'px-2 py-2' : 'px-3 py-2.5',
        )}
        title={active?.name ?? 'Workspace'}
      >
        <IconBuilding size={16} className="shrink-0 text-brand-main" />
        {!compact ? (
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">{active?.name ?? 'Workspace'}</p>
            <p className="text-[10px] text-sidebar-muted">
              {(active?.leadCount ?? 0).toLocaleString()} leads
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-bg/60 text-left text-sidebar-text transition-colors hover:bg-sidebar-hover',
          compact ? 'justify-center px-2 py-2' : 'px-3 py-2.5',
        )}
        title={active?.name ?? 'Switch workspace'}
      >
        <IconBuilding size={16} className="shrink-0 text-brand-main" />
        {!compact ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{active?.name ?? 'Select workspace'}</p>
              <p className="text-[10px] text-sidebar-muted">
                {(active?.leadCount ?? 0).toLocaleString()} leads · {workspaces.length} workspaces
              </p>
            </div>
            <IconChevronDown
              size={14}
              className={cn('shrink-0 text-sidebar-muted transition-transform', open && 'rotate-180')}
            />
          </>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close workspace menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-lg border border-sidebar-border bg-sidebar shadow-xl">
            {workspaces.map((workspace) => {
              const selected = workspace.id === activeWorkspaceId;
              return (
                <button
                  key={workspace.id}
                  type="button"
                  onClick={() => switchWorkspace(workspace.id)}
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-sidebar-hover',
                    selected && 'bg-sidebar-hover',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-sidebar-text">{workspace.name}</p>
                    <p className="text-[10px] text-sidebar-muted">
                      {workspace.leadCount?.toLocaleString() ?? 0} leads
                    </p>
                  </div>
                  {selected ? <IconCheck size={14} className="mt-0.5 shrink-0 text-brand-main" /> : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
