'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconDownload, IconLoader2, IconUpload } from '@tabler/icons-react';
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

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function LeadImportPage() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [listId, setListId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [rawRows, setRawRows] = useState<Array<Record<string, string>>>([]);
  const [sourceFields, setSourceFields] = useState<string[]>([]);
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [confidence, setConfidence] = useState<ReturnType<typeof detectFieldMapping>['confidence']>({});

  const mappedRows = useMemo(() => {
    return rawRows
      .map((row) => applyFieldMapping(row, mapping))
      .filter(isUsableMappedLead)
      .map((row) => ({ ...row, tags: ['csv'] as string[] }));
  }, [rawRows, mapping]);

  const readiness = useMemo(() => summarizeReadiness(mappedRows), [mappedRows]);

  async function fetchDestinations() {
    try {
      const [listsRes, categoriesRes] = await Promise.all([
        api.get('/api/lists'),
        api.get('/api/categories'),
      ]);
      setLists(listsRes.data.data ?? []);
      setCategories(categoriesRes.data.data ?? []);
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDestinations();
  }, []);

  const parseFile = async (file: File) => {
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

        const detected = detectFieldMapping(fields);
        setRawRows(rows);
        setSourceFields(fields);
        setMapping(detected.mapping);
        setConfidence(detected.confidence);
        setStep('mapping');
        toast.success(`Detected ${fields.length} columns across ${rows.length} rows. Review field mapping.`);
      },
      error: () => toast.error('Could not parse CSV file.'),
    });
  };

  const uploadRows = async () => {
    if (mappedRows.length === 0) {
      toast.error('No usable rows after mapping. Adjust your field mapping.');
      return;
    }
    try {
      setImporting(true);
      const parsedTags = parseTagInput(tags);
      const res = await api.post('/api/leads/upload', {
        rows: mappedRows,
        listId: listId || undefined,
        categoryId: categoryId || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
      });
      toast.success(`Imported ${res.data.data?.created ?? 0} leads.`);
      setRawRows([]);
      setSourceFields([]);
      setMapping({});
      setStep('upload');
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
    setStep('upload');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href="/dashboard/leads" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
        <IconArrowLeft size={14} /> Back to Leads
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dcfce7,transparent_28%),linear-gradient(135deg,#fff,#f8fafc)] p-6 shadow-sm">
        <div className="max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">CSV Upload</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Bulk import leads into the CRM.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Upload a CSV, review auto-detected field mapping, choose list/category/tags, then import with enrichment readiness shown upfront.
          </p>
        </div>
      </section>

      {step === 'upload' && (
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:bg-white">
              <IconUpload size={32} className="text-emerald-600" />
              <span className="mt-3 text-sm font-black text-slate-900">Drop or choose a CSV</span>
              <span className="mt-1 text-xs text-slate-500">We will auto-detect column mapping next</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void parseFile(file);
                }}
              />
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-950">Supported columns</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Company, location, first/last name (optional), email, domain, role, phone, LinkedIn, and notes.
                </p>
                <p className="mt-4 text-xs font-bold text-slate-500">
                  Required for enrichment: company name + location. Person name is optional — the research agent finds founders and decision-makers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  downloadCsvTemplate();
                  toast.success('CSV template downloaded.');
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-100"
              >
                <IconDownload size={16} />
                Download CSV template
              </button>
            </div>
          </section>
        </div>
      )}

      {step === 'mapping' && (
        <div className="space-y-6">
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

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-600">
              <span className="font-black text-slate-950">{mappedRows.length}</span> usable rows after mapping.
              {readiness.notReady > 0 && (
                <span className="ml-2 text-rose-600">{readiness.notReady} rows are not enrichment-ready.</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetImport}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Start over
              </button>
              <button
                onClick={uploadRows}
                disabled={importing || mappedRows.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {importing && <IconLoader2 size={16} className="animate-spin" />}
                Import {mappedRows.length} leads
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
