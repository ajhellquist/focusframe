import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TodosPage from '../todos'; // Adjust path as necessary
import { supabase } from '../../lib/supabaseClient'; // Adjust path for mock

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    // Add any other router properties/methods used by TodosPage if necessary
  })),
}));

// Mock supabase client
const mockTodoItems = [
  { id: '1', content: 'Test Todo 1', is_complete: false, created_at: new Date().toISOString(), detail: 'Detail 1' },
  { id: '2', content: 'Test Todo 2', is_complete: false, created_at: new Date().toISOString(), detail: 'Detail 2' },
  { id: '3', content: 'Test Todo 3', is_complete: true, created_at: new Date().toISOString(), completed_at: new Date().toISOString(), detail: 'Detail 3' },
];

// More detailed mock for chained calls
const mockSupabaseEq = jest.fn().mockReturnThis();
const mockSupabaseOrder = jest.fn().mockResolvedValue({ data: [...mockTodoItems], error: null });
const mockSupabaseSelect = jest.fn(() => ({
  eq: mockSupabaseEq,
  order: mockSupabaseOrder,
}));
const mockSupabaseDelete = jest.fn().mockReturnThis(); // To chain .eq
const mockSupabaseInsert = jest.fn().mockResolvedValue({ data: [{ id: 'new-id', content: 'New Todo', is_complete: false, created_at: new Date().toISOString() }], error: null });
const mockSupabaseUpdate = jest.fn().mockReturnThis(); // To chain .eq


jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: { user: { id: 'test-user-id' } } } })),
    },
    from: jest.fn(() => ({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert,
      update: mockSupabaseUpdate,
      delete: mockSupabaseDelete,
      eq: mockSupabaseEq, // Allow .eq directly after .from().delete() or .from().update()
      order: mockSupabaseOrder, // Allow .order directly after .from().select().eq()
    })),
    channel: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
    removeChannel: jest.fn(), // Added removeChannel
  },
}));

// Mock window.confirm
global.confirm = jest.fn(() => true);

// Mock HTMLAudioElement
global.HTMLAudioElement.prototype.play = jest.fn();
global.HTMLAudioElement.prototype.load = jest.fn();


describe('TodosPage - ContextMenu Delete Functionality', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Restore detailed mock implementation for supabase.from and its chainable methods
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert.mockResolvedValue({ data: [{ id: 'new-id', content: 'New Todo', is_complete: false, created_at: new Date().toISOString() }], error: null }),
      update: mockSupabaseUpdate.mockImplementation(() => ({ // Ensure update also returns object for chaining eq
        eq: mockSupabaseEq.mockResolvedValue({ data: [{id: '1', content: 'Test Todo 1 Updated', is_complete: false, created_at: new Date().toISOString(), detail: 'Detail 1 Updated'}], error: null })
      })),
      delete: mockSupabaseDelete.mockImplementation(() => ({ // Ensure delete also returns object for chaining eq
         eq: mockSupabaseEq.mockResolvedValue({ error: null })
      })),
    }));
    mockSupabaseSelect.mockImplementation(() => ({
        eq: mockSupabaseEq.mockReturnThis(), // .select().eq()
        order: mockSupabaseOrder.mockResolvedValue({ data: [...mockTodoItems], error: null }), // .select().eq().order()
    }));
    
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: { user: { id: 'test-user-id' } } } });
    (supabase.removeChannel as jest.Mock).mockClear();
    (supabase.channel as jest.Mock).mockReturnThis();
    (supabase.on as jest.Mock).mockReturnThis();
    (supabase.subscribe as jest.Mock).mockReturnValue({ unsubscribe: jest.fn() });

    // Ensure router mock is fresh for each test if needed, though basic one might be fine
    (require('next/router').useRouter as jest.Mock).mockReturnValue({
        push: jest.fn(),
    });
  });

  test('successfully deletes a current to-do item via ContextMenu', async () => {
    render(<TodosPage />);

    // Wait for initial todos to load and render
    expect(await screen.findByText('Test Todo 1')).toBeInTheDocument();
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument();
    // Completed todo should not be visible initially as "Current" tab is active
    expect(screen.queryByText('Test Todo 3')).not.toBeInTheDocument();


    const todo1Text = 'Test Todo 1';
    const todoItem1 = screen.getByText(todo1Text);
    expect(todoItem1).toBeInTheDocument();

    // Find the context menu button for the first todo item
    // The button is within the list item that contains the todo text
    const menuButton = screen.getByRole('button', { name: `Options for to-do: ${todo1Text}` });
    expect(menuButton).toBeInTheDocument();

    // Click the menu button to open the context menu
    fireEvent.click(menuButton);

    // Find and click the "Delete" option in the menu
    const deleteOption = await screen.findByText('Delete');
    expect(deleteOption).toBeInTheDocument();
    fireEvent.click(deleteOption);

    // Confirm the deletion (window.confirm is mocked to return true)
    expect(global.confirm).toHaveBeenCalledWith('Delete this to-do item?');

    // Verify the to-do item is removed from the displayed list
    await waitFor(() => {
      expect(screen.queryByText(todo1Text)).not.toBeInTheDocument();
    });

    // Verify supabase.delete was called correctly
    expect(supabase.from).toHaveBeenCalledWith('todos');
    // Check that the delete chain was called, and eq was called on it with the correct id
    expect(mockSupabaseDelete).toHaveBeenCalledTimes(1);
    expect(mockSupabaseEq).toHaveBeenCalledWith('id', '1');

    // Check that other items are still present
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument();
  });
});
