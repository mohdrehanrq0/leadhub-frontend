import type { ReactNode } from 'react';
import LeadHubBrandLockup from '@/components/common/LeadHubBrandLockup';

type AuthSplitLayoutProps = {
  panelTitle: string;
  panelSubtitle: string;
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthSplitLayout({
  panelTitle,
  panelSubtitle,
  title,
  subtitle,
  children,
}: AuthSplitLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-100">
      <div className="relative hidden items-center justify-center overflow-hidden bg-gradient-to-br from-brand-main via-brand-main/80 to-brand-secondary p-6 lg:flex lg:w-[36%] xl:w-[34%]">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-72 w-72 animate-pulse rounded-full bg-brand-secondary opacity-30 mix-blend-multiply blur-3xl filter" />
          <div className="absolute -bottom-40 -left-40 h-72 w-72 animate-pulse rounded-full bg-brand-tertiary opacity-30 mix-blend-multiply blur-3xl filter" />
        </div>
        <div className="relative z-10 max-w-xs px-2 text-center text-white">
          <h2 className="mb-2 text-xl font-bold">{panelTitle}</h2>
          <p className="text-sm text-white/90">{panelSubtitle}</p>
        </div>
      </div>

      <div className="flex h-full w-full items-stretch justify-center overflow-y-auto lg:w-[64%] xl:w-[66%]">
        <div className="mx-auto my-auto w-full max-w-md px-5 py-5">
          <div className="rounded-lg bg-white p-5 shadow-lg">
            <div className="mb-4 text-center">
              <div className="mb-3 flex items-center justify-center">
                <LeadHubBrandLockup size={40} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              <p className="mt-0.5 text-xs text-gray-600">{subtitle}</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
