'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  IconCheck,
  IconChevronLeft,
  IconHistory,
  IconLoader2,
  IconPlayerPlay,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
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
import { FlowConnector, FlowNode, StartFlowNode } from '@/components/recipe-engine/FlowNode';
import { StepsLibrary } from '@/components/recipe-engine/StepsLibrary';
import { CATEGORY_ACCENT, CATEGORY_LABEL, iconForNode } from '@/components/recipe-engine/flow-meta';
import { spinnerClass } from '@/components/ui/styles';
import { cn } from '@/lib/utils';

function rowColumns(rows: EngineRow[]): string[] {
  const cols: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!cols.includes(key)) cols.push(key);
    }
  }
  return cols
    .filter((c) => c !== 'dropped_reason' && c !== 'dropped_by_step')
    .concat(rows.some((r) => r.dropped_reason) ? ['dropped_reason'] : []);
}

function makeStep(type: string, nodes: Map<string, NodeMeta>, index: number): EngineStep {
  const node = nodes.get(type);
  const config = Object.fromEntries(
    (node?.configSchema ?? [])
      .filter((f) => f.default !== undefined)
      .map((f) => [f.key, f.default]),
  );
  return {
    id: `step-${index + 1}-${type.replace(/[^a-z0-9]+/gi, '-')}`,
    type,
    config,
  };
}

