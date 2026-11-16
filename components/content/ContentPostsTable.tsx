'use client';

import Link from 'next/link';
import { IconDotsVertical } from '@tabler/icons-react';
import {
  formatPlannedFor,
  formatRelativeUpdated,
  previewSnippet,
  statusBadgeClass,
  statusLabel,
  type ContentPost,
} from '@/lib/content-posts';
import { tableShellClass } from '@/components/ui/styles';

type Props = {
  posts: ContentPost[];
  emptyLabel: string;
  onWrite?: () => void;
  writeLabel?: string;
};

export function ContentPostsTable({ posts, emptyLabel, onWrite, writeLabel }: Props) {
  if (posts.length === 0) {
    return (
      <div className={`${tableShellClass} flex min-h-[280px] flex-col items-center justify-center gap-3 p-8`}>
        <p className="text-sm text-slate-500">{emptyLabel}</p>
        {onWrite ? (
          <button
            type="button"
            onClick={onWrite}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            + {writeLabel || 'Write a post'}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={tableShellClass}>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Draft</th>
            <th className="w-32 px-4 py-3">Status</th>
            <th className="w-40 px-4 py-3">Planned for</th>
            <th className="w-28 px-4 py-3">Updated</th>
            <th className="w-10 px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {posts.map((post) => (
            <tr key={post.id} className="hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/content/${post.id}`}
                  className="font-medium text-slate-800 hover:text-brand-main"
                >
                  {post.title || previewSnippet(post.body, 80) || 'Untitled post'}
                </Link>
                {post.lastError ? (
                  <p className="mt-0.5 text-xs text-red-600">{post.lastError}</p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(post.status)}`}
                >
                  {statusLabel(post.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatPlannedFor(post.scheduledFor, post.timezone)}
              </td>
              <td className="px-4 py-3 text-slate-500">{formatRelativeUpdated(post.updatedAt)}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/content/${post.id}`}
                  className="inline-flex rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Open post"
                >
                  <IconDotsVertical size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
