'use client';

import { useState, useEffect } from 'react';
import type { PromoSlide } from '@/app/api/admin/promo-slides/route';

const ACCENT_PRESETS = [
  { label: 'Forest', value: '#2d5a27' },
  { label: 'Terracotta', value: '#BE6A45' },
  { label: 'Ocean', value: '#1a5276' },
  { label: 'Gold', value: '#b7850a' },
  { label: 'Dark', value: '#1a1a1a' },
];

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27] bg-white';
const LABEL = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1';

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function PromoSlidesPage() {
  const [slides, setSlides] = useState<PromoSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/promo-slides')
      .then(r => r.json())
      .then(d => { setSlides(d.slides ?? []); setLoading(false); })
      .catch(() => { setError('Failed to load slides'); setLoading(false); });
  }, []);

  function update(id: string, patch: Partial<PromoSlide>) {
    setSlides(s => s.map(sl => sl.id === id ? { ...sl, ...patch } : sl));
  }

  function move(id: string, dir: -1 | 1) {
    setSlides(s => {
      const i = s.findIndex(sl => sl.id === id);
      if (i + dir < 0 || i + dir >= s.length) return s;
      const next = [...s];
      [next[i], next[i + dir]] = [next[i + dir], next[i]];
      return next;
    });
  }

  function addSlide() {
    const id = genId();
    setSlides(s => [...s, {
      id,
      enabled: true,
      accentColor: '#2d5a27',
      badge: 'New',
      title: 'New slide',
      body: '',
      bullets: [],
      ctaLabel: 'Learn more',
      ctaHref: '#',
      imageUrl: '',
      openBooking: false,
    }]);
    setExpandedId(id);
  }

  function deleteSlide(id: string) {
    if (!confirm('Delete this slide?')) return;
    setSlides(s => s.filter(sl => sl.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  async function save() {
    setSaving(true);
    setError('');
    const res = await fetch('/api/admin/promo-slides', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Failed to save'); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="px-6 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promo Popup</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage homepage popup slides — content, order, and visibility</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="bg-[#2d5a27] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#245020] transition-colors disabled:opacity-60 text-sm"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</p>}

      <div className="space-y-3">
        {slides.map((sl, idx) => (
          <div key={sl.id} className={`bg-white rounded-2xl border transition-all ${sl.enabled ? 'border-gray-100 shadow-sm' : 'border-gray-100 opacity-60'}`}>
            {/* Slide header row */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Color swatch */}
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: sl.accentColor }} />

              {/* Toggle */}
              <button
                onClick={() => update(sl.id, { enabled: !sl.enabled })}
                className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${sl.enabled ? 'bg-[#2d5a27]' : 'bg-gray-200'}`}
                aria-label={sl.enabled ? 'Disable' : 'Enable'}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${sl.enabled ? 'left-4' : 'left-0.5'}`} />
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{sl.title}</p>
                <p className="text-xs text-gray-400">{sl.badge} · {sl.enabled ? 'Visible' : 'Hidden'}</p>
              </div>

              {/* Reorder */}
              <div className="flex gap-1">
                <button onClick={() => move(sl.id, -1)} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-lg leading-none px-1">↑</button>
                <button onClick={() => move(sl.id, 1)} disabled={idx === slides.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-lg leading-none px-1">↓</button>
              </div>

              {/* Expand / Delete */}
              <button
                onClick={() => setExpandedId(expandedId === sl.id ? null : sl.id)}
                className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {expandedId === sl.id ? 'Close' : 'Edit'}
              </button>
              <button onClick={() => deleteSlide(sl.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
            </div>

            {/* Expanded editor */}
            {expandedId === sl.id && (
              <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Badge text</label>
                    <input className={INPUT} value={sl.badge} onChange={e => update(sl.id, { badge: e.target.value })} />
                  </div>
                  <div>
                    <label className={LABEL}>Accent color</label>
                    <div className="flex gap-2 flex-wrap">
                      {ACCENT_PRESETS.map(p => (
                        <button
                          key={p.value}
                          title={p.label}
                          onClick={() => update(sl.id, { accentColor: p.value })}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${sl.accentColor === p.value ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                          style={{ background: p.value }}
                        />
                      ))}
                      <input type="color" value={sl.accentColor} onChange={e => update(sl.id, { accentColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border border-gray-200" title="Custom color" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Title</label>
                  <input className={INPUT} value={sl.title} onChange={e => update(sl.id, { title: e.target.value })} />
                </div>

                <div>
                  <label className={LABEL}>Body text</label>
                  <textarea className={INPUT} rows={3} value={sl.body} onChange={e => update(sl.id, { body: e.target.value })} />
                </div>

                <div>
                  <label className={LABEL}>Bullet points <span className="font-normal normal-case text-gray-400">(one per line)</span></label>
                  <textarea
                    className={INPUT}
                    rows={3}
                    value={sl.bullets.join('\n')}
                    onChange={e => update(sl.id, { bullets: e.target.value.split('\n').filter(Boolean) })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>CTA button label</label>
                    <input className={INPUT} value={sl.ctaLabel} onChange={e => update(sl.id, { ctaLabel: e.target.value })} />
                  </div>
                  <div>
                    <label className={LABEL}>CTA link</label>
                    <input className={INPUT} value={sl.ctaHref} onChange={e => update(sl.id, { ctaHref: e.target.value })} placeholder="#section or https://..." />
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Image URL <span className="font-normal normal-case text-gray-400">(optional — /images/file.jpg or https://…)</span></label>
                  <input className={INPUT} value={sl.imageUrl} onChange={e => update(sl.id, { imageUrl: e.target.value })} placeholder="/images/restaurant.jpg" />
                  {sl.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sl.imageUrl} alt="" className="mt-2 h-24 w-full object-cover rounded-lg" />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id={`ob-${sl.id}`} checked={!!sl.openBooking} onChange={e => update(sl.id, { openBooking: e.target.checked })} className="accent-[#2d5a27]" />
                  <label htmlFor={`ob-${sl.id}`} className="text-sm text-gray-600">CTA opens booking search modal</label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addSlide}
        className="mt-4 w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
      >
        + Add new slide
      </button>

      <p className="text-xs text-gray-400 mt-4">Changes are saved to the database — no redeploy needed. Popup shows to visitors 2.5 seconds after page load.</p>
    </div>
  );
}
