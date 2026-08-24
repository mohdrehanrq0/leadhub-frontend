'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '../../../../components/layout/PageHeader';
import { btnPrimary } from '../../../../components/ui/styles';
import { IconArrowLeft, IconPlus } from '@tabler/icons-react';

interface SignupCategory {
  id: string;
  name: string;
  description?: string;
  rules: Record<string, unknown>;
  color: string;
  createdAt: string;
}

export default function SignupCategoriesPage() {
  const [categories, setCategories] = useState<SignupCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Mock data for now - implement backend endpoint later
      setCategories([
        {
          id: '1',
          name: 'Hot Leads',
          description: 'High ICP & intent scores',
          rules: { icpMin: 70, intentMin: 60 },
          color: '#ef4444',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Warm Leads',
          description: 'Moderate ICP or intent scores',
          rules: { icpMin: 50, intentMin: 40 },
          color: '#f59e0b',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'Cold Leads',
          description: 'Lower scores or missing data',
          rules: {},
          color: '#3b82f6',
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-40 skeleton max-w-4xl mx-auto" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-text">
      {/* Back Button */}
      <Link
        href="/dashboard/signups"
        className="inline-flex items-center space-x-2 text-sm text-text-200 hover:text-primary transition-colors"
      >
        <IconArrowLeft size={16} />
        <span>Back to Sign-ups</span>
      </Link>

      <PageHeader
        eyebrow="Sign-ups"
        title="Categories"
        description="Auto-categorization rules for signup leads."
        actions={
          <button type="button" onClick={() => toast.info('Custom category creation coming soon')} className={btnPrimary}>
            <IconPlus size={16} /> Add category
          </button>
        }
      />

      {/* Categories List */}
      <div className="space-y-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-card p-6 border border-border rounded-xl shadow-input hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <h3 className="text-lg font-semibold text-text-100">{category.name}</h3>
                </div>
                {category.description && (
                  <p className="text-sm text-text-200">{category.description}</p>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-200">Categorization Rules</label>
                  <div className="text-xs text-text-300 font-mono bg-bg-200 p-2 rounded">
                    {Object.keys(category.rules).length > 0 ? (
                      <pre>{JSON.stringify(category.rules, null, 2)}</pre>
                    ) : (
                      <span>Default category (no specific rules)</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => toast.info('Edit category coming soon')}
                className="px-3 py-1.5 bg-bg-200 text-text-100 rounded-lg text-xs font-medium hover:bg-bg-300 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-blue-500 mb-2">Auto-Categorization</h4>
        <p className="text-xs text-text-300">
          Signup leads are automatically categorized based on their ICP and intent scores after enrichment completes.
          Default rules: HOT (ICP ≥ 70 AND intent ≥ 60), WARM (ICP ≥ 50 OR intent ≥ 40), COLD (everything else).
        </p>
      </div>
    </div>
  );
}
