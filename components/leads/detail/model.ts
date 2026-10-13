import {
  displayEmailStatus,
  isShowableEmailStatus,
} from "../../../lib/email-display";
import { formatPhoneValue } from "../../enrichment/primitives";
import type { EnrichmentFact, LinkedInSnapshot } from "../../enrichment/types";
import { pickLinkedInUrl } from "../LinkedInLink";
import {
  enrichmentFromLead,
  enrichmentStatusMeta,
  leadLocation,
  priorityTone,
  stageMeta,
  type AiIntelligenceData,
  type EnrichmentProfile,
} from "../types";
import type { EmailEntry, LeadDetail } from "./types";

export type CheckState = "pass" | "fail" | "unknown";
export type FitVerdict = "strong" | "possible" | "weak" | "none";

export type ObjectiveRow = {
  id: string;
  label: string;
  score: number;
  satisfied: boolean;
  required: boolean;
};

export type SearchRow = {
  n: number;
  query: string;
  detail: string;
};

export type SignalModel = {
  verdict: FitVerdict;
  verdictLabel: string;
  score: number;
  reason: string;
  fitFor: string;
  mission: string;
  scoredAgainstOtherAgent: boolean;
  signal: {
    state: CheckState;
    text: string;
    sourceUrl: string | null;
    prominent: boolean;
  };
  role: { state: CheckState; text: string };
  location: { state: CheckState; text: string };
  objectives: { met: number; total: number; items: ObjectiveRow[] };
  coverage: { identity: number | null; data: number | null };
  searches: SearchRow[];
};

const GENERIC_LOCAL = new Set([
  "info",
  "hello",
  "contact",
  "sales",
  "support",
  "admin",
  "office",
  "team",
  "enquiries",
  "inquiries",
  "enquiry",
  "mail",
  "hi",
  "careers",
  "jobs",
  "hr",
  "marketing",
  "press",
  "media",
  "general",
  "help",
  "billing",
  "accounts",
  "noreply",
  "no-reply",
]);

const PLACES = [
  "united states",
  "united kingdom",
  "south africa",
  "saudi arabia",
  "sri lanka",
  "new zealand",
  "india",
  "pakistan",
  "singapore",
  "canada",
  "australia",
  "germany",
  "france",
  "netherlands",
  "europe",
  "indonesia",
  "bangladesh",
  "china",
  "japan",
  "nigeria",
  "kenya",
  "egypt",
  "qatar",
  "uae",
  "usa",
  "uk",
];

const ROLE_STOP = new Set([
  "manager",
  "director",
  "head",
  "lead",
  "senior",
  "hiring",
  "officer",
]);

type Objective = ObjectiveRow;

type Suggestion = {
  companyEnvironment?: {
    objective?: string;
    hiring?: Array<{
      title: string;
      matchedKeyword?: string;
      sourceUrl?: string;
    }>;
    sustainability?: Array<{ label: string; sourceUrl?: string }>;
    research?: {
      overallCoverage?: number;
      adaptiveCoverage?: number;
      queriesPlanned?: number;
      urlsDiscovered?: number;
      pagesRejected?: number;
      evidenceCount?: number;
      gaps?: string[];
      objectiveScores?: Objective[];
      searchTrace?: Array<{
        n: number;
        query: string;
        intent: string;
        strategy?: string;
      }>;
    };
  } | null;
  researchTrail?: {
    queryCount?: number;
    urlsDiscovered?: number;
    pagesRejected?: number;
    evidenceCount?: number;
    objectiveCoverage?: number;
    objectives?: Objective[];
    searchTrace?: Array<{
      n: number;
      query: string;
      intent: string;
      strategy?: string;
    }>;
  } | null;
  gapsRemaining?: string[];
  unableToFind?: string[];
  fetchStats?: {
    urlsAttempted: number;
    urlsRead: number;
    botBlocked: number;
    dropped: number;
  };
  hiringSignal?: {
    strength?: string;
    summary?: string;
    roles?: string[];
    evidence?: Array<{ quote?: string; sourceUrl?: string; role?: string }>;
  } | null;
};

