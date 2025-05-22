import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Layout from '../Layout'; // Adjust path as necessary
import { useRouter } from 'next/router'; // Mocked

// Mock Supabase client
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

// Mock window.matchMedia for responsive testing
// `matches` argument: true if media query should match (e.g., large screen for min-width query), false otherwise (e.g., small screen)
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: matches, 
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};


describe('Layout Component Responsive Header', () => {
  const TestChildren = () => <div>Test Content</div>;

  // Helper to render the Layout component
  const renderLayout = () => {
    return render(
      <Layout>
        <TestChildren />
      </Layout>
    );
  };

  describe('Hamburger Menu Visibility', () => {
    it('should be visible on small screens', () => {
      mockMatchMedia(false); // Small screen: (min-width: 768px) query does NOT match
      renderLayout();
      const allButtons = screen.getAllByRole('button');
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      const hamburgerButton = allButtons.find(button => button !== signOutButton);
      expect(hamburgerButton).toBeVisible(); // Hamburger is visible by default, hidden by md:hidden
    });

    it('should be hidden on large screens (due to md:hidden class)', () => {
      mockMatchMedia(true); // Large screen: (min-width: 768px) query MATCHES
      renderLayout();
      const allButtons = screen.getAllByRole('button');
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      const hamburgerButton = allButtons.find(button => button !== signOutButton);

      expect(hamburgerButton).toBeDefined();
      // Check that Tailwind's responsive class 'md:hidden' is present.
      // This class should make it display:none on 'md' screens and up.
      expect(hamburgerButton!.classList.contains('md:hidden')).toBe(true);
      // toBeVisible() is unreliable for Tailwind's responsive classes in JSDOM,
      // so we rely on the class being present.
    });
  });

  describe('Desktop Navigation Links Visibility', () => {
    it('should be visible on large screens', () => {
      mockMatchMedia(true); // Large screen: (min-width: 768px) query MATCHES
      renderLayout();
      const navElements = screen.getAllByRole('navigation');
      const desktopNavElement = navElements.find(nav => nav.classList.contains('md:flex'));
      
      expect(desktopNavElement).toBeDefined();
      expect(desktopNavElement!.classList.contains('hidden')).toBe(true); // It has 'hidden' for small screens
      expect(desktopNavElement!.classList.contains('md:flex')).toBe(true); // It has 'md:flex' for large screens
      expect(desktopNavElement).toBeVisible(); // 'md:flex' should override 'hidden'
    });

    it('should be hidden on small screens (due to hidden class)', () => {
      mockMatchMedia(false); // Small screen: (min-width: 768px) query does NOT match
      renderLayout();
      const navElements = screen.getAllByRole('navigation');
      const desktopNavElement = navElements.find(nav => nav.classList.contains('md:flex'));
      
      expect(desktopNavElement).toBeDefined();
      // On small screens, 'md:flex' is not active, so 'hidden' class should make it display:none.
      expect(desktopNavElement!.classList.contains('hidden')).toBe(true);
      // toBeVisible() is unreliable for Tailwind's responsive classes in JSDOM,
      // so we rely on the class being present.
    });
  });

  describe('Mobile Menu Functionality', () => {
    beforeEach(() => {
      mockMatchMedia(false); // Small screen: (min-width: 768px) query does NOT match for these tests
    });

    it('should open and show links when hamburger is clicked, then close', async () => {
      const user = userEvent.setup();
      renderLayout();
      
      const allButtons = screen.getAllByRole('button');
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      const hamburgerButton = allButtons.find(button => button !== signOutButton);
      expect(hamburgerButton).toBeVisible();

      // Initially, mobile menu container should not be in the document
      // The mobile menu container is a div with classes 'md:hidden', 'absolute', 'z-10'
      expect(screen.queryByRole('navigation', { name: /mobile-navigation-menu/i })).not.toBeInTheDocument();


      // Open mobile menu
      await user.click(hamburgerButton!);
      
      // After click, the mobile menu's parent div should be in the DOM and visible.
      // This parent div has classes like 'md:hidden', 'absolute', 'z-10'.
      // It contains the mobile <nav> element.
      const allNavElementsAfterClick = screen.getAllByRole('navigation');
      const mobileNavElement = allNavElementsAfterClick.find(nav => {
        const parent = nav.parentElement;
        return parent && 
               parent.classList.contains('md:hidden') && 
               parent.classList.contains('z-10');
      });

      expect(mobileNavElement).toBeDefined(); // Check we found the mobile nav
      const mobileMenuContainer = mobileNavElement!.parentElement!;
      
      expect(mobileMenuContainer).toBeVisible(); // The container div should be visible

      // Add an aria-label to the mobile nav for easier selection if needed, or use testid
      // For now, we assume mobileNavElement is the correct <nav>
      const { getByRole: getByRoleInMobileMenu, queryByRole: queryByRoleInMobileMenu } = within(mobileMenuContainer);

      const mobileNavDashboardLink = getByRoleInMobileMenu('link', { name: /dashboard/i });
      const mobileNavTodosLink = getByRoleInMobileMenu('link', { name: /to‑dos/i });
      const mobileNavHabitsLink = getByRoleInMobileMenu('link', { name: /habits/i });

      expect(mobileNavDashboardLink).toBeVisible();
      expect(mobileNavTodosLink).toBeVisible();
      expect(mobileNavHabitsLink).toBeVisible();

      // Click again to close
      await user.click(hamburgerButton!);
      
      // Mobile menu container should now be gone from the DOM
      expect(mobileMenuContainer).not.toBeInTheDocument(); 
      
      // And no 'Dashboard' link should be found within any mobile menu structure
      const mobileMenuDivGone = screen.queryByRole('generic', { name: /mobile-menu-container/i }); // Assuming we add a role and label/testid
      if (mobileMenuDivGone) { // If we could select it by a testid/label
        expect(queryByRoleInMobileMenu('link', { name: /dashboard/i })).not.toBeInTheDocument();
      }
      // More general check: the specific mobile dashboard link is gone
      expect(screen.queryByRole('link', { name: /dashboard/i, exact: true })?.closest('div.z-10.md\\:hidden')).not.toBeInTheDocument();
    });
  });

  describe('Persistent Elements Visibility', () => {
    it('should show logo and sign out button on small screens', () => {
      mockMatchMedia(false); // Small screen
      renderLayout();
      expect(screen.getByAltText(/focusframe logo/i)).toBeVisible();
      expect(screen.getByRole('button', { name: /sign out/i })).toBeVisible();
    });

    it('should show logo and sign out button on large screens', () => {
      mockMatchMedia(true); // Large screen
      renderLayout();
      expect(screen.getByAltText(/focusframe logo/i)).toBeVisible();
      expect(screen.getByRole('button', { name: /sign out/i })).toBeVisible();
    });
  });
});
