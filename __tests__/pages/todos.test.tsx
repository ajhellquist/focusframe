import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TodosPage from '../../pages/todos'; // Adjust path as necessary
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

// Chainable mocks for Supabase queries
const mockSelectOrder = jest.fn().mockResolvedValue({ data: [...mockTodoItems], error: null });
const mockSelectEq = jest.fn(() => ({ order: mockSelectOrder }));
const mockSupabaseSelect = jest.fn(() => ({ eq: mockSelectEq, order: mockSelectOrder }));

const mockInsertSelect = jest.fn().mockResolvedValue({
  data: [{ id: 'new-id', content: 'New Todo', is_complete: false, created_at: new Date().toISOString(), detail: '' }],
  error: null,
});
const mockSupabaseInsert = jest.fn(() => ({ select: mockInsertSelect }));

const mockUpdateSelect = jest.fn().mockResolvedValue({
  data: [{ id: '1', content: 'Test Todo 1', is_complete: false, created_at: new Date().toISOString(), detail: 'Updated' }],
  error: null,
});
const mockUpdateEq = jest.fn(() => ({ select: mockUpdateSelect }));
const mockSupabaseUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

const mockDeleteEq = jest.fn().mockResolvedValue({ error: null });
const mockSupabaseDelete = jest.fn(() => ({ eq: mockDeleteEq }));

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

    mockSelectOrder.mockResolvedValue({ data: [...mockTodoItems], error: null });
    mockSelectEq.mockReturnValue({ order: mockSelectOrder });
    mockSupabaseSelect.mockReturnValue({ eq: mockSelectEq, order: mockSelectOrder });

    mockInsertSelect.mockResolvedValue({
      data: [{ id: 'new-id', content: 'New Todo', is_complete: false, created_at: new Date().toISOString(), detail: '' }],
      error: null,
    });
    mockSupabaseInsert.mockReturnValue({ select: mockInsertSelect });

    mockUpdateSelect.mockResolvedValue({
      data: [{ id: '1', content: 'Test Todo 1', is_complete: false, created_at: new Date().toISOString(), detail: 'Updated' }],
      error: null,
    });
    mockUpdateEq.mockReturnValue({ select: mockUpdateSelect });
    mockSupabaseUpdate.mockReturnValue({ eq: mockUpdateEq });

    mockDeleteEq.mockResolvedValue({ error: null });
    mockSupabaseDelete.mockReturnValue({ eq: mockDeleteEq });

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
    expect(mockDeleteEq).toHaveBeenCalledWith('id', '1');

    // Check that other items are still present
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument();
  });
});
