'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconArrowLeft,
  IconBold,
  IconCalendar,
  IconDeviceFloppy,
  IconFileText,
  IconItalic,
  IconVideo,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightCollapse,
  IconList,
  IconListNumbers,
  IconPaperclip,
  IconRefresh,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  CONTENT_MEDIA_RULES,
  CONTENT_MEDIA_RULES_HINT,
  cancelScheduleContentPost,
  createContentPost,
  deleteContentPost,
  contentMediaSrc,
  fileToContentMedia,
  getContentPost,
  getLinkedInIdentity,
  previewSnippet,
  scheduleContentPost,
  statusBadgeClass,
  statusLabel,
  updateContentPost,
  type ContentPost,
  type ContentPostMedia,
  type LinkedInIdentity,
} from '@/lib/content-posts';
import { flushLinkedInOutbox } from '@/lib/flush-linkedin-outbox';
import { renderLinkedInPreviewHtml, wrapSelection } from '@/lib/linkedin-unicode';
import { btnOutline, btnPrimary, inputClass } from '@/components/ui/styles';
import { cn } from '@/lib/utils';

const LinkedInPdfViewer = dynamic(
  () =>
    import('@/components/content/LinkedInPdfViewer').then((m) => m.LinkedInPdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 items-center justify-center bg-[#e9e5df] text-sm text-slate-500">
        Loading PDF…
      </div>
    ),
  },
);

const MAX_CHARS = CONTENT_MEDIA_RULES.maxBodyChars;

type Props = {
  postId?: string;
};

function toLocalInputValue(iso: string | null | undefined): { date: string; time: string } {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      date: `${fallback.getFullYear()}-${pad(fallback.getMonth() + 1)}-${pad(fallback.getDate())}`,
      time: `${pad(fallback.getHours())}:${pad(fallback.getMinutes())}`,
    };
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Next whole minute — used when “Now” can’t flush the extension immediately. */
function oneMinuteFromNowIso(): string {
  return new Date(Date.now() + 60_000).toISOString();
}

