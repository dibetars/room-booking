'use client';

import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { label: 'Bookings', href: '/admin' },
  { label: 'Revenue', href: '/admin/revenue' },
  { label: 'Rooms', href: '/admin/rooms' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
  }

  return (
    <header className="bg-[#2d5a27] text-white px-5 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg shrink-0">BokoBoko Admin</span>
          <nav className="flex gap-1">
            {NAV.map(({ label, href }) => (
              <a key={href} href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === href ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}>
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin/new-booking"
            className="bg-white text-[#2d5a27] font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-[#f5f0e8] transition-colors">
            + New Booking
          </a>
          <button onClick={logout} className="text-white/70 text-sm hover:text-white transition-colors">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
