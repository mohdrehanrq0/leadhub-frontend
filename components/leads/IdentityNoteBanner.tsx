import type { IdentityNote } from '../../lib/identity-reasons';

export function IdentityNoteBanner({ note }: { note: IdentityNote }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">{note.headline}</p>
      {note.reasons.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 font-medium text-amber-900/90">
          {note.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
