'use client';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import api from '../../lib/api';
import CreatableSelect from '../common/CreatableSelect';
import type { LeadCategory, LeadList } from './types';
import { EnrichmentAgentPicker } from './EnrichmentAgentPicker';

type SelectOption = { id: string; name: string; color?: string };

type ImportDestinationFieldsProps = {
  lists: LeadList[];
  categories: LeadCategory[];
  listId: string;
  categoryId: string;
  tags: string;
  onListIdChange: (value: string) => void;
  onCategoryIdChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onListCreated?: (list: LeadList) => void;
  onCategoryCreated?: (category: LeadCategory) => void;
  enrichmentAgentId?: string;
  onEnrichmentAgentIdChange?: (id: string) => void;
  compact?: boolean;
};

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

/**
 * Shared destination controls for CSV import + Apollo/Apify sync mapping steps.
 * List / category / tags use LeadSniper-style creatable selectors (search + create).
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
  onListCreated,
  onCategoryCreated,
  enrichmentAgentId,
  onEnrichmentAgentIdChange,
  compact = false,
}: ImportDestinationFieldsProps) {
  const [creatingList, setCreatingList] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [extraListOptions, setExtraListOptions] = useState<SelectOption[]>([]);
  const [extraCategoryOptions, setExtraCategoryOptions] = useState<SelectOption[]>([]);
  const [extraTagOptions, setExtraTagOptions] = useState<SelectOption[]>([]);

  const listOptions: SelectOption[] = useMemo(() => {
    const byId = new Map<string, SelectOption>();
    for (const list of lists) byId.set(list.id, { id: list.id, name: list.name });
    for (const opt of extraListOptions) byId.set(opt.id, opt);
    return Array.from(byId.values());
  }, [lists, extraListOptions]);

  const categoryOptions: SelectOption[] = useMemo(() => {
    const byId = new Map<string, SelectOption>();
    for (const cat of categories) {
      byId.set(cat.id, { id: cat.id, name: cat.name, color: cat.color });
    }
    for (const opt of extraCategoryOptions) byId.set(opt.id, opt);
    return Array.from(byId.values());
  }, [categories, extraCategoryOptions]);

  const selectedTags = useMemo(
    () => parseTagInput(tags).map((tag) => ({ id: tag, name: tag })),
    [tags],
  );

  const tagOptions = useMemo(() => {
    const byId = new Map<string, SelectOption>();
    for (const opt of [...extraTagOptions, ...selectedTags]) {
      byId.set(opt.id.toLowerCase(), opt);
    }
    return Array.from(byId.values());
  }, [extraTagOptions, selectedTags]);

  const selectedList = useMemo(
    () => (listId ? listOptions.filter((item) => item.id === listId) : []),
    [listId, listOptions],
  );

  const selectedCategory = useMemo(
    () => (categoryId ? categoryOptions.filter((item) => item.id === categoryId) : []),
    [categoryId, categoryOptions],
  );

  const handleCreateList = async (name: string): Promise<SelectOption> => {
    setCreatingList(true);
    try {
      const res = await api.post('/api/lists', { name });
      const created = res.data.data as LeadList;
      const option = { id: created.id, name: created.name };
      setExtraListOptions((prev) =>
        prev.some((item) => item.id === created.id) ? prev : [...prev, option],
      );
      onListCreated?.(created);
      toast.success(`List "${created.name}" created`);
      return option;
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create list'));
      throw err;
    } finally {
      setCreatingList(false);
    }
  };

  const handleCreateCategory = async (name: string): Promise<SelectOption> => {
    setCreatingCategory(true);
    try {
      const res = await api.post('/api/categories', { name, color: '#3b82f6' });
      const created = res.data.data as LeadCategory;
      const option = { id: created.id, name: created.name, color: created.color };
      setExtraCategoryOptions((prev) =>
        prev.some((item) => item.id === created.id) ? prev : [...prev, option],
      );
      onCategoryCreated?.(created);
      toast.success(`Category "${created.name}" created`);
      return option;
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to create category'));
      throw err;
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreateTag = async (name: string): Promise<SelectOption> => {
    const option = { id: name, name };
    setExtraTagOptions((prev) =>
      prev.some((item) => item.id.toLowerCase() === name.toLowerCase()) ? prev : [...prev, option],
    );
    return option;
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      <div className="mb-3">
        <h3 className="text-sm font-black text-slate-950">Organize</h3>
        <p className="mt-1 text-xs text-slate-500">
          Optional — search or create a list, category, and tags.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            List
          </label>
          <CreatableSelect
            options={listOptions}
            value={selectedList}
            onChange={(selected) => onListIdChange(selected[0]?.id ?? '')}
            onCreateNew={handleCreateList}
            isMulti={false}
            isLoading={creatingList}
            placeholder="Select or create list"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Category
          </label>
          <CreatableSelect
            options={categoryOptions}
            value={selectedCategory}
            onChange={(selected) => onCategoryIdChange(selected[0]?.id ?? '')}
            onCreateNew={handleCreateCategory}
            isMulti={false}
            isLoading={creatingCategory}
            placeholder="Select or create category"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            Tags
          </label>
          <CreatableSelect
            options={tagOptions}
            value={selectedTags}
            onChange={(selected) => onTagsChange(selected.map((item) => item.name).join(', '))}
            onCreateNew={handleCreateTag}
            isMulti
            placeholder="Select or create tags"
          />
        </div>
      </div>
      {onEnrichmentAgentIdChange ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <EnrichmentAgentPicker
            value={enrichmentAgentId ?? ''}
            onChange={onEnrichmentAgentIdChange}
          />
        </div>
      ) : null}
    </div>
  );
}

export function parseTagInput(tags: string): string[] {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}
