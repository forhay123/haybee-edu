import React, { useEffect, useRef } from 'react';
import { ChatRoom, ChatMessage } from '../types/chat';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { DebugTyping } from './DebugTyping';
import { ArrowLeft, Users, User, MoreVertical } from 'lucide-react';

interface ChatWindowProps {
  room: ChatRoom;
  messages: ChatMessage[];
  onSendMessage: (content: string, replyToId?: number) => void;
  onEditMessage?: (messageId: number, content: string) => void;
  onDeleteMessage?: (messageId: number) => void;
  onBack?: () => void;
  onTyping?: () => void;
  loading?: boolean;
  replyingTo?: ChatMessage | null;
  onReply?: (message: ChatMessage) => void;
  onCancelReply?: () => void;
  typingUsers?: string[];
  wsConnected?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  room,
  messages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onBack,
  onTyping,
  loading,
  replyingTo,
  onReply,
  onCancelReply,
  typingUsers = [],
  wsConnected = false
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const isUserScrolledUpRef = useRef(false);
  const lastMessageIdRef = useRef<number | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  };

  // Track if user has scrolled up
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      isUserScrolledUpRef.current = !isAtBottom;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle new messages - only scroll if user is at bottom
  useEffect(() => {
    const hasNewMessages = messages.length > prevMessagesLengthRef.current;
    const lastMessage = messages[messages.length - 1];
    const isNewUniqueMessage = lastMessage && lastMessage.id !== lastMessageIdRef.current;
    
    if (hasNewMessages && isNewUniqueMessage) {
      // Only scroll if user hasn't scrolled up
      if (!isUserScrolledUpRef.current) {
        setTimeout(() => scrollToBottom('smooth'), 100);
      }
      
      lastMessageIdRef.current = lastMessage.id;
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Scroll to bottom when room changes (instant scroll)
  useEffect(() => {
    isUserScrolledUpRef.current = false;
    const lastMessage = messages[messages.length - 1];
    lastMessageIdRef.current = lastMessage?.id || null;
    
    // Instant scroll on room change
    setTimeout(() => scrollToBottom('auto'), 50);
    prevMessagesLengthRef.current = messages.length;
  }, [room.id]);

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm flex-shrink-0">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="Back to conversations"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            
            <div className="flex-shrink-0">
              {room.type === 'CLASS' ? (
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white shadow-sm">
                  <Users size={20} />
                </div>
              ) : room.otherUserAvatar ? (
                <img
                  src={room.otherUserAvatar}
                  alt={room.otherUserName || room.name || 'User'}
                  className="w-10 h-10 rounded-full object-cover shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold shadow-sm">
                  <User size={20} />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {room.type === 'CLASS' 
                  ? room.className || room.name 
                  : room.otherUserName || 'Unknown User'}
              </h2>
              <p className="text-sm text-gray-500 truncate">
                {typingUsers && typingUsers.length > 0 ? (
                  <span className="text-blue-600 italic font-medium">
                    ⌨️ {typingUsers[0]} is typing...
                  </span>
                ) : (
                  <span>
                    {room.type === 'CLASS' ? 'Class Chat' : room.otherUserEmail || 'Direct Message'}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            title="More options"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{ 
          minHeight: 0,
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-center max-w-md">
              {room.type === 'CLASS' ? (
                <>
                  <Users size={64} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Welcome to {room.className || room.name}!</p>
                  <p className="text-sm text-gray-400">
                    This is the beginning of your class conversation. Say hello to your classmates!
                  </p>
                </>
              ) : (
                <>
                  <User size={64} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Start the conversation!</p>
                  <p className="text-sm text-gray-400">
                    Send a message to {room.otherUserName} to begin chatting.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <MessageBubble 
                key={message.id} 
                message={message}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                onReply={onReply}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <MessageInput 
          onSend={onSendMessage} 
          disabled={loading}
          replyingTo={replyingTo}
          onCancelReply={onCancelReply}
          onTyping={onTyping}
        />
      </div>


    </div>
  );
};