/** Only valid personal mailboxes and confirmed role inboxes are shown in the UI.
 * Catch-all is shown only when a published web source backs the address
 * (SMTP cannot verify catch-all domains).
 */
export function isShowableEmailStatus(
  status: string | null | undefined,
  options?: { sourceUrl?: string | null; source?: string | null },
): boolean {
  if (!status) return false;
  if (status === 'invalid' || status === 'disposable' || status === 'blocked') {
    return false;
  }
  if (status === 'catch_all') {
    const published = Boolean(options?.sourceUrl) || isPublishedWebSource(options?.source);
    return published;
  }
  return status === 'valid' || status === 'unknown' || status === 'role_account';
}

const PUBLISHED_WEB_SOURCES = new Set([
  'web',
  'serp',
  'website',
  'contact_page',
  'press',
  'pdf',
]);

export function isPublishedWebSource(source?: string | null): boolean {
  return Boolean(source && PUBLISHED_WEB_SOURCES.has(source));
}

/** Role inboxes are stored but labeled unknown for outreach. */
export function displayEmailStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  if (status === 'role_account') return 'unknown';
  return status;
}

/** Host label for "Found on …" chip. */
export function emailSourceHost(sourceUrl?: string | null): string | null {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
