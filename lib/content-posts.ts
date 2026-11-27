import api from '@/lib/api';
import { flushLinkedInOutbox } from '@/lib/flush-linkedin-outbox';

export type ContentType = 'post' | 'article';

export type ContentArticleMeta = {
  seoTitle?: string | null;
  seoDescription?: string | null;
  commentary?: string | null;
};

export type ContentPostStatus =
  | 'draft'
  | 'ready'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

export type ContentPostMedia = {
  id: string;
  kind: 'image' | 'gif' | 'document' | 'video';
  name: string;
  mimeType: string;
  sizeBytes: number;
  /** Inline data URL (legacy / local upload before S3). */
  dataUrl?: string;
  /** Public HTTPS URL after S3 upload. */
  url?: string;
  s3Key?: string;
};

/** Prefer dataUrl for local preview; fall back to S3/public url. */
export function contentMediaSrc(item: ContentPostMedia): string {
  return item.dataUrl || item.url || '';
}

/**
 * Keep in sync with leadhub-backend content-media-rules + leadhub-mcp media-rules.
 * LinkedIn organic attachments LeadHub accepts for content posts.
 */
export const CONTENT_MEDIA_RULES = {
  maxImages: 4,
  maxPdf: 1,
  maxVideo: 1,
  maxImageOrPdfBytes: 4 * 1024 * 1024,
  maxVideoBytes: 50 * 1024 * 1024,
  maxBodyChars: 3000,
  maxArticleBodyChars: 120_000,
  maxArticleTitleChars: 150,
  maxSeoTitleChars: 60,
  maxSeoDescriptionChars: 160,
  maxArticleCommentaryChars: 3000,
  acceptAttr: 'image/jpeg,image/png,image/gif,application/pdf,video/mp4,video/quicktime,video/webm',
  imageMimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'] as const,
  pdfMimes: ['application/pdf'] as const,
  videoMimes: ['video/mp4', 'video/quicktime', 'video/webm'] as const,
} as const;

export const CONTENT_MEDIA_RULES_TEXT = [
  'LeadHub LinkedIn media rules:',
  '• Images: JPEG, PNG, GIF — max 4 MB each, up to 4 images',
  '• PDF: max 4 MB, one PDF alone (no images/video)',
  '• Video: MP4, MOV, WebM — max 50 MB, one video alone',
  '• Do not mix images + PDF + video on the same post',
].join('\n');

export const CONTENT_MEDIA_RULES_HINT =
  'JPEG/PNG/GIF ≤4 MB (up to 4) · PDF ≤4 MB (1 alone) · MP4/MOV/WebM ≤50 MB (1 alone)';

export type ContentPost = {
  id: string;
  workspaceId: string;
  contentType?: ContentType;
  title: string | null;
  body: string;
  articleMeta?: ContentArticleMeta | null;
  status: ContentPostStatus;
  scheduledFor: string | null;
  timezone: string;
  publishedAt: string | null;
  linkedinPostUrn: string | null;
  linkedinPostUrl: string | null;
  lastError: string | null;
  tags: string[];
  media: ContentPostMedia[];
  createdAt: string;
  updatedAt: string;
};

export type LinkedInIdentity = {
  profileUrn: string | null;
  publicId: string | null;
  displayName: string | null;
  headline: string | null;
  avatarUrl: string | null;
  syncedAt: string | null;
};

export type ContentTab = 'drafts' | 'calendar' | 'posts';

export function statusLabel(status: ContentPostStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'ready':
      return 'Ready';
    case 'scheduled':
      return 'Scheduled';
    case 'publishing':
      return 'Publishing';
    case 'published':
      return 'Published';
    case 'failed':
      return 'Needs attention';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

export function statusBadgeClass(status: ContentPostStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-blue-50 text-blue-700 ring-blue-200';
    case 'ready':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'scheduled':
      return 'bg-violet-50 text-violet-700 ring-violet-200';
    case 'publishing':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'published':
      return 'bg-green-50 text-green-700 ring-green-200';
    case 'failed':
      return 'bg-red-50 text-red-700 ring-red-200';
    case 'cancelled':
      return 'bg-slate-100 text-slate-600 ring-slate-200';
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200';
  }
}