type PersonScores = {
  functionScore?: number;
  geographyScore?: number;
  fitScore?: number;
  suitability?: number;
  role?: string | null;
  title?: string | null;
};

export type AgentRef = {
  id?: string;
  name?: string | null;
  mission?: string | null;
  description?: string | null;
  config?: {
    mission?: string;
    people?: { targets?: Array<{ objective?: string; roleHint?: string }> };
  } | null;
} | null;

export function isGenericInbox(email: string): boolean {
  const local = email.split("@")[0]?.toLowerCase().replace(/\+.*/, "") ?? "";
  return GENERIC_LOCAL.has(local);
}

export function humanizeGap(value: string): string {
  return value
    .replace(/[._]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

export function collectEmails(lead: LeadDetail): EmailEntry[] {
  const enrichment = enrichmentFromLead(lead);
  const byEmail = new Map<string, EmailEntry>();
  const primary = lead.contact?.email?.trim().toLowerCase() ?? "";

  const add = (
    raw: string | null | undefined,
    status?: string | null,
    meta?: {
      sourceUrl?: string | null;
      sourceTitle?: string | null;
      source?: string | null;
    },
  ) => {
    const email = raw?.trim().toLowerCase();
    if (!email || byEmail.has(email) || isGenericInbox(email)) return;
    const normalized = displayEmailStatus(status);
    const effective = normalized ?? status ?? null;
    const allowCatchAll =
      effective === "catch_all" &&
      lead.contact?.isCatchAll === true &&
      email === primary;
    if (
      !isShowableEmailStatus(effective, {
        sourceUrl: meta?.sourceUrl,
        source: meta?.source,
      }) &&
      !allowCatchAll
    ) {
      return;
    }
    byEmail.set(email, {
      email,
      status: effective && effective !== "unknown" ? effective : null,
      isPrimary: email === primary,
      sourceUrl: meta?.sourceUrl,
      sourceTitle: meta?.sourceTitle,
      source: meta?.source,
    });
  };

  const primaryValidated = enrichment?.emails?.validated?.find(
    (v) => v.email?.toLowerCase() === primary,
  );
  add(lead.contact?.email, lead.contact?.emailVerificationStatus, {
    sourceUrl: primaryValidated?.sourceUrl,
    sourceTitle: primaryValidated?.sourceTitle,
    source: primaryValidated?.source,
  });
  for (const email of lead.contact?.otherEmails ?? []) {
    const validated = enrichment?.emails?.validated?.find(
      (v) => v.email?.toLowerCase() === email.toLowerCase(),
    );
    add(email, validated?.status ?? null, {
      sourceUrl: validated?.sourceUrl,
      sourceTitle: validated?.sourceTitle,
      source: validated?.source,
    });
  }
  for (const v of enrichment?.emails?.validated ?? []) {
    add(v.email, v.status, {
      sourceUrl: v.sourceUrl,
      sourceTitle: v.sourceTitle,
      source: v.source,
    });
  }

  const ordered = [...byEmail.values()];
  ordered.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return ordered;
}

function fraction(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value <= 1 ? value : value / 100;
}

function placesIn(text: string): string[] {
  const lower = text.toLowerCase();
  return PLACES.filter((place) => lower.includes(place));
}

function titleCasePlace(place: string): string {
  return place
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUsa\b/, "USA")
    .replace(/\bUk\b/, "UK")
    .replace(/\bUae\b/, "UAE");
}

function countryOf(location: string): string {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts[parts.length - 1] ?? location;
}

function agentMission(agent: AgentRef): string {
  return (
    agent?.mission ||
    agent?.config?.mission ||
    agent?.description ||
    ""
  ).trim();
}

function agentTargets(agent: AgentRef): string[] {
  const targets = agent?.config?.people?.targets ?? [];
  const labels = targets
    .map((target) =>
      (
        target.roleHint?.trim() ||
        target.objective?.replace(/_/g, " ") ||
        ""
      ).trim(),
    )
    .filter(Boolean);
  return labels.length ? labels : [agent?.name?.trim() || "this mission"];
}

function agentTarget(agent: AgentRef): string {
  return agentTargets(agent).join(", ");
}

function executiveMismatch(role: string, target: string): boolean {
  const exec =
    /\b(c\.?\s*e\.?\s*o\.?|chief executive|founder|co-founder|owner|president)\b/i.test(
      role,
    );
  const hiringTarget = /hiring|recruit|talent|human resource|\bhr\b/i.test(
    target,
  );
  const hiringRole = /hiring|recruit|talent|human resource|\bhr\b/i.test(role);
  return exec && hiringTarget && !hiringRole;
}

function shortRole(role: string): string {
  if (/\b(c\.?\s*e\.?\s*o\.?|chief executive)\b/i.test(role)) return "CEO";
  if (/founder/i.test(role)) return "Founder";
  return role;
}

function shortTarget(target: string): string {
  if (/hiring manager/i.test(target)) return "a hiring manager";
  if (/^a |^an /i.test(target)) return target;
  return target.charAt(0).toLowerCase() + target.slice(1);
}

function targetKeywords(target: string): string[] {
  return target
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.trim())
    .filter((word) => {
      if (!word) return false;
      const lower = word.toLowerCase();
      if (ROLE_STOP.has(lower)) return false;
      if (word.length > 3) return true;
      // Keep short acronyms such as GTM, CEO, VP.
      return (
        word.length >= 2 && word === word.toUpperCase() && /[A-Z]/.test(word)
      );
    })
    .map((word) => word.toLowerCase());
}

