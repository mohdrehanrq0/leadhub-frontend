'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  IconCheck,
  IconLoader2,
  IconReceipt,
  IconSparkles,
} from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { BYOK_UI_ENABLED } from '../../../lib/features';
import { useAuth } from '../../../context/AuthContext';
import { PageHeader } from '../../../components/layout/PageHeader';
import { detectIsIndiaUser } from '../../../lib/currency';
import {
  CreditCheckoutModal,
  type CreditPack,
} from '../../../components/billing/CreditCheckoutModal';

type PlanInfo = {
  plan: 'free' | 'pro';
  status: string;
  proUntil: string | null;
  isPro: boolean;
  upgradeUrl: string;
  periodDays: number;
  proPack: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    priceInrPaise: number;
    priceUsdCents: number;
    isActive: boolean;
  } | null;
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
  const isIndia = detectIsIndiaUser();

  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutPack, setCheckoutPack] = useState<CreditPack | null>(null);
  const [pollingCrypto, setPollingCrypto] = useState(false);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoading(true);
      const [planRes, payRes] = await Promise.all([
        api.get('/api/billing/plan'),
        api
          .get('/api/credits/payments', { params: { limit: 20 } })
          .catch(() => ({ data: { data: [] } })),
      ]);
      setPlan(planRes.data.data);
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
            toast.success('Payment confirmed — Pro is active.');
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

  if (loading && !plan) {
    return <div className="h-40 max-w-4xl skeleton" />;
  }

  const proPack = plan?.proPack;
  const checkoutAsPack: CreditPack | null = proPack
    ? {
        id: proPack.id,
        slug: proPack.slug,
        name: proPack.name,
        description: proPack.description,
        credits: 0,
        priceInrPaise: proPack.priceInrPaise,
        priceUsdCents: proPack.priceUsdCents,
        isCustom: false,
        isActive: proPack.isActive,
      }
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 animate-fade-in text-text">
      <PageHeader
        eyebrow="Billing"
        title="Plan"
        description="Free includes core capture. Pro unlocks search import, reactions, event attendees, withdraw invites, and more."
      />

      {pollingCrypto && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <IconLoader2 size={16} className="animate-spin" />
          Confirming crypto payment…
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-200">
              Current plan
            </p>
            <h2 className="mt-1 text-2xl font-bold text-text-100">
              {plan?.isPro ? 'LeadHub Pro' : 'Free'}
            </h2>
            {plan?.isPro && plan.proUntil ? (
              <p className="mt-1 text-sm text-text-200">
                Renews / active until {new Date(plan.proUntil).toLocaleDateString()}
              </p>
            ) : (
              <p className="mt-1 text-sm text-text-200">
                Limited capture tools. Upgrade for full LinkedIn prospecting.
              </p>
            )}
          </div>
          {plan?.isPro ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <IconCheck size={14} /> Active
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              Free
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <p className="text-sm font-semibold text-text-100">Free</p>
            <ul className="mt-2 space-y-1 text-xs text-text-200">
              <li>Profile save &amp; commenters import</li>
              <li>Extension Status &amp; workspace connect</li>
              <li>Company / groups page detection</li>
            </ul>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-text-100">Pro — ₹99 / month</p>
            <ul className="mt-2 space-y-1 text-xs text-text-200">
              <li>Likes / reactions import</li>
              <li>People search import + CSV</li>
              <li>Event attendees + CSV</li>
              <li>Withdraw sent invites</li>
            </ul>
          </div>
        </div>

        {checkoutAsPack && (
          <button
            type="button"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:opacity-90 sm:w-auto"
            onClick={() => {
              if (!isIndia) {
                toast.message('Pro checkout is available via Razorpay (INR). Switch to an India locale or contact support.');
              }
              setCheckoutPack(checkoutAsPack);
            }}
          >
            <IconSparkles size={16} />
            {plan?.isPro ? 'Extend Pro — ₹99' : 'Upgrade to Pro — ₹99'}
          </button>
        )}
        {!checkoutAsPack && (
          <p className="mt-4 text-sm text-amber-700">
            Pro product is not seeded yet. Run <code className="font-mono text-xs">pnpm db:seed:credits</code> on the backend.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-100">
          <IconReceipt size={16} /> Payment history
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
                    {p.description || 'Payment'}
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
      </section>

      {BYOK_UI_ENABLED && (
        <p className="text-xs text-text-200">
          Need API keys?{' '}
          <Link href="/dashboard/settings/api-keys" className="font-semibold text-primary underline">
            Configure BYOK providers
          </Link>
        </p>
      )}

      <CreditCheckoutModal
        pack={checkoutPack}
        open={Boolean(checkoutPack)}
        onClose={() => setCheckoutPack(null)}
        onSuccess={() => void load()}
      />
    </div>
  );
}
