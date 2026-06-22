'use client';

import { usePathname } from 'next/navigation';
import AdminNav from './_components/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-[#f5f0e8]">
        {children}
      </main>
    </div>
  );
}
