'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';
import {
  IconArrowLeft,
  IconBlockquote,
  IconBold,
  IconCalendar,
  IconChevronDown,
  IconCode,
  IconDeviceFloppy,
  IconExternalLink,
  IconItalic,
  IconLayoutSidebarRight,
  IconLayoutSidebarRightCollapse,
  IconLink,
  IconList,
  IconListNumbers,
  IconMarkdown,
  IconPhoto,
  IconSend,
  IconSeparatorHorizontal,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
  CONTENT_MEDIA_RULES,
  cancelScheduleContentPost,
  contentMediaSrc,
  createContentPost,
  deleteContentPost,
  fileToContentMedia,
  getContentPost,
  getLinkedInIdentity,
  scheduleContentPost,
  statusBadgeClass,
  statusLabel,
  updateContentPost,
  type ContentPost,
  type ContentPostMedia,
  type LinkedInIdentity,
} from '@/lib/content-posts';
import { btnOutline, btnPrimary, inputClass } from '@/components/ui/styles';
import { cn } from '@/lib/utils';

type Props = {
  articleId?: string;
};

function toLocalInputValue(iso: string | null | undefined): { date: string; time: string } {
  const d = iso ? new Date(iso) : new Date(Date.now() + 3600_000);
  const valid = Number.isNaN(d.getTime()) ? new Date() : d;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${valid.getFullYear()}-${pad(valid.getMonth() + 1)}-${pad(valid.getDate())}`,
    time: `${pad(valid.getHours())}:${pad(valid.getMinutes())}`,
  };
}

function looksLikeMarkdown(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return (
    /^#{1,6}\s+\S/m.test(trimmed) ||
    /\*\*[^*\n]+\*\*/.test(trimmed) ||
    /(^|\n)\s*([-*+]|\d+\.)\s+\S/.test(trimmed) ||
    /^>\s+\S/m.test(trimmed) ||
    /```[\s\S]*```/.test(trimmed) ||
    /\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(trimmed) ||
    /^---+\s*$/m.test(trimmed)
  );
}

function markdownToHtml(md: string): string {
  const rendered = marked.parse(md, { async: false, gfm: true, breaks: true });
  return typeof rendered === 'string' ? rendered : '';
}

function htmlToApproxMarkdown(html: string): string {
  if (!html.trim()) return '';
  const div = document.createElement('div');
  div.innerHTML = html;

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join('');
    switch (tag) {
      case 'h1':
        return `# ${inner.trim()}\n\n`;
      case 'h2':
        return `## ${inner.trim()}\n\n`;
      case 'h3':
        return `### ${inner.trim()}\n\n`;
      case 'p':
        return `${inner.trim()}\n\n`;
      case 'br':
        return '\n';
      case 'strong':
      case 'b':
        return `**${inner}**`;
      case 'em':
      case 'i':
        return `*${inner}*`;
      case 'code':
        return el.parentElement?.tagName.toLowerCase() === 'pre' ? inner : `\`${inner}\``;
      case 'pre':
        return `\`\`\`\n${inner.trim()}\n\`\`\`\n\n`;
      case 'blockquote':
        return (
          inner
            .trim()
            .split('\n')
            .map((l) => `> ${l}`)
            .join('\n') + '\n\n'
        );
      case 'hr':
        return '---\n\n';
      case 'a': {
        const href = el.getAttribute('href') || '';
        return href ? `[${inner}](${href})` : inner;
      }
      case 'ul':
        return (
          Array.from(el.children)
            .map((li) => `- ${walk(li).trim()}`)
            .join('\n') + '\n\n'
        );
      case 'ol':
        return (
          Array.from(el.children)
            .map((li, idx) => `${idx + 1}. ${walk(li).trim()}`)
            .join('\n') + '\n\n'
        );
      case 'li':
        return inner;
      default:
        return inner;
    }
  };

  return walk(div).replace(/\n{3,}/g, '\n\n').trim();
}

