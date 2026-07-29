'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { IconX, IconLink, IconTrash, IconPlus, IconLoader2 } from '@tabler/icons-react';

interface ResourceLink {
  id: string;
  url: string;
  shortUrl?: string;
  title: string;
  summary: string;
  addedAt: string;
}

interface ResourceLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResourceLinksModal({ isOpen, onClose }: ResourceLinksModalProps) {
  const [links, setLinks] = useState<ResourceLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newShortUrl, setNewShortUrl] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) fetchLinks();
  }, [isOpen]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/onboarding/resource-links');
      setLinks(res.data.data ?? []);
    } catch {
      toast.error('Failed to load resource links');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newUrl.trim()) return;

    try {
      new URL(newUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }
    if (newShortUrl.trim()) {
      try {
        new URL(newShortUrl);
      } catch {
        toast.error('Short URL must be a valid URL');
        return;
      }
    }

    try {
      setAdding(true);
      const res = await api.post('/api/onboarding/resource-links', {
        url: newUrl.trim(),
        shortUrl: newShortUrl.trim() || undefined,
      });
      setLinks((prev) => [...prev, res.data.data]);
      setNewUrl('');
      setNewShortUrl('');
      toast.success('Link added and summarized');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add link');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.delete(`/api/onboarding/resource-links/${id}`);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success('Link removed');
    } catch {
      toast.error('Failed to remove link');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-text-100 flex items-center space-x-2">
              <IconLink size={22} className="text-primary" />
              <span>Resource Links</span>
            </h2>
            <p className="text-sm text-text-300 mt-1">
              Add links to guides, docs, or pages. We&apos;ll fetch and summarize them so the AI can reference real URLs in emails.
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-bg-200 rounded-lg transition-colors">
            <IconX size={20} className="text-text-300" />
          </button>
        </div>

        {/* Add new link */}
        <div className="p-6 border-b border-border">
          <div className="space-y-2">
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://yoursite.com/getting-started"
              className="flex-1 bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAdd();
              }}
            />
            <input
              type="url"
              value={newShortUrl}
              onChange={(e) => setNewShortUrl(e.target.value)}
              placeholder="Optional: LeadSniper short URL (https://...)" 
              className="w-full bg-bg-200 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors text-text-100"
            />
            <div className="flex justify-end">
              <button
                onClick={() => void handleAdd()}
                disabled={adding || !newUrl.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {adding ? (
                  <>
                    <IconLoader2 size={16} className="animate-spin" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <IconPlus size={16} />
                    <span>Add Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-text-300 mt-2">
            We&apos;ll visit the URL, extract its content, and generate a title + summary. The AI will use these real links instead of placeholders.
          </p>
        </div>

        {/* Links list */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-40 skeleton" />
          ) : links.length === 0 ? (
            <div className="text-center py-12">
              <IconLink size={40} className="text-text-300 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-text-300">No resource links yet</p>
              <p className="text-xs text-text-300 mt-1">
                Add links to guides, documentation, or helpful pages that should be included in onboarding emails.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="bg-bg-200 border border-border rounded-lg p-4 group hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-text-100 truncate">{link.title}</h3>
                      <a
                        href={link.shortUrl || link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline truncate block mt-0.5"
                      >
                        {link.shortUrl || link.url}
                      </a>
                      {link.shortUrl ? (
                        <p className="text-[11px] text-text-300 mt-1 truncate">Source: {link.url}</p>
                      ) : null}
                      <p className="text-xs text-text-300 mt-2">{link.summary}</p>
                    </div>
                    <button
                      onClick={() => void handleRemove(link.id)}
                      className="p-1.5 rounded border border-transparent text-text-300 hover:text-red-500 hover:border-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove link"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-border bg-bg-200">
          <p className="text-xs text-text-300">
            These links are injected into the AI prompt as <code className="text-primary">{'{{resourceLinks}}'}</code>.
            The AI will reference them with real URLs — no more placeholder brackets.
          </p>
        </div>
      </div>
    </div>
  );
}
