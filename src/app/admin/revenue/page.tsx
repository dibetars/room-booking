'use client';

import { useEffect, useState } from 'react';

interface MonthlyRevenue {
  month: string;
  label: string;
  revenue: number;
  bookings: number;
  avgStay: number;
}

interface ChannelBreakdown {
  channel: string;
  revenue: number;
  bookings: number;
  share: number;
}

interface Analytics {
  totalRevenue: number;
  thisMonthRevenue: number;
  upcomingRevenue: number;
  avgBookingValue: number;
  totalConfirmed: number;
  monthlyRevenue: MonthlyRevenue[];
  channelBreakdown: ChannelBreakdown[];
}

const CHANNEL_COLORS: Record<string, string> = {
  'Direct': 'bg-green-500',
  'Booking.com': 'bg-blue-500',
  'Airbnb': 'bg-rose-500',
  'Hostelworld': 'bg-purple-500',
  'Expedia': 'bg-yellow-500',
  'Admin': 'bg-gray-400',
};

export default function RevenuePage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load analytics'); setLoading(false); });
  }, []);

  const maxMonthlyRevenue = data ? Math.max(...data.monthlyRevenue.map((m) => m.revenue), 1) : 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {loading && <div className="py-20 text-center text-gray-400">Loading analytics…</div>}
        {error && <div className="py-20 text-center text-red-500">{error}</div>}

        {data && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Revenue (6mo)', value: `$${data.totalRevenue.toLocaleString()}`, sub: `${data.totalConfirmed} confirmed bookings` },
                { label: 'This Month', value: `$${data.thisMonthRevenue.toLocaleString()}`, sub: 'confirmed' },
                { label: 'Upcoming (90d)', value: `$${data.upcomingRevenue.toLocaleString()}`, sub: 'projected' },
                { label: 'Avg Booking Value', value: `$${data.avgBookingValue.toLocaleString()}`, sub: 'per confirmed booking' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-white rounded-xl shadow p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-2xl font-bold text-[#2d5a27]">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Monthly revenue bar chart */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-gray-800 mb-5">Monthly Revenue</h2>
              {data.monthlyRevenue.length === 0
                ? <p className="text-gray-400 text-sm text-center py-8">No confirmed bookings in this period.</p>
                : (
                  <div className="space-y-3">
                    {data.monthlyRevenue.map((m) => (
                      <div key={m.month} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-14 shrink-0 text-right">{m.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-7 relative overflow-hidden">
                          <div
                            className="bg-[#2d5a27] h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max((m.revenue / maxMonthlyRevenue) * 100, 2)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-white mix-blend-difference">
                            ${m.revenue.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 w-24 shrink-0">{m.bookings} booking{m.bookings !== 1 ? 's' : ''} · {m.avgStay}n avg</span>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>

            {/* Channel breakdown */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-gray-800 mb-5">Revenue by Channel</h2>
              {data.channelBreakdown.length === 0
                ? <p className="text-gray-400 text-sm text-center py-8">No data.</p>
                : (
                  <div className="space-y-1">
                    <div className="grid grid-cols-4 text-xs text-gray-400 uppercase tracking-wide px-2 pb-2">
                      <span>Channel</span>
                      <span className="text-right">Revenue</span>
                      <span className="text-right">Bookings</span>
                      <span className="text-right">Share</span>
                    </div>
                    {data.channelBreakdown.map((c) => (
                      <div key={c.channel} className="grid grid-cols-4 items-center px-2 py-2.5 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${CHANNEL_COLORS[c.channel] ?? 'bg-gray-400'}`} />
                          <span className="text-sm font-medium text-gray-700">{c.channel}</span>
                        </div>
                        <span className="text-sm text-right font-semibold text-gray-800">${c.revenue.toLocaleString()}</span>
                        <span className="text-sm text-right text-gray-500">{c.bookings}</span>
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className={`${CHANNEL_COLORS[c.channel] ?? 'bg-gray-400'} h-1.5 rounded-full`} style={{ width: `${c.share}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right">{c.share}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>

            {/* Avg stay trend */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-bold text-gray-800 mb-4">Avg Length of Stay by Month</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wide border-b">
                      <th className="text-left py-2">Month</th>
                      <th className="text-right py-2">Bookings</th>
                      <th className="text-right py-2">Avg Stay</th>
                      <th className="text-right py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.monthlyRevenue.map((m) => (
                      <tr key={m.month} className="hover:bg-gray-50">
                        <td className="py-2.5 font-medium text-gray-700">{m.label}</td>
                        <td className="py-2.5 text-right text-gray-500">{m.bookings}</td>
                        <td className="py-2.5 text-right">
                          <span className="inline-flex items-center gap-1">
                            <span className="font-semibold text-[#2d5a27]">{m.avgStay}</span>
                            <span className="text-gray-400 text-xs">nights</span>
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-gray-700">${m.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
    </div>
  );
}
