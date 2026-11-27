'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconPlus } from '@tabler/icons-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentCalendar } from '@/components/content/ContentCalendar';
import { ContentFilterBar } from '@/components/content/ContentFilterBar';
import { ContentPostsTable } from '@/components/content/ContentPostsTable';
import { ContentTabs } from '@/components/content/ContentTabs';
import { btnPrimary } from '@/components/ui/styles';
import {
  listContentPosts,
  type ContentPost,
  type ContentTab,
} from '@/lib/content-posts';

const DRAFT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'ready', label: 'Ready' },
  { id: 'submitted', label: 'Submitted' },
];

const POST_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'needs_attention', label: 'Needs attention' },
  { id: 'cancelled', label: 'Cancelled' },
];

function parseTab(raw: string | null): ContentTab {
  if (raw === 'calendar' || raw === 'posts' || raw === 'drafts') return raw;
  return 'drafts';
}

function ContentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));

  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [unplanned, setUnplanned] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filters = tab === 'posts' ? POST_FILTERS : DRAFT_FILTERS;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (tab === 'calendar') {
        const [cal, unpl] = await Promise.all([
          listContentPosts({ tab: 'calendar', contentType: 'post' }),
          listContentPosts({ tab: 'unplanned', contentType: 'post' }),
        ]);
        setPosts(cal);
        setUnplanned(unpl);
      } else {
        const data = await listContentPosts({
          tab,
          contentType: 'post',
          status: filter,
          q: search,
        });
        setPosts(data);
        setUnplanned([]);
      }
    } catch {
      toast.error('Failed to load content.');
    } finally {
      setLoading(false);
    }
  }, [tab, filter, search]);

  useEffect(() => {
    setFilter('all');
    setSearch('');
  }, [tab]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, search ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [load, search]);

  const headerActions = useMemo(
    () => (
      <Link href="/dashboard/content/new" className={btnPrimary}>
        <IconPlus size={16} /> New post
      </Link>
    ),
    [],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="LinkedIn"
        title="Content"
        description="Draft, schedule, and publish LinkedIn posts via the LeadHub extension."
        actions={headerActions}
      />

      <ContentTabs active={tab} />

      {tab !== 'calendar' ? (
        <ContentFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={
            tab === 'posts' ? 'Search post titles and text' : 'Search titles and post text.'
          }
          filters={filters}
          activeFilter={filter}
          onFilterChange={setFilter}
        />
      ) : null}

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      ) : tab === 'calendar' ? (
        <ContentCalendar posts={posts} unplanned={unplanned} />
      ) : (
        <ContentPostsTable
          posts={posts}
          emptyLabel={tab === 'posts' ? 'No posts yet' : 'No drafts yet.'}
          writeLabel={tab === 'posts' ? undefined : 'Write a post'}
          onWrite={tab === 'drafts' ? () => router.push('/dashboard/content/new') : undefined}
        />
      )}
    </div>
  );
}

export default function ContentPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl h-48 animate-pulse rounded-xl bg-slate-100" />}>
      <ContentPageInner />
    </Suspense>
  );
}
