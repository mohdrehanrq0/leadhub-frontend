'use client';

import Link from 'next/link';

/**
 * Release 3 — agency collaboration surface.
 * Shared briefs are workspace-scoped today: any workspace member can open
 * /research/history and the same job briefs. Role controls live in Settings.
 */
export default function ResearchTeamPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Release 3 · Collaboration
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
          Team & agency controls
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Research jobs and briefs are isolated by workspace. Invite teammates to the same
          workspace to share history, templates, and monitored companies. Use workspace roles in
          Settings for agency-level access control.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-sm text-slate-700">
        <p>
          <Link href="/research/history" className="font-medium text-brand-main hover:underline">
            Shared research history
          </Link>{' '}
          — every member sees the same briefs.
        </p>
        <p>
          <Link href="/research/templates" className="font-medium text-brand-main hover:underline">
            Shared templates
          </Link>{' '}
          — campaign presets for client work.
        </p>
        <p>
          <Link href="/dashboard/settings/workspace" className="font-medium text-brand-main hover:underline">
            Workspace settings
          </Link>{' '}
          — members and roles.
        </p>
        <p>
          <Link href="/dashboard/settings/developer-api" className="font-medium text-brand-main hover:underline">
            Developer API
          </Link>{' '}
          — call <code className="rounded bg-slate-100 px-1">/api/research/*</code> with a service
          key for CRM sync.
        </p>
      </div>
    </div>
  );
}
