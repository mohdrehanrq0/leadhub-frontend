import { IconBrandLinkedin, IconExternalLink } from '@tabler/icons-react';

export function normalizeLinkedInUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.)?linkedin\.com/i.test(trimmed)) return `https://${trimmed.replace(/^\/\//, '')}`;
  return trimmed;
}

export function pickLinkedInUrl(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    if (value.includes('linkedin.com')) return value;
  }
  return null;
}

export function LinkedInLink({
  url,
  kind = 'person',
  className = '',
  compact = false,
}: {
  url: string;
  kind?: 'company' | 'person';
  className?: string;
  compact?: boolean;
}) {
  const href = normalizeLinkedInUrl(url);
  if (!href) return null;

  const label = kind === 'company' ? 'Company LinkedIn' : 'LinkedIn profile';

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[#0A66C2]/20 bg-[#0A66C2]/5 px-2 py-1 text-xs font-semibold text-[#0A66C2] transition hover:border-[#0A66C2]/40 hover:bg-[#0A66C2]/10 ${className}`}
      title={href}
    >
      <IconBrandLinkedin size={compact ? 13 : 14} className="shrink-0" stroke={1.75} />
      <span>{compact ? 'LinkedIn' : label}</span>
      <IconExternalLink size={10} className="shrink-0 opacity-60" />
    </a>
  );
}
