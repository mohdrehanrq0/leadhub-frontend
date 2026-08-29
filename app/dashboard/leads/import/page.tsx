'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconArrowLeft,
  IconCheck,
  IconDownload,
  IconFileSpreadsheet,
  IconHistory,
  IconLoader2,
  IconUpload,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../../../lib/api';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { LeadCategory, LeadList } from '../../../../components/leads/types';
import { FieldMappingPanel } from '../../../../components/leads/FieldMappingPanel';
import {
  ImportDestinationFields,
  parseTagInput,
} from '../../../../components/leads/ImportDestinationFields';
import {
  applyFieldMapping,
  detectFieldMapping,
  downloadCsvTemplate,
  isUsableMappedLead,
  mappingHasAnchor,
  summarizeReadiness,
  type FieldMapping,
} from '../../../../lib/lead-field-mapping';

type CsvParseResult = { data?: Array<Record<string, string>>; meta?: { fields?: string[] } };
type PapaParser = {
  parse: (
    file: File,
    config: {
      header: boolean;
      skipEmptyLines: boolean;
      complete: (result: CsvParseResult) => void;
      error: () => void;
    },
  ) => void;
};

type ImportHistoryRow = {
  id: string;
  fileName: string;
  totalRows: number;
  importedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  summary: string;
  fieldMapping?: FieldMapping;
  sourceFields?: string[];
  createdAt: string;
};

type ImportResult = {
  created: number;
  duplicates: number;
  rejected: number;
  summary: string;
};

type ImportStep = 'upload' | 'mapping' | 'importing' | 'complete';

const IMPORT_PHASES = [
  { key: 'upload', label: 'Uploading file…', min: 8 },
  { key: 'process', label: 'Creating leads…', min: 35 },
  { key: 'dedupe', label: 'Skipping duplicates…', min: 70 },
  { key: 'finalize', label: 'Finalizing import…', min: 90 },
] as const;

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string }; status?: number } }).response;
    if (response?.status === 408 || response?.status === 504) {
      return 'Import timed out. Try a smaller CSV (max 2,000 rows).';
    }
    return response?.data?.message ?? fallback;
  }
  if (typeof err === 'object' && err && 'code' in err) {
    const code = (err as { code?: string }).code;
    if (code === 'ECONNABORTED') return 'Import timed out. Try a smaller CSV.';
  }
  return fallback;
}

