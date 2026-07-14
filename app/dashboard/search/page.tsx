'use client';

import React, { Suspense } from 'react';
import SearchPageInner from './search-inner';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SearchPageInner />
    </Suspense>
  );
}
