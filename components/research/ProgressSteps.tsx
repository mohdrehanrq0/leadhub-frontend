import { cn } from '@/lib/utils';
import type { ResearchBrief } from '@/lib/research-types';
import { IconCheck, IconLoader2, IconX } from '@tabler/icons-react';

export function ProgressSteps({ progress }: { progress: ResearchBrief['progress'] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {progress.steps.map((step, index) => {
        const active = step.state === 'active';
        const done = step.state === 'completed';
        const failed = step.state === 'failed';
        return (
          <li
            key={step.id}
            className={cn(
              'rounded-xl border px-4 py-3 transition',
              active && 'border-brand-main/40 bg-brand-main/5 shadow-sm',
              done && 'border-emerald-200 bg-emerald-50/60',
              failed && 'border-rose-200 bg-rose-50',
              step.state === 'pending' && 'border-slate-200 bg-white',
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                  done && 'bg-emerald-600 text-white',
                  active && 'bg-brand-main text-white',
                  failed && 'bg-rose-600 text-white',
                  step.state === 'pending' && 'bg-slate-100 text-slate-500',
                )}
              >
                {done ? (
                  <IconCheck size={14} />
                ) : failed ? (
                  <IconX size={14} />
                ) : active ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="text-sm font-semibold text-slate-800">{step.label}</span>
            </div>
            <p className="text-xs text-slate-500 capitalize">{step.state.replace('_', ' ')}</p>
          </li>
        );
      })}
    </ol>
  );
}
