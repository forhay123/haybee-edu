import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send, X, Paperclip } from 'lucide-react';
import { ChatMessage } from '../types/chat';

interface MessageInputProps {
  onSend: (content: string, replyToId?: number) => void;
  disabled?: boolean;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
  onTyping?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ 
  onSend, 
  disabled,
  replyingTo,
  onCancelReply,
  onTyping
}) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (content.trim() && !disabled) {
      onSend(content.trim(), replyingTo?.id);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape' && replyingTo && onCancelReply) {
      onCancelReply();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    // ✅ Send typing indicator
    if (onTyping && e.target.value.length > 0) {
      onTyping();
    }
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  };

  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  return (
    <div className="border-t border-gray-200 bg-white">
      {replyingTo && (
        <div className="px-4 pt-3 pb-2 flex items-start justify-between bg-gray-50 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-blue-600 mb-1">
              Replying to {replyingTo.senderName}
            </div>
            <div className="text-sm text-gray-600 truncate">
              {replyingTo.content}
            </div>
          </div>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="ml-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="Cancel reply"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-end space-x-2">
          <button
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={disabled}
            title="Attach file (coming soon)"
          >
            <Paperclip size={20} />
          </button>

          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed max-h-[150px]"
            style={{ minHeight: '40px' }}
          />

          <button
            onClick={handleSend}
            disabled={!content.trim() || disabled}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            title="Send message"
          >
            <Send size={20} />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};