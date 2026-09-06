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
  description: string;
};

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    name: 'Workspace',
    href: '/dashboard/settings/workspace',
    icon: IconBuilding,
    description: 'Create, rename, and switch workspaces. Leads, credits, and captures stay scoped to the active one.',
  },
  {
    name: 'API Keys',
    href: '/dashboard/settings/api-keys',
    icon: IconKey,
    description: 'Store provider credentials and choose how enrichment routes LLM and email verification.',
  },
  {
    name: 'Enrichment',
    href: '/dashboard/settings/enrichment-agents',
    icon: IconRobot,
    description: 'Build reusable recipes for who to find, which modules to run, and what to research.',
  },
  {
    name: 'Browser',
    href: '/dashboard/settings/extension',
    icon: IconPuzzle,
    description: 'Connect the Chrome extension so LinkedIn saves land in this workspace.',
  },
  {
    name: 'Founders',
    href: '/dashboard/settings/founder-profile',
    icon: IconUser,
    description: 'Contact details used in personalized sign-up onboarding emails.',
  },
  {
    name: 'Profile',
    href: '/dashboard/settings/profile',
    icon: IconUserCircle,
    description: 'Your LeadHub account identity and verification status.',
  },
];

export const SETTINGS_DEFAULT_HREF = SETTINGS_NAV[0].href;

export function isSettingsPath(pathname: string): boolean {
  return pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings/');
}

export function isSettingsNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveSettingsItem(pathname: string): SettingsNavItem {
  return SETTINGS_NAV.find((item) => isSettingsNavActive(pathname, item.href)) ?? SETTINGS_NAV[0];
}
