'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IntentStatus } from '@/types';

interface BookingStatusData {
  status: IntentStatus;
  checkIn: string;
  checkOut: string;
  roomName: string;
  amountGHS: number;
  expiresAt: string | null;
}

export default function ConfirmPage({ params }: { params: Promise<{ ref: string }> }) {
  const router = useRouter();
  const [ref, setRef] = useState('');
  const [data, setData] = useState<BookingStatusData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    params.then(({ ref: r }) => {
      setRef(r);
      poll(r);
    });
  }, []);

  async function poll(reference: string, attempts = 0) {
    try {
      const res = await fetch(`/api/bookings/${reference}`);
      const json = await res.json();

      if (!res.ok) { setError(json.error ?? 'Booking not found'); return; }

      setData(json);

      // Keep polling while payment is pending, up to 5 minutes
      if (['HELD', 'PAYMENT_PENDING', 'PAID'].includes(json.status) && attempts < 60) {
        setTimeout(() => poll(reference, attempts + 1), 5000);
      }
    } catch {
      if (attempts < 5) setTimeout(() => poll(reference, attempts + 1), 3000);
      else setError('Unable to load booking status.');
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (error) {
    return (
      <main className="min-h-screen bg-[#f5f0e8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => router.replace('/')} className="bg-[#2d5a27] text-white px-6 py-2 rounded-xl">Back to Home</button>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#2d5a27] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const isConfirmed = data.status === 'CONFIRMED';
  const isFailed = ['PAYMENT_FAILED', 'EXPIRED', 'CANCELLED'].includes(data.status);
  const isPending = !isConfirmed && !isFailed;

  return (
    <main className="min-h-screen bg-[#f5f0e8] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md w-full">
        {isConfirmed && (
          <>
            <div className="text-5xl text-center mb-4">✅</div>
            <h1 className="text-2xl font-bold text-[#2d5a27] text-center mb-1">Booking Confirmed!</h1>
            <p className="text-sm text-gray-500 text-center mb-6">A confirmation email is on its way.</p>
          </>
        )}
        {isFailed && (
          <>
            <div className="text-5xl text-center mb-4">❌</div>
            <h1 className="text-xl font-bold text-red-600 text-center mb-1">
              {data.status === 'EXPIRED' ? 'Hold Expired' : 'Payment Failed'}
            </h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              {data.status === 'EXPIRED' ? 'Your room hold has expired. Please search again.' : 'Your payment was not completed.'}
            </p>
          </>
        )}
        {isPending && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-10 h-10 border-4 border-[#2d5a27] border-t-transparent rounded-full animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-gray-700 text-center mb-1">Confirming your booking…</h1>
            <p className="text-sm text-gray-500 text-center mb-6">This can take up to a minute. Please don't close this page.</p>
          </>
        )}

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-6">
          <div className="flex justify-between">
            <span className="text-gray-500">Reference</span>
            <span className="font-mono font-semibold text-gray-800">{ref}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Room</span>
            <span className="text-gray-800">{data.roomName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Check-in</span>
            <span className="text-gray-800">{formatDate(data.checkIn)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Check-out</span>
            <span className="text-gray-800">{formatDate(data.checkOut)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Total paid</span>
            <span className="font-semibold text-[#2d5a27]">GHS {data.amountGHS.toLocaleString()}</span>
          </div>
        </div>

        {(isConfirmed || isFailed) && (
          <button onClick={() => router.replace('/')} className="w-full bg-[#2d5a27] text-white font-semibold py-3 rounded-xl hover:bg-[#245020]">
            {isConfirmed ? 'Book Another Stay' : 'Try Again'}
          </button>
        )}
      </div>
    </main>
  );
}
