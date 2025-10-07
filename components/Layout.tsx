import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ArrowRightEndOnRectangleIcon from '@heroicons/react/24/outline/ArrowRightEndOnRectangleIcon';
import { supabase } from '../lib/supabaseClient';

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [lastActiveRoute, setLastActiveRoute] = useState<string>(router.pathname);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Update the last active route when navigation completes
  useEffect(() => {
    const handleRouteChangeComplete = (url: string) => {
      // Extract pathname from the URL
      const pathname = url.split('?')[0];
      setLastActiveRoute(pathname);
    };

    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router]);

  // Helper function to check if a route is active
  const isActiveRoute = (path: string) => {
    // Use lastActiveRoute instead of router.pathname to prevent flicker
    return lastActiveRoute === path;
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/todos', label: 'To‑Dos' },
    { path: '/habits', label: 'Habits' }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white shadow relative"> {/* Added relative positioning */}
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <img
              src="/focusframe_logo_trimmed.png"
              alt="FocusFrame Logo"
              className="h-8 w-auto mr-4"
            />
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-4">
              {navItems.map(({ path, label }) => {
                const isActive = isActiveRoute(path);
                if (isActive) {
                  return (
                    <Link
                      key={path}
                      href={path}
                      className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-6 py-3 text-base font-semibold text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 backdrop-blur-xl border border-white/30 shadow-[0_18px_35px_-18px_rgba(34,87,51,0.75)] hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-[#325f40]/95 via-[#569866]/70 to-[#1f3a26]/95 transition-colors duration-300"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-full bg-white/40 opacity-0 transition-opacity duration-300 group-hover:opacity-30"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-[45%] translate-y-[65%] rotate-12 rounded-full bg-white/25 opacity-0 transition duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-40"
                      />
                      <span className="relative z-10">{label}</span>
                    </Link>
                  );
                }
                return (
                  <Link
                    key={path}
                    href={path}
                    className="relative inline-flex items-center justify-center rounded-full px-5 py-2.5 text-base font-medium text-gray-700 transition-colors duration-200 hover:text-[#25603a]"
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center">
            <div className="relative group mr-4"> {/* Wrapper takes the margin */}
              <button
                onClick={handleSignOut}
                aria-label="Sign Out"
                className="group w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:scale-95 transition-all duration-150 ease-in-out"
                // Removed mr-4 from button as it's now on the parent div
              >
                <ArrowRightEndOnRectangleIcon className="w-5 h-5" />
              </button>
              <span 
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-150 delay-300 z-10 whitespace-nowrap"
                // Added z-10 to ensure tooltip is above other elements if necessary
              >
                Sign Out
              </span>
            </div>
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
              {navItems.map(({ path, label }) => {
                const isActive = isActiveRoute(path);
                if (isActive) {
                  return (
                    <Link
                      key={path}
                      href={path}
                      className="group relative mx-4 my-1 inline-flex items-center justify-center overflow-hidden rounded-full px-6 py-3 text-base font-semibold text-white transition-all duration-300 backdrop-blur-xl border border-white/30 shadow-[0_18px_35px_-18px_rgba(34,87,51,0.75)] focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-[#325f40]/95 via-[#569866]/70 to-[#1f3a26]/95 transition-colors duration-300"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-full bg-white/40 opacity-0 transition-opacity duration-300 group-hover:opacity-30"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-[55%] translate-y-[70%] rotate-12 rounded-full bg-white/25 opacity-0 transition duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-35"
                      />
                      <span className="relative z-10">{label}</span>
                    </Link>
                  );
                }
                return (
                  <Link
                    key={path}
                    href={path}
                    className="py-3 px-4 text-gray-700 transition-colors duration-200 hover:text-[#25603a]"
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}
