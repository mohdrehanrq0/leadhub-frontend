'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import GetLogo from '@/components/common/getLogo';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import {
  // IconBook2, // Recipes tab parked
  IconArticle,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  // IconCode, // API tab parked
  IconCoin,
  // IconHistory, // Runs tab parked
  IconFileText,
  IconListDetails,
  IconLogout,
  IconNote,
  IconSend,
  IconSettings,
  IconTool,
  IconX,
} from '@tabler/icons-react';
import { CAMPAIGNS_UI, CONTENT_UI, LISTS_UI } from '@/lib/features';

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

type NavChild = {
  name: string;
  href: string;
  icon: typeof IconFileText;
};

type NavItem = {
  name: string;
  href: string;
  icon: typeof IconFileText;
  children?: NavChild[];
};

const NAV_RECIPE_LIBRARY: NavItem[] = [
  // Recipes / Runs / API tabs parked — restore when those surfaces ship again.
  // { name: 'Recipes', href: '/research', icon: IconBook2 },
  { name: 'Tools', href: '/tools', icon: IconTool },
  // { name: 'Runs', href: '/research/history', icon: IconHistory },
  ...(LISTS_UI
    ? [{ name: 'Prospect Lists', href: '/dashboard/prospect-lists', icon: IconListDetails }]
    : []),
  ...(CAMPAIGNS_UI
    ? [{ name: 'Campaigns', href: '/dashboard/campaigns', icon: IconSend }]
    : []),
  ...(CONTENT_UI
    ? [
        {
          name: 'Content',
          href: '/dashboard/content',
          icon: IconFileText,
          children: [
            { name: 'LinkedIn Post', href: '/dashboard/content', icon: IconNote },
            { name: 'LinkedIn Article', href: '/dashboard/content/articles', icon: IconArticle },
          ],
        },
      ]
    : []),
  // { name: 'API', href: '/dashboard/settings/developer-api', icon: IconCode },
  { name: 'Billing', href: '/dashboard/billing', icon: IconCoin },
];

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
  const [contentExpanded, setContentExpanded] = useState(() =>
    pathname.startsWith('/dashboard/content'),
  );
  const hoverCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedCollapse = useRef(false);

  useEffect(() => {
    if (pathname.startsWith('/dashboard/content')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContentExpanded(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (hydratedCollapse.current) return;
    hydratedCollapse.current = true;
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollapsed(saved === 'true');
    }
  }, []);

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
    if (href === '/dashboard/content') {
      return (
        pathname === '/dashboard/content' ||
        (pathname.startsWith('/dashboard/content/') &&
          !pathname.startsWith('/dashboard/content/articles'))
      );
    }
    if (href === '/dashboard/content/articles') {
      return (
        pathname === '/dashboard/content/articles' ||
        pathname.startsWith('/dashboard/content/articles/')
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderNav = (items: NavItem[]) =>
    items.map((item) => {
      const Icon = item.icon;
      if (item.children?.length) {
        const groupActive = pathname.startsWith('/dashboard/content');
        return (
          <div key={item.name} className="space-y-1">
            <button
              type="button"
              title={!showExpandedChrome ? item.name : undefined}
              onClick={() => {
                if (!showExpandedChrome) {
                  setIsCollapsed(false);
                  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'false');
                  setContentExpanded(true);
                  return;
                }
                setContentExpanded((prev) => !prev);
              }}
              className={cn(
                'group relative flex w-full items-center py-2.5 text-sm font-medium transition-all duration-200',
                showExpandedChrome ? 'rounded-lg px-3' : 'justify-center rounded-lg px-0',
                groupActive && !showExpandedChrome
                  ? 'bg-brand-main text-white shadow-md'
                  : groupActive
                    ? 'bg-sidebar-hover/80 text-sidebar-text'
                    : 'text-sidebar-text hover:bg-sidebar-hover',
              )}
            >
              <span className={cn('flex-shrink-0', showExpandedChrome && 'mr-3')}>
                <Icon className="h-5 w-5" />
              </span>
              {showExpandedChrome ? (
                <>
                  <span className="flex-1 overflow-hidden text-left whitespace-nowrap">
                    {item.name}
                  </span>
                  <IconChevronDown
                    className={cn(
                      'h-4 w-4 text-sidebar-muted transition-transform duration-200',
                      contentExpanded ? 'rotate-0' : '-rotate-90',
                    )}
                  />
                </>
              ) : null}
            </button>
            {showExpandedChrome && contentExpanded ? (
              <div className="ml-4 space-y-1 border-l border-sidebar-border pl-2.5">
                {item.children.map((child) => {
                  const ChildIcon = child.icon;
                  const childActive = isActive(child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => {
                        if (window.innerWidth < 768) onClose();
                      }}
                      className={cn(
                        'flex items-center rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200',
                        childActive
                          ? 'bg-brand-main text-white shadow-sm'
                          : 'text-sidebar-text/80 hover:bg-sidebar-hover hover:text-sidebar-text',
                      )}
                    >
                      <ChildIcon className="mr-2.5 h-4 w-4 flex-shrink-0" />
                      <span className="overflow-hidden whitespace-nowrap">{child.name}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      }

      const active = isActive(item.href);
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

            {/* Credits meter hidden while Pro billing is primary. Re-enable when credit packs return. */}

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