export function formatRelativeUpdated(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatPlannedFor(iso: string | null | undefined, timezone?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || undefined,
    });
  } catch {
    return d.toLocaleString();
  }
}

export async function listContentPosts(params: {
  tab?: ContentTab | 'unplanned';
  contentType?: ContentType | 'all';
  status?: string;
  q?: string;
  from?: string;
  to?: string;
}): Promise<ContentPost[]> {
  const qs = new URLSearchParams();
  if (params.tab) qs.set('tab', params.tab);
  if (params.contentType) qs.set('contentType', params.contentType);
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.q?.trim()) qs.set('q', params.q.trim());
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const res = await api.get(`/api/content/posts?${qs.toString()}`);
  return (res.data.data ?? []) as ContentPost[];
}

export async function getContentPost(id: string): Promise<ContentPost> {
  const res = await api.get(`/api/content/posts/${id}`);
  return res.data.data as ContentPost;
}

export async function getLinkedInIdentity(): Promise<LinkedInIdentity> {
  const res = await api.get('/api/content/linkedin-identity');
  return res.data.data as LinkedInIdentity;
}

export async function createContentPost(input: {
  contentType?: ContentType;
  body?: string;
  title?: string | null;
  articleMeta?: ContentArticleMeta | null;
  tags?: string[];
  status?: 'draft' | 'ready';
  media?: ContentPostMedia[];
}): Promise<ContentPost> {
  const res = await api.post('/api/content/posts', input);
  return res.data.data as ContentPost;
}

export async function updateContentPost(
  id: string,
  input: {
    body?: string;
    title?: string | null;
    articleMeta?: ContentArticleMeta | null;
    tags?: string[];
    status?: 'draft' | 'ready';
    media?: ContentPostMedia[];
  },
): Promise<ContentPost> {
  const res = await api.patch(`/api/content/posts/${id}`, input);
  return res.data.data as ContentPost;
}

export async function scheduleContentPost(
  id: string,
  input: { when: 'now' | string; timezone?: string; flush?: boolean },
): Promise<ContentPost> {
  const { flush = true, ...body } = input;
  const res = await api.post(`/api/content/posts/${id}/schedule`, body);
  const post = res.data.data as ContentPost;
  if (flush) {
    void flushLinkedInOutbox(2000);
  }
  return post;
}

export async function cancelScheduleContentPost(id: string): Promise<ContentPost> {
  const res = await api.post(`/api/content/posts/${id}/cancel-schedule`);
  return res.data.data as ContentPost;
}

export async function deleteContentPost(id: string): Promise<void> {
  await api.delete(`/api/content/posts/${id}`);
}

export function previewSnippet(body: string, max = 140): string {
  const t = body
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export async function fileToContentMedia(file: File): Promise<ContentPostMedia> {
  const mime = (file.type || 'application/octet-stream').toLowerCase();
  let kind: ContentPostMedia['kind'] = 'image';
  if (mime === 'image/gif') kind = 'gif';
  else if ((CONTENT_MEDIA_RULES.pdfMimes as readonly string[]).includes(mime)) kind = 'document';
  else if ((CONTENT_MEDIA_RULES.videoMimes as readonly string[]).includes(mime)) kind = 'video';
  else if ((CONTENT_MEDIA_RULES.imageMimes as readonly string[]).includes(mime)) kind = 'image';
  else {
    throw new Error(
      [
        `“${file.name}” is not an allowed type (${mime || 'unknown'}).`,
        CONTENT_MEDIA_RULES_TEXT,
      ].join('\n'),
    );
  }
  const max =
    kind === 'video'
      ? CONTENT_MEDIA_RULES.maxVideoBytes
      : CONTENT_MEDIA_RULES.maxImageOrPdfBytes;
  if (file.size > max) {
    throw new Error(
      [
        kind === 'video'
          ? `“${file.name}” exceeds 50 MB.`
          : `“${file.name}” exceeds 4 MB.`,
        CONTENT_MEDIA_RULES_TEXT,
      ].join('\n'),
    );
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
  return {
    id: crypto.randomUUID(),
    kind,
    name: file.name.slice(0, 200),
    mimeType: mime,
    sizeBytes: file.size,
    dataUrl,
  };
}
