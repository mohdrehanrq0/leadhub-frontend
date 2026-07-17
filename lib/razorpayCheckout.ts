let razorpayLoadPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only load in the browser'));
  }

  if ((window as Window & { Razorpay?: unknown }).Razorpay) {
    return Promise.resolve();
  }

  if (razorpayLoadPromise) return razorpayLoadPromise;

  razorpayLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Razorpay')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });

  return razorpayLoadPromise;
}

export function openRazorpayCheckout(options: {
  key: string;
  amount: number;
  currency: string;
  orderId: string;
  name: string;
  description: string;
  email?: string;
  prefillName?: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
  onDismiss?: () => void;
}): Promise<void> {
  return loadRazorpayScript().then(
    () =>
      new Promise((resolve, reject) => {
        const Razorpay = (
          window as Window & { Razorpay?: new (opts: object) => { open: () => void } }
        ).Razorpay;

        if (!Razorpay) {
          reject(new Error('Payment gateway failed to load'));
          return;
        }

        let paymentCompleted = false;

        const instance = new Razorpay({
          key: options.key,
          amount: options.amount,
          currency: options.currency,
          name: options.name,
          description: options.description,
          order_id: options.orderId,
          prefill: {
            email: options.email,
            name: options.prefillName,
          },
          handler: async (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          }) => {
            try {
              paymentCompleted = true;
              await options.onSuccess(response);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              options.onDismiss?.();
              if (!paymentCompleted) {
                reject(new Error('Payment cancelled'));
              }
            },
          },
        });

        instance.open();
      }),
  );
}
