/**
 * Browser fingerprint for guest tool sessions.
 * Primary: ThumbmarkJS. Fallback: FingerprintJS open-source.
 */

let cachedFingerprint: string | null = null;

export async function getBrowserFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint;
  if (typeof window === 'undefined') {
    throw new Error('Fingerprint only available in the browser');
  }

  try {
    const { getThumbmark } = await import('@thumbmarkjs/thumbmarkjs');
    const result = await getThumbmark({ logging: false });
    if (result.thumbmark && result.thumbmark.length >= 8) {
      cachedFingerprint = result.thumbmark.slice(0, 512);
      return cachedFingerprint;
    }
  } catch {
    // fall through
  }

  try {
    const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
    const agent = await FingerprintJS.load();
    const result = await agent.get();
    cachedFingerprint = result.visitorId;
    return cachedFingerprint;
  } catch (err) {
    const fallback = `lh_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    cachedFingerprint = fallback;
    console.warn('[fingerprint] both libraries failed, using ephemeral id', err);
    return cachedFingerprint;
  }
}