export function PostEditor({ postId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [post, setPost] = useState<ContentPost | null>(null);
  const [identity, setIdentity] = useState<LinkedInIdentity | null>(null);
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [media, setMedia] = useState<ContentPostMedia[]>([]);
  const [stage, setStage] = useState<'draft' | 'ready'>('draft');
  const [whenMode, setWhenMode] = useState<'now' | 'schedule'>('schedule');
  const [scheduleDate, setScheduleDate] = useState(() => toLocalInputValue(null).date);
  const [scheduleTime, setScheduleTime] = useState(() => toLocalInputValue(null).time);
  const [loading, setLoading] = useState(Boolean(postId));
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [syncingIdentity, setSyncingIdentity] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
  const [publishOpen, setPublishOpen] = useState(true);

  const fallbackName = useMemo(() => {
    const parts = [user?.firstName, user?.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : user?.email || 'You';
  }, [user]);

  const displayName = identity?.displayName || fallbackName;
  const headline = identity?.headline || 'LinkedIn member';
  const avatarUrl = identity?.avatarUrl;

  const initials = useMemo(() => {
    const parts = displayName.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || 'Y';
    const b = parts[1]?.[0] || '';
    return (a + b).toUpperCase();
  }, [displayName]);

  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  );

  const loadIdentity = useCallback(async () => {
    try {
      const data = await getLinkedInIdentity();
      setIdentity(data);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const data = await getContentPost(postId);
      setPost(data);
      setBody(data.body || '');
      setTitle(data.title || '');
      setTagsRaw((data.tags || []).join(', '));
      setMedia(Array.isArray(data.media) ? data.media : []);
      setStage(data.status === 'ready' ? 'ready' : 'draft');
      const local = toLocalInputValue(data.scheduledFor);
      setScheduleDate(local.date);
      setScheduleTime(local.time);
      setDirty(false);
    } catch {
      toast.error('Could not load post.');
      router.replace('/dashboard/content');
    } finally {
      setLoading(false);
    }
  }, [postId, router]);

  useEffect(() => {
    void load();
    void loadIdentity();
  }, [load, loadIdentity]);

  const charCount = [...body].length;
  const locked = post?.status === 'publishing' || post?.status === 'published';

  function snapScheduleInputsToNow() {
    const local = toLocalInputValue(null);
    setScheduleDate(local.date);
    setScheduleTime(local.time);
  }

  function openPublishPanel() {
    setPublishOpen(true);
    // Fresh open: Schedule fields should reflect “right now”, not a stale +1h default.
    if (!locked && post?.status !== 'scheduled') {
      snapScheduleInputsToNow();
    }
  }

  function applyFormat(kind: 'bold' | 'italic' | 'bullet' | 'number') {
    const el = textareaRef.current;
    if (!el || locked) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = wrapSelection(body, start, end, kind);
    setBody(next.value.slice(0, MAX_CHARS));
    setDirty(true);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }

  async function onPickFiles(files: FileList | null) {
    if (!files?.length || locked) return;
    try {
      const incoming: ContentPostMedia[] = [];
      for (const file of Array.from(files)) {
        incoming.push(await fileToContentMedia(file));
      }
      setMedia((prev) => {
        const merged = [...prev, ...incoming];
        const docs = merged.filter((m) => m.kind === 'document');
        const videos = merged.filter((m) => m.kind === 'video');
        const images = merged.filter((m) => m.kind === 'image' || m.kind === 'gif');
        if (
          (docs.length && (images.length || videos.length)) ||
          (videos.length && (images.length || docs.length))
        ) {
          toast.error(`Use images, one PDF, or one video — not mixed.\n${CONTENT_MEDIA_RULES_HINT}`);
          return prev;
        }
        if (docs.length > CONTENT_MEDIA_RULES.maxPdf) {
          toast.error(`Only one PDF is allowed.\n${CONTENT_MEDIA_RULES_HINT}`);
          return prev;
        }
        if (videos.length > CONTENT_MEDIA_RULES.maxVideo) {
          toast.error(`Only one video is allowed.\n${CONTENT_MEDIA_RULES_HINT}`);
          return prev;
        }
        if (images.length > CONTENT_MEDIA_RULES.maxImages) {
          toast.error(`Up to ${CONTENT_MEDIA_RULES.maxImages} images.\n${CONTENT_MEDIA_RULES_HINT}`);
          return prev;
        }
        setDirty(true);
        if (docs.length) return docs.slice(0, 1);
        if (videos.length) return videos.slice(0, 1);
        return images.slice(0, 4);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not attach file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function ensureSaved(): Promise<ContentPost | null> {
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      body,
      title: title.trim() || null,
      tags,
      status: stage,
      media,
    };

    if (!postId && !post) {
      const created = await createContentPost(payload);
      setPost(created);
      setDirty(false);
      router.replace(`/dashboard/content/${created.id}`);
      return created;
    }

    const id = post?.id || postId!;
    const updated = await updateContentPost(id, payload);
    setPost(updated);
    setDirty(false);
    return updated;
  }

  async function handleSave() {
    setSaving(true);
    try {
      await ensureSaved();
      toast.success('Draft saved.');
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not save draft.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSchedule() {
    if (!body.trim() && media.length === 0) {
      toast.error('Write your post or attach media before publishing.');
      return;
    }
    setScheduling(true);
    try {
      const saved = await ensureSaved();
      if (!saved) return;

      let when: 'now' | string = 'now';
      if (whenMode === 'schedule') {
        const local = new Date(`${scheduleDate}T${scheduleTime}`);
        if (Number.isNaN(local.getTime())) {
          toast.error('Pick a valid date and time.');
          setScheduling(false);
          return;
        }
        // If they left Schedule at “now” (same minute), treat as immediate publish.
        const diffMs = local.getTime() - Date.now();
        if (diffMs <= 30_000) {
          when = 'now';
        } else {
          when = local.toISOString();
        }
      }

      const scheduled = await scheduleContentPost(saved.id, {
        when,
        timezone,
        // Caller handles flush for “now” so we can await ack + fall back.
        flush: when !== 'now',
      });
      setPost(scheduled);
      setDirty(false);

      if (when === 'now' || whenMode === 'now') {
        const flushed = await flushLinkedInOutbox(4500);
        if (flushed) {
          toast.success('Publishing now via the LeadHub extension.');
        } else {
          // Extension offline / no ack — schedule ~1 minute ahead so the next poll picks it up.
          try {
            const fallback = await scheduleContentPost(saved.id, {
              when: oneMinuteFromNowIso(),
              timezone,
              flush: false,
            });
            setPost(fallback);
            const local = toLocalInputValue(fallback.scheduledFor);
            setScheduleDate(local.date);
            setScheduleTime(local.time);
            setWhenMode('schedule');
            toast.error(
              'Extension is unreachable — scheduled for about one minute from now. Reload the LeadHub extension, refresh this tab, and keep LinkedIn open.',
            );
          } catch {
            toast.success(
              'Queued to publish. Open LinkedIn with the LeadHub extension connected to send it.',
            );
          }
        }
      } else {
        toast.success('Post scheduled. The extension will publish at the planned time.');
      }
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not schedule post.',
      );
    } finally {
      setScheduling(false);
    }
  }

  async function handleCancelSchedule() {
    if (!post) return;
    try {
      const updated = await cancelScheduleContentPost(post.id);
      setPost(updated);
      setStage('draft');
      toast.success('Schedule cancelled.');
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not cancel schedule.',
      );
    }
  }

  async function handleDelete() {
    if (!post) {
      router.push('/dashboard/content');
      return;
    }
    if (!window.confirm('Delete this post?')) return;
    try {
      await deleteContentPost(post.id);
      toast.success('Post deleted.');
      router.push('/dashboard/content');
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not delete post.',
      );
    }
  }

  async function handleSyncIdentity() {
    setSyncingIdentity(true);
    try {
      const ok = await flushLinkedInOutbox(3500);
      await new Promise((r) => setTimeout(r, 1500));
      await loadIdentity();
      toast.success(
        ok
          ? 'Asked the extension to refresh your LinkedIn profile.'
          : 'Extension is unreachable — reload the extension, refresh this tab, and open LinkedIn with LeadHub connected.',
      );
    } finally {
      setSyncingIdentity(false);
    }
  }

  const previewHtml = useMemo(() => {
    if (!body.trim()) {
      return '<span class="text-slate-400">Start writing and your post will appear here. You can add images, #hashtags and emojis.</span>';
    }
    const truncated = body.length > 260;
    const shown = truncated ? body.slice(0, 260) : body;
    const html = renderLinkedInPreviewHtml(shown);
    return truncated ? `${html}<span class="text-slate-500">… more</span>` : html;
  }, [body]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[560px] flex-col animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/dashboard/content"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Back to content"
          >
            <IconArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {title.trim() || previewSnippet(body, 60) || 'New LinkedIn post'}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {post ? (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${statusBadgeClass(post.status)}`}
                >
                  {statusLabel(post.status)}
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                  Draft
                </span>
              )}
              <button
                type="button"
                title={publishOpen ? 'Hide publish panel' : 'Show publish panel'}
                aria-label={publishOpen ? 'Hide publish panel' : 'Show publish panel'}
                aria-pressed={publishOpen}
                onClick={() => {
                  if (publishOpen) setPublishOpen(false);
                  else openPublishPanel();
                }}
                className={cn(
                  'inline-flex items-center rounded-md border px-1.5 py-0.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800',
                  publishOpen ? 'border-brand-main/40 text-brand-main' : 'border-slate-200',
                )}
              >
                {publishOpen ? (
                  <IconLayoutSidebarRightCollapse size={14} />
                ) : (
                  <IconLayoutSidebarRight size={14} />
                )}
              </button>
              {dirty ? (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
                </span>
              ) : post ? (
                <span>Saved</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btnOutline} disabled={saving || locked} onClick={() => void handleSave()}>
            <IconDeviceFloppy size={16} /> Save draft
          </button>
          {!publishOpen ? (
            <button
              type="button"
              className={btnPrimary}
              disabled={locked || (!body.trim() && media.length === 0)}
              onClick={() => openPublishPanel()}
            >
              <IconSend size={16} /> {whenMode === 'now' ? 'Publish' : 'Schedule'}
            </button>
          ) : null}
        </div>
      </header>

      <div
        className={cn(
          'grid min-h-0 flex-1',
          publishOpen
            ? 'lg:grid-cols-[1fr_minmax(300px,380px)_minmax(260px,300px)]'
            : 'lg:grid-cols-[1fr_minmax(300px,420px)]',
        )}
      >
        {/* Editor */}
        <section className="flex min-h-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-3 py-2">
            <ToolbarBtn label="Bold" onClick={() => applyFormat('bold')}>
              <IconBold size={16} />
            </ToolbarBtn>
            <ToolbarBtn label="Italic" onClick={() => applyFormat('italic')}>
              <IconItalic size={16} />
            </ToolbarBtn>
            <ToolbarBtn label="Bulleted list" onClick={() => applyFormat('bullet')}>
              <IconList size={16} />
            </ToolbarBtn>
            <ToolbarBtn label="Numbered list" onClick={() => applyFormat('number')}>
              <IconListNumbers size={16} />
            </ToolbarBtn>
            <span className="mx-1 h-4 w-px bg-slate-200" />
            <ToolbarBtn
              label={`Attach media — ${CONTENT_MEDIA_RULES_HINT}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <IconPaperclip size={16} />
            </ToolbarBtn>
            <input
              ref={fileInputRef}
              type="file"
              accept={CONTENT_MEDIA_RULES.acceptAttr}
              multiple
              className="hidden"
              onChange={(e) => void onPickFiles(e.target.files)}
            />
          </div>
          <p className="border-b border-slate-100 px-4 py-1.5 text-[11px] leading-snug text-slate-500">
            {CONTENT_MEDIA_RULES_HINT}
          </p>
          <div className="flex-1 overflow-auto p-4">
            <textarea
              ref={textareaRef}
              value={body}
              disabled={locked}
              onChange={(e) => {
                setBody(e.target.value.slice(0, MAX_CHARS));
                setDirty(true);
              }}
              placeholder="Write your LinkedIn post…"
              className="min-h-[280px] w-full resize-none border-0 bg-transparent text-base leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            {media.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                  >
                    {item.kind === 'document' ? (
                      <div className="flex h-28 items-center gap-2 px-3 text-sm text-slate-600">
                        <IconFileText size={20} />
                        <span className="truncate">{item.name}</span>
                      </div>
                    ) : item.kind === 'video' ? (
                      <div className="relative flex h-28 items-center justify-center bg-slate-900/5">
                        <video
                          src={contentMediaSrc(item)}
                          className="h-28 w-full object-cover"
                          muted
                          playsInline
                        />
                        <IconVideo
                          size={22}
                          className="pointer-events-none absolute text-white drop-shadow"
                        />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={contentMediaSrc(item)}
                        alt={item.name}
                        className="h-28 w-full object-cover"
                      />
                    )}
                    {!locked ? (
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                        onClick={() => {
                          setMedia((m) => m.filter((x) => x.id !== item.id));
                          setDirty(true);
                        }}
                        aria-label="Remove attachment"
                      >
                        <IconX size={14} />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    charCount > MAX_CHARS * 0.9 ? 'bg-amber-500' : 'bg-brand-main',
                  )}
                  style={{ width: `${Math.min(100, (charCount / MAX_CHARS) * 100)}%` }}
                />
              </div>
              <span>
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
              </span>
            </div>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-800"
              onClick={() => {
                void navigator.clipboard.writeText(body);
                toast.success('Copied.');
              }}
            >
              Copy text
            </button>
          </div>
        </section>

        {/* LinkedIn-accurate preview */}
        <section className="flex min-h-0 flex-col border-r border-slate-200 bg-[#f3f2ef]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
            <h2 className="text-sm font-semibold text-slate-800">Preview</h2>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {(['mobile', 'desktop'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPreviewMode(m)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold capitalize',
                    previewMode === m ? 'bg-slate-100 text-slate-900' : 'text-slate-500',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-1 justify-center overflow-auto p-4">
            <div
              className={cn(
                'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm',
                previewMode === 'mobile' ? 'w-[340px]' : 'w-full max-w-lg',
              )}
            >
              {previewMode === 'mobile' ? (
                <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-3 py-2">
                  <div className="flex h-8 flex-1 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs text-slate-400">
                    Search
                  </div>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0a66c2]/10 text-[10px] font-bold text-[#0a66c2]">
                      {initials}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="flex items-start gap-3 p-4">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0a66c2]/15 text-sm font-bold text-[#0a66c2]">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {displayName}{' '}
                    <span className="font-normal text-slate-400">· You</span>
                  </p>
                  <p className="line-clamp-2 text-xs leading-snug text-slate-500">{headline}</p>
                  <p className="text-xs text-slate-400">Now</p>
                </div>
              </div>
              <div
                className="px-4 pb-3 text-sm leading-relaxed text-slate-800"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
              {media.length > 0 ? (
                media.length === 1 && media[0]?.kind === 'document' ? (
                  <div className="border-y border-slate-100">
                    <LinkedInPdfViewer
                      fileUrl={contentMediaSrc(media[0])}
                      fileName={media[0].name}
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      'grid gap-0.5 border-y border-slate-100',
                      media.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
                    )}
                  >
                    {media.map((item) =>
                      item.kind === 'document' ? (
                        <LinkedInPdfViewer
                          key={item.id}
                          fileUrl={contentMediaSrc(item)}
                          fileName={item.name}
                        />
                      ) : item.kind === 'video' ? (
                        <div key={item.id} className="relative h-40 bg-slate-900/5">
                          <video
                            src={contentMediaSrc(item)}
                            className="h-40 w-full object-cover"
                            muted
                            playsInline
                            controls
                          />
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={item.id}
                          src={contentMediaSrc(item)}
                          alt={item.name}
                          className="h-40 w-full object-cover"
                        />
                      ),
                    )}
                  </div>
                )
              ) : null}
              <div className="flex justify-between px-6 py-3 text-xs font-semibold text-slate-500">
                <span>Like</span>
                <span>Comment</span>
                <span>Repost</span>
                <span>Send</span>
              </div>
            </div>
          </div>
        </section>

        {/* Publish sidebar — toggled from header (next to Draft) / Schedule */}
        {publishOpen ? (
        <aside className="flex min-h-0 flex-col overflow-auto border-l border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-800">Publish</p>
            <button
              type="button"
              title="Hide publish panel"
              aria-label="Hide publish panel"
              onClick={() => setPublishOpen(false)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <IconX size={16} />
            </button>
          </div>
          <div className="space-y-5 p-4">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Publishing as
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-main hover:underline"
                  onClick={() => void handleSyncIdentity()}
                  disabled={syncingIdentity}
                >
                  <IconRefresh size={12} className={syncingIdentity ? 'animate-spin' : undefined} />
                  Sync profile
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0a66c2]/15 text-xs font-bold text-[#0a66c2]">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{displayName}</p>
                  {identity?.syncedAt ? (
                    <p className="text-xs text-emerald-600">Connected · LinkedIn profile</p>
                  ) : (
                    <p className="text-xs text-amber-600">Open LinkedIn + Sync to load photo/title</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">When</p>
              <div className="mb-3 inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {(['now', 'schedule'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      setWhenMode(m);
                      if (m === 'schedule' && !locked && post?.status !== 'scheduled') {
                        snapScheduleInputsToNow();
                      }
                    }}
                    className={cn(
                      'flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize',
                      whenMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {whenMode === 'schedule' ? (
                <div className="space-y-2">
                  <input
                    type="date"
                    className={inputClass}
                    value={scheduleDate}
                    disabled={locked}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                  <input
                    type="time"
                    className={inputClass}
                    value={scheduleTime}
                    disabled={locked}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500">
                    Defaults to the current time. Change it to plan ahead. ({timezone})
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Publishes immediately via the LeadHub extension. If it isn’t connected, we schedule
                  about one minute from now.
                </p>
              )}
              <button
                type="button"
                className={`${btnPrimary} mt-3 w-full`}
                disabled={scheduling || locked || (!body.trim() && media.length === 0)}
                onClick={() => void handleSchedule()}
              >
                <IconCalendar size={16} />
                {whenMode === 'now' ? 'Publish now' : 'Schedule post'}
              </button>
              {post?.status === 'scheduled' || post?.status === 'failed' ? (
                <button
                  type="button"
                  className={`${btnOutline} mt-2 w-full`}
                  onClick={() => void handleCancelSchedule()}
                >
                  Cancel schedule
                </button>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Title</label>
                <input
                  className={inputClass}
                  value={title}
                  disabled={locked}
                  placeholder="From first sentence"
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Tags</label>
                <input
                  className={inputClass}
                  value={tagsRaw}
                  disabled={locked}
                  placeholder="Tags separated by commas"
                  onChange={(e) => {
                    setTagsRaw(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">Stage</p>
                <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {(['draft', 'ready'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setStage(s);
                        setDirty(true);
                      }}
                      className={cn(
                        'flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize',
                        stage === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="text-xs font-medium text-red-600 hover:underline"
                onClick={() => void handleDelete()}
              >
                Delete post
              </button>
            </div>
          </div>
        </aside>
        ) : null}
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </button>
  );
}
