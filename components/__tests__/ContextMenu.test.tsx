import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContextMenu, { MenuItem } from '../ContextMenu'; // Import MenuItem type

describe('ContextMenu', () => {
  const defaultMenuButtonAriaLabel = 'Open menu';
  const customMenuButtonAriaLabel = 'Test Options';

  let mockAction1: jest.Mock;
  let mockAction2: jest.Mock;
  let menuItems: MenuItem[];

  beforeEach(() => {
    mockAction1 = jest.fn();
    mockAction2 = jest.fn();
    menuItems = [
      { label: 'Action 1', action: mockAction1 },
      { label: 'Action 2', action: mockAction2, className: 'custom-class-for-action2' },
    ];
  });

  const renderComponent = (props: Partial<React.ComponentProps<typeof ContextMenu>> = {}) => {
    const defaultProps = {
      items: menuItems,
      menuButtonAriaLabel: customMenuButtonAriaLabel,
    };
    return render(<ContextMenu {...defaultProps} {...props} />);
  };

  test('renders the three-dot menu button with correct aria-label', () => {
    renderComponent();
    const menuButton = screen.getByRole('button', { name: customMenuButtonAriaLabel });
    expect(menuButton).toBeInTheDocument();
    expect(menuButton.querySelector('svg path')).toBeInTheDocument(); // Check for SVG
  });

  test('renders with default aria-label if none provided', () => {
    renderComponent({ menuButtonAriaLabel: undefined });
    const menuButton = screen.getByRole('button', { name: defaultMenuButtonAriaLabel });
    expect(menuButton).toBeInTheDocument();
  });

  test('context menu is initially hidden', () => {
    renderComponent();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByText(menuItems[0].label)).not.toBeInTheDocument();
  });

  test('clicking the menu button shows the context menu with items', () => {
    renderComponent();
    const menuButton = screen.getByRole('button', { name: customMenuButtonAriaLabel });
    fireEvent.click(menuButton);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText(menuItems[0].label)).toBeInTheDocument();
    expect(screen.getByText(menuItems[1].label)).toBeInTheDocument();
    // Check for custom class
    expect(screen.getByText(menuItems[1].label)).toHaveClass('custom-class-for-action2');
  });

  test('clicking the menu button again hides the context menu', () => {
    renderComponent();
    const menuButton = screen.getByRole('button', { name: customMenuButtonAriaLabel });
    fireEvent.click(menuButton); // Open
    fireEvent.click(menuButton); // Close
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('clicking outside the menu (if open) closes the menu', () => {
    renderComponent();
    const menuButton = screen.getByRole('button', { name: customMenuButtonAriaLabel });
    fireEvent.click(menuButton); // Open menu
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body); // Click outside
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  describe('Menu Item Actions', () => {
    it.each([0, 1])('calls the correct action and closes menu when item %s is clicked', (itemIndex) => {
      renderComponent();
      const menuButton = screen.getByRole('button', { name: customMenuButtonAriaLabel });
      fireEvent.click(menuButton); // Open menu

      const itemToClick = menuItems[itemIndex];
      const itemElement = screen.getByText(itemToClick.label);
      expect(itemElement).toBeInTheDocument();

      fireEvent.click(itemElement);

      if (itemIndex === 0) {
        expect(mockAction1).toHaveBeenCalledTimes(1);
        expect(mockAction2).not.toHaveBeenCalled();
      } else {
        expect(mockAction2).toHaveBeenCalledTimes(1);
        expect(mockAction1).not.toHaveBeenCalled();
      }
      expect(screen.queryByRole('menu')).not.toBeInTheDocument(); // Menu should close
    });
  });

  describe('Handling different numbers of items', () => {
    test('renders correctly with a single menu item', () => {
      const singleItem: MenuItem[] = [{ label: 'Single Action', action: mockAction1 }];
      renderComponent({ items: singleItem });
      const menuButton = screen.getByRole('button', { name: customMenuButtonAriaLabel });
      fireEvent.click(menuButton);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      const menuItemElement = screen.getByText('Single Action');
      expect(menuItemElement).toBeInTheDocument();
      expect(menuItemElement).toHaveAttribute('role', 'menuitem');

      fireEvent.click(menuItemElement);
      expect(mockAction1).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    test('menu opens with no items if items array is empty, but shows no item elements', () => {
      renderComponent({ items: [] });
      const menuButton = screen.getByRole('button', { name: customMenuButtonAriaLabel });
      fireEvent.click(menuButton);

      const menuElement = screen.getByRole('menu');
      expect(menuElement).toBeInTheDocument();
      // Check that there are no elements with role="menuitem"
      expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    });

    test('menu button is still focusable and clickable even with empty items', () => {
        renderComponent({ items: [] });
        const menuButton = screen.getByRole('button', { name: customMenuButtonAriaLabel });
        expect(menuButton).toBeVisible();
        fireEvent.click(menuButton); // Open
        expect(screen.getByRole('menu')).toBeInTheDocument();
        fireEvent.click(menuButton); // Close
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  test('menu items are accessible (buttons with role="menuitem")', () => {
    renderComponent();
    const menuButton = screen.getByRole('button', { name: customMenuButtonAriaLabel });
    fireEvent.click(menuButton);

    const menuItemElements = screen.getAllByRole('menuitem');
    expect(menuItemElements.length).toBe(menuItems.length);
    menuItemElements.forEach(item => {
      expect(item.tagName).toBe('BUTTON'); // Items are rendered as buttons
    });
  });
});
