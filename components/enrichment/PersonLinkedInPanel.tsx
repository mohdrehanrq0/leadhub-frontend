/**
 * The person's LinkedIn profile in full: about, career history, education,
 * skills and the credibility signals that come with the payload.
 *
 * All of this was already cached in `linkedin_profiles` and never rendered —
 * the UI showed a link to the profile and nothing from inside it.
 */

import {
  IconAward,
  IconBriefcase,
  IconCertificate,
  IconSchool,
  IconUser,
} from '@tabler/icons-react';
import { LinkedInLink } from '@/components/leads/LinkedInLink';
import { Chip, ChipRow, EmptyNote, EnrichmentSection, FactRow, formatAge } from './primitives';
import type { LinkedInPersonView, LinkedInRole, LinkedInSchool } from './types';

export function PersonLinkedInPanel({
  person,
  fromCapture,
  id = 'person-linkedin',
}: {
  person?: LinkedInPersonView;
  fromCapture?: boolean;
  id?: string;
}) {
  if (!person) {
    return (
      <EnrichmentSection id={id} title="LinkedIn profile" icon={<IconUser size={16} />}>
        <EmptyNote>
          No LinkedIn profile has been read for this person yet. It fills in the first time
          enrichment scrapes them.
        </EmptyNote>
      </EnrichmentSection>
    );
  }

  const age = formatAge(person.fetchedAt);

  return (
    <EnrichmentSection
      id={id}
      title="LinkedIn profile"
      icon={<IconUser size={16} />}
      subtitle={
        fromCapture
          ? 'Read from the page when you saved it — thinner than a full scrape.'
          : age
            ? `Last read ${age}.`
            : undefined
      }
      actions={
        person.linkedinUrl ? <LinkedInLink url={person.linkedinUrl} compact /> : undefined
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {person.openToWork ? <Chip tone="emerald">Open to work</Chip> : null}
          {person.hiring ? <Chip tone="blue">Hiring</Chip> : null}
          {person.verified ? <Chip tone="violet">Verified</Chip> : null}
          {person.premium ? <Chip tone="amber">Premium</Chip> : null}
        </div>

        <dl className="space-y-3">
          <FactRow label="Headline">{person.headline}</FactRow>
          <FactRow label="Location">{person.location}</FactRow>
          <FactRow label="Connections">
            {person.connectionsCount ? person.connectionsCount.toLocaleString() : undefined}
          </FactRow>
          <FactRow label="Followers">
            {person.followerCount ? person.followerCount.toLocaleString() : undefined}
          </FactRow>
        </dl>

        {person.about ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">About</p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700">
              {person.about}
            </p>
          </div>
        ) : null}

        {person.experience.length ? (
          <Group icon={<IconBriefcase size={13} />} label="Experience">
            <ol className="space-y-3">
              {person.experience.map((role, index) => (
                <RoleRow key={`${role.company}-${role.title}-${index}`} role={role} />
              ))}
            </ol>
          </Group>
        ) : null}

        {person.education.length ? (
          <Group icon={<IconSchool size={13} />} label="Education">
            <ol className="space-y-2.5">
              {person.education.map((school, index) => (
                <SchoolRow key={`${school.school}-${index}`} school={school} />
              ))}
            </ol>
          </Group>
        ) : null}

        <ChipRow label="Top skills" items={person.topSkills} tone="blue" max={10} />
        <ChipRow
          label="Skills"
          // Top skills are already shown above; repeating them is noise.
          items={person.skills.filter((skill) => !person.topSkills.includes(skill))}
          max={18}
        />
        <ChipRow label="Languages" items={person.languages} />

        {person.certifications.length ? (
          <Group icon={<IconCertificate size={13} />} label="Certifications">
            <ul className="space-y-1">
              {person.certifications.map((cert, index) => (
                <li key={`${cert.name}-${index}`} className="text-sm text-slate-700">
                  {cert.name}
                  {cert.authority ? (
                    <span className="text-slate-400"> · {cert.authority}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Group>
        ) : null}

        {person.honors.length ? (
          <Group icon={<IconAward size={13} />} label="Honors">
            <ul className="space-y-1">
              {person.honors.map((honor, index) => (
                <li key={`${honor.title}-${index}`} className="text-sm text-slate-700">
                  {honor.title}
                </li>
              ))}
            </ul>
          </Group>
        ) : null}
      </div>
    </EnrichmentSection>
  );
}

function Group({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}

function RoleRow({ role }: { role: LinkedInRole }) {
  return (
    <li className="rounded-lg border border-white bg-white px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">{role.title ?? 'Role'}</p>
        {role.isCurrent ? <Chip tone="emerald">Current</Chip> : null}
      </div>
      <p className="mt-0.5 text-xs text-slate-600">
        {role.company}
        {role.location ? <span className="text-slate-400"> · {role.location}</span> : null}
      </p>
      {role.dateRange || role.duration ? (
        <p className="mt-0.5 text-[11px] text-slate-400">
          {[role.dateRange, role.duration].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      {role.description ? (
        <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-600">{role.description}</p>
      ) : null}
    </li>
  );
}

function SchoolRow({ school }: { school: LinkedInSchool }) {
  return (
    <li className="rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{school.school ?? 'School'}</p>
      <p className="mt-0.5 text-xs text-slate-600">
        {[school.degree, school.fieldOfStudy].filter(Boolean).join(', ')}
      </p>
      {school.dateRange ? (
        <p className="mt-0.5 text-[11px] text-slate-400">{school.dateRange}</p>
      ) : null}
    </li>
  );
}
