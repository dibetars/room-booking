'use client';

import { useState } from 'react';

const PRESETS = [
  { label: 'Bookings (upcoming)', url: '/api/admin/bookings?daysBack=0&daysAhead=60', method: 'GET' },
  { label: 'Bookings (past 30d)', url: '/api/admin/bookings?daysBack=30&daysAhead=0', method: 'GET' },
  { label: 'Messages by booking', url: '/api/admin/messages?bookingId=', method: 'GET' },
  { label: 'Revenue', url: '/api/admin/revenue', method: 'GET' },
  { label: 'Availability', url: '/api/availability?checkIn=2026-08-01&checkOut=2026-08-05&adults=2&children=0', method: 'GET' },
];

export default function ApiCheckPage() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<{ status: number; headers: Record<string, string>; body: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  async function handleSend() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setElapsed(null);
    const t0 = Date.now();
    try {
      const opts: RequestInit = { method };
      if (body.trim() && method !== 'GET') {
        opts.headers = { 'Content-Type': 'application/json' };
        opts.body = body.trim();
      }
      const res = await fetch(url.trim(), opts);
      const ms = Date.now() - t0;
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { headers[k] = v; });
      const text = await res.text();
      let pretty = text;
      try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch { /* not JSON */ }
      setResponse({ status: res.status, headers, body: pretty });
      setElapsed(ms);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    }
    setLoading(false);
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    setMethod(preset.method);
    setUrl(preset.url);
    setBody('');
    setResponse(null);
    setError(null);
  }

  const statusColor = response
    ? response.status < 300 ? 'text-green-600' : response.status < 500 ? 'text-yellow-600' : 'text-red-600'
    : '';

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-800">API Check</h1>
        <p className="text-sm text-gray-400 mt-0.5">Test API endpoints and inspect raw responses</p>
      </div>

      {/* Presets */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-[#2d5a27] hover:text-[#2d5a27] transition-colors bg-white"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Request builder */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30 bg-white font-mono"
          >
            {['GET', 'POST', 'PATCH', 'DELETE'].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="/api/admin/bookings"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
          />
          <button
            onClick={handleSend}
            disabled={loading || !url.trim()}
            className="px-4 py-2 bg-[#2d5a27] text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-[#234a20] transition-colors"
          >
            {loading ? 'Sending…' : 'Send'}
          </button>
        </div>

        {method !== 'GET' && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Request body (JSON)</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{ "key": "value" }'
              rows={4}
              className="w-full text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30 resize-y"
            />
          </div>
        )}
      </div>

      {/* Response */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {response && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className={`text-sm font-semibold font-mono ${statusColor}`}>
              {response.status}
            </span>
            {elapsed !== null && (
              <span className="text-xs text-gray-400">{elapsed}ms</span>
            )}
            <button
              onClick={() => navigator.clipboard.writeText(response.body)}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600"
            >
              Copy
            </button>
          </div>

          {/* Headers */}
          <details className="border-b border-gray-100">
            <summary className="px-4 py-2 text-xs text-gray-500 cursor-pointer select-none hover:bg-gray-50">
              Headers ({Object.keys(response.headers).length})
            </summary>
            <div className="px-4 py-2 space-y-0.5">
              {Object.entries(response.headers).map(([k, v]) => (
                <div key={k} className="flex gap-3 text-xs font-mono">
                  <span className="text-gray-500 min-w-[180px]">{k}</span>
                  <span className="text-gray-700 break-all">{v}</span>
                </div>
              ))}
            </div>
          </details>

          {/* Body */}
          <pre className="px-4 py-4 text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-words max-h-[500px] overflow-y-auto">
            {response.body || '(empty body)'}
          </pre>
        </div>
      )}
    </div>
  );
}
