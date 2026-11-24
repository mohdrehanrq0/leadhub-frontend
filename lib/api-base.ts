/**
 * API origin for browser and SSR requests.
 *
 * NEXT_PUBLIC_API_URL is baked in at build time. When it is missing on a
 * deployed frontend, axios falls back to localhost and every call fails in
 * the user's browser even though the same build works on a dev machine.
 */
function normalizeApiOrigin(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/i, '')
    .replace(/\/api$/i, '');
}

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return normalizeApiOrigin(configured);

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4001';
    }
    // Conventional split: app.example.com → api.example.com
    if (hostname.startsWith('app.')) {
      return normalizeApiOrigin(`${protocol}//api.${hostname.slice(4)}${port ? `:${port}` : ''}`);
    }
    // LeadHub production: leadhub.leadsnipper.com → leadhub-api.leadsnipper.com
    if (hostname.startsWith('leadhub.')) {
      const parent = hostname.slice('leadhub.'.length);
      return normalizeApiOrigin(`${protocol}//leadhub-api.${parent}${port ? `:${port}` : ''}`);
    }
  }

  return 'http://localhost:4001';
}
