import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import logo from '../focusframe_logo_trimmed.png';

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white shadow relative"> {/* Added relative positioning */}
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img
              src={logo.src}
              alt="FocusFrame Logo"
              className="h-8 w-auto mr-4"
            />
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-500 p-3">
                Dashboard
              </Link>
              <Link href="/todos" className="text-gray-700 hover:text-blue-500 p-3">
                To‑Dos
              </Link>
              <Link href="/habits" className="text-gray-700 hover:text-blue-500 p-3">
                Habits
              </Link>
            </nav>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleSignOut}
              className="bg-red-500 text-white px-3 py-3 rounded mr-4"
            >
              Sign Out
            </button>
            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden text-gray-700 hover:text-blue-500 focus:outline-none focus:text-blue-500 p-3"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          // Added absolute positioning, width, border, and z-index for overlay
          <div className="md:hidden bg-white shadow-lg absolute w-full left-0 border-t border-gray-200 z-10">
            <nav className="flex flex-col py-2">
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-500 py-3 px-4 block">
                Dashboard
              </Link>
              <Link href="/todos" className="text-gray-700 hover:text-blue-500 py-3 px-4 block">
                To‑Dos
              </Link>
              <Link href="/habits" className="text-gray-700 hover:text-blue-500 py-3 px-4 block">
                Habits
              </Link>
            </nav>
          </div>
        )}
      </header>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}