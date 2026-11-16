'use client';

import { use } from 'react';
import { PostEditor } from '@/components/content/PostEditor';

export default function ContentPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PostEditor postId={id} />;
}
