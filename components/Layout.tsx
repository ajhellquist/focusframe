import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import logo from '../focusframelogo.png';

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
          <div className="flex items-center">
            <img
              src={logo.src}
              alt="FocusFrame Logo"
              className="h-24 w-auto mr-4"
            />
            <nav className="space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-500">
                Dashboard
              </Link>
              <Link href="/todos" className="text-gray-700 hover:text-blue-500">
                To‑Dos
              </Link>
              <Link href="/habits" className="text-gray-700 hover:text-blue-500">
                Habits
              </Link>
            </nav>
          </div>
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