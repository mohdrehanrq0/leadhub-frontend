/**
 * Feature flags for frontend surfaces (Week 1 recipe-library freeze).
 * Keep in sync with leadhub-backend/src/config/feature-flags.ts.
 * Set a parked/killed flag to true to restore that surface.
 */
export const APOLLO_UI_ENABLED = false;

/** Enables Recipes · Runs · API · Billing primary nav. */
export const RECIPE_LIBRARY_NAV = true;

/** Parked / killed product surfaces — default off for Week 1. */
export const LEADS_CRM_UI = false;
export const SIGNUPS_UI = false;
export const CAPTURES_UI = false;
export const OUTREACH_UI = false;
export const MONITORING_UI = false;
export const TEAM_UI = false;
export const LISTS_UI = false;
export const CAMPAIGNS_UI = false;
export const AGENT_BUILDER_UI = false;
export const EXTENSION_SETTINGS_UI = false;

/** BYOK (Bring Your Own Keys) settings UI — disabled when using platform keys. */
export const BYOK_UI_ENABLED = false;
