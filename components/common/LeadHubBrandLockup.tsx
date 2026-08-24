'use client';

import GetLogo from '@/components/common/getLogo';

type LeadHubBrandLockupProps = {
  className?: string;
  /** Icon diameter in px. */
  size?: number;
};

/** Circular blue mark + Lead(dark)Hub(blue) wordmark. No pill background. */
export function LeadHubBrandLockup({ className = '', size = 36 }: LeadHubBrandLockupProps) {
  const iconInner = Math.round(size * 0.58);

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-[#3B82F6]"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <GetLogo className="block" width={String(iconInner)} height={String(iconInner)} color="#FFFFFF" />
      </div>
      <span
        className="font-semibold tracking-tight text-[#131b2e]"
        style={{ fontSize: Math.max(15, Math.round(size * 0.42)) }}
      >
        Lead<span className="text-[#0058be]">Hub</span>
      </span>
    </div>
  );
}

export default LeadHubBrandLockup;
