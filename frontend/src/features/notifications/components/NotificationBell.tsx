// frontend/src/features/notifications/components/NotificationBell.tsx

import { useState, useRef, useEffect } from 'react';
import { Bell, BellDot } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { useUnreadCount } from '../hooks/useNotifications';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: unreadCount, isLoading } = useUnreadCount();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const hasUnread = !isLoading && typeof unreadCount === 'number' && unreadCount > 0;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button - Enhanced styling */}
      <button
        type="button"
        onClick={toggleDropdown}
        className={`
          relative inline-flex items-center justify-center
          p-2.5 rounded-lg transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2
          ${hasUnread 
            ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 focus:ring-blue-500' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-400'
          }
          ${isOpen ? 'bg-gray-100' : ''}
        `}
        aria-label={hasUnread ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={isOpen}
      >
        {hasUnread ? (
          <BellDot size={24} className="drop-shadow-sm" />
        ) : (
          <Bell size={24} />
        )}

        {/* Unread Badge - Only show when hasUnread is true */}
        {hasUnread && (
          <>
            {/* Pulse animation behind badge */}
            <span className="absolute top-0 right-0 flex h-5 w-5 pointer-events-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            </span>
            
            {/* Actual badge */}
            <span 
              className="
                absolute -top-1 -right-1 
                inline-flex items-center justify-center 
                min-w-[20px] h-5 px-1.5
                text-[10px] font-bold text-white 
                bg-gradient-to-br from-red-500 to-red-600
                rounded-full 
                border-2 border-white
                shadow-lg
                z-10
                pointer-events-none
              "
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </div>
  );
};