/**
 * Ask the LeadHub Chrome extension to sync LinkedIn 1st-degree connections.
 */

export type ConnectionsSyncKickResult = {
  ok: boolean;
  started?: boolean;
  message?: string;
  progress?: {
    status: string;
    percentComplete?: number;
    syncedCount?: number;
    error?: string | null;
  };
};

export function requestLinkedInConnectionsSync(opts?: {
  forceFull?: boolean;
  headlineFilter?: string;
  timeoutMs?: number;
}): Promise<ConnectionsSyncKickResult> {
  if (typeof window === 'undefined') {
    return Promise.resolve({ ok: false, message: 'Not in browser.' });
  }

  // First tick processes ~20s of pages; wait long enough for the start ack.
  const timeoutMs = opts?.timeoutMs ?? 45_000;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: ConnectionsSyncKickResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      resolve(result);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as {
        source?: string;
        kind?: string;
        result?: ConnectionsSyncKickResult;
      } | null;
      if (data?.source !== 'leadhub-extension') return;
      if (data.kind === 'linkedin-connections-sync-ack') {
        // Keep waiting for the result; ack only proves the bridge is alive.
        return;
      }
      if (data.kind === 'linkedin-connections-sync-result') {
        finish(data.result ?? { ok: false, message: 'No result from extension.' });
      }
    };

    window.addEventListener('message', onMessage);
    const timer = window.setTimeout(
      () =>
        finish({
          ok: false,
          message:
            'LeadHub extension did not respond. Load the unpacked extension and keep this tab on the LeadHub app origin.',
        }),
      timeoutMs,
    );

    window.postMessage(
      {
        source: 'leadhub',
        kind: 'sync-linkedin-connections',
        forceFull: Boolean(opts?.forceFull),
        headlineFilter: opts?.headlineFilter,
      },
      window.location.origin,
    );
  });
}

export type ContactInfoSyncProgress = {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
  processedCount: number;
  foundCount: number;
  failedCount: number;
  totalCount: number;
  percentComplete: number;
  error?: string | null;
  updatedAt: string;
};

export type ContactInfoSyncKickResult = {
  ok: boolean;
  started?: boolean;
  message?: string;
  progress?: ContactInfoSyncProgress;
};

export function requestLinkedInContactInfoSync(opts?: {
  connectionIds?: string[];
  maxCount?: number;
  forceRefetch?: boolean;
  timeoutMs?: number;
}): Promise<ContactInfoSyncKickResult> {
  if (typeof window === 'undefined') {
    return Promise.resolve({ ok: false, message: 'Not in browser.' });
  }

  const timeoutMs = opts?.timeoutMs ?? 45_000;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: ContactInfoSyncKickResult) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      resolve(result);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as {
        source?: string;
        kind?: string;
        result?: ContactInfoSyncKickResult;
      } | null;
      if (data?.source !== 'leadhub-extension') return;
      if (data.kind === 'linkedin-contact-info-sync-ack') return;
      if (data.kind === 'linkedin-contact-info-sync-result') {
        finish(data.result ?? { ok: false, message: 'No result from extension.' });
      }
    };

    window.addEventListener('message', onMessage);
    const timer = window.setTimeout(
      () =>
        finish({
          ok: false,
          message:
            'LeadHub extension did not respond. Reload the unpacked extension and refresh this page.',
        }),
      timeoutMs,
    );

    window.postMessage(
      {
        source: 'leadhub',
        kind: 'sync-linkedin-contact-info',
        connectionIds: opts?.connectionIds,
        maxCount: opts?.maxCount,
        forceRefetch: Boolean(opts?.forceRefetch),
      },
      window.location.origin,
    );
  });
}

export function stopLinkedInContactInfoSync(): Promise<{ ok: boolean; progress?: ContactInfoSyncProgress }> {
  if (typeof window === 'undefined') return Promise.resolve({ ok: false });
  return new Promise((resolve) => {
    let settled = false;
    const finish = (res: { ok: boolean; progress?: ContactInfoSyncProgress }) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      resolve(res);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as {
        source?: string;
        kind?: string;
        result?: { ok: boolean; progress?: ContactInfoSyncProgress };
      } | null;
      if (data?.source === 'leadhub-extension' && data.kind === 'linkedin-contact-info-stop-result') {
        finish(data.result ?? { ok: true });
      }
    };
    window.addEventListener('message', onMessage);
    const timer = window.setTimeout(() => finish({ ok: false }), 5000);
    window.postMessage({ source: 'leadhub', kind: 'stop-linkedin-contact-info' }, window.location.origin);
  });
}

export function getLinkedInContactInfoSyncProgress(): Promise<ContactInfoSyncProgress | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (progress: ContactInfoSyncProgress | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      resolve(progress);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as {
        source?: string;
        kind?: string;
        progress?: ContactInfoSyncProgress;
      } | null;
      if (data?.source === 'leadhub-extension' && data.kind === 'linkedin-contact-info-sync-progress') {
        finish(data.progress ?? null);
      }
    };
    window.addEventListener('message', onMessage);
    const timer = window.setTimeout(() => finish(null), 2500);
    window.postMessage(
      { source: 'leadhub', kind: 'get-linkedin-contact-info-progress' },
      window.location.origin,
    );
  });
}
