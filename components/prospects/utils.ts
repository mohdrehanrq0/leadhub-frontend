import {
  leadCompanyName,
  leadLocation,
  leadName,
  type LeadList,
  type LeadRow,
} from '@/components/leads/types';

export type LeadWithRaw = LeadRow & { rawData?: Record<string, unknown> | null };

export function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

export function formatListDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function prospectInitials(lead: LeadRow) {
  const first = lead.contact?.firstName?.trim()?.[0] ?? '';
  const last = lead.contact?.lastName?.trim()?.[0] ?? '';
  const initials = `${first}${last}`.toUpperCase();
  if (initials) return initials;
  const name = prospectDisplayName(lead);
  return name.slice(0, 2).toUpperCase() || '?';
}

export function prospectAvatarUrl(lead: LeadRow) {
  const raw = rawOf(lead);
  for (const key of ['avatarUrl', 'photoUrl', 'profilePicture'] as const) {
    const value = raw[key];
    if (typeof value === 'string' && /^https?:\/\//i.test(value.trim())) return value.trim();
  }
  const snapshot = raw.personSnapshot;
  if (snapshot && typeof snapshot === 'object') {
    const avatar = (snapshot as { avatarUrl?: unknown }).avatarUrl;
    if (typeof avatar === 'string' && /^https?:\/\//i.test(avatar.trim())) return avatar.trim();
  }
  return '';
}

export function prospectTitle(lead: LeadRow) {
  const role = lead.contact?.role?.trim();
  if (role) return role;
  const headline = rawString(lead, 'headline');
  if (headline) return headline;
  return '—';
}

export function prospectEmail(lead: LeadRow) {
  return lead.contact?.email?.trim() || '';
}

export function prospectCompany(lead: LeadRow) {
  const name = leadCompanyName(lead).trim();
  if (!name) return '—';
  if (/\(employer TBD\)/i.test(name) || /employer TBD/i.test(name)) return '—';
  return name;
}

const AVATAR_TONES = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-800',
  'bg-indigo-100 text-indigo-700',
  'bg-orange-100 text-orange-800',
] as const;

export function prospectAvatarTone(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 997;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length] ?? AVATAR_TONES[0];
}

export function prospectLocationLabel(lead: LeadRow) {
  return leadLocation(lead) || '—';
}

