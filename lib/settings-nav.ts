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
    description: 'Create, rename, and switch workspaces. Leads, credits, and captures stay scoped to the active one.',
  },
  {
    name: 'Company Profile',
    href: '/dashboard/settings/company',
    icon: IconBuildingSkyscraper,
    description: 'View and update company identity, offerings, tech stack, ICP, and target niches from onboarding.',
  },
  {
    name: 'Developer API',
    href: '/dashboard/settings/developer-api',
    icon: IconCode,
    description: 'Create API tokens and access the LeadCRM REST API with interactive documentation and code snippets.',
  },
  {
    name: 'API Keys',
    href: '/dashboard/settings/api-keys',
    icon: IconKey,
    description: 'Store AI and data provider credentials (OpenAI, Gemini, Apify, Reoon) and choose LLM routing.',
  },
  {
    name: 'Enrichment',
    href: '/dashboard/settings/enrichment-agents',
    icon: IconRobot,
    description: 'Build reusable recipes for who to find, which modules to run, and what to research.',
  },
  {
    name: 'Outreach',
    href: '/dashboard/settings/outreach-templates',
    icon: IconMail,
    description: 'Signal-specific email templates, evidence rules, and Test Template on enriched leads.',
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
    description: 'Composite founder persona and company context. Optional for CRM, required for Sign-up email automation.',
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
  return (
    SETTINGS_NAV.find((item) => isSettingsNavActive(pathname, item.href)) ??
    SETTINGS_NAV[0]
  );
}
