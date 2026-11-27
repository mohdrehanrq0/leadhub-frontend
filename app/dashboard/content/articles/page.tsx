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

const PUBLISHED_FILTERS = [
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

function ArticlesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));

  const [articles, setArticles] = useState<ContentPost[]>([]);
  const [unplanned, setUnplanned] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filters = tab === 'posts' ? PUBLISHED_FILTERS : DRAFT_FILTERS;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (tab === 'calendar') {
        const [cal, unpl] = await Promise.all([
          listContentPosts({ tab: 'calendar', contentType: 'article' }),
          listContentPosts({ tab: 'unplanned', contentType: 'article' }),
        ]);
        setArticles(cal);
        setUnplanned(unpl);
      } else {
        const data = await listContentPosts({
          tab,
          contentType: 'article',
          status: filter,
          q: search,
        });
        setArticles(data);
        setUnplanned([]);
      }
    } catch {
      toast.error('Failed to load articles.');
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
      <Link href="/dashboard/content/articles/new" className={btnPrimary}>
        <IconPlus size={16} /> New article
      </Link>
    ),
    [],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
      <PageHeader
        eyebrow="LinkedIn"
        title="LinkedIn Articles"
        description="Write, format, schedule, and publish LinkedIn articles via the LeadHub extension."
        actions={headerActions}
      />

      <ContentTabs
        active={tab}
        basePath="/dashboard/content/articles"
        publishedLabel="Articles"
      />

      {tab !== 'calendar' ? (
        <ContentFilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search article titles and body…"
          filters={filters}
          activeFilter={filter}
          onFilterChange={setFilter}
        />
      ) : null}

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      ) : tab === 'calendar' ? (
        <ContentCalendar
          posts={articles}
          unplanned={unplanned}
          basePath="/dashboard/content/articles"
          untitledLabel="Untitled article"
        />
      ) : (
        <ContentPostsTable
          posts={articles}
          basePath="/dashboard/content/articles"
          untitledLabel="Untitled article"
          emptyLabel={tab === 'posts' ? 'No articles yet.' : 'No article drafts yet.'}
          writeLabel={tab === 'posts' ? undefined : 'Write an article'}
          onWrite={
            tab === 'drafts' ? () => router.push('/dashboard/content/articles/new') : undefined
          }
        />
      )}
    </div>
  );
}

export default function ContentArticlesPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-6xl h-48 animate-pulse rounded-xl bg-slate-100" />}
    >
      <ArticlesPageInner />
    </Suspense>
  );
}
