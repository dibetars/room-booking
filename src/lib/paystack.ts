import crypto from 'crypto';

const BASE_URL = 'https://api.paystack.co';

async function paystackFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      ...options.headers,
    },
  });
}

export interface PaystackInitResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export async function initializeTransaction(params: {
  email: string;
  amountPesewas: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<PaystackInitResult> {
  const res = await paystackFetch('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      amount: params.amountPesewas,
      currency: 'GHS',
      reference: params.reference,
      callback_url: params.callbackUrl,
      channels: ['card', 'mobile_money'],
      metadata: params.metadata,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paystack init failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference,
  };
}

export async function verifyTransaction(reference: string): Promise<{
  status: string;
  amount: number;
  currency: string;
  metadata: Record<string, unknown>;
}> {
  const res = await paystackFetch(`/transaction/verify/${encodeURIComponent(reference)}`);

  if (!res.ok) {
    throw new Error(`Paystack verify failed: ${res.status}`);
  }

  const json = await res.json();
  const data = json.data;
  return {
    status: data.status,
    amount: data.amount,
    currency: data.currency,
    metadata: data.metadata ?? {},
  };
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}
