'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconLoader2, IconUpload } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../../../lib/api';
import { LeadList } from '../../../../components/leads/types';

type ImportRow = {
  company: { name?: string; domain?: string };
  contact: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    phone?: string;
    linkedinUrl?: string;
  };
  notes?: string;
  tags?: string[];
};

type CsvParseResult = { data?: Array<Record<string, string>> };
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

const columnAliases: Record<string, string[]> = {
  email: ['email', 'work email', 'business email'],
  firstName: ['first name', 'firstname', 'first'],
  lastName: ['last name', 'lastname', 'last'],
  company: ['company', 'company name', 'organization', 'account'],
  domain: ['domain', 'website', 'company website'],
  role: ['role', 'title', 'job title', 'position'],
  phone: ['phone', 'mobile', 'phone number'],
  linkedinUrl: ['linkedin', 'linkedin url', 'profile'],
  notes: ['notes', 'note'],
};

function pick(row: Record<string, string>, key: string) {
  const headers = columnAliases[key] ?? [key];
  for (const header of headers) {
    const found = Object.keys(row).find((item) => item.trim().toLowerCase() === header);
    if (found && row[found]?.trim()) return row[found].trim();
  }
  return undefined;
}

function normalizeRows(rows: Array<Record<string, string>>): ImportRow[] {
  return rows
    .map((row) => ({
      company: { name: pick(row, 'company'), domain: pick(row, 'domain') },
      contact: {
        firstName: pick(row, 'firstName'),
        lastName: pick(row, 'lastName'),
        email: pick(row, 'email'),
        role: pick(row, 'role'),
        phone: pick(row, 'phone'),
        linkedinUrl: pick(row, 'linkedinUrl'),
      },
      notes: pick(row, 'notes'),
      tags: ['csv'],
    }))
    .filter((row) => row.contact.email || row.company.name || row.company.domain);
}

export default function LeadImportPage() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [listId, setListId] = useState('');
  const [importing, setImporting] = useState(false);

  async function fetchLists() {
    try {
      const res = await api.get('/api/lists');
      setLists(res.data.data ?? []);
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLists();
  }, []);

  const parseFile = async (file: File) => {
    const Papa = await import('papaparse');
    const parser = (Papa.default ?? Papa) as PapaParser;
    parser.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = normalizeRows(result.data ?? []);
        setRows(parsed);
        toast.success(`Parsed ${parsed.length} usable rows.`);
      },
      error: () => toast.error('Could not parse CSV file.'),
    });
  };

  const uploadRows = async () => {
    if (rows.length === 0) {
      toast.error('Choose a CSV file first.');
      return;
    }
    try {
      setImporting(true);
      const res = await api.post('/api/leads/upload', { rows, listId: listId || undefined });
      toast.success(`Imported ${res.data.data?.created ?? 0} leads.`);
      setRows([]);
    } catch (err) {
      toast.error(errorMessage(err, 'Import failed.'));
    } finally {
      setImporting(false);
    }
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
            Upload a CSV with email, first name, last name, company, domain, role, phone, LinkedIn, and notes. Headers are matched flexibly.
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:bg-white">
            <IconUpload size={32} className="text-emerald-600" />
            <span className="mt-3 text-sm font-black text-slate-900">Drop or choose a CSV</span>
            <span className="mt-1 text-xs text-slate-500">Client-side preview before import</span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void parseFile(file);
            }} />
          </label>

          <div className="mt-4 space-y-2">
            <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Attach to list</label>
            <select value={listId} onChange={(event) => setListId(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
              <option value="">No list</option>
              {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
            </select>
          </div>

          <button onClick={uploadRows} disabled={importing || rows.length === 0} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black text-white disabled:opacity-40">
            {importing && <IconLoader2 size={16} className="animate-spin" />}
            Import {rows.length || ''} leads
          </button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <h2 className="text-sm font-black text-slate-950">Preview</h2>
            <p className="text-xs text-slate-500">First 25 normalized rows.</p>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Domain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 25).map((row, index) => (
                  <tr key={index}>
                    <td className="p-3 font-bold text-slate-800">{row.contact.firstName} {row.contact.lastName}</td>
                    <td className="p-3 text-slate-600">{row.contact.email}</td>
                    <td className="p-3 text-slate-600">{row.company.name}</td>
                    <td className="p-3 text-slate-600">{row.contact.role}</td>
                    <td className="p-3 text-slate-600">{row.company.domain}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="p-12 text-center text-sm text-slate-500">No CSV parsed yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
