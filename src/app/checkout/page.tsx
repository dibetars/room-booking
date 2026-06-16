'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';


const GHS_PER_USD = Number(process.env.NEXT_PUBLIC_GHS_PER_USD ?? '15.5');

function CheckoutContent() {
  const router = useRouter();
  const params = useSearchParams();

  const checkIn = params.get('checkIn') ?? '';
  const checkOut = params.get('checkOut') ?? '';
  const adults = params.get('adults') ?? '2';
  const children = params.get('children') ?? '0';
  const roomId = Number(params.get('roomId'));
  const totalPriceGHS = Number(params.get('totalPriceGHS'));
  const perNight = Number(params.get('perNight'));
  const roomName = params.get('roomName') ?? 'Room';

  const nights = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
  const perNightUSD = Math.round(perNight / GHS_PER_USD);
  const totalUSD = perNightUSD * nights;

  const HOLD_SECONDS = 30 * 60;
  const [secondsLeft, setSecondsLeft] = useState(HOLD_SECONDS);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!checkIn || !checkOut || !roomId) { router.replace('/'); return; }
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(timerRef.current!); router.replace('/'); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, checkIn, checkOut, adults: Number(adults), children: Number(children), guest: { name, email, phone: phone || undefined } }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Booking failed. Please try again.'); setSubmitting(false); return; }

      const { reference, amountPesewas } = data;
      const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (window as any).PaystackPop.setup({
        key: paystackKey,
        email,
        amount: amountPesewas,
        currency: 'GHS',
        ref: reference,
        channels: ['card', 'mobile_money'],
        onClose() {
          setError('Payment cancelled. Your room hold is still active.');
          setSubmitting(false);
        },
        callback(response: { reference: string }) {
          router.push(`/confirm/${response.reference}`);
        },
      });

      handler.openIframe();
    } catch {
      setError('Network error. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GH', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />
      <main className="min-h-screen bg-[#f5f0e8] px-4 py-8">
        <div className="max-w-lg mx-auto space-y-4">
          <button onClick={() => router.back()} className="text-[#2d5a27] text-sm flex items-center gap-1 hover:underline">
            ← Back
          </button>

          {/* Hold countdown */}
          <div className="bg-[#2d5a27] text-white rounded-2xl px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Room held for</span>
            <span className="text-xl font-bold tabular-nums">{mm}:{ss}</span>
          </div>

          {/* Price summary */}
          <div className="bg-white rounded-2xl shadow p-5 space-y-2">
            <h2 className="font-semibold text-gray-800">{roomName}</h2>
            <p className="text-sm text-gray-500">{fmt(checkIn)} → {fmt(checkOut)} · {nights} night{nights !== 1 ? 's' : ''}</p>
            <p className="text-sm text-gray-500">
              {adults} adult{Number(adults) !== 1 ? 's' : ''}{Number(children) > 0 ? `, ${children} child${Number(children) !== 1 ? 'ren' : ''}` : ''}
            </p>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">${perNightUSD} / night × {nights} night{nights !== 1 ? 's' : ''}</span>
                <span className="font-bold text-[#2d5a27]">${totalUSD}</span>
              </div>
            </div>
          </div>

          {/* Guest form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Your Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Full name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Kwame Mensah"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="kwame@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone (for MoMo confirmation)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024 000 0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>

            {/* Payment trust signals */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-2 font-medium">Accepted payment methods</p>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="bg-[#ffcc00] text-black px-2 py-1 rounded">MTN MoMo</span>
                <span className="bg-[#e40087] text-white px-2 py-1 rounded">Telecel Cash</span>
                <span className="bg-[#00539b] text-white px-2 py-1 rounded">AT Money</span>
                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">Visa / Mastercard</span>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button type="submit" disabled={submitting}
              className="w-full bg-[#2d5a27] text-white font-semibold py-3 rounded-xl hover:bg-[#245020] transition-colors disabled:opacity-60">
              {submitting ? 'Opening payment…' : `Pay $${totalUSD}`}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Secure payment powered by Paystack. Prices in USD.
            </p>
          </form>
        </div>
      </main>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  );
}
