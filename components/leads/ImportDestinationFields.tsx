'use client';

import React from 'react';
import type { LeadCategory, LeadList } from './types';

type ImportDestinationFieldsProps = {
  lists: LeadList[];
  categories: LeadCategory[];
  listId: string;
  categoryId: string;
  tags: string;
  onListIdChange: (value: string) => void;
  onCategoryIdChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  compact?: boolean;
};

/**
 * Shared destination controls for CSV import + Apollo/Apify sync mapping steps.
 */
export function ImportDestinationFields({
  lists,
  categories,
  listId,
  categoryId,
  tags,
  onListIdChange,
  onCategoryIdChange,
  onTagsChange,
  compact = false,
}: ImportDestinationFieldsProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="mb-3">
        <h3 className="text-sm font-black text-slate-950">Import destination</h3>
        <p className="mt-1 text-xs text-slate-500">
          Optionally attach imported leads to a list, category, and tags.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            List
          </label>
          <select
            value={listId}
            onChange={(e) => onListIdChange(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-300"
          >
            <option value="">No list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => onCategoryIdChange(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-300"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Tags
          </label>
          <input
            value={tags}
            onChange={(e) => onTagsChange(e.target.value)}
            placeholder="saas, india, outbound"
            className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-300"
          />
          <p className="mt-1 text-[10px] text-slate-400">Comma-separated</p>
        </div>
      </div>
    </div>
  );
}

export function parseTagInput(tags: string): string[] {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}
