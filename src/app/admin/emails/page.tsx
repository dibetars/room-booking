'use client';

import { useEffect, useState } from 'react';

interface EmailTypeInfo {
  id: string;
  label: string;
  description: string;
  autoSent: boolean;
  autoSentWhen: string;
}

interface EmailCopy {
  subject: string;
  heading: string;
  preheader: string;
  body: string;
}

const PLACEHOLDERS = [
  '{{firstName}}', '{{guestName}}', '{{roomName}}', '{{checkIn}}', '{{checkOut}}',
  '{{nights}}', '{{guests}}', '{{reference}}', '{{amount}}', '{{stayCard}}',
];

const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27]';

export default function AdminEmailsPage() {
  const [types, setTypes] = useState<EmailTypeInfo[]>([]);
  const [selected, setSelected] = useState('');
  const [copy, setCopy] = useState<EmailCopy | null>(null);
  const [html, setHtml] = useState('');
  const [subjectPreview, setSubjectPreview] = useState('');
  const [customized, setCustomized] = useState(false);
  const [autoSent, setAutoSent] = useState(false);
  const [autoSentWhen, setAutoSentWhen] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

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
    setError('');
    setSaved(false);
    fetch(`/api/admin/emails?type=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setCopy(d.copy);
        setHtml(d.html);
        setSubjectPreview(d.subject);
        setCustomized(Boolean(d.customized));
        setAutoSent(Boolean(d.autoSent));
        setAutoSentWhen(d.autoSentWhen ?? '');
        setDescription(d.description ?? '');
      })
      .catch(() => setError('Failed to load preview'));
  }, [selected]);

  async function previewDraft() {
    if (!copy) return;
    setPreviewing(true);
    setError('');
    const res = await fetch('/api/admin/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: selected, copy }),
    });
    const data = await res.json();
    setPreviewing(false);
    if (!res.ok) { setError(data.error ?? 'Preview failed'); return; }
    setHtml(data.html);
    setSubjectPreview(data.subject);
  }

  async function save() {
    if (!copy) return;
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/emails', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: selected, copy }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Save failed'); return; }
    setHtml(data.html);
    setSubjectPreview(data.subject);
    setCustomized(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function resetDefault() {
    if (!confirm('Reset this template to the default copy?')) return;
    const res = await fetch(`/api/admin/emails?type=${encodeURIComponent(selected)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Reset failed'); return; }
    setCopy(data.copy);
    setHtml(data.html);
    setSubjectPreview(data.subject);
    setCustomized(false);
  }

  function insertToken(token: string) {
    if (!copy) return;
    setCopy({ ...copy, body: copy.body + (copy.body.endsWith('\n') || copy.body === '' ? '' : ' ') + token });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Emails</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Edit and preview guest emails. Direct (website / admin) bookings only — Airbnb and Booking.com guests are not emailed from this app.
        </p>
      </div>

      {loading && <div className="py-16 text-center text-gray-400">Loading templates…</div>}
      {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      {!loading && (
        <div className="grid lg:grid-cols-[240px_1fr] gap-5 items-start">
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
            {copy && (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-500">{description}</p>
                      <p className="text-xs text-gray-400 mt-1">{autoSentWhen}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      autoSent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {customized ? 'Custom' : autoSent ? 'Auto-sent' : 'Preview only'}
                    </span>
                  </div>

                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Subject
                    <input className={`${FIELD} mt-1 font-normal normal-case tracking-normal`} value={copy.subject}
                      onChange={e => setCopy({ ...copy, subject: e.target.value })} />
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Heading
                      <input className={`${FIELD} mt-1 font-normal normal-case tracking-normal`} value={copy.heading}
                        onChange={e => setCopy({ ...copy, heading: e.target.value })} />
                    </label>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Preview text
                      <input className={`${FIELD} mt-1 font-normal normal-case tracking-normal`} value={copy.preheader}
                        onChange={e => setCopy({ ...copy, preheader: e.target.value })} />
                    </label>
                  </div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Body
                    <textarea
                      rows={12}
                      className={`${FIELD} mt-1 font-normal normal-case tracking-normal font-mono text-[13px] leading-relaxed`}
                      value={copy.body}
                      onChange={e => setCopy({ ...copy, body: e.target.value })}
                    />
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map(token => (
                      <button key={token} type="button" onClick={() => insertToken(token)}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200 hover:border-[#2d5a27] hover:text-[#2d5a27]">
                        {token}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Blank lines start a new paragraph. Put <code className="bg-gray-50 px-1 rounded">{'{{stayCard}}'}</code> where the booking details table should appear. Check-in time is in the body copy so you can edit it here.</p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button type="button" onClick={previewDraft} disabled={previewing}
                      className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                      {previewing ? 'Updating…' : 'Refresh preview'}
                    </button>
                    <button type="button" onClick={save} disabled={saving}
                      className="px-4 py-2 text-sm rounded-lg bg-[#2d5a27] text-white font-semibold hover:bg-[#245020] disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save template'}
                    </button>
                    {customized && (
                      <button type="button" onClick={resetDefault} className="text-sm text-gray-400 hover:text-red-600 px-2">
                        Reset to default
                      </button>
                    )}
                    {saved && <span className="text-sm text-green-700">Saved.</span>}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Subject preview</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{subjectPreview}</p>
                  </div>
                  <iframe
                    title="Email preview"
                    sandbox=""
                    srcDoc={html}
                    className="w-full bg-[#f5f0e8] border-0"
                    style={{ height: 640 }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
