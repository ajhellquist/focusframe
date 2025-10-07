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

  // Helper function to get navigation link classes
  const getNavLinkClasses = (path: string) => {
    const isActive = isActiveRoute(path);
    return isActive
      ? "bg-[#569866] text-white font-semibold px-6 py-3 shadow-sm hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 transition-all duration-200 ease-out"
      : "text-gray-700 hover:text-blue-500 p-3 transition-colors duration-200";
  };

  // Helper function to get mobile navigation link classes
  const getMobileNavLinkClasses = (path: string) => {
    const isActive = isActiveRoute(path);
    return isActive
      ? "bg-[#569866] text-white font-semibold mx-4 my-1 px-6 py-3 shadow-sm rounded-full block hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
      : "text-gray-700 hover:text-blue-500 py-3 px-4 block transition-colors duration-200";
  };

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
              <Link 
                href="/dashboard" 
                className={getNavLinkClasses('/dashboard')}
                style={isActiveRoute('/dashboard') ? { borderRadius: '40px' } : {}}
              >
                Dashboard
              </Link>
              <Link 
                href="/todos" 
                className={getNavLinkClasses('/todos')}
                style={isActiveRoute('/todos') ? { borderRadius: '40px' } : {}}
              >
                To‑Dos
              </Link>
              <Link 
                href="/habits" 
                className={getNavLinkClasses('/habits')}
                style={isActiveRoute('/habits') ? { borderRadius: '40px' } : {}}
              >
                Habits
              </Link>
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
              <Link 
                href="/dashboard" 
                className={getMobileNavLinkClasses('/dashboard')}
              >
                Dashboard
              </Link>
              <Link 
                href="/todos" 
                className={getMobileNavLinkClasses('/todos')}
              >
                To‑Dos
              </Link>
              <Link 
                href="/habits" 
                className={getMobileNavLinkClasses('/habits')}
              >
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
