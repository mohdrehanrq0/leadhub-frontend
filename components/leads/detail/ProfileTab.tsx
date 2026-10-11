'use client';

import { useState } from 'react';
import { CappedChips, ClampText, DetailCard, SectionLabel } from './primitives';
import { isSchoolLevel } from './model';
import type { LinkedInPersonView } from '../../enrichment/types';

export function ProfileTab({ person }: { person?: LinkedInPersonView }) {
  const [showExperience, setShowExperience] = useState(false);
  const [showEducation, setShowEducation] = useState(false);

  if (!person) {
    return (
      <DetailCard>
        <p className="text-sm text-slate-500">No LinkedIn profile has been read for this person yet.</p>
      </DetailCard>
    );
  }

  const skills = [...person.topSkills, ...person.skills.filter((skill) => !person.topSkills.includes(skill))];
  const college = person.education.filter((school) => !isSchoolLevel(school));
  const educationDefault = college.length ? college : [];
  const experience = showExperience ? person.experience : person.experience.slice(0, 2);
  const education = showEducation ? person.education : educationDefault.slice(0, 2);

  return (
    <div className="space-y-4">
      <DetailCard>
        <div className="flex min-w-0 items-start gap-3">
          {person.photo ? (
            <img src={person.photo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-100 text-lg font-semibold text-slate-500">
              {(person.fullName || 'P').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-950">{person.fullName || 'LinkedIn profile'}</p>
            {person.headline ? <p className="mt-0.5 text-sm leading-6 text-slate-600">{person.headline}</p> : null}
            {person.linkedinUrl ? (
              <a
                href={person.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex text-sm font-semibold text-violet-700 hover:underline"
              >
                Open LinkedIn profile
              </a>
            ) : null}
          </div>
        </div>
      </DetailCard>
      <DetailCard>
        <div className="@container">
          <div className="grid min-w-0 gap-3 @min-[600px]:grid-cols-3">
            <Stat label="Connections" value={person.connectionsCount ? person.connectionsCount.toLocaleString() : '—'} />
            <Stat label="Followers" value={person.followerCount ? person.followerCount.toLocaleString() : '—'} />
            <Stat label="Location" value={person.location || '—'} />
          </div>
        </div>
      </DetailCard>

      {person.about ? (
        <DetailCard>
          <SectionLabel>About</SectionLabel>
          <div className="mt-2">
            <ClampText text={person.about} lines={4} />
          </div>
        </DetailCard>
      ) : null}

      {person.experience.length ? (
        <DetailCard>
          <SectionLabel>Experience</SectionLabel>
          <ol className="mt-3 space-y-3">
            {experience.map((role, index) => (
              <li key={`${role.company}-${role.title}-${index}`} className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{role.title ?? 'Role'}</p>
                <p className="truncate text-sm text-slate-600">
                  {[role.company, role.location].filter(Boolean).join(' · ')}
                </p>
                {role.dateRange || role.duration ? (
                  <p className="text-sm text-slate-400">{[role.dateRange, role.duration].filter(Boolean).join(' · ')}</p>
                ) : null}
                {role.description ? (
                  <p className="mt-1 line-clamp-3 text-sm leading-normal text-slate-600">{role.description}</p>
                ) : null}
              </li>
            ))}
          </ol>
          {person.experience.length > 2 ? (
            <button
              type="button"
              onClick={() => setShowExperience((open) => !open)}
              className="mt-3 text-sm font-medium text-violet-700 hover:underline"
            >
              {showExperience ? 'Show less' : 'Show all'}
            </button>
          ) : null}
        </DetailCard>
      ) : null}

      {person.education.length ? (
        <DetailCard>
          <SectionLabel>Education</SectionLabel>
          <ol className="mt-3 space-y-3">
            {education.map((school, index) => (
              <li key={`${school.school}-${index}`} className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{school.school ?? 'School'}</p>
                <p className="truncate text-sm text-slate-600">
                  {[school.degree, school.fieldOfStudy].filter(Boolean).join(', ')}
                </p>
                {school.dateRange ? <p className="text-sm text-slate-400">{school.dateRange}</p> : null}
              </li>
            ))}
          </ol>
          {person.education.length > educationDefault.slice(0, 2).length ? (
            <button
              type="button"
              onClick={() => setShowEducation((open) => !open)}
              className="mt-3 text-sm font-medium text-violet-700 hover:underline"
            >
              {showEducation ? 'Show less' : 'Show all'}
            </button>
          ) : null}
        </DetailCard>
      ) : null}

      {skills.length ? (
        <DetailCard>
          <SectionLabel>Skills</SectionLabel>
          <div className="mt-2">
            <CappedChips items={skills} max={5} />
          </div>
          {person.languages.length ? (
            <p className="mt-3 text-[11px] text-slate-500">{person.languages.join(' · ')}</p>
          ) : null}
        </DetailCard>
      ) : person.languages.length ? (
        <p className="text-[11px] text-slate-500">{person.languages.join(' · ')}</p>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.05em] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900" title={value}>
        {value}
      </p>
    </div>
  );
}
