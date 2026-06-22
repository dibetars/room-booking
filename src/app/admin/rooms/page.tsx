'use client';

import { useEffect, useState } from 'react';

interface RoomConfig {
  id: number;
  name: string;
  description: string;
  maxOccupancy: number;
  rackRateUSD: number;
  photos: string[];
}

interface RoomPerf {
  roomId: number;
  name: string;
  revenue: number;
  bookings: number;
  totalNights: number;
  avgStay: number;
}

interface MonthlyRow {
  label: string;
  avgStay: number;
  bookings: number;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomConfig[]>([]);
  const [perf, setPerf] = useState<RoomPerf[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<RoomConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/rooms').then((r) => r.json()),
      fetch('/api/admin/analytics').then((r) => r.json()),
    ]).then(([roomData, analyticsData]) => {
      setRooms(roomData.rooms ?? []);
      setPerf(analyticsData.roomPerformance ?? []);
      setMonthly(analyticsData.monthlyRevenue ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const maxRevenue = Math.max(...perf.map((r) => r.revenue), 1);

  async function saveRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setSaveError('');
    setSaveOk(false);
    const res = await fetch('/api/admin/rooms', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editing.id,
        name: editing.name,
        description: editing.description,
        maxOccupancy: editing.maxOccupancy,
        rackRateUSD: editing.rackRateUSD,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setSaveError(data.error ?? 'Save failed'); return; }
    setSaveOk(true);
    setRooms((prev) => prev.map((r) => r.id === editing.id ? { ...r, ...editing } : r));
    setTimeout(() => { setEditing(null); setSaveOk(false); }, 800);
  }

  return (
    <>
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {loading && <div className="py-20 text-center text-gray-400">Loading room data…</div>}

        {!loading && (
          <>
            {/* Room Performance Table */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="font-bold text-gray-800">Room Performance <span className="text-sm font-normal text-gray-400 ml-1">(last 6 months)</span></h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wide border-b bg-gray-50">
                      <th className="text-left px-6 py-3">Room</th>
                      <th className="text-right px-4 py-3">Bookings</th>
                      <th className="text-right px-4 py-3">Revenue</th>
                      <th className="text-right px-4 py-3">Nights Occupied</th>
                      <th className="text-right px-4 py-3">Avg Stay</th>
                      <th className="px-4 py-3">Revenue Share</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rooms.map((room) => {
                      const p = perf.find((p) => p.roomId === room.id);
                      return (
                        <tr key={room.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <p className="font-semibold text-gray-800">{room.name}</p>
                            <p className="text-xs text-gray-400">${room.rackRateUSD}/night · up to {room.maxOccupancy} guests</p>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">{p?.bookings ?? 0}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[#2d5a27]">${(p?.revenue ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{p?.totalNights ?? 0}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{p?.avgStay ?? '—'}{p ? ' n' : ''}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div className="bg-[#BE6A45] h-2 rounded-full"
                                  style={{ width: `${Math.round(((p?.revenue ?? 0) / maxRevenue) * 100)}%` }} />
                              </div>
                              <span className="text-xs text-gray-400 w-8 text-right">
                                {maxRevenue > 0 ? Math.round(((p?.revenue ?? 0) / maxRevenue) * 100) : 0}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => { setEditing({ ...room }); setSaveError(''); setSaveOk(false); }}
                              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {rooms.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-gray-400 py-12">No rooms found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Avg Stay trend */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-gray-800 mb-4">Avg Length of Stay Trend</h2>
              {monthly.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">No booking data in this period.</p>
                : (
                  <div className="flex items-end gap-3 h-32">
                    {monthly.map((m) => {
                      const maxAvg = Math.max(...monthly.map((x) => x.avgStay), 1);
                      const pct = Math.max((m.avgStay / maxAvg) * 100, 4);
                      return (
                        <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-semibold text-[#2d5a27]">{m.avgStay}n</span>
                          <div className="w-full bg-[#2d5a27] rounded-t-md transition-all" style={{ height: `${pct}%` }} />
                          <span className="text-xs text-gray-400 mt-1">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          </>
        )}
      </div>

      {/* Edit Room Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-800">Edit Room</h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={saveRoom} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Room Name</label>
                <input type="text" value={editing.name} required
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</label>
                <textarea rows={3} value={editing.description} required
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27] resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Rack Rate (USD/night)</label>
                  <input type="number" step="0.01" min="1" value={editing.rackRateUSD} required
                    onChange={(e) => setEditing({ ...editing, rackRateUSD: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Max Occupancy</label>
                  <input type="number" min="1" max="20" value={editing.maxOccupancy} required
                    onChange={(e) => setEditing({ ...editing, maxOccupancy: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
                </div>
              </div>
              {saveError && <p className="text-red-600 text-sm">{saveError}</p>}
              {saveOk && <p className="text-green-600 text-sm font-medium">Saved!</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditing(null)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#2d5a27] text-white font-semibold py-2.5 rounded-lg hover:bg-[#245020] transition-colors disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
