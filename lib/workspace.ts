export type WorkspaceSummary = {
  id: string;
  name: string;
  slug?: string;
  role?: 'owner' | 'admin' | 'member';
  leadCount?: number;
  createdAt?: string;
  joinedAt?: string;
};

const STORAGE_KEY = 'leadhub_workspace_id';

export function readStoredWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Picks the workspace every API call should scope to.
 *
 * Leads, enrichment, credits, and captures are all workspace-scoped. Local
 * dev often keeps the right id in localStorage for months, while production
 * login blindly took `workspaces[0]` — frequently an empty workspace created
 * during onboarding — so the same user on the same database saw 0 leads in
 * prod and thousands locally.
 */
export function resolveActiveWorkspaceId(
  workspaces: WorkspaceSummary[],
  storedId: string | null,
): string | null {
  if (!workspaces.length) return null;

  if (storedId) {
    const stored = workspaces.find((workspace) => workspace.id === storedId);
    if (stored) {
      const richest = [...workspaces].sort(
        (a, b) => (b.leadCount ?? 0) - (a.leadCount ?? 0),
      )[0]!;
      // A valid but empty workspace is usually the wrong one after login on a
      // new browser — prefer the workspace that actually has leads.
      if ((stored.leadCount ?? 0) === 0 && (richest.leadCount ?? 0) > 0) {
        return richest.id;
      }
      return stored.id;
    }
  }

  const sorted = [...workspaces].sort(
    (a, b) => (b.leadCount ?? 0) - (a.leadCount ?? 0),
  );
  return sorted[0]!.id;
}

export async function fetchAndResolveWorkspaceId(storedId: string | null): Promise<string | null> {
  const api = (await import('./api')).default;
  const res = await api.get('/api/workspaces');
  const workspaces: WorkspaceSummary[] = res.data.data ?? [];
  return resolveActiveWorkspaceId(workspaces, storedId);
}
