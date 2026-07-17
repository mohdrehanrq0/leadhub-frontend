/**
 * Currency helpers for LeadHub billing — INR for India, USD for international.
 */

export type DisplayCurrency = 'INR' | 'USD';
export type PaymentMethod = 'razorpay' | 'cryptomus';

export const INR_PER_USD = 50;

/** Sync heuristic: timezone or locale suggests India. */
export function detectIsIndiaUser(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return true;
    const lang = (navigator.language || '').toLowerCase();
    if (lang === 'en-in' || lang.endsWith('-in')) return true;
  } catch {
    // ignore
  }
  return false;
}

export function detectDisplayCurrency(): DisplayCurrency {
  return detectIsIndiaUser() ? 'INR' : 'USD';
}

export function formatInrFromPaise(paise: number): string {
  return `₹${Math.max(0, Math.round(paise / 100)).toLocaleString('en-IN')}`;
}

export function formatUsdFromCents(cents: number): string {
  return `$${(Math.max(0, cents) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPackPrice(
  priceInrPaise: number,
  priceUsdCents: number,
  currency: DisplayCurrency,
): string {
  if (currency === 'INR') return formatInrFromPaise(priceInrPaise);
  return formatUsdFromCents(priceUsdCents);
}

export function availablePaymentMethods(isIndia: boolean): PaymentMethod[] {
  return isIndia ? ['razorpay', 'cryptomus'] : ['cryptomus'];
}

export function defaultPaymentMethod(isIndia: boolean): PaymentMethod {
  return isIndia ? 'razorpay' : 'cryptomus';
}
