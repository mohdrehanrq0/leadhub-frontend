/**
 * Ask the LeadHub Chrome extension to pull the next LinkedIn outbox job.
 * Resolves true when the dashboard-bridge content script acknowledges.
 */
export function flushLinkedInOutbox(timeoutMs = 2500): Promise<boolean> {
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
    window.postMessage({ source: 'leadhub', kind: 'send-linkedin' }, window.location.origin);
  });
}
