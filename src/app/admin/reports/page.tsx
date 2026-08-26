'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { MonthlyReport } from '@/lib/reports';

const GHS = (n: number) => `GH₵ ${n.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function pct(n: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((n / total) * 100)}%`;
}

function Bar({ value, max }: { value: number; max: number }) {
  const w = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
      <div className="h-full bg-[#2d5a27] rounded-full transition-all" style={{ width: `${w}%` }} />
    </div>
  );
}

function downloadReport(report: MonthlyReport) {
  const fmtPeriod = (p: string) => new Date(p + '-01').toLocaleDateString('en-GH', { month: 'long', year: 'numeric' });
  const ghsStr = (n: number) => `GH₵ ${n.toLocaleString('en-GH', { maximumFractionDigits: 0 })}`;
  const lines: string[] = [
    `BOKOBOKO BEACH RESORT`,
    `Monthly Booking Report — ${fmtPeriod(report.period)}`,
    `Period: ${report.dateFrom} to ${report.dateTo}`,
    `Generated: ${new Date(report.generatedAt).toLocaleString('en-GH')}`,
    ``,
    `═══════════════════════════════════════`,
    `SUMMARY`,
    `═══════════════════════════════════════`,
    `Total Bookings : ${report.totalBookings}`,
    `  Confirmed    : ${report.confirmedBookings}`,
    `  Cancelled    : ${report.cancelledBookings}`,
    `  New/Pending  : ${report.totalBookings - report.confirmedBookings - report.cancelledBookings}`,
    `Total Revenue  : ${ghsStr(report.totalRevenueGHS)}`,
    ``,
    `═══════════════════════════════════════`,
    `BOOKINGS BY SOURCE`,
    `═══════════════════════════════════════`,
    ...report.byChannel.map(c =>
      `${c.label.padEnd(20)} ${String(c.count).padStart(3)} bookings   ${String(Math.round(c.count / report.totalBookings * 100)).padStart(3)}%   ${ghsStr(c.revenue)}`
    ),
    ``,
    `═══════════════════════════════════════`,
    `BOOKINGS BY ROOM`,
    `═══════════════════════════════════════`,
    ...report.byRoom.map(r =>
      `${r.label.padEnd(20)} ${String(r.count).padStart(3)} bookings   ${String(Math.round(r.count / report.totalBookings * 100)).padStart(3)}%   ${ghsStr(r.revenue)}`
    ),
    ``,
    `═══════════════════════════════════════`,
    `STATUS BREAKDOWN`,
    `═══════════════════════════════════════`,
    ...report.byStatus.map(s =>
      `${s.label.charAt(0).toUpperCase() + s.label.slice(1).padEnd(19)} ${String(s.count).padStart(3)}`
    ),
    ``,
    `───────────────────────────────────────`,
    `BokoBoko Beach Resort · Busua, Ghana`,
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bokoboko-report-${report.period}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportView({ report }: { report: MonthlyReport }) {
  const maxChannelCount = Math.max(...report.byChannel.map(c => c.count), 1);
  const maxRoomCount = Math.max(...report.byRoom.map(r => r.count), 1);
  const fmtPeriod = (p: string) => new Date(p + '-01').toLocaleDateString('en-GH', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header row with download */}
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-gray-700">{fmtPeriod(report.period)}</p>
        <button
          onClick={() => downloadReport(report)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 transition-colors"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download report
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', value: String(report.totalBookings) },
          { label: 'Confirmed', value: String(report.confirmedBookings) },
          { label: 'Cancelled', value: String(report.cancelledBookings) },
          { label: 'Revenue', value: GHS(report.totalRevenueGHS) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* By channel */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Bookings by source</p>
          <div className="space-y-3">
            {report.byChannel.map(ch => (
              <div key={ch.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{ch.label}</span>
                  <span className="text-gray-400">{ch.count} · {pct(ch.count, report.totalBookings)} · {GHS(ch.revenue)}</span>
                </div>
                <Bar value={ch.count} max={maxChannelCount} />
              </div>
            ))}
            {report.byChannel.length === 0 && <p className="text-sm text-gray-400">No data</p>}
          </div>
        </div>

        {/* By room */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Bookings by room</p>
          <div className="space-y-3">
            {report.byRoom.map(r => (
              <div key={r.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{r.label}</span>
                  <span className="text-gray-400">{r.count} · {pct(r.count, report.totalBookings)} · {GHS(r.revenue)}</span>
                </div>
                <Bar value={r.count} max={maxRoomCount} />
              </div>
            ))}
            {report.byRoom.length === 0 && <p className="text-sm text-gray-400">No data</p>}
          </div>
        </div>
      </div>

      {/* By status */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Booking status breakdown</p>
        <div className="flex flex-wrap gap-3">
          {report.byStatus.map(s => (
            <div key={s.label} className="px-4 py-2 rounded-xl bg-gray-50 text-sm">
              <span className="font-semibold text-gray-800 capitalize">{s.label}</span>
              <span className="text-gray-400 ml-2">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Generated {new Date(report.generatedAt).toLocaleString('en-GH')} ·
        Period {report.dateFrom} → {report.dateTo}
      </p>
    </div>
  );
}

function ReportsPageInner() {
  const searchParams = useSearchParams();
  const [savedReports, setSavedReports] = useState<{ period: string; generatedAt: string; totalBookings: number; totalRevenueGHS: number }[]>([]);
  const [activeReport, setActiveReport] = useState<MonthlyReport | null>(null);
  const [activePeriod, setActivePeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Custom range
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [dateTo, setDateTo] = useState(now.toISOString().slice(0, 10));

  const loadReport = useCallback(async (period: string) => {
    setLoading(true);
    setError('');
    setActivePeriod(period);
    const res = await fetch(`/api/admin/reports?period=${period}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Failed to load'); return; }
    setActiveReport(data.report);
  }, []);

  useEffect(() => {
    fetch('/api/admin/reports')
      .then(r => r.json())
      .then(d => {
        setSavedReports(d.reports ?? []);
        const p = searchParams.get('period');
        if (p) loadReport(p);
      })
      .catch(() => {});
  }, [searchParams, loadReport]);

  async function generateCustom() {
    setGenerating(true);
    setError('');
    const period = dateFrom.slice(0, 7);
    const res = await fetch('/api/admin/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateFrom, dateTo, period }),
    });
    const data = await res.json();
    setGenerating(false);
    if (!res.ok) { setError(data.error ?? 'Failed to generate'); return; }
    setActiveReport(data.report);
    setActivePeriod(period);
    setSavedReports(prev => {
      const filtered = prev.filter(r => r.period !== period);
      return [{ period, generatedAt: data.report.generatedAt, totalBookings: data.report.totalBookings, totalRevenueGHS: data.report.totalRevenueGHS }, ...filtered];
    });
  }

  const fmtPeriod = (p: string) => {
    const [y, m] = p.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GH', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="px-6 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Bookings, sources, and revenue — auto-generated each month</p>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</p>}

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar — saved reports + custom range */}
        <div className="space-y-4">
          {/* Custom date range */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Custom range</p>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a27]" />
            </div>
            <button onClick={generateCustom} disabled={generating}
              className="w-full bg-[#2d5a27] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#245020] transition-colors disabled:opacity-60">
              {generating ? 'Generating…' : 'Generate report'}
            </button>
          </div>

          {/* Saved reports list */}
          {savedReports.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 pt-4 pb-2">Saved reports</p>
              {savedReports.map(r => (
                <button key={r.period} onClick={() => loadReport(r.period)}
                  className={`w-full text-left px-4 py-3 border-t border-gray-50 hover:bg-gray-50 transition-colors ${activePeriod === r.period ? 'bg-[#f0f5ee]' : ''}`}>
                  <p className="text-sm font-semibold text-gray-800">{fmtPeriod(r.period)}</p>
                  <p className="text-xs text-gray-400">{r.totalBookings} bookings · {GHS(r.totalRevenueGHS)}</p>
                </button>
              ))}
            </div>
          )}

          {savedReports.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No saved reports yet. Generate one above or wait for auto-generation at the start of next month.</p>
          )}
        </div>

        {/* Report content */}
        <div>
          {loading && <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>}
          {!loading && activeReport && <ReportView report={activeReport} />}
          {!loading && !activeReport && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-300">
              <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              <p className="text-sm mt-3">Select a saved report or generate one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsPageInner />
    </Suspense>
  );
}
