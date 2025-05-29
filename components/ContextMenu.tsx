import React, { useState, useEffect, useRef } from 'react';

interface ContextMenuProps {
  habitId: string;
  habitTitle: string;
  onEdit: (habitId: string) => void;
  onDelete: (habitId: string) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ habitId, habitTitle, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleEdit = () => {
    onEdit(habitId);
    setIsOpen(false);
  };

  const handleDelete = () => {
    onDelete(habitId);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={toggleMenu}
        aria-label={`Options for habit: ${habitTitle}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={`Options for habit: ${habitTitle}`}
        >
          <div className="py-1" role="none">
            <button
              onClick={handleEdit}
              className="text-gray-700 block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              role="menuitem"
            >
              Change start date
            </button>
            <button
              onClick={handleDelete}
              className="text-gray-700 block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              role="menuitem"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextMenu;
