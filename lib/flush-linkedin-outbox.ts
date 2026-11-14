export type LinkedInOutboxFlushMode = 'all' | 'retry' | 'recheck';

/** Ask the extension to drain the LinkedIn outbox and any message_1st People Search campaigns. */
export function flushLinkedInOutbox(
  timeoutMs = 2500,
  campaignId?: string,
  mode: LinkedInOutboxFlushMode = 'all',
): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
      resolve(ok);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as { source?: string; kind?: string } | null;
      if (data?.source === 'leadhub-extension' && data.kind === 'linkedin-send-ack') {
        finish(true);
      }
    };

    window.addEventListener('message', onMessage);
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    window.postMessage(
      {
        source: 'leadhub',
        kind: 'send-linkedin',
        campaignId: campaignId || undefined,
        mode,
      },
      window.location.origin,
    );
  });
}