function textMatchesTarget(text: string, target: string): boolean {
  const keywords = targetKeywords(target);
  if (!keywords.length) return true;
  const blob = text.toLowerCase();
  return keywords.some((word) => blob.includes(word));
}

function suggestionsOf(lead: LeadDetail): Suggestion {
  return (lead.researchSuggestions ?? {}) as Suggestion;
}

function personScores(lead: LeadDetail): PersonScores | null {
  const enrichment = enrichmentFromLead(lead);
  const raw = enrichment?.people?.[0] as PersonScores | undefined;
  if (!raw) return null;
  return raw;
}

function profileOf(
  lead: LeadDetail,
  ai: AiIntelligenceData | null,
): EnrichmentProfile | null {
  return lead.enrichmentProfile ?? ai?.enrichmentProfile ?? null;
}

export function deriveSignal(
  lead: LeadDetail,
  ai: AiIntelligenceData | null,
  agent: AgentRef,
  searchesFromQueries: SearchRow[],
): SignalModel {
  const suggestions = suggestionsOf(lead);
  const env = suggestions.companyEnvironment;
  const trail = suggestions.researchTrail;
  const profile = profileOf(lead, ai);
  const person = personScores(lead);
  const mission = agentMission(agent);
  const targets = agentTargets(agent);
  const fitFor = targets.join(", ");
  const roleText = (
    lead.contact?.role ||
    person?.title ||
    person?.role ||
    ""
  ).trim();
  const locationText =
    lead.contact?.location?.trim() ||
    leadLocation(lead) ||
    profile?.identity?.location ||
    "";
  const objectives = trail?.objectives ?? env?.research?.objectiveScores ?? [];
  const met = objectives.filter((item) => item.satisfied).length;

  const missionBlob = [
    mission,
    env?.objective ?? "",
    ...objectives.map((item) => `${item.id} ${item.label}`),
  ].join(" ");
  const leadPlaces = placesIn(
    `${locationText} ${lead.company?.country ?? ""} ${lead.company?.city ?? ""}`,
  );
  const missionPlaces = placesIn(missionBlob);
  const targetPlace =
    missionPlaces.find((place) => !leadPlaces.includes(place)) ?? null;

  const geo = fraction(person?.geographyScore);
  let locationState: CheckState = "unknown";
  if (targetPlace && locationText) {
    locationState = placesIn(locationText).includes(targetPlace)
      ? "pass"
      : "fail";
  } else if (geo != null) {
    locationState = geo >= 0.6 ? "pass" : geo < 0.4 ? "fail" : "unknown";
  }
  const locationValue = !locationText
    ? "Location unknown"
    : locationState === "fail" && targetPlace
      ? `${countryOf(locationText)} (target: ${titleCasePlace(targetPlace)})`
      : locationText;

  let roleState: CheckState = "unknown";
  if (
    roleText &&
    targets.some((target) => target && target !== "this mission")
  ) {
    if (targets.some((target) => textMatchesTarget(roleText, target)))
      roleState = "pass";
    else if (targets.every((target) => executiveMismatch(roleText, target)))
      roleState = "fail";
    else {
      const fn = fraction(person?.functionScore);
      roleState = fn == null ? "fail" : fn >= 0.6 ? "pass" : "fail";
    }
  } else if (person?.functionScore != null) {
    const fn = fraction(person.functionScore) ?? 0;
    roleState = fn >= 0.6 ? "pass" : fn < 0.4 ? "fail" : "unknown";
  }
  let roleValue =
    roleState === "fail" && roleText
      ? `${shortRole(roleText)}, not ${shortTarget(fitFor)}`
      : roleState === "pass" && roleText
        ? roleText
        : roleText || "Role not compared";

  const matchedHiring = env?.hiring?.[0];
  const matchedRole = ai?.hiringIntelligence?.roles?.[0];
  const hiringSignal = suggestions.hiringSignal;
  const signalBlob = [
    matchedHiring?.title,
    matchedHiring?.matchedKeyword,
    matchedRole?.title,
    hiringSignal?.summary,
    ...(hiringSignal?.roles ?? []),
    ...(profile?.signals ?? []).map((signal) => signal.summary),
  ]
    .filter(Boolean)
    .join(" ");

  const backendMatched = Boolean(matchedHiring || matchedRole);
  const confirmed =
    hiringSignal?.strength === "confirmed" ||
    hiringSignal?.strength === "likely";
  const hasSignal =
    (backendMatched &&
      (!fitFor ||
        fitFor === "this mission" ||
        textMatchesTarget(signalBlob, fitFor) ||
        Boolean(matchedHiring?.matchedKeyword))) ||
    (confirmed && textMatchesTarget(signalBlob, fitFor));

  let signalText = "None found";
  let signalUrl: string | null =
    matchedHiring?.sourceUrl ?? matchedRole?.sourceUrl ?? null;
  if (hasSignal) {
    const title =
      matchedHiring?.title ||
      matchedRole?.title ||
      hiringSignal?.roles?.[0] ||
      "a matching role";
    const when = matchedRole?.posted ? ` ${matchedRole.posted}` : "";
    signalText = `Posted “${title}”${when}`;
    signalUrl =
      matchedHiring?.sourceUrl ??
      matchedRole?.sourceUrl ??
      hiringSignal?.evidence?.[0]?.sourceUrl ??
      null;
  }

  const trace = trail?.searchTrace ?? env?.research?.searchTrace ?? [];
  const searches: SearchRow[] = trace.length
    ? trace.map((row) => ({
        n: row.n,
        query: row.query,
        detail: [row.intent?.replace(/_/g, " "), row.strategy]
          .filter(Boolean)
          .join(" · "),
      }))
    : searchesFromQueries;

  const rolePts = roleState === "pass" ? 1 : roleState === "fail" ? 0.2 : 0.45;
  const locPts =
    locationState === "pass" ? 1 : locationState === "fail" ? 0.15 : 0.45;
  const sigPts = hasSignal ? 1 : 0;
  const objPts = objectives.length
    ? met / objectives.length
    : hasSignal
      ? 0.5
      : 0;
  let score = Math.round(
    (rolePts * 0.35 + locPts * 0.25 + sigPts * 0.25 + objPts * 0.15) * 100,
  );
  const personFit = fraction(person?.suitability ?? person?.fitScore);
  if (personFit != null)
    score = Math.round(score * 0.6 + personFit * 100 * 0.4);
  score = Math.max(0, Math.min(100, score));

  const enriched =
    lead.enrichmentStatus === "completed" ||
    lead.enrichmentStatus === "partial" ||
    lead.enrichmentStatus === "failed";
  const researched = enriched || searches.length > 0 || objectives.length > 0;

  let verdict: FitVerdict = "none";
  if (!researched) verdict = "none";
  else if (
    score >= 70 &&
    roleState !== "fail" &&
    locationState !== "fail" &&
    hasSignal
  )
    verdict = "strong";
  else if (score >= 45 && roleState !== "fail" && locationState !== "fail")
    verdict = "possible";
  else if (
    !hasSignal &&
    roleState === "unknown" &&
    locationState === "unknown" &&
    score === 0
  )
    verdict = "none";
  else verdict = "weak";

  const industry =
    lead.company?.industry || profile?.qualification?.industry || "";
  const city = lead.company?.city || locationText.split(",")[0]?.trim() || "";
  const reasonParts: string[] = [];
  if (!researched) {
    reasonParts.push("Enrich this lead to see whether they match the mission.");
  } else {
    if (industry && city) reasonParts.push(`${industry} company in ${city}.`);
    else if (city) reasonParts.push(`Based in ${city}.`);
    else if (industry) reasonParts.push(`${industry} company.`);
    if (!hasSignal) reasonParts.push("No hiring signal found.");
    if (locationState === "fail") reasonParts.push("Outside target region.");
  }

  const identity = profile?.quality?.identityConfidence;
  const data = profile?.quality?.dataConfidence;

  const rubric = ai?.icpBreakdown as {
    score?: number;
    priority?: string;
    fitReason?: string;
    parts?: { persona?: number };
  } | null;
  if (
    rubric &&
    typeof rubric.score === "number" &&
    rubric.priority &&
    rubric.priority !== "unknown"
  ) {
    score = rubric.score;
    const persona = rubric.parts?.persona;
    if (typeof persona === "number") {
      if (persona >= 32) {
        roleState = "pass";
        roleValue = roleText || "Matches this agent’s persona";
      } else if (persona === 0) {
        roleState = "fail";
      }
    }
    if (rubric.priority === "hot") verdict = "strong";
    else if (rubric.priority === "warm") verdict = "possible";
    else if (rubric.priority === "cold" || rubric.priority === "skip")
      verdict = "weak";
    if (rubric.fitReason)
      reasonParts.splice(0, reasonParts.length, rubric.fitReason);
  }

  return {
    verdict,
    verdictLabel:
      verdict === "strong"
        ? "Strong fit"
        : verdict === "possible"
          ? "Possible fit"
          : verdict === "weak"
            ? "Weak fit"
            : "No signal",
    score,
    reason: reasonParts.join(" ") || "Not enough evidence to judge this lead.",
    fitFor,
    mission,
    scoredAgainstOtherAgent: Boolean(
      agent?.id &&
      lead.enrichmentAgentId &&
      agent.id !== lead.enrichmentAgentId,
    ),
    signal: {
      state: hasSignal ? "pass" : researched ? "unknown" : "unknown",
      text: signalText,
      sourceUrl: signalUrl,
      prominent: hasSignal,
    },
    role: { state: roleState, text: roleValue },
    location: { state: locationState, text: locationValue },
    objectives: { met, total: objectives.length, items: objectives },
    coverage: {
      identity:
        identity == null
          ? null
          : Math.round(identity * (identity <= 1 ? 100 : 1)),
      data: data == null ? null : Math.round(data * (data <= 1 ? 100 : 1)),
    },
    searches,
  };
}

