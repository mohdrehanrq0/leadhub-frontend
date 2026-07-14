'use client';

import { useState } from 'react';
import { IconBuilding } from '@tabler/icons-react';
import { companyDomainFromLead, companyUrlHref, faviconUrlForDomain } from '../filterTypes';

type Props = {
  domain?: string | null;
  website?: string | null;
  companyName?: string | null;
};

export function CompanyUrlCell({ domain, website, companyName }: Props) {
  const host = companyDomainFromLead(domain, website);
  const href = companyUrlHref(domain, website);
  const [imgFailed, setImgFailed] = useState(false);

  if (!href || !host) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={companyName || host}
      className="inline-flex max-w-full items-center gap-2 text-slate-700 hover:text-blue-700"
      onClick={(e) => e.stopPropagation()}
    >
      {!imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrlForDomain(host)}
          alt=""
          width={16}
          height={16}
          className="h-4 w-4 shrink-0 rounded-sm"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <IconBuilding size={14} className="shrink-0 text-slate-400" />
      )}
      <span className="truncate font-mono text-[11px]">{host}</span>
    </a>
  );
}
