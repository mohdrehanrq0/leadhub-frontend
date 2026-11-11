import type { ComponentType } from 'react';
import {
  IconBrain,
  IconFilter,
  IconLink,
  IconList,
  IconMail,
  IconSend,
  IconSparkles,
  IconUsers,
  IconWorldWww,
} from '@tabler/icons-react';
import type { NodeMeta } from '@/lib/recipe-engine-api';

export type FlowCategory = NodeMeta['category'];

export const CATEGORY_ORDER: FlowCategory[] = ['source', 'ai', 'enrich', 'transform', 'email', 'output'];

export const CATEGORY_LABEL: Record<FlowCategory, string> = {
  source: 'Sources',
  ai: 'AI',
  enrich: 'Profiles',
  transform: 'Transform',
  email: 'Email',
  output: 'Output',
};

/** Soft LeadHub accents — blue brand + restrained category tints. */
export const CATEGORY_ACCENT: Record<FlowCategory, { icon: string; selected: string }> = {
  source: { icon: 'bg-sky-50 text-sky-600', selected: 'border-brand-main ring-brand-main/20' },
  ai: { icon: 'bg-violet-50 text-violet-600', selected: 'border-violet-400 ring-violet-200' },
  enrich: { icon: 'bg-blue-50 text-blue-600', selected: 'border-blue-400 ring-blue-200' },
  transform: { icon: 'bg-amber-50 text-amber-700', selected: 'border-amber-400 ring-amber-200' },
  email: { icon: 'bg-fuchsia-50 text-fuchsia-600', selected: 'border-fuchsia-400 ring-fuchsia-200' },
  output: { icon: 'bg-emerald-50 text-emerald-700', selected: 'border-emerald-400 ring-emerald-200' },
};

const TYPE_ICONS: Record<string, ComponentType<{ size?: number; className?: string; stroke?: number }>> = {
  'input.url_list': IconList,
  'apify.post_comments': IconWorldWww,
  'linkedin.employees': IconUsers,
  'linkedin.profile': IconUsers,
  'linkedin.company': IconWorldWww,
  dedupe: IconFilter,
  'ai.intent_score': IconBrain,
  'email.waterfall': IconMail,
  'out.leadsnipper_list': IconSend,
  'out.linkedin_queue': IconLink,
};

export function iconForNode(type: string, category: FlowCategory) {
  if (TYPE_ICONS[type]) return TYPE_ICONS[type];
  if (category === 'ai') return IconSparkles;
  if (category === 'email') return IconMail;
  if (category === 'output') return IconSend;
  if (category === 'enrich') return IconUsers;
  if (category === 'source') return IconList;
  return IconFilter;
}

export function previewForStep(config: Record<string, unknown>, node?: NodeMeta): string {
  if (!node) return '';
  const rubric = config.rubric;
  if (typeof rubric === 'string' && rubric.trim()) {
    return rubric.trim().length > 90 ? `${rubric.trim().slice(0, 90)}…` : rubric.trim();
  }
  const note = config.noteTemplate;
  if (typeof note === 'string' && note.trim()) {
    return note.trim().length > 90 ? `${note.trim().slice(0, 90)}…` : note.trim();
  }
  const listName = config.listName;
  if (typeof listName === 'string' && listName.trim()) return `List: ${listName.trim()}`;
  const urls = config.urls ?? config.postUrls;
  if (Array.isArray(urls) && urls.length) return `${urls.length} URL${urls.length === 1 ? '' : 's'}`;
  if (typeof urls === 'string' && urls.trim()) return 'URLs set';
  return node.description;
}
