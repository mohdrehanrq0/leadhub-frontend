'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
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
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState<Array<Record<string, string>>>([]);
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [confidence, setConfidence] = useState<ReturnType<typeof detectFieldMapping>['confidence']>({});
  const [history, setHistory] = useState<ImportHistoryRow[]>([]);
  const [reuploadPrompt, setReuploadPrompt] = useState<ImportHistoryRow | null>(null);

  const mappedRows = useMemo(() => {
    return rawRows
      .map((row) => applyFieldMapping(row, mapping))
      .filter(isUsableMappedLead)
      .map((row) => ({ ...row, tags: ['csv'] as string[] }));
  }, [rawRows, mapping]);

  const readiness = useMemo(() => summarizeReadiness(mappedRows), [mappedRows]);

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
  }, []);

  const parseFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Please upload a .csv file.');
      return;
    }

    setParsing(true);
    setFileName(file.name);

    try {
      // Prefer saved mapping from a prior upload of the same filename
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

          if (rows.length === 0 || fields.length === 0) {
            toast.error('This CSV looks empty. Check the file and try again.');
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
        },
        error: () => {
          setParsing(false);
          toast.error('Could not read that CSV.');
        },
      });
    } catch {
      setParsing(false);
      toast.error('Could not read that CSV.');
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
    if (mappedRows.length === 0) {
      toast.error('Map at least company name so we can import rows.');
      return;
    }
    try {
      setImporting(true);
      const parsedTags = parseTagInput(tags);
      const res = await api.post(
        '/api/leads/upload',
        {
          rows: mappedRows,
          listId: listId || undefined,
          categoryId: categoryId || undefined,
          tags: parsedTags.length > 0 ? parsedTags : undefined,
          fileName: fileName || 'untitled.csv',
          fieldMapping: mapping,
          sourceFields,
          confirmReupload,
        },
        {
          // 409 is an expected "already uploaded" prompt, not a hard failure
          validateStatus: (status) => (status >= 200 && status < 300) || status === 409,
        },
      );

      if (res.status === 409 || res.data?.needsConfirmation) {
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
      toast.success(
        data?.summary ||
          `Imported ${data?.created ?? 0} · duplicates ${data?.duplicates ?? 0} · rejected ${data?.rejected ?? 0}`,
      );
      router.push('/dashboard/leads');
    } catch (err) {
      toast.error(errorMessage(err, 'Import failed.'));
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setRawRows([]);
    setSourceFields([]);
    setMapping({});
    setConfidence({});
    setFileName('');
    setReuploadPrompt(null);
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

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32%),linear-gradient(135deg,#ffffff,#f8fafc)] p-6 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
          <IconUpload size={14} />
          Import
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Import CSV</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Upload your file, confirm the columns, then import. Duplicates are skipped automatically.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <StepPill index={1} label="Upload" active={step === 'upload'} done={step === 'mapping'} />
          <span className="h-px w-6 bg-slate-200" aria-hidden />
          <StepPill index={2} label="Map & import" active={step === 'mapping'} done={false} />
        </div>
      </section>

      {step === 'upload' && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
                {parsing ? 'Reading CSV…' : dragging ? 'Drop to upload' : 'Drop CSV here, or click to browse'}
              </span>
              <span className="mt-2 max-w-sm text-sm leading-5 text-slate-500">
                Needs a company column. Location helps enrichment. Names are optional.
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
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
          />

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
            <div className="text-sm text-slate-600">
              <span className="font-black text-slate-950">{mappedRows.length.toLocaleString()}</span>
              {' '}ready to import
              {readiness.notReady > 0 && (
                <span className="ml-2 text-slate-400">
                  · {readiness.notReady} missing company/location
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
                disabled={importing || mappedRows.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {importing && <IconLoader2 size={16} className="animate-spin" />}
                Import {mappedRows.length.toLocaleString()} leads
              </button>
            </div>
          </div>
        </div>
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
