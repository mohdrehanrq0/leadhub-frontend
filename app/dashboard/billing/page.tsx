'use client';

import { Suspense } from 'react';
import BillingPage from './billing-inner';

export default function BillingPageWrapper() {
  return (
    <Suspense fallback={<div className="h-40 max-w-4xl skeleton" />}>
      <BillingPage />
    </Suspense>
  );
}
