'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { previewSnippet, type ContentPost } from '@/lib/content-posts';
import { cn } from '@/lib/utils';

type Props = {
  posts: ContentPost[];
  unplanned: ContentPost[];
  basePath?: string;
  untitledLabel?: string;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Monday-first weekday index 0..6 */
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function ContentCalendar({
  posts,
  unplanned,
  basePath = '/dashboard/content',
  untitledLabel = 'Untitled post',
}: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const today = useMemo(() => new Date(), []);

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const total = daysInMonth(cursor);
    const lead = mondayIndex(first);
    const result: { date: Date; inMonth: boolean }[] = [];

    for (let i = 0; i < lead; i += 1) {
      const d = new Date(first);
      d.setDate(d.getDate() - (lead - i));
      result.push({ date: d, inMonth: false });
    }
    for (let day = 1; day <= total; day += 1) {
      result.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), day), inMonth: true });
    }
    while (result.length % 7 !== 0 || result.length < 42) {
      const last = result[result.length - 1]!.date;
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      result.push({ date: d, inMonth: false });
    }
    return result;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, ContentPost[]>();
    for (const post of posts) {
      if (!post.scheduledFor && post.status !== 'published') continue;
      const raw = post.scheduledFor || post.publishedAt;
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const key = dayKey(d);
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [posts]);

  const monthLabel = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              aria-label="Previous month"
            >
              <IconChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setCursor(startOfMonth(new Date()))}
            >
              Today
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              aria-label="Next month"
            >
              <IconChevronRight size={16} />
            </button>
            <h2 className="ml-2 text-sm font-semibold text-slate-800">{monthLabel}</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Published
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-500" /> Scheduled
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full border border-dashed border-slate-400" /> Planned
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="px-1 py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-[minmax(88px,1fr)]">
          {cells.map(({ date, inMonth }) => {
            const key = dayKey(date);
            const dayPosts = byDay.get(key) ?? [];
            const isToday = sameDay(date, today);
            return (
              <div
                key={key + String(inMonth)}
                className={cn(
                  'border-b border-r border-slate-100 p-1.5',
                  !inMonth && 'bg-slate-50/70 text-slate-400',
                )}
              >
                <div
                  className={cn(
                    'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    isToday && 'bg-brand-main text-white',
                  )}
                >
                  {date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayPosts.slice(0, 3).map((p) => (
                    <Link
                      key={p.id}
                      href={`${basePath}/${p.id}`}
                      className={cn(
                        'block truncate rounded px-1 py-0.5 text-[10px] font-medium',
                        p.status === 'published' && 'bg-emerald-50 text-emerald-800',
                        (p.status === 'scheduled' || p.status === 'publishing') &&
                          'bg-violet-50 text-violet-800',
                        (p.status === 'draft' || p.status === 'ready') &&
                          'border border-dashed border-slate-300 text-slate-600',
                        p.status === 'failed' && 'bg-red-50 text-red-700',
                      )}
                      title={p.title || p.body}
                    >
                      {previewSnippet(p.title || p.body, 28)}
                    </Link>
                  ))}
                  {dayPosts.length > 3 ? (
                    <p className="px-1 text-[10px] text-slate-400">+{dayPosts.length - 3} more</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Not planned yet</h3>
          <Link href={`${basePath}?tab=drafts`} className="text-xs font-medium text-brand-main hover:underline">
            All drafts
          </Link>
        </div>
        {unplanned.length === 0 ? (
          <p className="text-sm text-slate-500">No unscheduled drafts.</p>
        ) : (
          <ul className="space-y-2">
            {unplanned.map((p) => (
              <li key={p.id}>
                <Link
                  href={`${basePath}/${p.id}`}
                  className="block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-brand-main/40 hover:bg-slate-50"
                >
                  {previewSnippet(p.title || p.body, 60) || untitledLabel}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