function looksLikeSlugDisplayName(name: string, linkedinUrl?: string | null) {
  const compact = name.replace(/\s+/g, '').toLowerCase();
  if (!compact) return true;
  if (name.includes(' ')) return false;
  const publicId = linkedinUrl?.match(/\/in\/([^/?#]+)/i)?.[1]?.toLowerCase() ?? '';
  if (!publicId) return false;
  return compact === publicId.replace(/[-_\d]+/g, '');
}

export function prospectDisplayName(lead: LeadRow) {
  const fromContact = leadName(lead);
  const linkedin = lead.contact?.linkedinUrl;
  const fromRaw =
    rawString(lead, 'personName') ||
    [rawString(lead, 'firstName'), rawString(lead, 'lastName')].filter(Boolean).join(' ').trim();

  if (fromContact && fromContact !== 'Unnamed contact' && !looksLikeSlugDisplayName(fromContact, linkedin)) {
    return fromContact;
  }
  if (fromRaw && !looksLikeSlugDisplayName(fromRaw, linkedin)) return fromRaw;
  return fromContact || fromRaw || 'Unnamed contact';
}

export function linkedInHostPath(url?: string | null) {
  if (!url) return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname}`.replace(/\/$/, '');
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  }
}

function rawOf(lead: LeadRow): Record<string, unknown> {
  return ((lead as LeadWithRaw).rawData ?? {}) as Record<string, unknown>;
}

function rawString(lead: LeadRow, key: string) {
  const value = rawOf(lead)[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function sourcePostAuthor(lead: LeadRow) {
  return rawString(lead, 'sourcePostAuthor');
}

export function sourcePostText(lead: LeadRow) {
  return rawString(lead, 'sourcePostText');
}

export function sourcePostUrl(lead: LeadRow) {
  return rawString(lead, 'sourcePostUrl');
}

export function commentText(lead: LeadRow) {
  const fromRaw = rawString(lead, 'commentText');
  if (fromRaw) return fromRaw;
  const note = lead.notes ?? '';
  const match = note.match(/^Comment on post:\s*(.*)$/i);
  return match?.[1]?.trim() || '';
}

export function sourcePostSnippet(lead: LeadRow, max = 72) {
  const text = sourcePostText(lead).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** Commenters saved via the LinkedIn extension. */
export function isFromComments(lead: LeadRow) {
  const raw = rawOf(lead);
  if (raw.identitySource === 'post_comment') return true;
  if (rawString(lead, 'commentText')) return true;
  const captureNote = rawString(lead, 'captureNote').toLowerCase();
  if (captureNote.includes('comment')) return true;
  const note = (lead.notes ?? '').toLowerCase();
  if (note.includes('comment on post') || note.startsWith('commenter from')) return true;
  const source = (lead.source ?? '').toLowerCase();
  return source === 'comment' || source.includes('comment');
}

export function hasLinkedIn(lead: LeadRow) {
  return Boolean(lead.contact?.linkedinUrl?.trim());
}

export function hasCompany(lead: LeadRow) {
  return prospectCompany(lead) !== '—';
}

export type ListFilter = 'all' | 'with_prospects' | 'empty';

export function filterLists(lists: LeadList[], filter: ListFilter, query: string) {
  const q = query.trim().toLowerCase();
  return lists.filter((list) => {
    const count = list.leadCount ?? 0;
    if (filter === 'with_prospects' && count === 0) return false;
    if (filter === 'empty' && count > 0) return false;
    if (!q) return true;
    return (
      list.name.toLowerCase().includes(q) ||
      (list.description ?? '').toLowerCase().includes(q) ||
      (list.outreachMotive ?? '').toLowerCase().includes(q)
    );
  });
}

export type ProspectFilter =
  | 'all'
  | 'with_email'
  | 'missing_email'
  | 'with_linkedin'
  | 'missing_linkedin'
  | 'from_comments'
  | 'missing_company';

export type ProspectExtraFilter = 'missing_title' | null;

export type ProspectSourceFilters = {
  postAuthor?: string | null;
  postUrl?: string | null;
  postSnippet?: string | null;
  /** Precomputed identities from listSourcePosts — match any URL variant. */
  postMatchIds?: string[] | null;
};

export function filterProspects(
  leads: LeadRow[],
  filter: ProspectFilter,
  query: string,
  extra: ProspectExtraFilter = null,
  source: ProspectSourceFilters = {},
) {
  const q = query.trim().toLowerCase();
  const author = source.postAuthor?.trim().toLowerCase() || '';
  const postUrl = source.postUrl?.trim() || '';
  const postSnippet = source.postSnippet?.trim().toLowerCase() || '';
  const matchIds = (source.postMatchIds ?? []).filter(Boolean);
  return leads.filter((lead) => {
    const email = prospectEmail(lead);
    const linkedin = hasLinkedIn(lead);
    if (filter === 'with_email' && !email) return false;
    if (filter === 'missing_email' && email) return false;
    if (filter === 'with_linkedin' && !linkedin) return false;
    if (filter === 'missing_linkedin' && linkedin) return false;
    if (filter === 'from_comments' && !isFromComments(lead)) return false;
    if (filter === 'missing_company' && hasCompany(lead)) return false;
    if (extra === 'missing_title' && prospectTitle(lead) !== '—') return false;
    if (matchIds.length > 0 || postUrl || postSnippet || author) {
      const leadAuthor = sourcePostAuthor(lead);
      const leadUrl = sourcePostUrl(lead);
      const leadSnippet = sourcePostSnippet(lead, 64);
      const leadId = sourcePostIdentity(leadUrl, leadAuthor, leadSnippet);
      const idHit = matchIds.length > 0 && matchIds.includes(leadId);
      const urlHit = Boolean(postUrl) && (
        leadUrl === postUrl ||
        sourcePostIdentity(postUrl, author, postSnippet) === leadId
      );
      const snipHit =
        !postUrl &&
        Boolean(postSnippet) &&
        (leadSnippet.toLowerCase() === postSnippet ||
          sourcePostText(lead).toLowerCase().startsWith(postSnippet.replace(/…$/, '')) ||
          snippetPrefix(leadSnippet) === snippetPrefix(postSnippet));
      const authorHit = Boolean(author) && leadAuthor.toLowerCase() === author;
      // Chip selected: match by normalized identity first, then URL / snippet.
      if (matchIds.length > 0 || postUrl || postSnippet) {
        if (!(idHit || urlHit || snipHit)) return false;
        if (author && !authorHit && !idHit && !urlHit) return false;
      } else if (author && !authorHit) {
        return false;
      }
    }
    if (!q) return true;
    const haystack = [
      prospectDisplayName(lead),
      prospectTitle(lead),
      prospectCompany(lead),
      prospectLocationLabel(lead),
      email,
      lead.contact?.linkedinUrl ?? '',
      lead.notes ?? '',
      lead.source ?? '',
      sourcePostAuthor(lead),
      sourcePostText(lead),
      sourcePostUrl(lead),
      commentText(lead),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function countProspectFilters(leads: LeadRow[]) {
  return {
    all: leads.length,
    with_email: leads.filter((lead) => Boolean(prospectEmail(lead))).length,
    missing_email: leads.filter((lead) => !prospectEmail(lead)).length,
    with_linkedin: leads.filter((lead) => hasLinkedIn(lead)).length,
    missing_linkedin: leads.filter((lead) => !hasLinkedIn(lead)).length,
    from_comments: leads.filter((lead) => isFromComments(lead)).length,
    missing_company: leads.filter((lead) => !hasCompany(lead)).length,
  };
}

export type SourcePostOption = {
  key: string;
  author: string;
  snippet: string;
  url: string;
  count: number;
  /** Normalized ids that should match this chip (activity / posts slug / meta). */
  matchIds: string[];
};

/**
 * Collapse LinkedIn post URL variants (posts/… vs feed/update/urn:li:activity:…)
 * into one stable id so rescans don't create duplicate "From post" chips.
 */
export function sourcePostIdentity(url: string, author = '', snippet = ''): string {
  const raw = (url || '').trim();
  if (raw) {
    const activity =
      raw.match(/urn:li:(?:activity|share|ugcpost):(\d+)/i) ||
      raw.match(/activity[:/%]+(\d{15,})/i) ||
      raw.match(/(\d{15,})/);
    if (activity?.[1] && /\/(?:posts|feed|update)/i.test(raw)) {
      return `activity:${activity[1]}`;
    }
    const posts = raw.match(/linkedin\.com\/posts\/([^/?#]+)/i);
    if (posts?.[1]) return `posts:${posts[1].toLowerCase()}`;
    const feed = raw.match(/linkedin\.com\/feed\/update\/([^/?#]+)/i);
    if (feed?.[1]) return `feed:${decodeURIComponent(feed[1]).toLowerCase()}`;
    return `url:${raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '').toLowerCase()}`;
  }
  const who = author.trim().toLowerCase() || 'unknown';
  const snip = snippet.replace(/\s+/g, ' ').trim().slice(0, 40).toLowerCase();
  return `meta:${who}::${snip}`;
}

function snippetPrefix(text: string, n = 28) {
  return text.replace(/\s+/g, ' ').trim().slice(0, n).toLowerCase();
}

/** Unique source posts represented among commenter leads in this list. */
export function listSourcePosts(leads: LeadRow[]): SourcePostOption[] {
  const map = new Map<string, SourcePostOption>();

  const findMergeTarget = (author: string, snippet: string, identity: string) => {
    const hit = map.get(identity);
    if (hit) return hit;
    const who = author.trim().toLowerCase();
    const prefix = snippetPrefix(snippet);
    if (!who || !prefix) return undefined;
    for (const post of map.values()) {
      if (post.author.trim().toLowerCase() !== who) continue;
      const other = snippetPrefix(post.snippet);
      if (!other) continue;
      // Same author + overlapping snippet → same post (URL form differed).
      if (prefix.startsWith(other.slice(0, 20)) || other.startsWith(prefix.slice(0, 20))) {
        return post;
      }
    }
    return undefined;
  };

  for (const lead of leads) {
    if (!isFromComments(lead)) continue;
    const url = sourcePostUrl(lead);
    const author = sourcePostAuthor(lead) || 'Unknown author';
    const snippet = sourcePostSnippet(lead, 64) || 'LinkedIn post';
    const identity = sourcePostIdentity(url, author, snippet);
    const existing = findMergeTarget(author, snippet, identity);
    if (existing) {
      existing.count += 1;
      if (!existing.matchIds.includes(identity)) existing.matchIds.push(identity);
      // Prefer a real URL when merging a url-less row into one that has it.
      if (!existing.url && url) existing.url = url;
      if (snippet.length > existing.snippet.length) existing.snippet = snippet;
    } else {
      map.set(identity, {
        key: identity,
        author,
        snippet,
        url,
        count: 1,
        matchIds: [identity],
      });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.author.localeCompare(b.author));
}
