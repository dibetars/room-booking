'use client';

import { useEffect, useState, useRef } from 'react';

interface Message {
  id: number;
  bookingId: number;
  time: string;
  message: string;
  type: 'guest' | 'owner' | 'system' | 'internal';
  from?: string;
}

interface Conversation {
  bookingId: number;
  guestName: string;
  room: string;
  arrival: string;
  referer?: string;
  messages: Message[];
  lastTime: string;
  unread: number;
}

const CHANNEL_BADGE: Record<string, { label: string; className: string }> = {
  'booking.com':  { label: 'Booking.com', className: 'bg-blue-100 text-blue-700' },
  'airbnb':       { label: 'Airbnb',      className: 'bg-rose-100 text-rose-700' },
  'hostelworld':  { label: 'Hostelworld', className: 'bg-purple-100 text-purple-700' },
  'expedia':      { label: 'Expedia',     className: 'bg-yellow-100 text-yellow-800' },
};

function channelBadge(referer?: string) {
  if (!referer) return { label: 'Direct', className: 'bg-green-100 text-green-700' };
  return CHANNEL_BADGE[referer.toLowerCase()] ?? { label: referer, className: 'bg-gray-100 text-gray-600' };
}

function timeAgo(t: string) {
  const diff = Date.now() - new Date(t).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ROOM_NAMES: Record<string, string> = {
  '2634263': 'Bungalow 1',
  '2509568': 'Bungalow 2',
  '2634338': 'Bungalow 3a',
  '2634343': 'Bungalow 3b',
  '2509563': 'Family Suite',
};

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState<Conversation | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/messages')
      .then((r) => r.json())
      .then((d) => {
        setConversations(d.conversations ?? []);
        setLoading(false);
      })
      .catch(() => { setError('Failed to load messages'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [active]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !reply.trim()) return;
    setSending(true);
    setSendError('');

    const res = await fetch('/api/admin/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: active.bookingId, message: reply.trim() }),
    });

    setSending(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSendError(d.error ?? 'Send failed');
      return;
    }

    // Optimistically append the message
    const optimistic: Message = {
      id: Date.now(),
      bookingId: active.bookingId,
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      message: reply.trim(),
      type: 'owner',
      from: 'You',
    };
    const updated = { ...active, messages: [...active.messages, optimistic] };
    setActive(updated);
    setConversations((prev) =>
      prev.map((c) => c.bookingId === active.bookingId ? updated : c)
    );
    setReply('');
  }

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="flex px-4 py-6 gap-4 w-full" style={{ height: 'calc(100vh - 48px)' }}>

        {/* Conversation list */}
        <div className="w-80 shrink-0 bg-white rounded-2xl shadow flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-sm">
              Inbox
              {totalUnread > 0 && (
                <span className="ml-2 bg-[#BE6A45] text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </h2>
            <button
              onClick={() => { setLoading(true); fetch('/api/admin/messages').then(r => r.json()).then(d => { setConversations(d.conversations ?? []); setLoading(false); }); }}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >↻</button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading && <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>}
            {error && <div className="py-8 text-center text-red-500 text-sm">{error}</div>}
            {!loading && !error && conversations.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">No messages yet.</div>
            )}
            {conversations.map((c) => {
              const last = c.messages[c.messages.length - 1];
              const badge = channelBadge(c.referer);
              const isActive = active?.bookingId === c.bookingId;
              return (
                <button
                  key={c.bookingId}
                  onClick={() => { setActive(c); setSendError(''); }}
                  className={`w-full text-left px-4 py-3 transition-colors ${isActive ? 'bg-[#f5f0e8]' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-800 text-sm truncate">{c.guestName}</p>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.lastTime)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 mb-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.className}`}>
                      {badge.label}
                    </span>
                    {c.room && (
                      <span className="text-[10px] text-gray-400">{ROOM_NAMES[c.room] ?? `Room ${c.room}`}</span>
                    )}
                    {c.unread > 0 && (
                      <span className="ml-auto bg-[#BE6A45] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  {last && (
                    <p className="text-xs text-gray-400 truncate">
                      {last.type === 'owner' ? 'You: ' : ''}{last.message}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 bg-white rounded-2xl shadow flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Select a conversation
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-5 py-3 border-b flex items-center gap-3">
                <div>
                  <p className="font-bold text-gray-800">{active.guestName}</p>
                  <p className="text-xs text-gray-400">
                    Booking #{active.bookingId}
                    {active.arrival ? ` · Arrival ${active.arrival}` : ''}
                    {active.room ? ` · ${ROOM_NAMES[active.room] ?? `Room ${active.room}`}` : ''}
                  </p>
                </div>
                {(() => { const b = channelBadge(active.referer); return (
                  <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${b.className}`}>{b.label}</span>
                ); })()}
              </div>

              {/* Messages */}
              <div ref={threadRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {active.messages
                  .filter((m) => m.type !== 'internal')
                  .map((m) => {
                    const isHost = m.type === 'owner';
                    return (
                      <div key={m.id} className={`flex ${isHost ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                          isHost
                            ? 'bg-[#2d5a27] text-white rounded-br-sm'
                            : m.type === 'system'
                            ? 'bg-gray-100 text-gray-500 text-xs italic'
                            : 'bg-[#f5f0e8] text-gray-800 rounded-bl-sm'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
                          <p className={`text-[10px] mt-1 ${isHost ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                            {m.from && !isHost ? `${m.from} · ` : ''}{new Date(m.time).toLocaleString('en-GH', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Reply box */}
              <form onSubmit={sendReply} className="border-t px-4 py-3 flex gap-3 items-end">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e as unknown as React.FormEvent); } }}
                  placeholder="Type a reply… (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#2d5a27] resize-none"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="bg-[#2d5a27] text-white font-semibold px-4 py-2 rounded-xl hover:bg-[#245020] transition-colors disabled:opacity-50 text-sm shrink-0"
                >
                  {sending ? '…' : 'Send'}
                </button>
              </form>
              {sendError && <p className="px-4 pb-2 text-xs text-red-500">{sendError}</p>}
            </>
          )}
        </div>
    </div>
  );
}
