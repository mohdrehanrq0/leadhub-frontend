'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { IconHistory, IconLoader2, IconPlayerPlay, IconPlus } from '@tabler/icons-react';
import { RECIPE_ENGINE_V2 } from '@/lib/features';
import {
  getEngineRecipe,
  listEngineNodes,
  listEngineRecipeVersions,
  restoreEngineRecipeVersion,
  runEngineRecipe,
  saveEngineRecipeVersion,
  type EngineRecipe,
  type EngineRow,
  type EngineRunResult,
  type EngineStep,
  type NodeMeta,
} from '@/lib/recipe-engine-api';
import { ConfigForm } from '@/components/recipe-engine/ConfigForm';
import { StepCard } from '@/components/recipe-engine/StepCard';
import { spinnerClass } from '@/components/ui/styles';
import { cn } from '@/lib/utils';

function rowColumns(rows: EngineRow[]): string[] {
  const cols: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!cols.includes(key)) cols.push(key);
    }
  }
  return cols.filter((c) => c !== 'dropped_reason' && c !== 'dropped_by_step').concat(
    rows.some((r) => r.dropped_reason) ? ['dropped_reason'] : [],
  );
}

export default function RecipeEngineEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [recipe, setRecipe] = useState<EngineRecipe | null>(null);
  const [nodes, setNodes] = useState<NodeMeta[]>([]);
  const [versions, setVersions] = useState<EngineRecipe[]>([]);
  const [steps, setSteps] = useState<EngineStep[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(RECIPE_ENGINE_V2);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<'test' | 'full' | null>(null);
  const [run, setRun] = useState<EngineRunResult | null>(null);
  const [showDropped, setShowDropped] = useState(false);
  const [costCap, setCostCap] = useState('');

  const nodeByType = useMemo(() => new Map(nodes.map((n) => [n.type, n])), [nodes]);
  const selectedStep = steps[selected];
  const selectedNode = selectedStep ? nodeByType.get(selectedStep.type) : undefined;
  const selectedRunStep = run?.steps.find((s) => s.stepId === selectedStep?.id) ?? run?.steps[selected];
  const outputRows = useMemo(() => {
    const rows = selectedRunStep?.rows ?? [];
    return showDropped ? rows : rows.filter((r) => !r.dropped_reason);
  }, [selectedRunStep, showDropped]);
  const columns = useMemo(() => rowColumns(outputRows), [outputRows]);

  useEffect(() => {
    if (!RECIPE_ENGINE_V2 || !id) return;
    Promise.all([getEngineRecipe(id), listEngineNodes(), listEngineRecipeVersions(id)])
      .then(([r, ns, vs]) => {
        setRecipe(r); setNodes(ns); setVersions(vs); setSteps(r.steps);
        if (r.costCap != null) setCostCap(String(r.costCap));
      })
      .catch(() => toast.error('Could not load recipe'))
      .finally(() => setLoading(false));
  }, [id]);

  if (!RECIPE_ENGINE_V2) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Recipe engine is disabled.</div>;
  }
  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-zinc-500"><IconLoader2 className={spinnerClass} /></div>;
  }
  if (!recipe) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Recipe not found. <Link className="text-blue-600" href="/research/engine">Back to recipes</Link></div>;
  }

  function updateStep(index: number, next: EngineStep) {
    setSteps((prev) => prev.map((s, i) => (i === index ? next : s)));
  }
  function move(index: number, dir: -1 | 1) {
    setSteps((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(index + dir, 0, item!);
      return next;
    });
    setSelected(index + dir);
  }
  function addStep(type: string) {
    const node = nodeByType.get(type);
    const config = Object.fromEntries((node?.configSchema ?? []).filter((f) => f.default !== undefined).map((f) => [f.key, f.default]));
    const step: EngineStep = { id: `step-${steps.length + 1}-${type.replace(/[^a-z0-9]+/gi, '-')}`, type, config };
    setSteps((prev) => [...prev, step]);
    setSelected(steps.length);
  }

  async function onSave() {
    setSaving(true);
    try {
      const saved = await saveEngineRecipeVersion(id, { steps, costCap: costCap ? Number(costCap) : undefined });
      setRecipe(saved);
      setVersions(await listEngineRecipeVersions(id));
      toast.success(`Saved v${saved.version}`);
    } catch { toast.error('Could not save'); } finally { setSaving(false); }
  }

  async function onRun(mode: 'test' | 'full') {
    setRunning(mode);
    try {
      // Run the steps on screen: persist edits as a new version first when they differ.
      if (JSON.stringify(steps) !== JSON.stringify(recipe?.steps ?? [])) {
        const saved = await saveEngineRecipeVersion(id, { steps, costCap: costCap ? Number(costCap) : undefined });
        setRecipe(saved);
        setVersions(await listEngineRecipeVersions(id));
      }
      const result = await runEngineRecipe(id, { mode, costCap: costCap ? Number(costCap) : undefined });
      setRun(result);
      if (result.status === 'completed') toast.success(`Run completed — est. ${result.estimatedCost}, actual ${result.actualCost} credits`);
      else toast.error(result.error ?? `Run ${result.status}`);
    } catch { toast.error('Run failed'); } finally { setRunning(null); }
  }

  async function onRestore(version: number) {
    try {
      const restored = await restoreEngineRecipeVersion(id, version);
      setRecipe(restored); setSteps(restored.steps);
      setVersions(await listEngineRecipeVersions(id));
      toast.success(`Restored v${version} as v${restored.version}`);
    } catch { toast.error('Could not restore'); }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/research/engine" className="text-sm text-blue-600">← Recipe engine</Link>
          <h1 className="text-xl font-semibold text-slate-900">{recipe.name} <span className="text-sm font-normal text-slate-400">v{recipe.version}</span></h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={costCap} onChange={(e) => setCostCap(e.target.value)} placeholder="Cost cap" inputMode="numeric" className="h-10 w-28 rounded-lg border border-slate-200 bg-white px-3 text-sm" />
          <button type="button" onClick={onSave} disabled={saving} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">{saving ? 'Saving…' : 'Save new version'}</button>
          <button type="button" onClick={() => onRun('test')} disabled={running != null} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"><IconPlayerPlay size={15} /> Run on 5 rows</button>
          <button type="button" onClick={() => onRun('full')} disabled={running != null} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><IconPlayerPlay size={15} /> Run full</button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {steps.map((step, i) => (
            <StepCard key={step.id} step={step} node={nodeByType.get(step.type)} index={i} total={steps.length}
              selected={i === selected} cacheHit={run?.steps.find((s) => s.stepId === step.id)?.cacheHit}
              onSelect={() => setSelected(i)} onMove={(dir) => move(i, dir)}
              onRemove={() => setSteps((prev) => prev.filter((_, x) => x !== i))} />
          ))}
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
            <p className="mb-2 flex items-center gap-1 text-sm font-medium text-slate-700"><IconPlus size={14} /> Add step (registry only)</p>
            <div className="flex flex-wrap gap-2">
              {nodes.map((node) => (
                <button key={node.type} type="button" onClick={() => addStep(node.type)} className="rounded-full border border-slate-200 px-3 py-1 text-xs hover:bg-slate-50">{node.label}</button>
              ))}
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {selectedStep && selectedNode ? (
            <>
              <h2 className="font-semibold text-slate-900">{selectedNode.label}</h2>
              <p className="mb-4 text-sm text-slate-500">{selectedStep.type}</p>
              <ConfigForm schema={selectedNode.configSchema} value={selectedStep.config}
                onChange={(config) => updateStep(selected, { ...selectedStep, config })} />
              <p className="mt-4 text-xs text-slate-400">Outputs: {selectedNode.outputColumns.join(', ') || '—'}</p>
            </>
          ) : <p className="text-sm text-slate-500">Select a step to edit its config.</p>}
        </aside>
      </div>

      {run ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Funnel — {run.status} · est. {run.estimatedCost} / actual {run.actualCost} credits</h2>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={showDropped} onChange={(e) => setShowDropped(e.target.checked)} className="h-4 w-4 accent-blue-600" />
              Show dropped rows
            </label>
          </div>
          {run.error ? <p className="text-sm text-red-600">{run.error}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-slate-500"><th className="py-2 pr-3">Step</th><th className="py-2 pr-3">In</th><th className="py-2 pr-3">Out</th><th className="py-2 pr-3">Dropped</th><th className="py-2 pr-3">Cache</th><th className="py-2">Est / actual</th></tr></thead>
              <tbody>
                {run.funnel.map((s, i) => (
                  <tr key={s.stepId} className={cn('cursor-pointer border-b last:border-0', i === selected && 'bg-blue-50')} onClick={() => setSelected(i)}>
                    <td className="py-2 pr-3">{s.stepId}<div className="text-xs text-slate-400">{Object.entries(s.dropReasons).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div></td>
                    <td className="py-2 pr-3">{s.rowsIn}</td><td className="py-2 pr-3">{s.rowsOut}</td><td className="py-2 pr-3">{s.droppedCount}</td>
                    <td className="py-2 pr-3">{s.cacheHit ? 'hit' : '—'}</td><td className="py-2">{s.estimatedCost} / {s.actualCost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-slate-500">{columns.map((c) => <th key={c} className="py-2 pr-3">{c}</th>)}</tr></thead>
              <tbody>
                {outputRows.slice(0, 100).map((row, i) => (
                  <tr key={i} className={cn('border-b last:border-0', row.dropped_reason && 'bg-red-50 text-slate-500')}>
                    {columns.map((c) => <td key={c} className="max-w-56 truncate py-2 pr-3">{row[c] == null ? '' : String(row[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {outputRows.length === 0 ? <p className="py-4 text-sm text-slate-400">No rows for this step.</p> : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><IconHistory size={16} /> Version history</h2>
        <div className="space-y-2">
          {versions.map((v) => (
            <div key={`${v.version}-${v.myRecipeId ?? ''}`} className="flex items-center justify-between text-sm">
              <span>v{v.version} · {v.steps.length} steps {v.version === recipe.version ? '· current' : ''}</span>
              {v.version !== recipe.version ? <button type="button" className="text-blue-600" onClick={() => onRestore(v.version)}>Restore</button> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
