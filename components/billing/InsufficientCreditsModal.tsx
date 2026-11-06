'use client';

import Link from 'next/link';
import { IconAlertTriangle, IconCoin, IconX } from '@tabler/icons-react';

type Props = {
  open: boolean;
  onClose: () => void;
  required: number;
  balance: number;
  operation?: string;
};

export function InsufficientCreditsModal({ open, onClose, required, balance, operation }: Props) {
  if (!open) return null;

  const shortfall = required - balance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-amber-600">
            <IconAlertTriangle size={20} />
            <span className="font-semibold">Insufficient Credits</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="mb-4 text-zinc-700">
            {operation ? (
              <>
                The <strong>{operation}</strong> operation requires{' '}
              </>
            ) : (
              <>This action requires </>
            )}
            <strong>{required}</strong> credits, but you only have{' '}
            <strong>{balance}</strong>.
          </p>

          <div className="mb-6 flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <IconCoin size={18} className="text-amber-500" />
              <span className="text-sm text-zinc-600">Credits needed</span>
            </div>
            <span className="font-semibold text-zinc-900">{shortfall}</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
            <Link
              href="/dashboard/billing"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              onClick={onClose}
            >
              <IconCoin size={16} />
              Buy Credits
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
