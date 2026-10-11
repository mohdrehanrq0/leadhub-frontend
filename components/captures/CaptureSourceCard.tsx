'use client';

import { commentSnippet, displayPersonName, isFromPostComment, sourcePostInfo, type CaptureDetail } from '@/lib/captures';

export function CaptureSourceCard({ capture }: { capture: CaptureDetail }) {
  const comment = isFromPostComment(capture);
  const post = capture.type === 'post';
  const source = sourcePostInfo(capture);
  const author = source.author ? displayPersonName(source.author) : null;
  const person = capture.personSnapshot;
  const personName = displayPersonName(person?.fullName || capture.personName);
  const headline = person?.headline || capture.headline || capture.positionTitle;
  const experience = person?.experience ?? [];
  const current = person?.currentPosition;
  const postText =
    (typeof capture.sourceContext?.sourcePostText === 'string' && capture.sourceContext.sourcePostText.trim()) ||
    (post ? capture.postText : null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
        {comment ? 'LinkedIn comment' : post ? 'LinkedIn post' : 'LinkedIn profile'}
      </p>
      {comment ? (
        <div className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
          <p>
            <span className="font-semibold text-slate-900">Their comment: </span>
            {commentSnippet(capture) || 'Comment saved with this profile.'}
          </p>
          {author || source.url ? (
            <p className="text-slate-500">
              On {author ? `${author}'s` : 'a'} post
              {source.url ? (
                <>
                  {' · '}
                  <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-violet-700 hover:underline">
                    Open post
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          {postText ? <p className="whitespace-pre-wrap text-slate-600">{postText}</p> : null}
        </div>
      ) : null}
      {post ? (
        <div className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
          <p className="whitespace-pre-wrap">{capture.postText || 'Post saved from LinkedIn.'}</p>
          {capture.url ? (
            <a href={capture.url} target="_blank" rel="noreferrer" className="font-semibold text-violet-700 hover:underline">
              Open post
            </a>
          ) : null}
        </div>
      ) : null}
      {personName || headline || person?.about || experience.length || capture.personProfileUrl ? (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-sm leading-6 text-slate-700">
          {personName ? <p className="font-semibold text-slate-950">{personName}</p> : null}
          {headline ? <p>{headline}</p> : null}
          {current?.title || current?.company ? (
            <p className="text-slate-600">
              {[current.title, current.company].filter(Boolean).join(' · ')}
              {current.dateRange ? ` · ${current.dateRange}` : ''}
            </p>
          ) : null}
          {person?.location ? <p className="text-slate-500">{person.location}</p> : null}
          {person?.about ? <p className="whitespace-pre-wrap text-slate-600">{person.about}</p> : null}
          {experience.length ? (
            <ul className="space-y-1 text-slate-600">
              {experience.slice(0, 4).map((role, index) => (
                <li key={`${role.company}-${role.title}-${index}`}>
                  {[role.title, role.company].filter(Boolean).join(' · ')}
                  {role.dateRange ? ` · ${role.dateRange}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
          {capture.personProfileUrl ? (
            <a
              href={capture.personProfileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-violet-700 hover:underline"
            >
              Open LinkedIn profile
            </a>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