export default function RecipeEngineEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [recipe, setRecipe] = useState<EngineRecipe | null>(null);
  const [nodes, setNodes] = useState<NodeMeta[]>([]);
  const [versions, setVersions] = useState<EngineRecipe[]>([]);
  const [steps, setSteps] = useState<EngineStep[]>([]);
  const [selected, setSelected] = useState<number | 'flow'>(0);
  const [loading, setLoading] = useState(RECIPE_ENGINE_V2);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<'test' | 'full' | null>(null);
  const [run, setRun] = useState<EngineRunResult | null>(null);
  const [showDropped, setShowDropped] = useState(false);
  const [costCap, setCostCap] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [insertAt, setInsertAt] = useState<number | null>(null);

  const nodeByType = useMemo(() => new Map(nodes.map((n) => [n.type, n])), [nodes]);
  const selectedIndex = typeof selected === 'number' ? selected : -1;
  const selectedStep = selectedIndex >= 0 ? steps[selectedIndex] : undefined;
  const selectedNode = selectedStep ? nodeByType.get(selectedStep.type) : undefined;
  const selectedRunStep =
    run?.steps.find((s) => s.stepId === selectedStep?.id) ??
    (selectedIndex >= 0 ? run?.steps[selectedIndex] : undefined);
  const outputRows = useMemo(() => {
    const rows = selectedRunStep?.rows ?? [];
    return showDropped ? rows : rows.filter((r) => !r.dropped_reason);
  }, [selectedRunStep, showDropped]);
  const columns = useMemo(() => rowColumns(outputRows), [outputRows]);
  const dirty = JSON.stringify(steps) !== JSON.stringify(recipe?.steps ?? []);

  useEffect(() => {
    if (!RECIPE_ENGINE_V2 || !id) return;
    Promise.all([getEngineRecipe(id), listEngineNodes(), listEngineRecipeVersions(id)])
      .then(([r, ns, vs]) => {
        setRecipe(r);
        setNodes(ns);
        setVersions(vs);
        setSteps(r.steps);
        setSelected(r.steps.length ? 0 : 'flow');
        if (r.costCap != null) setCostCap(String(r.costCap));
      })
      .catch(() => toast.error('Could not load recipe'))
      .finally(() => setLoading(false));
  }, [id]);

  if (!RECIPE_ENGINE_V2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Recipe engine is disabled.
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500">
        <IconLoader2 className={spinnerClass} />
      </div>
    );
  }
  if (!recipe) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Recipe not found.{' '}
        <Link className="font-medium text-brand-main" href="/research">
          Back to recipes
        </Link>
      </div>
    );
  }

  function updateStep(index: number, next: EngineStep) {
    setSteps((prev) => prev.map((s, i) => (i === index ? next : s)));
  }

  function addStep(type: string, at?: number) {
    const index = at ?? steps.length;
    const step = makeStep(type, nodeByType, index);
    setSteps((prev) => {
      const next = [...prev];
      next.splice(index, 0, step);
      return next;
    });
    setSelected(index);
    setInsertAt(null);
  }

  function removeSelected() {
    if (selectedIndex < 0) return;
    setSteps((prev) => prev.filter((_, i) => i !== selectedIndex));
    setSelected((prev) => {
      if (typeof prev !== 'number') return 'flow';
      if (steps.length <= 1) return 'flow';
      return Math.max(0, prev - 1);
    });
  }

  async function onSave() {
    setSaving(true);
    try {
      const saved = await saveEngineRecipeVersion(id, {
        steps,
        costCap: costCap ? Number(costCap) : undefined,
      });
      setRecipe(saved);
      setVersions(await listEngineRecipeVersions(id));
      toast.success(`Saved v${saved.version}`);
    } catch {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function onRun(mode: 'test' | 'full') {
    setRunning(mode);
    try {
      if (dirty) {
        const saved = await saveEngineRecipeVersion(id, {
          steps,
          costCap: costCap ? Number(costCap) : undefined,
        });
        setRecipe(saved);
        setVersions(await listEngineRecipeVersions(id));
      }
      const result = await runEngineRecipe(id, {
        mode,
        costCap: costCap ? Number(costCap) : undefined,
      });
      setRun(result);
      if (result.status === 'completed') {
        toast.success(`Run completed — est. ${result.estimatedCost}, actual ${result.actualCost} credits`);
      } else {
        toast.error(result.error ?? `Run ${result.status}`);
      }
    } catch {
      toast.error('Run failed');
    } finally {
      setRunning(null);
    }
  }

  async function onRestore(version: number) {
    try {
      const restored = await restoreEngineRecipeVersion(id, version);
      setRecipe(restored);
      setSteps(restored.steps);
      setVersions(await listEngineRecipeVersions(id));
      setSelected(restored.steps.length ? 0 : 'flow');
      setShowHistory(false);
      toast.success(`Restored v${version} as v${restored.version}`);
    } catch {
      toast.error('Could not restore');
    }
  }

  const SelectedIcon = selectedNode
    ? iconForNode(selectedStep!.type, selectedNode.category)
    : null;
  const selectedAccent = selectedNode ? CATEGORY_ACCENT[selectedNode.category] : null;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-bg-100 text-slate-900">
      {/* Header */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          <Link href="/research" className="inline-flex items-center gap-0.5 hover:text-slate-800">
            <IconChevronLeft size={13} />
            Recipes
          </Link>
          <span className="text-slate-300">/</span>
          <span className="truncate font-semibold text-slate-900">{recipe.name}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            v{recipe.version}
          </span>
          {dirty ? (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              Unsaved
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              <IconCheck size={10} /> Saved
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={costCap}
            onChange={(e) => setCostCap(e.target.value)}
            placeholder="Cost cap"
            inputMode="numeric"
            className="h-7 w-20 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-brand-main focus:ring-2 focus:ring-brand-main/20"
          />
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <IconHistory size={12} />
            Versions
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || !dirty}
            className="h-7 rounded-md bg-brand-main px-2.5 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => void onRun('test')}
            disabled={running != null}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <IconPlayerPlay size={12} />
            Run 5
          </button>
          <button
            type="button"
            onClick={() => void onRun('full')}
            disabled={running != null}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <IconPlayerPlay size={12} />
            {running ? 'Running…' : 'Run full'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left library */}
        <div className="hidden w-52 shrink-0 lg:block xl:w-56">
          <StepsLibrary nodes={nodes} onAdd={(type) => addStep(type, insertAt ?? undefined)} />
        </div>

        {/* Canvas */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-bg-100">
          <div className="mx-auto flex w-full max-w-md flex-col px-3 py-5">
            <StartFlowNode />
            <FlowConnector onInsert={() => setInsertAt(0)} />

            {steps.map((step, i) => {
              const runStep = run?.steps.find((s) => s.stepId === step.id);
              return (
                <div key={step.id}>
                  <FlowNode
                    step={step}
                    node={nodeByType.get(step.type)}
                    selected={selectedIndex === i}
                    cacheHit={runStep?.cacheHit}
                    rowsOut={runStep?.rowsOut}
                    onSelect={() => {
                      setSelected(i);
                      setInsertAt(null);
                    }}
                  />
                  <FlowConnector onInsert={() => setInsertAt(i + 1)} />
                </div>
              );
            })}

            {insertAt != null ? (
              <div className="mx-auto mb-4 w-full max-w-sm rounded-xl border border-brand-main/30 bg-white p-2.5 shadow-sm">
                <p className="mb-1.5 text-[11px] font-medium text-slate-700">
                  Insert at step {insertAt + 1}
                </p>
                <div className="flex flex-wrap gap-1">
                  {nodes.map((node) => (
                    <button
                      key={node.type}
                      type="button"
                      onClick={() => addStep(node.type, insertAt)}
                      className="rounded-md border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 hover:border-brand-main hover:text-brand-main"
                    >
                      {node.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setInsertAt(null)}
                  className="mt-1.5 text-[10px] text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {steps.length === 0 ? (
              <p className="text-center text-xs text-slate-500">
                Add a step from the left, or tap + on a connector.
              </p>
            ) : null}
          </div>
        </div>

        {/* Right inspector */}
        <aside className="hidden w-72 shrink-0 flex-col border-l border-slate-200 bg-white xl:flex">
          {selectedStep && selectedNode && SelectedIcon && selectedAccent ? (
            <>
              <div className="shrink-0 border-b border-slate-100 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                        selectedAccent.icon,
                      )}
                    >
                      <SelectedIcon size={13} stroke={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-900">
                        {selectedNode.label}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {CATEGORY_LABEL[selectedNode.category]}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeSelected}
                    className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove step"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-slate-500">{selectedNode.description}</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                <ConfigForm
                  compact
                  schema={selectedNode.configSchema}
                  value={selectedStep.config}
                  onChange={(config) => updateStep(selectedIndex, { ...selectedStep, config })}
                />
                <p className="mt-4 text-[10px] text-slate-400">
                  Outputs: {selectedNode.outputColumns.join(', ') || '—'}
                </p>
              </div>
            </>
          ) : (
            <div className="px-3 py-3">
              <h2 className="text-[13px] font-semibold text-slate-900">Flow</h2>
              <div className="mt-2 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                  <IconCheck size={12} />
                  {dirty ? 'Unsaved edits' : 'Ready'}
                </p>
                <p className="text-xs text-slate-700">{steps.length} steps</p>
                <p className="text-[11px] leading-4 text-slate-500">
                  Select a node to edit its config. Save creates a new version.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Mobile steps strip */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-2 py-1.5 lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {nodes.map((node) => (
            <button
              key={node.type}
              type="button"
              onClick={() => addStep(node.type)}
              className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-600"
            >
              + {node.label}
            </button>
          ))}
        </div>
        {selectedStep && selectedNode ? (
          <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2">
            <p className="mb-1.5 text-xs font-medium text-slate-800">{selectedNode.label}</p>
            <ConfigForm
              compact
              schema={selectedNode.configSchema}
              value={selectedStep.config}
              onChange={(config) => updateStep(selectedIndex, { ...selectedStep, config })}
            />
          </div>
        ) : null}
      </div>

      {/* Run results */}
      {run ? (
        <section className="max-h-[30vh] shrink-0 overflow-y-auto border-t border-slate-200 bg-white px-3 py-2">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-900">
              Funnel — {run.status} · est. {run.estimatedCost} / actual {run.actualCost} credits
            </h2>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <input
                type="checkbox"
                checked={showDropped}
                onChange={(e) => setShowDropped(e.target.checked)}
                className="h-3 w-3 accent-brand-main"
              />
              Show dropped
            </label>
          </div>
          {run.error ? <p className="mb-1.5 text-xs text-red-600">{run.error}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-slate-700">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="py-1 pr-2 font-medium">Step</th>
                  <th className="py-1 pr-2 font-medium">In</th>
                  <th className="py-1 pr-2 font-medium">Out</th>
                  <th className="py-1 pr-2 font-medium">Drop</th>
                  <th className="py-1 font-medium">Est / act</th>
                </tr>
              </thead>
              <tbody>
                {run.funnel.map((s, i) => (
                  <tr
                    key={s.stepId}
                    className={cn(
                      'cursor-pointer border-b border-slate-50',
                      i === selectedIndex && 'bg-blue-50',
                    )}
                    onClick={() => setSelected(i)}
                  >
                    <td className="py-1 pr-2">{s.stepId}</td>
                    <td className="py-1 pr-2">{s.rowsIn}</td>
                    <td className="py-1 pr-2">{s.rowsOut}</td>
                    <td className="py-1 pr-2">{s.droppedCount}</td>
                    <td className="py-1">
                      {s.estimatedCost}/{s.actualCost}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {columns.length ? (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-[11px] text-slate-700">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    {columns.map((c) => (
                      <th key={c} className="py-1 pr-2 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {outputRows.slice(0, 40).map((row, i) => (
                    <tr
                      key={i}
                      className={cn('border-b border-slate-50', row.dropped_reason && 'text-slate-400')}
                    >
                      {columns.map((c) => (
                        <td key={c} className="max-w-40 truncate py-1 pr-2">
                          {row[c] == null ? '' : String(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Versions drawer */}
      {showHistory ? (
        <div className="absolute inset-0 z-20 flex justify-end bg-slate-900/30 p-3 backdrop-blur-[1px]">
          <div className="flex h-full w-full max-w-xs flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2.5">
              <h2 className="text-sm font-semibold text-slate-900">Versions</h2>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <IconX size={14} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
              {versions.map((v) => (
                <div
                  key={`${v.version}-${v.myRecipeId ?? ''}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-2.5 py-2 text-xs"
                >
                  <span className="text-slate-700">
                    v{v.version} · {v.steps.length} steps
                    {v.version === recipe.version ? ' · current' : ''}
                  </span>
                  {v.version !== recipe.version ? (
                    <button
                      type="button"
                      className="font-medium text-brand-main hover:underline"
                      onClick={() => void onRestore(v.version)}
                    >
                      Restore
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
