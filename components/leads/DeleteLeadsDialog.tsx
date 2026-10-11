'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconLoader2, IconTrash, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { BodyPortal } from '../ui/BodyPortal';
import type { LeadCategory, LeadList } from './types';

type Target = 'selected' | 'list' | 'category' | 'tag';

export type DeleteLeadsRequest = {
  leadIds: string[];
  leadLabel?: string;
  listId?: string;
  categoryId?: string;
};

type Preview = { count: number; target: Target; label: string };

type Props = {
  open: boolean;
  request: DeleteLeadsRequest | null;
  lists: LeadList[];
  categories: LeadCategory[];
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
};

function errorMessage(err: unknown, fallback: string) {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || (err instanceof Error ? err.message : fallback);
}

function initialTarget(request: DeleteLeadsRequest | null): Target {
  if (request?.leadIds.length) return 'selected';
  if (request?.listId && request.listId !== 'all') return 'list';
  if (request?.categoryId && request.categoryId !== 'all') return 'category';
  return 'selected';
}

export function DeleteLeadsDialog({ open, request, lists, categories, onClose, onDeleted }: Props) {
  const [target, setTarget] = useState<Target>('selected');
  const [listId, setListId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !request) return;
    setTarget(initialTarget(request));
    setListId(request.listId && request.listId !== 'all' ? request.listId : lists[0]?.id ?? '');
    setCategoryId(
      request.categoryId && request.categoryId !== 'all' ? request.categoryId : categories[0]?.id ?? '',
    );
    setTag('');
    setPreview(null);
    setConfirmed(false);
    setDeleting(false);
    // Reset only when the dialog opens for a new request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request?.leadIds.join(','), request?.leadLabel, request?.listId, request?.categoryId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void api
      .get('/api/leads/tags')
      .then((res) => {
        if (cancelled) return;
        const next: string[] = res.data?.data ?? [];
        setTags(next);
        setTag((current) => current || next[0] || '');
      })
      .catch(() => {
        if (!cancelled) setTags([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const payload = useMemo(() => {
    if (!request) return null;
    if (target === 'selected') {
      return request.leadIds.length ? { leadIds: request.leadIds } : null;
    }
    if (target === 'list') return listId ? { listId } : null;
    if (target === 'category') return categoryId ? { categoryId } : null;
    return tag.trim() ? { tag: tag.trim() } : null;
  }, [request, target, listId, categoryId, tag]);

  useEffect(() => {
    if (!open || !payload) {
      setPreview(null);
      setPreviewing(false);
      return;
    }
    let cancelled = false;
    setPreviewing(true);
    setConfirmed(false);
    const timer = setTimeout(() => {
      void api
        .post('/api/leads/delete/preview', payload)
        .then((res) => {
          if (!cancelled) setPreview(res.data?.data ?? null);
        })
        .catch((err) => {
          if (!cancelled) {
            setPreview(null);
            toast.error(errorMessage(err, 'Could not count matching leads.'));
          }
        })
        .finally(() => {
          if (!cancelled) setPreviewing(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, payload]);

  if (!open || !request) return null;

  const count = preview?.count ?? 0;
  const canDelete = Boolean(payload) && !previewing && !deleting && confirmed && count > 0;
  const selectedLabel =
    request.leadIds.length === 1 && request.leadLabel
      ? request.leadLabel
      : `${request.leadIds.length.toLocaleString()} selected`;

  const submit = async () => {
    if (!payload || !canDelete) return;
    try {
      setDeleting(true);
      const res = await api.post('/api/leads/delete', payload);
      const deleted = Number(res.data?.data?.deleted ?? 0);
      toast.success(`Deleted ${deleted.toLocaleString()} lead${deleted === 1 ? '' : 's'}.`);
      await onDeleted();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, 'Delete failed.'));
      setDeleting(false);
    }
  };

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-leads-title"
          className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-600">Permanent</p>
              <h2 id="delete-leads-title" className="mt-1 text-lg font-semibold text-slate-950">
                Delete leads
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <IconX size={16} />
            </button>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Remove one lead, the current selection, or every lead in a list, category, or tag. The list
            and category themselves stay.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {(
              [
                ['selected', 'Selected'],
                ['list', 'Whole list'],
                ['category', 'Category'],
                ['tag', 'Tag'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTarget(id)}
                disabled={id === 'selected' && request.leadIds.length === 0}
                className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                  target === id
                    ? 'border-rose-300 bg-rose-50 text-rose-800'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {label}
                {id === 'selected' ? (
                  <span className="mt-0.5 block text-[11px] font-medium text-slate-500">{selectedLabel}</span>
                ) : null}
              </button>
            ))}
          </div>

          {target === 'list' ? (
            <label className="mt-3 block text-xs font-semibold text-slate-500">
              List
              <select
                value={listId}
                onChange={(event) => setListId(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"
              >
                {lists.length === 0 ? <option value="">No lists yet</option> : null}
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {target === 'category' ? (
            <label className="mt-3 block text-xs font-semibold text-slate-500">
              Category
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"
              >
                {categories.length === 0 ? <option value="">No categories yet</option> : null}
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {target === 'tag' ? (
            <label className="mt-3 block text-xs font-semibold text-slate-500">
              Tag
              {tags.length > 0 ? (
                <select
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"
                >
                  {tags.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  placeholder="Tag name"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800"
                />
              )}
            </label>
          ) : null}

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
            {previewing ? (
              <span className="inline-flex items-center gap-2">
                <IconLoader2 size={14} className="animate-spin" /> Counting leads…
              </span>
            ) : preview ? (
              <span>
                <span className="font-semibold text-slate-950">{count.toLocaleString()}</span> lead
                {count === 1 ? '' : 's'}
                {preview.target === 'selected' ? ' in this selection' : ` in ${preview.label}`} will be deleted.
              </span>
            ) : (
              <span>Choose what to delete.</span>
            )}
          </div>

          <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1"
            />
            I understand this cannot be undone.
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canDelete}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {deleting ? <IconLoader2 size={14} className="animate-spin" /> : <IconTrash size={14} />}
              Delete {count > 0 ? count.toLocaleString() : ''}
            </button>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}
