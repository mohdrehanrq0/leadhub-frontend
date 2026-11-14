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
