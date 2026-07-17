'use client';

import { useEffect, useState } from 'react';
import { IconCoin, IconCreditCard, IconLoader2, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import {
  availablePaymentMethods,
  defaultPaymentMethod,
  detectIsIndiaUser,
  formatPackPrice,
  type DisplayCurrency,
  type PaymentMethod,
} from '../../lib/currency';
import { openRazorpayCheckout } from '../../lib/razorpayCheckout';
import { useAuth } from '../../context/AuthContext';

export type CreditPack = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  credits: number;
  priceInrPaise: number;
  priceUsdCents: number;
  isCustom: boolean;
  isActive: boolean;
};

type Props = {
  pack: CreditPack | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CreditCheckoutModal({ pack, open, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const isIndia = detectIsIndiaUser();
  const displayCurrency: DisplayCurrency = isIndia ? 'INR' : 'USD';
  const methods = availablePaymentMethods(isIndia);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod(isIndia));
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setPaymentMethod(defaultPaymentMethod(isIndia));
  }, [isIndia, open]);

  if (!open || !pack) return null;

  const priceLabel = formatPackPrice(pack.priceInrPaise, pack.priceUsdCents, displayCurrency);

  const handlePay = async () => {
    if (pack.isCustom) {
      toast.message('Contact sales for Enterprise pricing.');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.post('/api/credits/checkout', {
        packId: pack.id,
        paymentMethod,
      });
      const data = res.data.data;

      if (data.provider === 'razorpay') {
        await openRazorpayCheckout({
          key: data.key,
          amount: data.amount,
          currency: data.currency,
          orderId: data.orderId,
          name: 'LeadHub',
          description: `${pack.name} — ${pack.credits.toLocaleString()} credits`,
          email: data.email || user?.email,
          prefillName: data.name,
          onSuccess: async (response) => {
            await api.post('/api/credits/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success(`${pack.credits.toLocaleString()} credits added to your wallet.`);
            onSuccess?.();
            onClose();
          },
        });
      } else if (data.provider === 'cryptomus' && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('Unexpected checkout response.');
      }
    } catch (err) {
      const message =
        typeof err === 'object' && err && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : null;
      if (message !== 'Payment cancelled') {
        toast.error(message || 'Checkout failed.');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-text-100">Checkout</h2>
            <p className="text-xs text-text-200">{pack.name} pack</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-200 hover:bg-sidebar-hover"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-text-200">Credits</span>
              <span className="text-xl font-bold text-text-100">
                {pack.credits.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-sm text-text-200">Total</span>
              <span className="text-2xl font-bold text-primary">{priceLabel}</span>
            </div>
            <p className="mt-2 text-[11px] text-text-200">
              1 enrichment = 1 credit. Credits are used only when enrichment completes successfully.
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-200">
              Payment method
            </p>
            <div className="grid grid-cols-2 gap-2">
              {methods.includes('razorpay') && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    paymentMethod === 'razorpay'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-200 hover:border-primary/40'
                  }`}
                >
                  <IconCreditCard size={16} />
                  Razorpay
                </button>
              )}
              {methods.includes('cryptomus') && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cryptomus')}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                    paymentMethod === 'cryptomus'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-200 hover:border-primary/40'
                  }`}
                >
                  <IconCoin size={16} />
                  Crypto
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handlePay()}
            disabled={processing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {processing ? <IconLoader2 size={16} className="animate-spin" /> : null}
            {paymentMethod === 'razorpay' ? `Pay ${priceLabel}` : `Continue to crypto · ${priceLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
