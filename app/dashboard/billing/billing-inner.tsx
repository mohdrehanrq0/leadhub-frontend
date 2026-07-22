'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  IconCheck,
  IconCoin,
  IconLoader2,
  IconReceipt,
  IconSparkles,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { APOLLO_UI_ENABLED } from '../../../lib/features';
import { useAuth } from '../../../context/AuthContext';
import {
  detectDisplayCurrency,
  detectIsIndiaUser,
  formatPackPrice,
  type DisplayCurrency,
} from '../../../lib/currency';
import {
  CreditCheckoutModal,
  type CreditPack,
} from '../../../components/billing/CreditCheckoutModal';

type CreditBalance = {
  balance: number;
  reservedBalance: number;
  totalPurchased: number;
  totalUsed: number;
  available: number;
};

type CreditTxn = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
};

type PaymentRow = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  creditsGranted: number;
  paymentProvider: string;
  description: string | null;
  createdAt: string;
  paidAt: string | null;
};

function errorMessage(err: unknown, fallback: string) {
  if (typeof err === 'object' && err && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function BillingPage() {
  const { activeWorkspaceId } = useAuth();
  const searchParams = useSearchParams();
  const currency: DisplayCurrency = detectDisplayCurrency();
  const isIndia = detectIsIndiaUser();

  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [history, setHistory] = useState<CreditTxn[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPack, setCheckoutPack] = useState<CreditPack | null>(null);
  const [pollingCrypto, setPollingCrypto] = useState(false);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoading(true);
      const [balRes, packsRes, histRes, payRes] = await Promise.all([
        api.get('/api/credits/balance'),
        api.get('/api/credits/packs'),
        api.get('/api/credits/history', { params: { limit: 20 } }),
        api
          .get('/api/credits/payments', { params: { limit: 20 } })
          .catch(() => ({ data: { data: [] } })),
      ]);
      setBalance(balRes.data.data);
      setPacks(packsRes.data.data ?? []);
      setHistory(histRes.data.data ?? []);
      setPayments(payRes.data.data ?? []);
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load billing.'));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const payment = searchParams.get('payment');
    const orderId = searchParams.get('order_id');
    if (payment !== 'cryptomus' || !orderId) return;

    let cancelled = false;
    let attempts = 0;
    setPollingCrypto(true);

    const poll = async () => {
      while (!cancelled && attempts < 40) {
        attempts += 1;
        try {
          const res = await api.get('/api/credits/cryptomus/status', {
            params: { order_id: orderId },
          });
          const status = res.data.data?.status;
          if (status === 'succeeded') {
            toast.success('Payment confirmed — credits added.');
            await load();
            setPollingCrypto(false);
            return;
          }
          if (status === 'failed' || status === 'cancelled') {
            toast.error('Payment failed or was cancelled.');
            setPollingCrypto(false);
            return;
          }
        } catch {
          // keep polling
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (!cancelled) {
        toast.message('Still confirming payment… check back shortly.');
        setPollingCrypto(false);
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [searchParams, load]);

  if (loading && !balance) {
    return <div className="h-40 max-w-4xl skeleton" />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in text-text">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text-100">
          <IconCoin className="text-primary" />
          Billing & Credits
        </h1>
        <p className="mt-1 text-sm text-text-200">
          1 enrichment = 1 credit. Credits are charged only when enrichment finishes successfully.
          Bring your own {APOLLO_UI_ENABLED ? 'Apollo, ' : ''}Apify, OpenAI/Gemini, and Reoon keys.
        </p>
      </div>

      {pollingCrypto && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <IconLoader2 size={16} className="animate-spin" />
          Confirming crypto payment…
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-input">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-200">Available</p>
          <p className="mt-1 text-3xl font-bold text-text-100">
            {(balance?.available ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-200">credits ready to enrich</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-input">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-200">Reserved</p>
          <p className="mt-1 text-3xl font-bold text-text-100">
            {(balance?.reservedBalance ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-200">in-flight enrichments</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-input">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-200">Used</p>
          <p className="mt-1 text-3xl font-bold text-text-100">
            {(balance?.totalUsed ?? 0).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-200">successful enrichments</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text-100">
          <IconSparkles size={18} className="text-primary" />
          Credit packs
          <span className="text-xs font-normal text-text-200">
            ({isIndia ? 'INR · Razorpay' : 'USD · Crypto'})
          </span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packs.map((pack) => {
            const price = pack.isCustom
              ? 'Custom'
              : formatPackPrice(pack.priceInrPaise, pack.priceUsdCents, currency);
            const perCredit =
              !pack.isCustom && pack.credits > 0
                ? currency === 'INR'
                  ? `₹${(pack.priceInrPaise / 100 / pack.credits).toFixed(2)}/credit`
                  : `$${(pack.priceUsdCents / 100 / pack.credits).toFixed(3)}/credit`
                : null;

            return (
              <div
                key={pack.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-input"
              >
                <h3 className="text-base font-bold text-text-100">{pack.name}</h3>
                <p className="mt-1 text-xs text-text-200">{pack.description}</p>
                <p className="mt-4 text-3xl font-bold text-text-100">{price}</p>
                {!pack.isCustom && (
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {pack.credits.toLocaleString()} credits
                  </p>
                )}
                {perCredit && <p className="mt-1 text-[11px] text-text-200">{perCredit}</p>}
                <button
                  type="button"
                  onClick={() => {
                    if (pack.isCustom) {
                      toast.message('Email sales for Enterprise volume pricing.');
                      return;
                    }
                    setCheckoutPack(pack);
                  }}
                  className="mt-auto pt-4"
                >
                  <span className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-white hover:opacity-90">
                    {pack.isCustom ? 'Contact sales' : 'Buy credits'}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-input">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-100">
            <IconReceipt size={16} /> Credit activity
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-text-200">No credit activity yet.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
              {history.map((txn) => (
                <li
                  key={txn.id}
                  className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0"
                >
                  <div>
                    <p className="font-medium capitalize text-text-100">{txn.type}</p>
                    <p className="text-[11px] text-text-200">
                      {txn.description || '—'} · {new Date(txn.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`font-bold ${txn.amount > 0 ? 'text-emerald-600' : txn.amount < 0 ? 'text-rose-600' : 'text-text-200'}`}
                  >
                    {txn.amount > 0 ? '+' : ''}
                    {txn.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-input">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-100">
            <IconCheck size={16} /> Payment history
          </h2>
          {payments.length === 0 ? (
            <p className="text-sm text-text-200">No purchases yet.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-0"
                >
                  <div>
                    <p className="font-medium text-text-100">
                      {p.description || `${p.creditsGranted} credits`}
                    </p>
                    <p className="text-[11px] text-text-200">
                      {p.paymentProvider} · {p.status} ·{' '}
                      {new Date(p.paidAt || p.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="font-bold text-text-100">
                    {p.currency === 'INR'
                      ? `₹${(p.amount / 100).toLocaleString('en-IN')}`
                      : `$${(p.amount / 100).toFixed(2)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="text-xs text-text-200">
        Need API keys?{' '}
        <Link href="/dashboard/settings/api-keys" className="font-semibold text-primary underline">
          Configure BYOK providers
        </Link>
      </p>

      <CreditCheckoutModal
        pack={checkoutPack}
        open={Boolean(checkoutPack)}
        onClose={() => setCheckoutPack(null)}
        onSuccess={() => void load()}
      />
    </div>
  );
}
