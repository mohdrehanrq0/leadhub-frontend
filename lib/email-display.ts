/** Only valid personal mailboxes and confirmed role inboxes are shown in the UI. */
export function isShowableEmailStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  if (status === 'invalid' || status === 'disposable' || status === 'blocked' || status === 'catch_all') {
    return false;
  }
  return status === 'valid' || status === 'unknown' || status === 'role_account';
}

/** Role inboxes are stored but labeled unknown for outreach. */
export function displayEmailStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  if (status === 'role_account') return 'unknown';
  return status;
}
