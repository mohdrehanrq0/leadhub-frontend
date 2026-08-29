import { IconAlertTriangle, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import {
  GAP_SEVERITY_STYLE,
  type CaptureDataGap,
  type CaptureGapField,
} from '@/lib/captures';

/**
 * The warning that sits next to an empty field.
 *
 * Rendered inline so the user sees *why* a value is blank at the point they
 * look for it, instead of inferring it from an em dash.
 */
export function GapBadge({ gap }: { gap: CaptureDataGap | undefined }) {
  if (!gap) return null;
  const style = GAP_SEVERITY_STYLE[gap.severity];

  return (
    <span
      title={gap.reason}
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${style.className}`}
    >
      <span className={`h-1 w-1 rounded-full ${style.dot}`} />
      {gap.severity === 'blocking' ? 'Required' : 'Not on LinkedIn'}
    </span>
  );
}

/**
 * A field value with its gap warning, or an em dash when the value is present
 * but empty for an unrelated reason.
 */
export function GapValue({
  value,
  gap,
  mono = false,
}: {
  value?: string | number | null;
  gap?: CaptureDataGap;
  mono?: boolean;
}) {
  if (value !== null && value !== undefined && value !== '') {
    return <span className={mono ? 'font-mono text-[13px]' : undefined}>{value}</span>;
  }
  return gap ? <GapBadge gap={gap} /> : <span className="text-text-300">—</span>;
}

/**
 * Summary of everything LinkedIn did not carry.
 *
 * Blocking gaps come first because they are the reason the capture cannot
 * reach the CRM yet.
 */
export function DataGapsPanel({
  gaps,
  message,
}: {
  gaps: CaptureDataGap[] | null | undefined;
  message?: string;
}) {
  const rows = [...(gaps ?? [])].sort((a, b) => rank(a) - rank(b));

  if (!rows.length) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
        <IconCircleCheck size={17} className="mt-px shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-emerald-900">No data gaps</p>
          <p className="mt-0.5 text-xs leading-5 text-emerald-800">
            {message ?? 'LinkedIn carried every field LeadHub needs for this company.'}
          </p>
        </div>
      </div>
    );
  }

  const blocking = rows.filter((gap) => gap.severity === 'blocking').length;

  return (
    <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60">
      <div className="flex items-start gap-2.5 border-b border-amber-200/70 px-4 py-3">
        <IconAlertTriangle size={17} className="mt-px shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-900">
            {blocking
              ? `${blocking} field${blocking > 1 ? 's' : ''} missing before this can become a lead`
              : `LinkedIn is missing ${rows.length} field${rows.length > 1 ? 's' : ''}`}
          </p>
          {message ? (
            <p className="mt-0.5 text-xs leading-5 text-amber-800">{message}</p>
          ) : null}
        </div>
      </div>
      <ul className="divide-y divide-amber-200/50">
        {rows.map((gap) => {
          const style = GAP_SEVERITY_STYLE[gap.severity];
          return (
            <li key={gap.field} className="flex items-start gap-2.5 px-4 py-2.5">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-900">
                  {gap.label}
                  {gap.severity === 'blocking' ? (
                    <span className="ml-1.5 rounded bg-red-100 px-1 py-0.5 text-[9px] font-bold uppercase text-red-700">
                      required
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-amber-800">{gap.reason}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="flex items-start gap-2 border-t border-amber-200/70 bg-amber-100/40 px-4 py-2.5 text-[11px] leading-5 text-amber-800">
        <IconInfoCircle size={13} className="mt-0.5 shrink-0" />
        Enrichment tries to fill these from the company website and other sources. You can also
        correct them by hand below.
      </p>
    </div>
  );
}

function rank(gap: CaptureDataGap): number {
  return gap.severity === 'blocking' ? 0 : gap.severity === 'warning' ? 1 : 2;
}

export type { CaptureGapField };
