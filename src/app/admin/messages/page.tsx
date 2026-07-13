'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface Booking {
  id?: number;
  roomId: number;
  arrival: string;
  departure: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  referer?: string;
}

interface Message {
  id: number;
  bookingId: number;
  time: string;
  read?: boolean;
  message: string;
  source: 'guest' | 'host';
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatFullTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function MessagesPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    setBookingsError(null);
    try {
      const res = await fetch('/api/admin/bookings?daysBack=90&daysAhead=90');
      const data = await res.json();
      if (!res.ok) { setBookingsError(data.error ?? 'Failed to load bookings'); setLoadingBookings(false); return; }
      const valid = (data.bookings ?? []).filter((b: Booking) => !!b.id && b.channel !== 'direct');
      setBookings(valid);
      if (valid.length && !selected) setSelected(valid[0]);
    } catch {
      setBookingsError('Failed to load bookings');
    }
    setLoadingBookings(false);
  }, [selected]);

  const loadMessages = useCallback(async (bookingId: number) => {
    setLoadingMessages(true);
    setMessagesError(null);
    try {
      const res = await fetch(`/api/admin/messages?bookingId=${bookingId}`);
      const data = await res.json();
      if (!res.ok) { setMessagesError(data.error ?? 'Failed to load messages'); setLoadingMessages(false); return; }
      const sorted = (data.messages ?? []).slice().sort(
        (a: Message, b: Message) => a.time.localeCompare(b.time)
      );
      setMessages(sorted);
    } catch {
      setMessagesError('Failed to load messages');
    }
    setLoadingMessages(false);
  }, []);

  useEffect(() => { loadBookings(); }, []);

  useEffect(() => {
    if (selected?.id) loadMessages(selected.id);
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!reply.trim() || !selected?.id) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: selected.id, message: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setSendError(data.error ?? 'Failed to send'); setSending(false); return; }
      setReply('');
      await loadMessages(selected.id);
    } catch {
      setSendError('Failed to send');
    }
    setSending(false);
  }

  if (loadingBookings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (bookingsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-red-500 text-sm">{bookingsError}</p>
        <button onClick={loadBookings} className="text-sm text-[#2d5a27] underline">Retry</button>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-14 h-14 bg-[#2d5a27]/10 rounded-2xl flex items-center justify-center mb-4">
          <svg width="28" height="28" fill="none" stroke="#2d5a27" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">No bookings</h2>
        <p className="text-gray-400 text-sm">Bookings with messages will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Booking list */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Bookings</span>
          <button onClick={loadBookings} className="text-xs text-[#2d5a27] hover:underline">Refresh</button>
        </div>
        {bookings.map((b) => {
          const isActive = selected?.id === b.id;
          const guestName = `${b.firstName} ${b.lastName}`.trim();
          return (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isActive ? 'bg-[#2d5a27]/5 border-l-2 border-l-[#2d5a27]' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-gray-800 truncate">{guestName}</span>
                <span className="text-[11px] text-gray-400 flex-shrink-0">
                  {b.arrival ? formatTime(b.arrival) : ''}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-gray-400">
                Room {b.roomId} · {b.arrival ? new Date(b.arrival).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''} → {b.departure ? new Date(b.departure).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
              </div>
            </button>
          );
        })}
      </div>

      {/* Thread */}
      {selected && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-3 border-b border-gray-200 bg-white">
            <p className="text-sm font-semibold text-gray-800">
              {`${selected.firstName} ${selected.lastName}`.trim()}
            </p>
            <p className="text-xs text-gray-400">
              Booking #{selected.id} · Room {selected.roomId}
              {selected.arrival ? ` · Check-in ${new Date(selected.arrival).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-[#f7f5f0]">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading messages…</div>
            ) : messagesError ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <p className="text-red-500 text-sm">{messagesError}</p>
                <button onClick={() => selected.id && loadMessages(selected.id)} className="text-sm text-[#2d5a27] underline">Retry</button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">No messages for this booking</div>
            ) : (
              messages.map((msg) => {
                const isHost = msg.source === 'host';

                const bubbleClass = isHost
                  ? 'bg-[#2d5a27] text-white rounded-br-sm'
                  : 'bg-blue-50 text-blue-900 border border-blue-100 rounded-bl-sm';
                const timeClass = isHost ? 'text-white/60' : 'text-blue-400';
                const labelClass = isHost ? 'text-white/50' : 'text-blue-400';

                return (
                  <div key={msg.id} className={`flex flex-col ${isHost ? 'items-end' : 'items-start'}`}>
                    <span className={`text-[10px] mb-0.5 px-1 ${labelClass}`}>
                      {isHost ? 'You' : 'Guest'}
                    </span>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${bubbleClass}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${timeClass}`}>
                        {formatFullTime(msg.time)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply box */}
          <div className="px-6 py-3 border-t border-gray-200 bg-white">
            {sendError && <p className="text-xs text-red-500 mb-2">{sendError}</p>}
            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message… (Enter to send)"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a27]/30"
              />
              <button
                onClick={handleSend}
                disabled={sending || !reply.trim()}
                className="px-4 py-2 bg-[#2d5a27] text-white text-sm font-medium rounded-xl disabled:opacity-40 hover:bg-[#234a20] transition-colors self-end"
              >
                {sending ? '…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
