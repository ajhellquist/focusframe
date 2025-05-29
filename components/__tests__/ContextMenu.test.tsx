import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContextMenu from '../ContextMenu';

describe('ContextMenu', () => {
  const mockHabitId = 'habit-123';
  const mockHabitTitle = 'Test Habit';
  let mockOnEdit: jest.Mock;
  let mockOnDelete: jest.Mock;

  beforeEach(() => {
    mockOnEdit = jest.fn();
    mockOnDelete = jest.fn();
  });

  const renderComponent = () => {
    render(
      <ContextMenu
        habitId={mockHabitId}
        habitTitle={mockHabitTitle}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
  };

  test('renders the three-dot menu button', () => {
    renderComponent();
    const menuButton = screen.getByRole('button', { name: `Options for habit: ${mockHabitTitle}` });
    expect(menuButton).toBeInTheDocument();
    // Check for SVG presence indirectly by checking for its path elements
    expect(menuButton.querySelector('svg path')).toBeInTheDocument();
  });

  test('context menu is initially hidden', () => {
    renderComponent();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByText('Change start date')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  test('clicking the three-dot button shows the context menu', () => {
    renderComponent();
    const menuButton = screen.getByRole('button', { name: `Options for habit: ${mockHabitTitle}` });
    fireEvent.click(menuButton);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Change start date')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  test('clicking the three-dot button again hides the context menu', () => {
    renderComponent();
    const menuButton = screen.getByRole('button', { name: `Options for habit: ${mockHabitTitle}` });
    fireEvent.click(menuButton); // Open
    fireEvent.click(menuButton); // Close
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('clicking outside the menu (if open) closes the menu', () => {
    renderComponent();
    const menuButton = screen.getByRole('button', { name: `Options for habit: ${mockHabitTitle}` });
    fireEvent.click(menuButton); // Open menu
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body); // Click outside
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  describe('Menu Options and Callbacks', () => {
    test('renders "Change start date" option and calls onEdit when clicked', () => {
      renderComponent();
      const menuButton = screen.getByRole('button', { name: `Options for habit: ${mockHabitTitle}` });
      fireEvent.click(menuButton); // Open menu

      const editButton = screen.getByText('Change start date');
      expect(editButton).toBeInTheDocument();

      fireEvent.click(editButton);
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
      expect(mockOnEdit).toHaveBeenCalledWith(mockHabitId);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument(); // Menu should close
    });

    test('renders "Delete" option and calls onDelete when clicked', () => {
      renderComponent();
      const menuButton = screen.getByRole('button', { name: `Options for habit: ${mockHabitTitle}` });
      fireEvent.click(menuButton); // Open menu

      const deleteButton = screen.getByText('Delete');
      expect(deleteButton).toBeInTheDocument();

      fireEvent.click(deleteButton);
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(mockHabitId);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument(); // Menu should close
    });
  });
});
