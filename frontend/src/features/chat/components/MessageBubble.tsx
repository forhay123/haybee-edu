// ============================================
// FILE: MessageBubble.tsx
// PATH: frontend/src/features/chat/components/MessageBubble.tsx
// ============================================

import React, { useState } from 'react';
import { ChatMessage } from '../types/chat';
import { format } from 'date-fns';
import { MoreVertical, Edit2, Trash2, Reply, Image as ImageIcon } from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
  onEdit?: (messageId: number, content: string) => void;
  onDelete?: (messageId: number) => void;
  onReply?: (message: ChatMessage) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onEdit, 
  onDelete,
  onReply 
}) => {
  const isOwn = message.isOwnMessage;
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleEdit = () => {
    if (onEdit && editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
      setIsEditing(false);
      setShowMenu(false);
    }
  };

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this message?')) {
      onDelete(message.id);
    }
    setShowMenu(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
    setShowMenu(false);
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isOwn ? 'order-2' : 'order-1'}`}>
        
        {/* Sender Name */}
        {!isOwn && (
          <div className="text-xs font-medium text-gray-700 mb-1 px-1">
            {message.senderName}
          </div>
        )}

        {/* Reply Preview */}
        {message.replyToId && message.replyToContent && (
          <div className={`text-xs p-2 mb-1 rounded-lg border-l-2 ${
            isOwn 
              ? 'bg-blue-500/20 border-blue-400 text-blue-900' 
              : 'bg-gray-100 border-gray-400 text-gray-700'
          }`}>
            <div className="font-medium flex items-center space-x-1">
              <Reply size={12} />
              <span>{message.replyToSenderName}</span>
            </div>
            <div className="truncate opacity-75 mt-0.5">{message.replyToContent}</div>
          </div>
        )}

        {/* Message Content */}
        <div className="relative">
          <div
            className={`rounded-2xl px-4 py-2 shadow-sm ${
              isOwn
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
            }`}
          >
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 rounded-lg bg-white text-gray-900 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEdit();
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleEdit}
                    disabled={!editContent.trim() || editContent === message.content}
                    className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 bg-gray-400 text-white rounded-lg text-xs hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {message.content}
                </p>

                {/* Attachment */}
                {message.attachmentUrl && (
                  <div className="mt-2">
                    {message.attachmentType?.startsWith('image') ? (
                      <img 
                        src={message.attachmentUrl} 
                        alt="attachment" 
                        className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(message.attachmentUrl, '_blank')}
                      />
                    ) : (
                      <a
                        href={message.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs underline flex items-center space-x-1 hover:opacity-80 ${
                          isOwn ? 'text-blue-100' : 'text-blue-600'
                        }`}
                      >
                        <ImageIcon size={14} />
                        <span>View attachment</span>
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Buttons */}
          {!isEditing && (
            <div className={`flex items-center space-x-1 ${
              isOwn ? 'justify-end' : 'justify-start'
            } opacity-0 group-hover:opacity-100 transition-opacity mt-1`}>
              {onReply && (
                <button
                  onClick={() => onReply(message)}
                  className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                  title="Reply"
                >
                  <Reply size={14} className="text-gray-600" />
                </button>
              )}

              {isOwn && (onEdit || onDelete) && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                    title="More options"
                  >
                    <MoreVertical size={14} className="text-gray-600" />
                  </button>

                  {showMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[120px]">
                        {onEdit && (
                          <button
                            onClick={() => {
                              setIsEditing(true);
                              setShowMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2 transition-colors"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={handleDelete}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Metadata */}
        <div className={`flex items-center mt-1 space-x-2 text-xs text-gray-500 px-1 ${
          isOwn ? 'justify-end' : 'justify-start'
        }`}>
          <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
          {isOwn && (
            <span className={message.status === 'READ' ? 'text-blue-500' : 'text-gray-400'}>
              {message.status === 'READ' && '✓✓'}
              {message.status === 'DELIVERED' && '✓'}
              {message.status === 'SENT' && '•'}
            </span>
          )}
          {message.isEdited && <span className="text-gray-400 italic">(edited)</span>}
        </div>
      </div>
    </div>
  );
};
