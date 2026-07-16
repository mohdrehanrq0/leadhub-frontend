'use client';

import Link from 'next/link';
import {
  IconCheck,
  IconExternalLink,
  IconKey,
  IconPlayerPlay,
  IconRocket,
} from '@tabler/icons-react';

const STEPS = [
  {
    title: 'Create or sign in to Apify',
    body: 'Open the Apify Console and create an account (or sign in). You need an Apify account to generate an API token and run actors.',
    href: 'https://console.apify.com',
    linkLabel: 'Open Apify Console',
  },
  {
    title: 'Copy your API token',
    body: 'In Apify go to Settings → Integrations (or Account → API & Integrations) and copy your personal API token. Treat it like a password — do not share it publicly.',
    href: 'https://console.apify.com/account/integrations',
    linkLabel: 'Open Apify Integrations',
  },
  {
    title: 'Confirm actor access',
    body: 'Lead Search can run two Apify Store actors: code_crafter/leads-finder (~$1.50/1k) and microworlds/leads-finder (~$1.00/1k, verified emails). Ensure your account can run Store actors and has enough credits for the fetch sizes you plan.',
    href: 'https://apify.com/code_crafter/leads-finder',
    linkLabel: 'View code_crafter actor',
  },
  {
    title: 'Optional: microworlds actor',
    body: 'When you enable “Apify · microworlds” in Lead Search, LeadHub calls microworlds/leads-finder with verified-email filters. Same Apify API token covers both actors.',
    href: 'https://apify.com/microworlds/leads-finder',
    linkLabel: 'View microworlds actor',
  },
  {
    title: 'Paste & test in LeadHub',
    body: 'In LeadHub open Settings → API Keys, choose provider Apify, paste the token, save, then click Test until the key shows as valid.',
    href: '/dashboard/settings/api-keys?provider=apify',
    linkLabel: 'Open LeadHub API Keys',
    internal: true,
  },
  {
    title: 'Return to Lead Search',
    body: 'Once the Apify key is valid, open Lead Search / Leads Finder again. The top alert disappears and you can plan, review filters, and fetch leads.',
    href: '/dashboard/search',
    linkLabel: 'Open Lead Search',
    internal: true,
  },
];

export default function ApifyIntegrationGuidePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in text-text pb-12">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-input space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <IconRocket size={22} />
          <span className="text-xs font-semibold uppercase tracking-wider">Apify integration</span>
        </div>
        <h1 className="text-2xl font-bold text-text-100">Connect Apify to LeadHub</h1>
        <p className="text-sm text-text-200 leading-relaxed">
          Lead Search needs a valid Apify API key on your workspace. One token unlocks both
          code_crafter/leads-finder and microworlds/leads-finder. Follow these steps to create a
          token, save it in LeadHub, and start fetching leads. This page does not store your key —
          paste it only on the API Keys settings page.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a
            href="https://docs.apify.com/platform/integrations/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Apify API docs <IconExternalLink size={12} />
          </a>
          <a
            href="https://console.apify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Apify Console <IconExternalLink size={12} />
          </a>
        </div>
      </div>

      <ol className="space-y-4">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-2xl border border-border bg-card p-5 shadow-input flex gap-4"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
              {index + 1}
            </div>
            <div className="space-y-2 min-w-0">
              <h2 className="text-sm font-semibold text-text-100">{step.title}</h2>
              <p className="text-sm text-text-200 leading-relaxed">{step.body}</p>
              {step.internal ? (
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  {step.linkLabel} <IconPlayerPlay size={12} />
                </Link>
              ) : (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  {step.linkLabel} <IconExternalLink size={12} />
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-success/30 bg-success/5 p-5 flex gap-3">
        <IconCheck className="text-success flex-shrink-0 mt-0.5" size={18} />
        <div className="space-y-2">
          <p className="text-sm font-semibold text-text-100">Ready to connect?</p>
          <p className="text-sm text-text-200">
            After you copy your token from Apify, save and test it here:
          </p>
          <Link
            href="/dashboard/settings/api-keys?provider=apify"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-200 transition-colors"
          >
            <IconKey size={16} />
            Open API Keys (Apify)
          </Link>
        </div>
      </div>
    </div>
  );
}
