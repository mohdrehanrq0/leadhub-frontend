'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import {
  IconSearch,
  IconBriefcase,
  IconKey,
  IconSettings,
  IconLogout,
  IconUsers,
  IconChevronDown,
  IconPlus,
  IconMail,
} from '@tabler/icons-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, activeWorkspaceId, setActiveWorkspaceId, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading]);

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    }
  }, [user]);

  const fetchWorkspaces = async () => {
    try {
      const res = await api.get('/api/workspaces');
      setWorkspaces(res.data.data ?? []);
    } catch {
      // ignore
    }
  };

  const createNewWorkspace = async () => {
    const name = prompt('Enter workspace name:');
    if (!name) return;
    try {
      const res = await api.post('/api/workspaces', { name });
      const newWs = res.data.data;
      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWorkspaceId(newWs.id);
    } catch (err: any) {
      alert(err.message ?? 'Failed to create workspace.');
    }
  };

  if (loading || !user) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const menuItems = [
    { name: 'Lead Search', href: '/dashboard/search', icon: IconSearch },
    { name: 'Campaigns', href: '/dashboard/campaigns', icon: IconMail },
    { name: 'Jobs Queue', href: '/dashboard/jobs', icon: IconBriefcase },
    { name: 'API Keys', href: '/dashboard/settings/api-keys', icon: IconKey },
    { name: 'Workspace Settings', href: '/dashboard/settings/workspace', icon: IconSettings },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden text-text">
      {/* ─── Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col justify-between sidebar-scrollbar">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo / Workspace Selector */}
          <div className="p-4 border-b border-sidebar-border relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between bg-sidebar border border-sidebar-border rounded-lg p-2 hover:bg-sidebar-hover transition-colors text-left"
            >
              <div className="flex items-center space-x-2 truncate">
                <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0">
                  {activeWorkspace?.name?.slice(0, 2) ?? 'WS'}
                </div>
                <span className="text-sm font-semibold truncate text-sidebar-text">
                  {activeWorkspace?.name ?? 'Select Workspace'}
                </span>
              </div>
              <IconChevronDown size={16} className="text-sidebar-muted flex-shrink-0 ml-1" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-4 right-4 mt-2 bg-sidebar border border-sidebar-border rounded-lg shadow-xl py-1 z-50 animate-fade-in">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setActiveWorkspaceId(ws.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-sidebar-hover transition-colors flex items-center justify-between ${
                      ws.id === activeWorkspaceId ? 'text-primary font-semibold' : 'text-sidebar-text'
                    }`}
                  >
                    <span>{ws.name}</span>
                    {ws.id === activeWorkspaceId && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
                <div className="border-t border-sidebar-border my-1" />
                <button
                  onClick={() => {
                    createNewWorkspace();
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-sidebar-hover transition-colors text-primary font-medium flex items-center space-x-1.5"
                >
                  <IconPlus size={14} />
                  <span>Create Workspace</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    active
                      ? 'bg-primary/10 text-primary border border-primary/20 font-medium'
                      : 'text-sidebar-muted hover:text-sidebar-text hover:bg-sidebar-hover'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-primary' : 'text-sidebar-muted'} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar-hover/30 flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate mr-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-hover border border-sidebar-border flex items-center justify-center text-xs font-semibold text-sidebar-text">
              {user.firstName?.slice(0, 1) ?? '?'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-sidebar-text truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] text-sidebar-muted truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-sidebar-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-sidebar-hover transition-all cursor-pointer"
            title="Log Out"
          >
            <IconLogout size={16} />
          </button>
        </div>
      </aside>

      {/* ─── Main Content Shell ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-y-auto">
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-bg-200">
          <h2 className="text-sm font-semibold text-text-200 uppercase tracking-wider">
            {menuItems.find((i) => i.href === pathname)?.name ?? 'LeadHub'}
          </h2>
          <div className="flex items-center space-x-2">
            {/* Quick status indicators */}
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs text-text-300">Live Connection</span>
          </div>
        </header>
        <div className="flex-1 p-6 relative bg-background">{children}</div>
      </main>
    </div>
  );
}
