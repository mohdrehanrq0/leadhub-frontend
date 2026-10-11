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
    description: 'Create and manage workspaces. Each workspace has its own leads, credits, and saved profiles.',
  },
  {
    name: 'Company Profile',
    href: '/dashboard/settings/company',
    icon: IconBuildingSkyscraper,
    description: 'Your company details, products, tech stack, and ideal customer profile.',
  },
  {
    name: 'Developer API',
    href: '/dashboard/settings/developer-api',
    icon: IconCode,
    description: 'Create API tokens to integrate LeadHub with your apps. Includes docs and code examples.',
  },
  {
    name: 'API Keys',
    href: '/dashboard/settings/api-keys',
    icon: IconKey,
    description: 'Connect your AI keys (OpenAI, Gemini, etc.) and third-party services.',
  },
  {
    name: 'AI Agents',
    href: '/dashboard/settings/enrichment-agents',
    icon: IconRobot,
    description: 'Configure what the AI should research for each lead — company info, contacts, and buying signals.',
  },
  {
    name: 'Outreach',
    href: '/dashboard/settings/outreach-agents',
    icon: IconMail,
    description: 'Define your offer and talking points. The AI uses these to write personalized emails.',
  },
  {
    name: 'Email Templates',
    href: '/dashboard/settings/outreach-templates',
    icon: IconMail,
    description: 'Create email templates that adapt to each lead\'s situation and buying signals.',
  },
  {
    name: 'Browser Extension',
    href: '/dashboard/settings/extension',
    icon: IconPuzzle,
    description: 'Install the Chrome extension to save LinkedIn profiles directly to LeadHub.',
  },
  {
    name: 'Your Profile',
    href: '/dashboard/settings/founder-profile',
    icon: IconUser,
    description: 'Your background and company context. Used to personalize outreach emails.',
  },
  {
    name: 'Account',
    href: '/dashboard/settings/profile',
    icon: IconUserCircle,
    description: 'Your LeadHub account details and email verification.',
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
  return (
    SETTINGS_NAV.find((item) => isSettingsNavActive(pathname, item.href)) ??
    SETTINGS_NAV[0]
  );
}
