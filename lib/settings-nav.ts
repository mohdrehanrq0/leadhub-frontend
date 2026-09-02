import {
  IconBuilding,
  IconKey,
  IconPuzzle,
  IconRobot,
  IconUser,
  IconUserCircle,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';

export type SettingsNavItem = {
  name: string;
  href: string;
  icon: Icon;
};

export const SETTINGS_NAV: SettingsNavItem[] = [
  { name: 'Workspace', href: '/dashboard/settings/workspace', icon: IconBuilding },
  { name: 'API Keys', href: '/dashboard/settings/api-keys', icon: IconKey },
  { name: 'Enrichment', href: '/dashboard/settings/enrichment-agents', icon: IconRobot },
  { name: 'Browser', href: '/dashboard/settings/extension', icon: IconPuzzle },
  { name: 'Founders', href: '/dashboard/settings/founder-profile', icon: IconUser },
  { name: 'Profile', href: '/dashboard/settings/profile', icon: IconUserCircle },
];

export const SETTINGS_DEFAULT_HREF = SETTINGS_NAV[0].href;

export function isSettingsPath(pathname: string): boolean {
  return pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings/');
}

export function isSettingsNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
