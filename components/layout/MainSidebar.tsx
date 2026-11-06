'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import GetLogo from '@/components/common/getLogo';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import api from '@/lib/api';
import {
  IconBook2,
  IconChevronLeft,
  IconChevronRight,
  IconCode,
  IconCoin,
  IconHistory,
  IconLogout,
  IconSettings,
  IconTool,
  IconX,
} from '@tabler/icons-react';

type User = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

type MainSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  activeWorkspaceId: string | null;
  onWorkspaceChange: (id: string) => void;
};

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
const HOVER_COLLAPSE_MS = 220;

const NAV_RECIPE_LIBRARY = [
  { name: 'Recipes', href: '/research', icon: IconBook2 },
  { name: 'Tools', href: '/tools', icon: IconTool },
  { name: 'Runs', href: '/research/history', icon: IconHistory },
  { name: 'API', href: '/dashboard/settings/developer-api', icon: IconCode },
  { name: 'Billing', href: '/dashboard/billing', icon: IconCoin },
];

type CreditBalanceData = {
  balance: number;
  freeBalance: number;
  freeExpiresAt: string | null;
  available: number;
};

export function MainSidebar({
  isOpen,
  onClose,
  user,
  onLogout,
  activeWorkspaceId,
  onWorkspaceChange,
}: MainSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [creditBalance, setCreditBalance] = useState<CreditBalanceData | null>(null);
  const hoverCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedCollapse = useRef(false);

  useEffect(() => {
    if (hydratedCollapse.current) return;
    hydratedCollapse.current = true;
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const fetchCredits = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const { data } = await api.get('/api/v1/credits/balance');
      if (data.success && data.data) {
        setCreditBalance(data.data);
      }
    } catch {
      // silently fail
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    void fetchCredits();
  }, [fetchCredits]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
    if (!next) setIsHoverExpanded(false);
  };

  const clearHoverCollapseTimer = () => {
    if (hoverCollapseTimer.current) {
      clearTimeout(hoverCollapseTimer.current);
      hoverCollapseTimer.current = null;
    }
  };

  useEffect(() => () => clearHoverCollapseTimer(), []);

  const showExpandedChrome = !isCollapsed || isHoverExpanded;
  const navItems = NAV_RECIPE_LIBRARY;

  const isActive = (href: string) => {
    if (href === '/research') {
      return (
        pathname === '/research' ||
        (pathname.startsWith('/research/') &&
          !pathname.startsWith('/research/history') &&
          !pathname.startsWith('/research/jobs'))
      );
    }
    if (href === '/research/history') {
      return (
        pathname === '/research/history' ||
        pathname.startsWith('/research/history/') ||
        pathname.startsWith('/research/jobs')
      );
    }
    if (href === '/dashboard/settings/developer-api') {
      return (
        pathname.startsWith('/dashboard/settings/developer-api') ||
        pathname.startsWith('/dashboard/settings/api-keys')
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderNav = (items: typeof NAV_RECIPE_LIBRARY) =>
    items.map((item) => {
      const active = isActive(item.href);
      const Icon = item.icon;
      return (
        <Link
          key={item.href}
          href={item.href}
          title={!showExpandedChrome ? item.name : undefined}
          onClick={() => {
            if (window.innerWidth < 768) onClose();
          }}
          className={cn(
            'group relative flex items-center py-2.5 text-sm font-medium transition-all duration-200',
            showExpandedChrome ? 'rounded-lg px-3' : 'justify-center rounded-lg px-0',
            active ? 'bg-brand-main text-white shadow-md' : 'text-sidebar-text hover:bg-sidebar-hover',
          )}
        >
          <span className={cn('flex-shrink-0', showExpandedChrome && 'mr-3')}>
            <Icon className="h-5 w-5" />
          </span>
          {showExpandedChrome ? <span className="flex-1 overflow-hidden whitespace-nowrap">{item.name}</span> : null}
        </Link>
      );
    });

  return (
    <>
      {isOpen ? (
        <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={onClose} />
      ) : null}

      <div
        className={cn(
          'relative h-screen w-0 shrink-0 overflow-visible transition-[width] duration-300 ease-in-out motion-reduce:transition-none',
          isCollapsed ? 'md:w-[72px]' : 'md:w-64',
        )}
      >
        <motion.div
          onPointerEnter={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 768) return;
            clearHoverCollapseTimer();
            if (isCollapsed) setIsHoverExpanded(true);
          }}
          onPointerLeave={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 768) return;
            if (!isCollapsed) return;
            clearHoverCollapseTimer();
            hoverCollapseTimer.current = setTimeout(() => {
              setIsHoverExpanded(false);
              hoverCollapseTimer.current = null;
            }, HOVER_COLLAPSE_MS);
          }}
          className={cn(
            'fixed top-0 left-0 z-[45] h-screen w-64 overflow-x-hidden bg-sidebar shadow-xl transition-[width,transform] duration-300 ease-in-out md:absolute md:top-0 md:left-0 md:z-[45] motion-reduce:transition-none',
            isCollapsed && !isHoverExpanded ? 'md:w-[72px]' : 'md:w-64',
            isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          )}
        >
          <div className="flex h-full flex-col">
            <div className={cn('border-b border-sidebar-border py-5', showExpandedChrome ? 'px-4' : 'px-3')}>
              <div className="flex items-center justify-between">
                <Link
                  href="/research"
                  className={cn('flex items-center', showExpandedChrome ? 'space-x-3' : 'w-full justify-center')}
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                    <GetLogo className="h-8 w-8" color="#3b82f6" />
                  </div>
                  {showExpandedChrome ? (
                    <div className="overflow-hidden">
                      <h1 className="text-base font-bold whitespace-nowrap text-sidebar-text">LeadHub</h1>
                      <p className="text-xs whitespace-nowrap text-sidebar-muted">Recipe library</p>
                    </div>
                  ) : null}
                </Link>

                {showExpandedChrome ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleCollapse();
                    }}
                    className="ml-2 hidden h-8 w-8 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text md:flex"
                  >
                    <IconChevronLeft className="h-5 w-5" />
                  </button>
                ) : null}
              </div>

              {!showExpandedChrome ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleCollapse();
                  }}
                  className="mt-3 hidden w-full items-center justify-center rounded-md py-2 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text md:flex"
                >
                  <IconChevronRight className="h-5 w-5" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 rounded-lg p-2 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text md:hidden"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <div className={cn('mb-4', showExpandedChrome ? 'px-3' : 'px-2')}>
              <WorkspaceSwitcher
                activeWorkspaceId={activeWorkspaceId}
                onWorkspaceChange={onWorkspaceChange}
                compact={!showExpandedChrome}
              />
            </div>

            <nav
              className={cn(
                'sidebar-scrollbar no-scrollbar flex-1 overflow-y-auto py-4',
                showExpandedChrome ? 'px-3' : 'px-2',
              )}
            >
              <div className="mb-6 space-y-1">{renderNav(navItems)}</div>
            </nav>

            {/* Credit Meter */}
            {creditBalance !== null && (
              <div className={cn('shrink-0 border-t border-sidebar-border p-3', showExpandedChrome ? 'px-3' : 'px-2')}>
                <Link
                  href="/dashboard/billing"
                  className={cn(
                    'flex items-center rounded-lg bg-sidebar-hover/50 transition-colors hover:bg-sidebar-hover',
                    showExpandedChrome ? 'justify-between px-3 py-2' : 'justify-center p-2',
                  )}
                  title={!showExpandedChrome ? `${creditBalance.available} credits` : undefined}
                >
                  <div className={cn('flex items-center gap-2', !showExpandedChrome && 'flex-col gap-0.5')}>
                    <IconCoin size={showExpandedChrome ? 16 : 18} className="text-amber-500" />
                    <span className={cn('font-semibold text-sidebar-text', showExpandedChrome ? 'text-sm' : 'text-xs')}>
                      {creditBalance.available.toLocaleString()}
                    </span>
                  </div>
                  {showExpandedChrome && (
                    <div className="text-right">
                      <div className="text-xs text-sidebar-muted">credits</div>
                      {creditBalance.freeBalance > 0 && creditBalance.freeExpiresAt && (
                        <div className="text-[10px] text-amber-500">
                          {creditBalance.freeBalance} free · exp {new Date(creditBalance.freeExpiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              </div>
            )}

            <div className="shrink-0 border-t border-sidebar-border bg-sidebar-bg/90 p-3">
              <div
                className={cn(
                  'flex w-full items-center rounded-xl border border-transparent px-3 py-2.5',
                  showExpandedChrome ? '' : 'justify-center px-2',
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-main/25 ring-2 ring-brand-main/30">
                  <span className="text-sm font-semibold text-brand-main">{user.firstName?.slice(0, 1) ?? '?'}</span>
                </div>
                {showExpandedChrome ? (
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-sidebar-text">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-[10px] text-sidebar-muted">{user.email}</p>
                  </div>
                ) : null}
                <Link
                  href="/dashboard/settings/workspace"
                  className="ml-1 rounded-lg p-1.5 text-sidebar-muted transition-all hover:bg-sidebar-hover hover:text-sidebar-text"
                  title="Settings"
                >
                  <IconSettings size={16} />
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1 rounded-lg p-1.5 text-sidebar-muted transition-all hover:bg-sidebar-hover hover:text-red-400"
                  title="Log out"
                >
                  <IconLogout size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