export function headerEnrichmentLabel(lead: LeadDetail): {
  label: string;
  tone: string;
} {
  if (lead.enrichmentStatus === "partial") {
    return {
      label: "Enriched – partial",
      tone: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }
  if (lead.enrichmentStatus === "completed") {
    return {
      label: "Enriched",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  const meta = enrichmentStatusMeta(
    lead.enrichmentStatus,
    lead.enrichmentError,
  );
  return { label: meta.label, tone: meta.tone };
}

export function statusChips(lead: LeadDetail) {
  const stage = stageMeta(lead.pipelineStage);
  const enrichment = headerEnrichmentLabel(lead);
  const chips = [
    { key: "stage", label: stage.label, tone: stage.tone },
    ...(lead.priority && lead.priority !== "unknown"
      ? [
          {
            key: "priority",
            label: lead.priority[0].toUpperCase() + lead.priority.slice(1),
            tone: priorityTone(lead.priority),
          },
        ]
      : []),
    { key: "enrichment", label: enrichment.label, tone: enrichment.tone },
  ];
  return chips.slice(0, 3);
}

export function personSnapshot(
  lead: LeadDetail,
  snapshot: LinkedInSnapshot | null,
  emails: EmailEntry[],
) {
  const person = snapshot?.person;
  const headline = person?.headline?.trim() || lead.contact?.role || "";
  const location =
    person?.location || lead.contact?.location || leadLocation(lead);
  const connections = person?.connectionsCount;
  const followers = person?.followerCount;
  const reach =
    connections || followers
      ? [
          connections ? `${connections.toLocaleString()} connections` : null,
          followers ? `${followers.toLocaleString()} followers` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "";
  return {
    headline,
    location,
    reach,
    email: emails[0] ?? null,
    extraEmails: Math.max(0, emails.length - 1),
  };
}

export function companySnapshot(
  lead: LeadDetail,
  ai: AiIntelligenceData | null,
  snapshot: LinkedInSnapshot | null,
) {
  const profile = profileOf(lead, ai);
  const linkedin = snapshot?.company;
  const industry = [
    lead.company?.industry ||
      linkedin?.industry ||
      profile?.qualification?.industry,
    lead.company?.size ||
      linkedin?.employeeRange ||
      profile?.qualification?.sizeBucket,
  ]
    .filter(Boolean)
    .join(" · ");
  const location =
    [lead.company?.city || null, lead.company?.country || null]
      .filter(Boolean)
      .join(", ") ||
    linkedin?.headquarters ||
    profile?.identity?.location ||
    "";
  const does =
    profile?.qualification?.whatTheySell ||
    lead.company?.description ||
    linkedin?.tagline ||
    "";
  const domain = (lead.company?.domain || linkedin?.website || "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "");
  const href = lead.company?.website || (domain ? `https://${domain}` : "");
  return { industry, location, does, domain, href };
}

export function dataGaps(
  lead: LeadDetail,
  ai: AiIntelligenceData | null,
): string[] {
  const profile = profileOf(lead, ai);
  const suggestions = suggestionsOf(lead);
  const raw = [
    ...(profile?.quality?.missing ?? []),
    ...(suggestions.gapsRemaining ?? []),
    ...(suggestions.unableToFind ?? []),
    ...(suggestions.companyEnvironment?.research?.gaps ?? []),
  ];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const gap of raw) {
    const label = humanizeGap(String(gap));
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    items.push(label);
  }
  return items;
}

export function researchLogStats(
  lead: LeadDetail,
  queryCount: number,
  fetchStats: {
    urlsAttempted?: number;
    urlsRead?: number;
    botBlocked?: number;
    dropped?: number;
  } | null,
) {
  const suggestions = suggestionsOf(lead);
  const trail = suggestions.researchTrail;
  const env = suggestions.companyEnvironment?.research;
  const stats = fetchStats ?? suggestions.fetchStats ?? null;
  return {
    searches: trail?.queryCount ?? env?.queriesPlanned ?? queryCount,
    urlsFound: trail?.urlsDiscovered ?? env?.urlsDiscovered ?? 0,
    pagesRead: stats?.urlsRead ?? 0,
    dropped: stats?.dropped ?? trail?.pagesRejected ?? env?.pagesRejected ?? 0,
    botWalls: stats?.botBlocked ?? 0,
  };
}

export function isSchoolLevel(school: {
  school?: string;
  degree?: string;
  fieldOfStudy?: string;
}): boolean {
  const blob =
    `${school.school ?? ""} ${school.degree ?? ""} ${school.fieldOfStudy ?? ""}`.toLowerCase();
  return /high school|secondary school|senior secondary|higher secondary|gcse|a-levels|matriculation/.test(
    blob,
  );
}

export function companyPhone(snapshot: LinkedInSnapshot | null): string | null {
  return formatPhoneValue(snapshot?.company?.phone) ?? null;
}

export function visibleFacts(facts: EnrichmentFact[]) {
  const kept = facts.filter((fact) => fact.status !== "rejected");
  const rejected = facts.filter((fact) => fact.status === "rejected");
  return { kept, rejected };
}

export function lowFit(verdict: FitVerdict): boolean {
  return verdict === "weak" || verdict === "none";
}
