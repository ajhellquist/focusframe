import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <nav className="space-x-4">
            <Link href="/dashboard">
              <a className="text-gray-700 hover:text-blue-500">Dashboard</a>
            </Link>
            <Link href="/todos">
              <a className="text-gray-700 hover:text-blue-500">To‑Dos</a>
            </Link>
            <Link href="/habits">
              <a className="text-gray-700 hover:text-blue-500">Habits</a>
            </Link>
          </nav>
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white px-3 py-1 rounded"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}