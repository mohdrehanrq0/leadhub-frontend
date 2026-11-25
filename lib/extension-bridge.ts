/**
 * Talk to the LeadHub Chrome extension from the web app.
 *
 * Two channels (tried in order):
 * 1. chrome.runtime.sendMessage via externally_connectable (needs extension id)
 * 2. window.postMessage → dashboard-bridge content script
 *
 * The bridge writes the extension id into localStorage on every page load so
 * channel 1 keeps working after an extension reload orphans the content script.
 */

const EXTENSION_ID_KEY = 'leadhub_extension_id';

type PageChromeRuntime = {
  sendMessage: (
    extensionId: string,
    message: Record<string, unknown>,
  ) => Promise<unknown>;
};

function pageChromeRuntime(): PageChromeRuntime | null {
  try {
    const runtime = (window as unknown as { chrome?: { runtime?: PageChromeRuntime } }).chrome
      ?.runtime;
    return runtime && typeof runtime.sendMessage === 'function' ? runtime : null;
  } catch {
    return null;
  }
}

export function rememberExtensionId(id: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const trimmed = typeof id === 'string' ? id.trim() : '';
  if (!trimmed) return;
  try {
    window.localStorage.setItem(EXTENSION_ID_KEY, trimmed);
  } catch {
    /* private mode / blocked storage */
  }
}

export function getRememberedExtensionId(): string | null {
  if (typeof window === 'undefined') return null;
  const fromEnv = process.env.NEXT_PUBLIC_LEADHUB_EXTENSION_ID?.trim();
  if (fromEnv) return fromEnv;
  try {
    const stored = window.localStorage.getItem(EXTENSION_ID_KEY)?.trim();
    return stored || null;
  } catch {
    return null;
  }
}

export function clearRememberedExtensionId(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(EXTENSION_ID_KEY);
  } catch {
    /* ignore */
  }
}

/** Listen for bridge “ready” announcements and persist the extension id. */
export function watchExtensionAnnouncement(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onMessage = (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data as {
      source?: string;
      kind?: string;
      extensionId?: string;
    } | null;
    if (data?.source !== 'leadhub-extension') return;
    if (data.kind === 'extension-ready' || data.kind === 'extension-pong') {
      rememberExtensionId(data.extensionId);
    }
  };

  window.addEventListener('message', onMessage);
  // Ask the bridge to announce itself if it is already injected.
  window.postMessage({ source: 'leadhub', kind: 'ping-extension' }, window.location.origin);
  return () => window.removeEventListener('message', onMessage);
}

/**
 * Prefer direct runtime messaging when we know the extension id; otherwise
 * fall through so callers can use the postMessage bridge.
 */
export async function sendToExtensionRuntime(
  message: Record<string, unknown>,
): Promise<{ ok: true; result?: unknown } | { ok: false; error?: string }> {
  const extensionId = getRememberedExtensionId();
  const runtime = pageChromeRuntime();
  if (!extensionId || !runtime) {
    return { ok: false, error: 'extension-id-missing' };
  }
  try {
    const result = await runtime.sendMessage(extensionId, message);
    if (
      result &&
      typeof result === 'object' &&
      'ok' in result &&
      (result as { ok?: boolean }).ok === false
    ) {
      const err =
        (result as { error?: string; message?: string }).error ||
        (result as { message?: string }).message ||
        'Extension rejected the request.';
      return { ok: false, error: err };
    }
    return { ok: true, result };
  } catch (err) {
    const messageText = err instanceof Error ? err.message : String(err);
    // Stale id after reinstall / Receiving end does not exist.
    if (/Receiving end|Invalid extension|does not exist|Could not establish/i.test(messageText)) {
      clearRememberedExtensionId();
    }
    return {
      ok: false,
      error: messageText || 'Extension is unreachable.',
    };
  }
}
