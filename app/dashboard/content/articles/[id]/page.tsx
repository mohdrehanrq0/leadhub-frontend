'use client';

import { useParams } from 'next/navigation';
import { ArticleEditor } from '@/components/content/ArticleEditor';

export default function EditArticlePage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : undefined;
  return <ArticleEditor articleId={id} />;
}
