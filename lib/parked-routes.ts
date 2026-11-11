/**
 * Soft-redirect helpers for Week 1 parked / killed UI surfaces.
 */
import {
  AGENT_BUILDER_UI,
  CAMPAIGNS_UI,
  CAPTURES_UI,
  EXTENSION_CONNECTION_ENABLED,
  LEADS_CRM_UI,
  LISTS_UI,
  MONITORING_UI,
  OUTREACH_UI,
  SIGNUPS_UI,
  TEAM_UI,
} from '@/lib/features';

/** Where to send users when a parked path is visited. */
export const PARKED_REDIRECT = '/research';

/**
 * Returns a redirect target if `pathname` is a parked surface, else null.
 */
export function parkedRedirectFor(pathname: string): string | null {
  const isProspectLists =
    pathname === '/dashboard/prospect-lists' || pathname.startsWith('/dashboard/prospect-lists/');
  const isLegacyLists =
    pathname === '/dashboard/leads/lists' || pathname.startsWith('/dashboard/leads/lists/');

  if (!LISTS_UI && (isProspectLists || isLegacyLists)) {
    return '/research/history';
  }

  if (!LEADS_CRM_UI) {
    const isLeadsCrm =
      pathname === '/dashboard/leads' ||
      pathname.startsWith('/dashboard/leads/');
    // Lists stay reachable via their own flag even while the broader CRM is parked.
    if (isLeadsCrm && !isLegacyLists) {
      return '/research/history';
    }
  }

  if (!SIGNUPS_UI && (pathname === '/dashboard/signups' || pathname.startsWith('/dashboard/signups/'))) {
    return PARKED_REDIRECT;
  }

  if (!CAPTURES_UI && (pathname === '/dashboard/captures' || pathname.startsWith('/dashboard/captures/'))) {
    return PARKED_REDIRECT;
  }

  if (!OUTREACH_UI) {
    if (
      pathname.startsWith('/dashboard/outreach') ||
      pathname.startsWith('/dashboard/settings/outreach-agents') ||
      pathname.startsWith('/dashboard/settings/outreach-templates') ||
      pathname.startsWith('/dashboard/settings/founder-profile')
    ) {
      return '/dashboard/settings/workspace';
    }
  }

  if (!EXTENSION_CONNECTION_ENABLED && pathname.startsWith('/dashboard/settings/extension')) {
    return '/dashboard/settings/workspace';
  }

  if (!AGENT_BUILDER_UI && pathname.startsWith('/dashboard/settings/enrichment-agents')) {
    return '/dashboard/settings/workspace';
  }

  if (!CAMPAIGNS_UI && pathname.startsWith('/dashboard/campaigns')) {
    return PARKED_REDIRECT;
  }

  if (!MONITORING_UI && pathname.startsWith('/research/monitoring')) {
    return PARKED_REDIRECT;
  }

  if (!TEAM_UI && pathname.startsWith('/research/team')) {
    return PARKED_REDIRECT;
  }

  return null;
}
