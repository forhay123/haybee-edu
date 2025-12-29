import React from 'react';
import { ChatRoom, ChatRoomType } from '../types/chat';
import { formatDistanceToNow } from 'date-fns';
import { Users, User, MessageCircle } from 'lucide-react';

interface ChatRoomListProps {
  rooms: ChatRoom[];
  selectedRoom: ChatRoom | null;
  onSelectRoom: (room: ChatRoom) => void;
  loading?: boolean;
  totalUnreadCount?: number;
}

export const ChatRoomList: React.FC<ChatRoomListProps> = ({
  rooms,
  selectedRoom,
  onSelectRoom,
  loading,
  totalUnreadCount
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-6">
        <MessageCircle size={64} className="text-gray-300 mb-4" />
        <p className="text-lg font-medium">No conversations yet</p>
        <p className="text-sm text-gray-400 mt-2 text-center">
          Start a conversation with your classmates or teachers
        </p>
      </div>
    );
  }

  // Sort rooms by last message time (most recent first)
  const sortedRooms = [...rooms].sort((a, b) => {
    const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="divide-y divide-gray-200">
      {sortedRooms.map(room => (
        <div
          key={room.id}
          onClick={() => onSelectRoom(room)}
          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
            selectedRoom?.id === room.id 
              ? 'bg-blue-50 border-l-4 border-blue-600' 
              : 'border-l-4 border-transparent'
          }`}
        >
          <div className="flex items-start space-x-3">
            {/* Avatar */}
            <div className="flex-shrink-0 relative">
              {room.type === ChatRoomType.CLASS ? (
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white shadow-sm">
                  <Users size={24} />
                </div>
              ) : room.otherUserAvatar ? (
                <img
                  src={room.otherUserAvatar}
                  alt={room.otherUserName || room.name || 'User'}
                  className="w-12 h-12 rounded-full object-cover shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold shadow-sm">
                  <User size={24} />
                </div>
              )}
              
              {/* Online indicator (placeholder - implement with real-time presence) */}
              {room.type === ChatRoomType.DIRECT && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
              )}
              
              {/* Unread badge */}
              {room.unreadCount && room.unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center px-1">
                  <span className="text-xs font-bold text-white">
                    {room.unreadCount > 99 ? '99+' : room.unreadCount}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {room.type === ChatRoomType.CLASS 
                    ? room.className || room.name 
                    : room.otherUserName || 'Unknown User'}
                </h3>
                {room.lastMessageAt && (
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(room.lastMessageAt), { addSuffix: true })}
                  </span>
                )}
              </div>

              <div className="flex items-center">
                <p className={`text-sm truncate flex-1 ${
                  room.unreadCount && room.unreadCount > 0 
                    ? 'font-semibold text-gray-900' 
                    : 'text-gray-600'
                }`}>
                  {room.lastMessage || 'No messages yet'}
                </p>
              </div>
              
              {/* Room type badge */}
              {room.type === ChatRoomType.CLASS && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                  <Users size={12} className="mr-1" />
                  Class Chat
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};