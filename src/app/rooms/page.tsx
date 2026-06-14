'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import type { RoomAvailability } from '@/types';

const GHS_PER_USD = Number(process.env.NEXT_PUBLIC_GHS_PER_USD ?? '15.5');

function RoomsContent() {
  const router = useRouter();
  const params = useSearchParams();

  const checkIn = params.get('checkIn') ?? '';
  const checkOut = params.get('checkOut') ?? '';
  const adults = params.get('adults') ?? '2';
  const children = params.get('children') ?? '0';

  const [rooms, setRooms] = useState<RoomAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const nights = Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000
  );

  useEffect(() => {
    if (!checkIn || !checkOut) { router.replace('/'); return; }
    fetch(`/api/availability?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setRooms(data.rooms);
      })
      .catch(() => setError('Failed to load availability. Please try again.'))
      .finally(() => setLoading(false));
  }, [checkIn, checkOut, adults, children]);

  function selectRoom(room: RoomAvailability) {
    const qs = new URLSearchParams({ checkIn, checkOut, adults, children, roomId: String(room.roomId), totalPriceGHS: String(room.totalPriceGHS), perNight: String(room.perNight), roomName: room.name });
    router.push(`/checkout?${qs}`);
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GH', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <main className="min-h-screen bg-[#f5f0e8] px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="text-[#2d5a27] text-sm mb-4 flex items-center gap-1 hover:underline">
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-[#2d5a27] mb-1">Available Rooms</h1>
        <p className="text-sm text-[#5a4a3a] mb-6">
          {formatDate(checkIn)} → {formatDate(checkOut)} · {nights} night{nights !== 1 ? 's' : ''} · {adults} adult{Number(adults) !== 1 ? 's' : ''}{Number(children) > 0 ? `, ${children} child${Number(children) !== 1 ? 'ren' : ''}` : ''}
        </p>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#2d5a27] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {!loading && !error && rooms.filter((r) => r.available).length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center shadow">
            <p className="text-gray-600 mb-4">No rooms available for these dates.</p>
            <button onClick={() => router.replace('/')} className="bg-[#2d5a27] text-white px-6 py-2 rounded-xl hover:bg-[#245020]">Try different dates</button>
          </div>
        )}

        <div className="space-y-4">
          {rooms.filter((r) => r.available).map((room) => {
            const perNightUSD = Math.round(room.perNight / GHS_PER_USD);
            const totalUSD = perNightUSD * nights;
            const photo = room.photos?.[0];
            return (
              <div key={room.roomId} className="bg-white rounded-2xl shadow overflow-hidden flex flex-col sm:flex-row gap-0">
                {photo && (
                  <div className="relative w-full sm:w-48 h-44 sm:h-auto shrink-0">
                    <Image src={photo} alt={room.name} fill className="object-cover" />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1 gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">{room.name}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{room.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Up to {room.maxOccupancy} guests</p>
                  </div>
                  <div className="flex items-end justify-between mt-auto pt-2">
                    <div>
                      <p className="text-2xl font-bold text-[#2d5a27]">GHS {room.totalPriceGHS.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">
                        GHS {room.perNight.toLocaleString()} / night · <span className="text-gray-500">${perNightUSD} / night · ${totalUSD} total</span>
                      </p>
                    </div>
                    <button
                      onClick={() => selectRoom(room)}
                      className="bg-[#2d5a27] text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-[#245020] transition-colors shrink-0"
                    >
                      Select
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function RoomsPage() {
  return (
    <Suspense>
      <RoomsContent />
    </Suspense>
  );
}
