'use client';

import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  {
    label: 'Bookings', href: '/admin',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  },
  {
    label: 'Messages', href: '/admin/messages',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    label: 'Revenue', href: '/admin/revenue',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    label: 'Rooms', href: '/admin/rooms',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    label: 'Settings', href: '/admin/settings',
    icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  }

  return (
    <aside className="w-56 shrink-0 min-h-screen bg-[#1a3518] flex flex-col sticky top-0 h-screen">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#BE6A45] rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">B</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">BokoBoko</p>
            <p className="text-white/40 text-[10px]">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ label, href, icon }) => {
          const isActive = pathname === href;
          return (
            <a
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/55 hover:text-white hover:bg-white/8'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-white/50'}>{icon}</span>
              {label}
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#BE6A45]" />}
            </a>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-0.5">
        <a
          href="/admin/new-booking"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            pathname === '/admin/new-booking'
              ? 'bg-white/15 text-white'
              : 'text-white/55 hover:text-white hover:bg-white/8'
          }`}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
          </svg>
          New Booking
        </a>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/55 hover:text-white hover:bg-white/8 transition-all"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
