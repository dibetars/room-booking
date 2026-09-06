'use client';

import { useEffect, useState } from 'react';

interface EmailTypeInfo {
  id: string;
  label: string;
  description: string;
  autoSent: boolean;
  autoSentWhen: string;
}

interface Preview {
  subject: string;
  html: string;
  autoSent: boolean;
  autoSentWhen: string;
  description: string;
}

export default function AdminEmailsPage() {
  const [types, setTypes] = useState<EmailTypeInfo[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/emails')
      .then((r) => r.json())
      .then((d) => {
        const list: EmailTypeInfo[] = d.types ?? [];
        setTypes(list);
        if (list[0]) setSelected(list[0].id);
      })
      .catch(() => setError('Failed to load email types'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setPreview(null);
    fetch(`/api/admin/emails?type=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setError('');
        setPreview(d);
      })
      .catch(() => setError('Failed to load preview'));
  }, [selected]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Emails</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Preview guest emails. Direct (website / admin) bookings only — Airbnb and Booking.com guests are not emailed from this app.
        </p>
      </div>

      {loading && <div className="py-16 text-center text-gray-400">Loading templates…</div>}
      {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      {!loading && (
        <div className="grid lg:grid-cols-[280px_1fr] gap-5 items-start">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Templates</p>
            </div>
            <ul className="p-2 space-y-0.5">
              {types.map((t) => {
                const active = t.id === selected;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(t.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                        active ? 'bg-[#2d5a27] text-white' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium block">{t.label}</span>
                      <span className={`text-[11px] ${active ? 'text-white/70' : 'text-gray-400'}`}>
                        {t.autoSent ? 'Auto-sent' : 'Preview only'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-4">
            {preview && (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Subject</p>
                      <p className="font-semibold text-gray-800">{preview.subject}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      preview.autoSent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {preview.autoSent ? 'Auto-sent' : 'Preview only'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{preview.description}</p>
                  <p className="text-xs text-gray-400">{preview.autoSentWhen}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">HTML preview</p>
                    <p className="text-[11px] text-gray-400">Sample data · iframe</p>
                  </div>
                  <iframe
                    title="Email preview"
                    sandbox=""
                    srcDoc={preview.html}
                    className="w-full bg-[#f5f0e8] border-0"
                    style={{ height: 640 }}
                  />
                </div>
              </>
            )}
            {!preview && !error && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-20 text-center text-gray-400 text-sm">
                Select a template to preview
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
