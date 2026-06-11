'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ checkIn, checkOut, adults: String(adults), children: String(children) });
    router.push(`/rooms?${params}`);
  }

  return (
    <main className="min-h-screen bg-[#f5f0e8] flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-[#2d5a27] mb-3">BokoBoko</h1>
        <p className="text-lg text-[#5a4a3a]">Eco-Friendly Accommodation · Accra, Ghana</p>
      </div>

      <form
        onSubmit={handleSearch}
        className="bg-white rounded-2xl shadow-lg p-6 md:p-8 w-full max-w-lg space-y-4"
      >
        <h2 className="text-xl font-semibold text-[#2d5a27]">Check Availability</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Check-in</label>
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Check-out</label>
            <input
              type="date"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Adults</label>
            <select
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Children</label>
            <select
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]"
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#2d5a27] text-white font-semibold py-3 rounded-xl hover:bg-[#245020] transition-colors"
        >
          Search Rooms
        </button>
      </form>

      <p className="mt-6 text-sm text-[#5a4a3a]">
        Also available on{' '}
        <a href="https://www.airbnb.com" target="_blank" rel="noopener noreferrer" className="underline">Airbnb</a>
        {' '}and{' '}
        <a href="https://www.booking.com" target="_blank" rel="noopener noreferrer" className="underline">Booking.com</a>
      </p>
    </main>
  );
}