export function ArticleEditor({ articleId }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [article, setArticle] = useState<ContentPost | null>(null);
  const [identity, setIdentity] = useState<LinkedInIdentity | null>(null);
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [markdownDraft, setMarkdownDraft] = useState('');
  const [editorMode, setEditorMode] = useState<'richtext' | 'markdown'>('richtext');
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);

  const [cover, setCover] = useState<ContentPostMedia | null>(null);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [commentary, setCommentary] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [stage, setStage] = useState<'draft' | 'ready'>('draft');
  const [whenMode, setWhenMode] = useState<'now' | 'schedule'>('schedule');
  const [scheduleDate, setScheduleDate] = useState(() => toLocalInputValue(null).date);
  const [scheduleTime, setScheduleTime] = useState(() => toLocalInputValue(null).time);

  const [loading, setLoading] = useState(Boolean(articleId));
  const [saving, setSaving] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [publishOpen, setPublishOpen] = useState(true);

  const locked = article?.status === 'publishing' || article?.status === 'published';

  const fallbackName = useMemo(() => {
    const parts = [user?.firstName, user?.lastName].filter(Boolean);
    return parts.length ? parts.join(' ') : user?.email || 'You';
  }, [user]);
  const displayName = identity?.displayName || fallbackName;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !locked,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-brand-main underline',
          rel: 'noopener noreferrer nofollow',
        },
      }),
      Placeholder.configure({
        placeholder: 'Write your article here, or paste Markdown (auto-converts to rich text)…',
      }),
    ],
    content: bodyHtml,
    editorProps: {
      attributes: {
        class:
          'min-h-[380px] focus:outline-none text-[16px] leading-7 text-slate-800',
      },
      handlePaste(view, event) {
        if (locked) return false;
        const html = event.clipboardData?.getData('text/html');
        const text = event.clipboardData?.getData('text/plain') || '';
        if (!html && looksLikeMarkdown(text)) {
          event.preventDefault();
          const converted = markdownToHtml(text);
          if (converted && editor) {
            editor.chain().focus().insertContent(converted).run();
            toast.success('Markdown pasted and converted to rich text.');
            return true;
          }
        }
        return false;
      },
    },
    onUpdate({ editor: ed }) {
      const next = ed.getHTML();
      setBodyHtml(next);
      setDirty(true);
    },
  });

  useEffect(() => {
    if (editor) {
      editor.setEditable(!locked);
    }
  }, [editor, locked]);

  useEffect(() => {
    void getLinkedInIdentity()
      .then((id) => setIdentity(id))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!articleId) return;
    let active = true;
    setLoading(true);
    void getContentPost(articleId)
      .then((row) => {
        if (!active) return;
        setArticle(row);
        setTitle(row.title === 'Untitled article' ? '' : row.title || '');
        setBodyHtml(row.body || '');
        setCover(row.media?.[0] ?? null);
        setSeoTitle(row.articleMeta?.seoTitle || '');
        setSeoDescription(row.articleMeta?.seoDescription || '');
        setCommentary(row.articleMeta?.commentary || '');
        setTagsRaw((row.tags ?? []).join(', '));
        setStage(row.status === 'ready' ? 'ready' : 'draft');
        if (row.scheduledFor) {
          const dt = toLocalInputValue(row.scheduledFor);
          setScheduleDate(dt.date);
          setScheduleTime(dt.time);
        }
        if (editor) {
          editor.commands.setContent(row.body || '', { emitUpdate: false });
        }
        setDirty(false);
      })
      .catch(() => {
        toast.error('Failed to load article.');
        router.push('/dashboard/content/articles');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [articleId, editor, router]);

  // Sync loaded HTML into TipTap once editor mounts
  useEffect(() => {
    if (editor && bodyHtml && editor.isEmpty) {
      editor.commands.setContent(bodyHtml, { emitUpdate: false });
    }
  }, [editor, bodyHtml]);

  const switchMode = (nextMode: 'richtext' | 'markdown') => {
    if (nextMode === editorMode) return;
    if (nextMode === 'markdown') {
      const currentHtml = editor ? editor.getHTML() : bodyHtml;
      setMarkdownDraft(htmlToApproxMarkdown(currentHtml));
      setEditorMode('markdown');
    } else {
      const converted = markdownToHtml(markdownDraft);
      setBodyHtml(converted);
      editor?.commands.setContent(converted, { emitUpdate: false });
      setDirty(true);
      setEditorMode('richtext');
    }
  };

  const resolveLatestHtml = useCallback(() => {
    if (editorMode === 'markdown') {
      const converted = markdownToHtml(markdownDraft);
      setBodyHtml(converted);
      editor?.commands.setContent(converted, { emitUpdate: false });
      return converted;
    }
    return editor ? editor.getHTML() : bodyHtml;
  }, [bodyHtml, editor, editorMode, markdownDraft]);

  const handleCoverSelect = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const item = await fileToContentMedia(file);
      if (item.kind === 'document') {
        toast.error('Article cover must be an image, GIF, or video.');
        return;
      }
      setCover(item);
      setDirty(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not attach cover.');
    } finally {
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const parseTags = () =>
    tagsRaw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);

  const persistArticle = useCallback(
    async (opts?: { silent?: boolean }): Promise<ContentPost | null> => {
      const latestHtml = resolveLatestHtml();
      const payload = {
        contentType: 'article' as const,
        title: title.trim() || 'Untitled article',
        body: latestHtml,
        articleMeta: {
          seoTitle: seoTitle.trim() || null,
          seoDescription: seoDescription.trim() || null,
          commentary: commentary.trim() || null,
        },
        tags: parseTags(),
        status: stage,
        media: cover ? [cover] : [],
      };

      setSaving(true);
      try {
        const saved = article?.id
          ? await updateContentPost(article.id, payload)
          : await createContentPost(payload);
        setArticle(saved);
        setCover(saved.media?.[0] ?? null);
        setDirty(false);
        if (!opts?.silent) toast.success('Article saved.');
        if (!articleId && saved.id) {
          router.replace(`/dashboard/content/articles/${saved.id}`);
        }
        return saved;
      } catch (err) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Save failed.');
        toast.error(msg);
        return null;
      } finally {
        setSaving(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [article?.id, articleId, commentary, cover, resolveLatestHtml, router, seoDescription, seoTitle, stage, tagsRaw, title],
  );

  const handleScheduleOrPublish = async (mode: 'now' | 'schedule') => {
    const latestHtml = resolveLatestHtml();
    const plain = latestHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!title.trim()) {
      toast.error('Please add an article title before publishing.');
      return;
    }
    if (!plain) {
      toast.error('Please write your article body before publishing.');
      return;
    }

    setScheduling(true);
    try {
      const saved = await persistArticle({ silent: true });
      if (!saved) return;

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      let when: 'now' | string = 'now';
      if (mode === 'schedule') {
        const local = new Date(`${scheduleDate}T${scheduleTime}`);
        if (Number.isNaN(local.getTime())) {
          toast.error('Pick a valid schedule date and time.');
          return;
        }
        when = local.toISOString();
      }

      const updated = await scheduleContentPost(saved.id, {
        when,
        timezone: tz,
        flush: mode === 'now',
      });
      setArticle(updated);
      toast.success(
        mode === 'now'
          ? 'Article queued for immediate publish via the LeadHub extension.'
          : 'Article scheduled.',
      );
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Could not schedule article.');
      toast.error(msg);
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelSchedule = async () => {
    if (!article?.id) return;
    try {
      const updated = await cancelScheduleContentPost(article.id);
      setArticle(updated);
      toast.success('Schedule cancelled.');
    } catch {
      toast.error('Failed to cancel schedule.');
    }
  };

  const handleDelete = async () => {
    if (!article?.id) {
      router.push('/dashboard/content/articles');
      return;
    }
    if (!window.confirm('Delete this article draft?')) return;
    try {
      await deleteContentPost(article.id);
      toast.success('Article deleted.');
      router.push('/dashboard/content/articles');
    } catch {
      toast.error('Failed to delete article.');
    }
  };

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL', prev || 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const activeStyleLabel = editor?.isActive('heading', { level: 2 })
    ? 'Heading'
    : editor?.isActive('heading', { level: 3 })
      ? 'Subheading'
      : 'Normal';

  if (loading) {
    return <div className="mx-auto max-w-6xl h-96 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 animate-fade-in">
      {/* Top header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/content/articles"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <IconArrowLeft size={16} /> Articles
          </Link>
          <span className="text-slate-300">/</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{displayName}</span>
            <span className="text-xs text-slate-400">Individual article</span>
          </div>
          {article ? (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(article.status)}`}
            >
              {statusLabel(article.status)}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {article?.linkedinPostUrl ? (
            <a
              href={article.linkedinPostUrl}
              target="_blank"
              rel="noreferrer"
              className={btnOutline}
            >
              View on LinkedIn <IconExternalLink size={15} />
            </a>
          ) : null}
          {!locked ? (
            <button
              type="button"
              onClick={() => void persistArticle()}
              disabled={saving}
              className={btnOutline}
            >
              <IconDeviceFloppy size={15} />
              {saving ? 'Saving…' : dirty ? 'Save draft' : 'Saved'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setPublishOpen((o) => !o)}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            title={publishOpen ? 'Hide publish panel' : 'Show publish panel'}
          >
            {publishOpen ? (
              <IconLayoutSidebarRightCollapse size={18} />
            ) : (
              <IconLayoutSidebarRight size={18} />
            )}
          </button>
        </div>
      </div>

      {article?.lastError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong>Publish error:</strong> {article.lastError}
        </div>
      ) : null}

      <div className={cn('grid gap-5', publishOpen ? 'lg:grid-cols-[1fr_340px]' : 'grid-cols-1')}>
        {/* Main LinkedIn-style Article Canvas */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Formatting Toolbar matching LinkedIn Article Editor */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-1">
              {editorMode === 'richtext' ? (
                <>
                  {/* Style dropdown: Normal / Heading / Subheading */}
                  <div className="relative">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => setStyleMenuOpen((o) => !o)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {activeStyleLabel}
                      <IconChevronDown size={14} />
                    </button>
                    {styleMenuOpen ? (
                      <div className="absolute left-0 z-20 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            editor?.chain().focus().setParagraph().run();
                            setStyleMenuOpen(false);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            editor?.chain().focus().toggleHeading({ level: 2 }).run();
                            setStyleMenuOpen(false);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-base font-bold text-slate-800 hover:bg-slate-50"
                        >
                          Heading
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            editor?.chain().focus().toggleHeading({ level: 3 }).run();
                            setStyleMenuOpen(false);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                        >
                          Subheading
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <span className="mx-1 h-5 w-px bg-slate-200" />

                  <ToolbarBtn
                    active={Boolean(editor?.isActive('bold'))}
                    disabled={locked}
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    title="Bold"
                  >
                    <IconBold size={16} />
                  </ToolbarBtn>
                  <ToolbarBtn
                    active={Boolean(editor?.isActive('italic'))}
                    disabled={locked}
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    title="Italic"
                  >
                    <IconItalic size={16} />
                  </ToolbarBtn>

                  <span className="mx-1 h-5 w-px bg-slate-200" />

                  <ToolbarBtn
                    active={Boolean(editor?.isActive('bulletList'))}
                    disabled={locked}
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    title="Bullet list"
                  >
                    <IconList size={16} />
                  </ToolbarBtn>
                  <ToolbarBtn
                    active={Boolean(editor?.isActive('orderedList'))}
                    disabled={locked}
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    title="Numbered list"
                  >
                    <IconListNumbers size={16} />
                  </ToolbarBtn>

                  <span className="mx-1 h-5 w-px bg-slate-200" />

                  <ToolbarBtn
                    active={Boolean(editor?.isActive('blockquote'))}
                    disabled={locked}
                    onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                    title="Quote"
                  >
                    <IconBlockquote size={16} />
                  </ToolbarBtn>
                  <ToolbarBtn
                    active={Boolean(editor?.isActive('codeBlock'))}
                    disabled={locked}
                    onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                    title="Code block"
                  >
                    <IconCode size={16} />
                  </ToolbarBtn>
                  <ToolbarBtn
                    active={false}
                    disabled={locked}
                    onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                    title="Divider"
                  >
                    <IconSeparatorHorizontal size={16} />
                  </ToolbarBtn>
                  <ToolbarBtn
                    active={Boolean(editor?.isActive('link'))}
                    disabled={locked}
                    onClick={setLink}
                    title="Link"
                  >
                    <IconLink size={16} />
                  </ToolbarBtn>
                </>
              ) : (
                <span className="text-xs text-slate-500">
                  Markdown mode — switches back to rich text automatically
                </span>
              )}
            </div>

            {/* Rich Text / Markdown toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => switchMode('richtext')}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition',
                  editorMode === 'richtext'
                    ? 'bg-brand-main text-white'
                    : 'text-slate-600 hover:text-slate-900',
                )}
              >
                Rich Text
              </button>
              <button
                type="button"
                disabled={locked}
                onClick={() => switchMode('markdown')}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition disabled:opacity-50',
                  editorMode === 'markdown'
                    ? 'bg-brand-main text-white'
                    : 'text-slate-600 hover:text-slate-900',
                )}
              >
                <IconMarkdown size={14} /> Markdown
              </button>
            </div>
          </div>

          <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
            {/* Cover Image / Video Upload Zone */}
            <div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={(e) => void handleCoverSelect(e.target.files)}
              />
              {cover ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {cover.kind === 'video' ? (
                    <video
                      src={contentMediaSrc(cover)}
                      controls
                      className="max-h-72 w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={contentMediaSrc(cover)}
                      alt={cover.name}
                      className="max-h-72 w-full object-cover"
                    />
                  )}
                  {!locked ? (
                    <div className="absolute right-3 top-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow hover:bg-white"
                      >
                        Replace cover
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCover(null);
                          setDirty(true);
                        }}
                        className="rounded-lg bg-white/90 p-1.5 text-slate-700 shadow hover:bg-white"
                        aria-label="Remove cover"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-[#f3f2ef] px-6 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm">
                    <IconPhoto size={26} />
                  </div>
                  <p className="text-sm text-slate-600">
                    Add a cover image or video to your article.
                  </p>
                  {!locked ? (
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-400 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <IconUpload size={14} /> Upload from computer
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Article Title */}
            <div>
              <input
                type="text"
                disabled={locked}
                value={title}
                maxLength={CONTENT_MEDIA_RULES.maxArticleTitleChars}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                }}
                placeholder="Title"
                className="w-full border-0 bg-transparent text-3xl font-bold tracking-tight text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-75"
              />
            </div>

            {/* Body Editor: TipTap Rich Text OR Markdown */}
            {editorMode === 'richtext' ? (
              <div
                className={cn(
                  '[&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-slate-900',
                  '[&_.ProseMirror_h3]:mt-5 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-slate-900',
                  '[&_.ProseMirror_p]:my-2.5',
                  '[&_.ProseMirror_ul]:my-3 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6',
                  '[&_.ProseMirror_ol]:my-3 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6',
                  '[&_.ProseMirror_blockquote]:my-4 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-slate-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-slate-600',
                  '[&_.ProseMirror_pre]:my-4 [&_.ProseMirror_pre]:overflow-x-auto [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:bg-slate-900 [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:text-sm [&_.ProseMirror_pre]:text-slate-100',
                  '[&_.ProseMirror_hr]:my-6 [&_.ProseMirror_hr]:border-slate-200',
                  '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-slate-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
                )}
              >
                <EditorContent editor={editor} />
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={markdownDraft}
                  onChange={(e) => {
                    setMarkdownDraft(e.target.value);
                    setDirty(true);
                  }}
                  rows={18}
                  placeholder={'## Heading\n\nWrite or paste **Markdown** here…'}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-800 focus:border-brand-main focus:bg-white focus:outline-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode('richtext')}
                    className={btnOutline}
                  >
                    Convert Markdown to Rich Text
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Publish, Schedule & SEO Settings Sidebar */}
        {publishOpen ? (
          <aside className="space-y-4">
            {/* Publish / Schedule Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Publish & Schedule</h3>
                <span className="text-xs text-slate-400">via Extension</span>
              </div>

              {!locked ? (
                <>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStage('draft');
                        setDirty(true);
                      }}
                      className={cn(
                        'flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium',
                        stage === 'draft'
                          ? 'border-brand-main bg-brand-main/10 text-brand-main'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStage('ready');
                        setDirty(true);
                      }}
                      className={cn(
                        'flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium',
                        stage === 'ready'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      Ready
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setWhenMode('now')}
                      className={cn(
                        'rounded-md py-1.5 font-medium',
                        whenMode === 'now'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600',
                      )}
                    >
                      Publish now
                    </button>
                    <button
                      type="button"
                      onClick={() => setWhenMode('schedule')}
                      className={cn(
                        'rounded-md py-1.5 font-medium',
                        whenMode === 'schedule'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600',
                      )}
                    >
                      Schedule
                    </button>
                  </div>

                  {whenMode === 'schedule' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className={inputClass}
                      />
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  ) : null}

                  <button
                    type="button"
                    disabled={scheduling || saving}
                    onClick={() => void handleScheduleOrPublish(whenMode)}
                    className={cn(btnPrimary, 'w-full justify-center')}
                  >
                    {whenMode === 'now' ? <IconSend size={15} /> : <IconCalendar size={15} />}
                    {scheduling
                      ? 'Submitting…'
                      : whenMode === 'now'
                        ? 'Publish article now'
                        : 'Schedule article'}
                  </button>

                  {article?.status === 'scheduled' || article?.status === 'failed' ? (
                    <button
                      type="button"
                      onClick={() => void handleCancelSchedule()}
                      className={cn(btnOutline, 'w-full justify-center')}
                    >
                      Cancel schedule
                    </button>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  This article is {article?.status}. Editing is locked.
                </p>
              )}

              {article?.status !== 'publishing' ? (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <IconTrash size={14} /> Delete article
                </button>
              ) : null}
            </div>

            {/* SEO Settings Card (matches LinkedIn Manage -> Settings) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">SEO Settings</h3>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <label htmlFor="seo-title">SEO title</label>
                  <span className="text-slate-400">
                    {seoTitle.length}/{CONTENT_MEDIA_RULES.maxSeoTitleChars}
                  </span>
                </div>
                <input
                  id="seo-title"
                  type="text"
                  disabled={locked}
                  maxLength={CONTENT_MEDIA_RULES.maxSeoTitleChars}
                  value={seoTitle}
                  onChange={(e) => {
                    setSeoTitle(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Ex: My article"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <label htmlFor="seo-desc">SEO description</label>
                  <span className="text-slate-400">
                    {seoDescription.length}/{CONTENT_MEDIA_RULES.maxSeoDescriptionChars}
                  </span>
                </div>
                <textarea
                  id="seo-desc"
                  rows={3}
                  disabled={locked}
                  maxLength={CONTENT_MEDIA_RULES.maxSeoDescriptionChars}
                  value={seoDescription}
                  onChange={(e) => {
                    setSeoDescription(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Ex: A recap about what the article is about"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Share Commentary Card (LinkedIn Next -> Publish modal) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Share commentary</h3>
                <span className="text-xs text-slate-400">
                  {commentary.length}/{CONTENT_MEDIA_RULES.maxArticleCommentaryChars}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Optional feed post text added when LinkedIn shares your published article.
              </p>
              <textarea
                rows={4}
                disabled={locked}
                maxLength={CONTENT_MEDIA_RULES.maxArticleCommentaryChars}
                value={commentary}
                onChange={(e) => {
                  setCommentary(e.target.value);
                  setDirty(true);
                }}
                placeholder="Tell your network what your article is about…"
                className={inputClass}
              />
            </div>

            {/* Tags */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
              <label htmlFor="article-tags" className="text-sm font-semibold text-slate-800">
                Tags
              </label>
              <input
                id="article-tags"
                type="text"
                disabled={locked}
                value={tagsRaw}
                onChange={(e) => {
                  setTagsRaw(e.target.value);
                  setDirty(true);
                }}
                placeholder="growth, b2b, outbound"
                className={inputClass}
              />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function ToolbarBtn({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        'rounded-lg p-1.5 transition disabled:opacity-40',
        active
          ? 'bg-brand-main/15 text-brand-main'
          : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900',
      )}
    >
      {children}
    </button>
  );
}