function StepPill({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-800'
          : done
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-slate-200 bg-white text-slate-400'
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
          active
            ? 'bg-blue-600 text-white'
            : done
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-400'
        }`}
      >
        {done && !active ? <IconCheck size={12} stroke={3} /> : index}
      </span>
      {label}
    </div>
  );
}

export default function LeadImportPage() {
  const router = useRouter();
  const [lists, setLists] = useState<LeadList[]>([]);
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [listId, setListId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [enrichmentAgentId, setEnrichmentAgentId] = useState('');
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<Array<Record<string, string>>>([]);
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [confidence, setConfidence] = useState<ReturnType<typeof detectFieldMapping>['confidence']>({});
  const [history, setHistory] = useState<ImportHistoryRow[]>([]);
  const [reuploadPrompt, setReuploadPrompt] = useState<ImportHistoryRow | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importPhaseLabel, setImportPhaseLabel] = useState<string>(IMPORT_PHASES[0].label);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const parseSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Summarize before filtering, so the footer can report what was dropped
  // rather than silently shrinking the import.
  const allMappedRows = useMemo(
    () => rawRows.map((row) => applyFieldMapping(row, mapping)),
    [rawRows, mapping],
  );

  const mappedRows = useMemo(
    () =>
      allMappedRows
        .filter(isUsableMappedLead)
        .map((row) => ({ ...row, tags: ['csv'] as string[] })),
    [allMappedRows],
  );

  const readiness = useMemo(() => summarizeReadiness(allMappedRows), [allMappedRows]);
  const hasAnchor = useMemo(() => mappingHasAnchor(mapping), [mapping]);

  const clearProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const startProgressSimulation = (rowCount: number) => {
    clearProgressTimer();
    setImportProgress(5);
    setImportPhaseLabel(IMPORT_PHASES[0].label);
    // Larger files tick slower so the bar doesn't look "done" before the API returns
    const tickMs = Math.min(900, Math.max(220, Math.floor(120_000 / Math.max(rowCount, 50))));
    progressTimerRef.current = setInterval(() => {
      setImportProgress((prev) => {
        const next = prev >= 92 ? prev : prev + (prev < 40 ? 4 : prev < 75 ? 2 : 1);
        const phase = [...IMPORT_PHASES].reverse().find((p) => next >= p.min) ?? IMPORT_PHASES[0];
        setImportPhaseLabel(phase.label);
        return next;
      });
    }, tickMs);
  };

  async function fetchDestinations() {
    try {
      const [listsRes, categoriesRes, historyRes] = await Promise.all([
        api.get('/api/lists'),
        api.get('/api/categories'),
        api.get('/api/leads/imports'),
      ]);
      setLists(listsRes.data.data ?? []);
      setCategories(categoriesRes.data.data ?? []);
      setHistory(historyRes.data.data ?? []);
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDestinations();
    return () => {
      clearProgressTimer();
      if (parseSafetyRef.current) clearTimeout(parseSafetyRef.current);
    };
  }, []);

  const parseFile = useCallback(async (file: File) => {
    const lower = file.name.toLowerCase();
    const isCsv = lower.endsWith('.csv') || file.type === 'text/csv';
    const isExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls');
    if (!isCsv && !isExcel) {
      toast.error('Please upload a .csv or .xlsx file.');
      return;
    }

    setParsing(true);
    setFileName(file.name);
    setImportResult(null);

    if (parseSafetyRef.current) clearTimeout(parseSafetyRef.current);
    parseSafetyRef.current = setTimeout(() => {
      setParsing((still) => {
        if (still) toast.error('File parsing is taking too long. Try a smaller file.');
        return false;
      });
    }, 45_000);

    try {
      let savedMapping: FieldMapping | null = null;
      try {
        const prior = await api.get('/api/leads/imports/by-filename', {
          params: { fileName: file.name },
        });
        if (prior.data.data?.fieldMapping) {
          savedMapping = prior.data.data.fieldMapping as FieldMapping;
        }
      } catch {
        // ignore — fall back to auto-detect
      }

      const applyParsed = (rows: Array<Record<string, string>>, fields: string[]) => {
        if (parseSafetyRef.current) clearTimeout(parseSafetyRef.current);
        if (rows.length === 0 || fields.length === 0) {
          toast.error('This file looks empty. Check the file and try again.');
          setParsing(false);
          return;
        }

        const detected = detectFieldMapping(fields);
        const usableSaved =
          savedMapping &&
          Object.values(savedMapping).some((col) => fields.includes(col))
            ? savedMapping
            : null;

        setRawRows(rows);
        setSourceFields(fields);
        setMapping(usableSaved ?? detected.mapping);
        setConfidence(usableSaved ? {} : detected.confidence);
        setStep('mapping');
        setParsing(false);
        toast.success(
          usableSaved
            ? `Loaded ${rows.length.toLocaleString()} rows — reused mapping from last upload of this file`
            : `Loaded ${rows.length.toLocaleString()} rows from ${file.name}`,
        );
      };

      if (isExcel) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
        const base64 = btoa(binary);
        const res = await api.post('/api/leads/parse-spreadsheet', {
          fileName: file.name,
          base64,
        });
        const fields = (res.data.data?.fields ?? []) as string[];
        const rows = (res.data.data?.rows ?? []) as Array<Record<string, string>>;
        applyParsed(rows, fields);
        return;
      }

      const Papa = await import('papaparse');
      const parser = (Papa.default ?? Papa) as PapaParser;
      parser.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const rows = result.data ?? [];
          const fields =
            result.meta?.fields?.filter(Boolean) ??
            Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
          applyParsed(rows, fields);
        },
        error: () => {
          if (parseSafetyRef.current) clearTimeout(parseSafetyRef.current);
          setParsing(false);
          toast.error('Could not read that CSV.');
        },
      });
    } catch {
      if (parseSafetyRef.current) clearTimeout(parseSafetyRef.current);
      setParsing(false);
      toast.error('Could not read that file.');
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) void parseFile(file);
    },
    [parseFile],
  );

  const uploadRows = async (confirmReupload = false) => {
    if (!hasAnchor) {
      toast.error('Map a company website, name, or LinkedIn column before importing.');
      return;
    }
    if (mappedRows.length === 0) {
      toast.error('No rows have a company to identify. Check your column mapping.');
      return;
    }
    try {
      setImporting(true);
      setStep('importing');
      setImportResult(null);

      const parsedTags = parseTagInput(tags);
      const CHUNK_SIZE = 250;
      const totalRows = mappedRows.length;
      const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);

      let accumulatedCreated = 0;
      let accumulatedDuplicates = 0;
      let accumulatedRejected = 0;
      let currentImportId: string | undefined = undefined;

      setImportProgress(5);

      for (let i = 0; i < totalChunks; i++) {
        const chunkRows = mappedRows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const isFirstChunk = i === 0;

        const progressPercent = Math.min(95, Math.round((i / totalChunks) * 100));
        setImportProgress(Math.max(5, progressPercent));
        setImportPhaseLabel(
          totalChunks === 1
            ? 'Creating leads…'
            : `Processing chunk ${i + 1} of ${totalChunks} (${progressPercent}%)…`,
        );

        const res: any = await api.post(
          '/api/leads/upload',
          {
            rows: chunkRows,
            totalRows,
            listId: listId || undefined,
            categoryId: categoryId || undefined,
            tags: parsedTags.length > 0 ? parsedTags : undefined,
            fileName: fileName || 'untitled.csv',
            fieldMapping: mapping,
            sourceFields,
            confirmReupload: confirmReupload || !isFirstChunk,
            importId: currentImportId,
            ...(enrichmentAgentId ? { enrichmentAgentId } : {}),
          },
          {
            timeout: 180_000,
            validateStatus: (status) => (status >= 200 && status < 300) || status === 409,
          },
        );

        if (res.status === 409 || res.data?.needsConfirmation) {
          clearProgressTimer();
          setImportProgress(0);
          setStep('mapping');
          const prev = res.data?.data?.previousImport as ImportHistoryRow | undefined;
          setReuploadPrompt(
            prev ?? {
              id: '',
              fileName,
              totalRows: mappedRows.length,
              importedCount: 0,
              duplicateCount: 0,
              rejectedCount: 0,
              summary: res.data?.message ?? 'This file was uploaded before.',
              createdAt: new Date().toISOString(),
            },
          );
          return;
        }

        const data = res.data.data;
        if (data?.importId) {
          currentImportId = data.importId;
        }

        accumulatedCreated += data?.created ?? 0;
        accumulatedDuplicates += data?.duplicates ?? 0;
        accumulatedRejected += data?.rejected ?? 0;
      }

      clearProgressTimer();
      setImportProgress(100);
      setImportPhaseLabel('Import complete');

      const result: ImportResult = {
        created: accumulatedCreated,
        duplicates: accumulatedDuplicates,
        rejected: accumulatedRejected,
        summary: `${fileName || 'File'}: imported ${accumulatedCreated}, duplicates ${accumulatedDuplicates}, rejected ${accumulatedRejected} (of ${totalRows} rows)`,
      };

      setImportResult(result);
      setStep('complete');
      toast.success(result.summary);
      void fetchDestinations();
    } catch (err) {
      clearProgressTimer();
      setImportProgress(0);
      setStep('mapping');
      toast.error(errorMessage(err, 'Import failed.'));
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    clearProgressTimer();
    setRawRows([]);
    setSourceFields([]);
    setMapping({});
    setConfidence({});
    setFileName('');
    setReuploadPrompt(null);
    setImportResult(null);
    setImportProgress(0);
    setImportPhaseLabel(IMPORT_PHASES[0].label);
    setStep('upload');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-fade-in text-text">
      <Link
        href="/dashboard/leads"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900"
      >
        <IconArrowLeft size={14} /> Back to Leads
      </Link>

      <PageHeader
        eyebrow="Import"
        title="Import CSV"
        description="Upload your file, confirm the columns, then import. Duplicates are skipped automatically."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
          <StepPill
            index={1}
            label="Upload"
            active={step === 'upload'}
            done={step !== 'upload'}
          />
          <span className="h-px w-6 bg-slate-200" aria-hidden />
          <StepPill
            index={2}
            label="Map & import"
            active={step === 'mapping' || step === 'importing'}
            done={step === 'complete'}
          />
          <span className="h-px w-6 bg-slate-200" aria-hidden />
          <StepPill index={3} label="Complete" active={step === 'complete'} done={step === 'complete'} />
      </div>

      {step === 'upload' && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
                dragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-slate-200 bg-slate-50/80 hover:border-blue-300 hover:bg-blue-50/40'
              }`}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                  dragging ? 'bg-blue-100 text-blue-700' : 'bg-white text-blue-600 shadow-sm'
                }`}
              >
                {parsing ? (
                  <IconLoader2 size={28} className="animate-spin" />
                ) : (
                  <IconUpload size={28} />
                )}
              </div>
              <span className="mt-4 text-base font-black text-slate-950">
                {parsing ? 'Reading file…' : dragging ? 'Drop to upload' : 'Drop CSV or Excel here, or click to browse'}
              </span>
              <span className="mt-2 max-w-sm text-sm leading-5 text-slate-500">
                Needs a company column. Location helps enrichment. Names are optional.
              </span>
              {parsing && (
                <div className="mt-5 w-full max-w-xs">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-500" />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-slate-500">Parsing columns and rows…</p>
                </div>
              )}
              <input
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                disabled={parsing}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void parseFile(file);
                  event.target.value = '';
                }}
              />
            </label>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">Accepts standard CSV. Max 2,000 rows per upload.</p>
              <button
                type="button"
                onClick={() => {
                  downloadCsvTemplate();
                  toast.success('Template downloaded.');
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <IconDownload size={14} />
                Download template
              </button>
            </div>
          </section>

          {history.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                <IconHistory size={16} className="text-slate-400" />
                <h2 className="text-sm font-black text-slate-950">Upload history</h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {history.slice(0, 8).map((row) => (
                  <li key={row.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{row.fileName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{row.summary}</p>
                      </div>
                      <p className="shrink-0 text-[11px] font-medium text-slate-400">
                        {new Date(row.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                        {row.importedCount} imported
                      </span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                        {row.duplicateCount} duplicates
                      </span>
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                        {row.rejectedCount} rejected
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {step === 'mapping' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <IconFileSpreadsheet size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{fileName || 'CSV file'}</p>
                <p className="text-xs text-slate-500">
                  {rawRows.length.toLocaleString()} rows · {sourceFields.length} columns
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetImport}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Choose another file
            </button>
          </div>

          <FieldMappingPanel
            sourceLabel="CSV"
            sourceFields={sourceFields}
            mapping={mapping}
            confidence={confidence}
            onMappingChange={setMapping}
            previewRows={rawRows}
            mappedPreviewRows={mappedRows}
            sampleSize={5}
          />

          <ImportDestinationFields
            lists={lists}
            categories={categories}
            listId={listId}
            categoryId={categoryId}
            tags={tags}
            onListIdChange={setListId}
            onCategoryIdChange={setCategoryId}
            onTagsChange={setTags}
            enrichmentAgentId={enrichmentAgentId}
            onEnrichmentAgentIdChange={setEnrichmentAgentId}
          />

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
            <div className="text-sm text-slate-600">
              <span className="font-black text-slate-950">{mappedRows.length.toLocaleString()}</span>
              {' '}ready to import
              {readiness.needsDiscovery > 0 && (
                <span className="ml-2 text-amber-600">
                  · {readiness.needsDiscovery.toLocaleString()} without a website
                </span>
              )}
              {readiness.rejected > 0 && (
                <span className="ml-2 text-rose-500">
                  · {readiness.rejected.toLocaleString()} skipped, no company
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetImport}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Start over
              </button>
              <button
                type="button"
                onClick={() => void uploadRows(false)}
                disabled={importing || mappedRows.length === 0 || !hasAnchor}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {importing && <IconLoader2 size={16} className="animate-spin" />}
                Import {mappedRows.length.toLocaleString()} leads
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <section className="rounded-2xl border border-blue-100 bg-white p-8 shadow-sm">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <IconLoader2 size={28} className="animate-spin" />
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-950">Importing your leads</h2>
            <p className="mt-2 text-sm text-slate-600">
              {importPhaseLabel}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {fileName || 'CSV'} · {mappedRows.length.toLocaleString()} rows
            </p>

            <div className="mt-6 w-full">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Progress</span>
                <span>{Math.min(99, Math.round(importProgress))}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(99, importProgress)}%` }}
                />
              </div>
            </div>

            <ul className="mt-6 w-full space-y-2 text-left">
              {IMPORT_PHASES.map((phase) => {
                const reached = importProgress >= phase.min;
                const current = importPhaseLabel === phase.label;
                return (
                  <li
                    key={phase.key}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                      current
                        ? 'bg-blue-50 font-bold text-blue-800'
                        : reached
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                    }`}
                  >
                    {reached && !current ? (
                      <IconCheck size={16} className="text-emerald-600" />
                    ) : current ? (
                      <IconLoader2 size={16} className="animate-spin" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-slate-200" />
                    )}
                    {phase.label.replace(/…$/, '')}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {step === 'complete' && importResult && (
        <section className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-sm">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <IconCheck size={28} stroke={2.5} />
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-950">Upload complete</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{importResult.summary}</p>
            <p className="mt-1 text-xs text-slate-400">{fileName || 'CSV file'}</p>

            <div className="mt-6 grid w-full grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3">
                <p className="text-2xl font-black text-emerald-800">{importResult.created}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Imported</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3">
                <p className="text-2xl font-black text-amber-800">{importResult.duplicates}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">Duplicates</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-3">
                <p className="text-2xl font-black text-rose-800">{importResult.rejected}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-700">Rejected</p>
              </div>
            </div>

            <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push('/dashboard/leads')}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
              >
                View leads
              </button>
              <button
                type="button"
                onClick={resetImport}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Import another file
              </button>
            </div>
          </div>
        </section>
      )}

      {reuploadPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-950">File already uploaded</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              <span className="font-bold text-slate-900">{reuploadPrompt.fileName}</span> was uploaded
              before. Re-upload will skip duplicates and only add new leads.
            </p>
            {reuploadPrompt.summary && (
              <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {reuploadPrompt.summary}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReuploadPrompt(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={() => {
                  setReuploadPrompt(null);
                  void uploadRows(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {importing && <IconLoader2 size={16} className="animate-spin" />}
                Re-upload anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
