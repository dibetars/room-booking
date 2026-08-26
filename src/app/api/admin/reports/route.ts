import { NextRequest, NextResponse } from 'next/server';
import {
  generateReport, getReport, saveReport, listReports,
  prevMonthPeriod, periodToDates,
} from '@/lib/reports';

// GET /api/admin/reports — list all saved reports
// GET /api/admin/reports?period=2026-07 — fetch one report
// GET /api/admin/reports?check=prev — check/auto-generate last month's report
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const period = searchParams.get('period');
  if (period) {
    const report = await getReport(period);
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    return NextResponse.json({ report });
  }

  if (searchParams.get('check') === 'prev') {
    const prev = prevMonthPeriod();
    const existing = await getReport(prev);
    if (existing) {
      return NextResponse.json({ generated: false, period: prev, report: existing });
    }
    // Auto-generate
    try {
      const { dateFrom, dateTo } = periodToDates(prev);
      const report = await generateReport(dateFrom, dateTo, prev);
      await saveReport(report);
      return NextResponse.json({ generated: true, period: prev, report });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    const reports = await listReports();
    return NextResponse.json({ reports });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/reports — generate + save a report for a custom date range
export async function POST(req: NextRequest) {
  const { dateFrom, dateTo, period } = await req.json().catch(() => ({}));
  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: 'dateFrom and dateTo required' }, { status: 400 });
  }
  const p = period ?? dateFrom.slice(0, 7);
  try {
    const report = await generateReport(dateFrom, dateTo, p);
    await saveReport(report);
    return NextResponse.json({ report });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
