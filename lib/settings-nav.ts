import {
  IconBuilding,
  IconBuildingSkyscraper,
  IconCode,
  IconKey,
  IconMail,
  IconPuzzle,
  IconRobot,
  IconUser,
  IconUserCircle,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import {
  AGENT_BUILDER_UI,
  EXTENSION_CONNECTION_ENABLED,
  OUTREACH_UI,
} from '@/lib/features';

export type SettingsNavItem = {
  name: string;
  href: string;
  icon: Icon;
  description: string;
};

const ALL_SETTINGS_NAV: (SettingsNavItem & { enabled: boolean })[] = [
  {
    name: 'Workspace',
    href: '/dashboard/settings/workspace',
    icon: IconBuilding,
    description: 'Create and manage workspaces. Each workspace has its own leads, credits, and saved profiles.',
    enabled: true,
  },
  {
    name: 'Company Profile',
    href: '/dashboard/settings/company',
    icon: IconBuildingSkyscraper,
    description: 'Your company details, products, tech stack, and ideal customer profile.',
    enabled: true,
  },
  {
    name: 'Developer API',
    href: '/dashboard/settings/developer-api',
    icon: IconCode,
    description: 'Create API tokens to integrate LeadHub with your apps. Includes docs and code examples.',
    enabled: true,
  },
  {
    name: 'API Keys',
    href: '/dashboard/settings/api-keys',
    icon: IconKey,
    description: 'Connect your AI keys (OpenAI, Gemini, etc.) and third-party services.',
    enabled: true,
  },
  {
    name: 'AI Agents',
    href: '/dashboard/settings/enrichment-agents',
    icon: IconRobot,
    description: 'Configure what the AI should research for each lead — company info, contacts, and buying signals.',
    enabled: AGENT_BUILDER_UI,
  },
  {
    name: 'Outreach',
    href: '/dashboard/settings/outreach-agents',
    icon: IconMail,
    description: 'Define your offer and talking points. The AI uses these to write personalized emails.',
    enabled: OUTREACH_UI,
  },
  {
    name: 'Email Templates',
    href: '/dashboard/settings/outreach-templates',
    icon: IconMail,
    description: "Create email templates that adapt to each lead's situation and buying signals.",
    enabled: OUTREACH_UI,
  },
  {
    name: 'Browser Extension',
    href: '/dashboard/settings/extension',
    icon: IconPuzzle,
    description: 'Connect the Chrome extension so LeadHub can queue LinkedIn steps within your daily caps.',
    enabled: EXTENSION_CONNECTION_ENABLED,
  },
  {
    name: 'Your Profile',
    href: '/dashboard/settings/founder-profile',
    icon: IconUser,
    description: 'Your background and company context. Used to personalize outreach emails.',
    enabled: OUTREACH_UI,
  },
  {
    name: 'Account',
    href: '/dashboard/settings/profile',
    icon: IconUserCircle,
    description: 'Your LeadHub account details and email verification.',
    enabled: true,
  },
];

export const SETTINGS_NAV: SettingsNavItem[] = ALL_SETTINGS_NAV.filter((item) => item.enabled).map(
  ({ enabled: _enabled, ...item }) => item,
);

export const SETTINGS_DEFAULT_HREF = SETTINGS_NAV[0]?.href ?? '/dashboard/settings/workspace';

export function isSettingsPath(pathname: string): boolean {
  return pathname === '/dashboard/settings' || pathname.startsWith('/dashboard/settings/');
}

export function isSettingsNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href !== '/dashboard/settings' && pathname.startsWith(`${href}/`)) return true;
  return false;
}

export function getActiveSettingsItem(pathname: string): SettingsNavItem {
  const active = SETTINGS_NAV.find((item) => isSettingsNavActive(pathname, item.href));
  return (
    active ??
    SETTINGS_NAV[0] ?? {
      name: 'Settings',
      href: SETTINGS_DEFAULT_HREF,
      icon: IconBuilding,
      description: 'Manage your LeadHub workspace and account.',
    }
  );
}
