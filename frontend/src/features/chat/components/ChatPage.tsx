import React, { useState, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { ChatRoomList } from './ChatRoomList';
import { ChatWindow } from './ChatWindow';
import { NewChatDialog } from './NewChatDialog';
import { MessageSquare, Plus } from 'lucide-react';
import { ChatRoomType } from '../types/chat';

export const ChatPage: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);

  // Decode JWT token to get user ID
  useEffect(() => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.sub || payload.userId || payload.id;
        setCurrentUserId(Number(userId));
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
  }, []);

  const {
    rooms,
    selectedRoom,
    messages,
    loading,
    error,
    unreadCount,
    replyingTo,
    wsConnected,
    typingUsers,
    createOrGetRoom,
    sendMessage,
    editMessage,
    deleteMessage,
    selectRoom,
    markAsRead,
    setReplyTo,
    clearSelectedRoom,
    sendTypingIndicator
  } = useChat({ currentUserId: currentUserId || undefined, autoFetchRooms: !!currentUserId });

  const handleSendMessage = async (content: string, replyToId?: number) => {
    if (selectedRoom) {
      await sendMessage({
        roomId: selectedRoom.id,
        content,
        replyToId
      });
    }
  };

  const handleTyping = () => {
    if (selectedRoom && sendTypingIndicator) {
      sendTypingIndicator(selectedRoom.id);
    }
  };

  const handleSelectRoom = async (room: any) => {
    // If clicking same room, just show chat
    if (selectedRoom?.id === room.id) {
      console.log('📱 Same room selected, just showing chat window');
      setShowMobileChat(true);
      return;
    }
    
    // Select new room
    console.log('📱 Selecting new room:', room.id);
    await selectRoom(room);
    setShowMobileChat(true);
  };

  // Don't clear room on back, just hide chat window
  const handleBack = () => {
    setShowMobileChat(false);
  };

  const handleReply = (message: any) => {
    if (setReplyTo) setReplyTo(message);
  };

  const handleCancelReply = () => {
    if (setReplyTo) setReplyTo(null);
  };

  const handleCreateChat = async (type: ChatRoomType, otherUserId?: number, classId?: number) => {
    const room = await createOrGetRoom({
      type,
      otherUserId,
      classId
    });
    await selectRoom(room);
    setShowMobileChat(true);
  };

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-100" style={{ height: '100dvh' }}>
        {/* Sidebar */}
        <div className={`w-full lg:w-96 bg-white border-r border-gray-200 flex flex-col ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold flex items-center">
                <MessageSquare className="mr-2" />
                Messages
              </h1>
              <div className="flex items-center space-x-2">
                {!wsConnected && (
                  <div 
                    className="flex items-center space-x-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded"
                    title="Reconnecting to chat..."
                  >
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    <span className="hidden sm:inline">Reconnecting...</span>
                  </div>
                )}
                {unreadCount > 0 && (
                  <div className="bg-red-500 text-white rounded-full px-3 py-1 text-sm font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-blue-100 mt-1">
              {rooms.length} {rooms.length === 1 ? 'conversation' : 'conversations'}
            </p>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Room List */}
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {error ? (
              <div className="flex items-center justify-center h-full p-6">
                <div className="text-center text-red-600">
                  <p className="font-medium">Error loading conversations</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            ) : (
              <ChatRoomList
                rooms={rooms}
                selectedRoom={selectedRoom}
                onSelectRoom={handleSelectRoom}
                loading={loading}
                totalUnreadCount={unreadCount}
              />
            )}
          </div>

          {/* New Chat Button */}
          <div className="p-4 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={() => setShowNewChatDialog(true)}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              <span className="font-medium">New Conversation</span>
            </button>
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 ${!showMobileChat ? 'hidden lg:flex' : 'flex'} flex-col`}>
          {selectedRoom ? (
            <ChatWindow
              room={selectedRoom}
              messages={messages}
              onSendMessage={handleSendMessage}
              onEditMessage={editMessage}
              onDeleteMessage={deleteMessage}
              onReply={handleReply}
              onCancelReply={handleCancelReply}
              onBack={handleBack}
              onTyping={handleTyping}
              loading={loading}
              replyingTo={replyingTo}
              typingUsers={typingUsers}
              wsConnected={wsConnected}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-white">
              <div className="text-center max-w-md p-6">
                <MessageSquare size={80} className="mx-auto mb-6 text-gray-300" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Welcome to Chat
                </h2>
                <p className="text-gray-500 mb-6">
                  Select a conversation from the sidebar to start chatting, or create a new conversation to connect with your classmates and teachers.
                </p>
                <button
                  onClick={() => setShowNewChatDialog(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Start a Conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewChatDialog
        isOpen={showNewChatDialog}
        onClose={() => setShowNewChatDialog(false)}
        onCreateChat={handleCreateChat}
        currentUserId={currentUserId}
      />
    </>
  );
};

export default ChatPage;