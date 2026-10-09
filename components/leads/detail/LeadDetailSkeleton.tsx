export function LeadDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1120px] animate-pulse space-y-4">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-36 rounded-xl border border-slate-200 bg-white" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="h-10 rounded-full bg-slate-200" />
          <div className="h-56 rounded-xl border border-slate-200 bg-white" />
          <div className="h-32 rounded-xl border border-slate-200 bg-white" />
          <div className="h-32 rounded-xl border border-slate-200 bg-white" />
        </div>
        <div className="min-w-0 space-y-4">
          <div className="h-24 rounded-xl border border-slate-200 bg-white" />
          <div className="h-40 rounded-xl border border-slate-200 bg-white" />
          <div className="h-64 rounded-xl border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
