import { sendToExtensionRuntime } from '@/lib/extension-bridge';

export type LinkedInOutboxFlushMode = 'all' | 'retry' | 'recheck';

function waitForBridgeAck(
  ackKind: 'linkedin-send-ack' | 'linkedin-cancel-ack',
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<boolean> {
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
      const data = event.data as {
        source?: string;
        kind?: string;
        ok?: boolean;
        error?: string;
      } | null;
      if (data?.source !== 'leadhub-extension' || data.kind !== ackKind) return;
      // Explicit failure from an orphaned bridge (extension reloaded).
      if (data.ok === false) {
        finish(false);
        return;
      }
      finish(true);
    };

    window.addEventListener('message', onMessage);
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    window.postMessage({ source: 'leadhub', ...payload }, window.location.origin);
  });
}

/** Ask the extension to drain the LinkedIn outbox and any message_1st People Search campaigns. */
export async function flushLinkedInOutbox(
  timeoutMs = 2500,
  campaignId?: string,
  mode: LinkedInOutboxFlushMode = 'all',
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Channel 1: direct page → service worker (survives orphaned content scripts).
  const runtime = await sendToExtensionRuntime({
    kind: 'flush-outbox',
    campaignId: campaignId || undefined,
    mode,
  });
  if (runtime.ok) return true;

  // Channel 2: window.postMessage → dashboard-bridge content script.
  return waitForBridgeAck(
    'linkedin-send-ack',
    {
      kind: 'send-linkedin',
      campaignId: campaignId || undefined,
      mode,
    },
    timeoutMs,
  );
}

/** Tell the extension to abort in-flight outbox / SERP work for a stopped or deleted campaign. */
export async function cancelLinkedInCampaignOutbox(
  campaignId: string,
  timeoutMs = 1500,
): Promise<boolean> {
  if (typeof window === 'undefined' || !campaignId) return false;

  const runtime = await sendToExtensionRuntime({
    kind: 'cancel-campaign-outbox',
    campaignId,
  });
  if (runtime.ok) return true;

  return waitForBridgeAck(
    'linkedin-cancel-ack',
    {
      kind: 'cancel-linkedin-campaign',
      campaignId,
    },
    timeoutMs,
  );
}
