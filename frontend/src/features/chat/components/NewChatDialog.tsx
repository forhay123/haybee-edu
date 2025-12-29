import React, { useState, useEffect } from 'react';
import { X, Search, User, Users } from 'lucide-react';
import { ChatRoomType } from '../types/chat';
import api from '../../../api/axios';

interface UserOption {
  id: number;
  name: string;
  email: string;
  role?: string;
}

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat: (type: ChatRoomType, otherUserId?: number, classId?: number) => Promise<void>;
  currentUserId: number;
}

export const NewChatDialog: React.FC<NewChatDialogProps> = ({
  isOpen,
  onClose,
  onCreateChat,
  currentUserId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching chat users...');
      
      // ✅ FIXED: Use the new /chat-users endpoint
      const response = await api.get('/users/chat-users');
      
      console.log('✅ Chat users fetched successfully:', response.data);
      
      setUsers(response.data.map((u: any) => ({
        id: u.id,
        name: u.fullName || u.name || u.email,
        email: u.email,
        role: u.roles?.[0] || 'USER'
      })));
      
      console.log(`✅ Loaded ${response.data.length} users available for chat`);
    } catch (error: any) {
      console.error('❌ Error fetching chat users:', error);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectUser = async (userId: number) => {
    try {
      console.log(`💬 Creating chat with user ${userId}...`);
      await onCreateChat(ChatRoomType.DIRECT, userId);
      onClose();
      setSearchTerm('');
    } catch (error) {
      console.error('❌ Error creating chat:', error);
      setError('Failed to create chat. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">New Conversation</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <Users size={48} className="mb-2 text-gray-300" />
              <p>{searchTerm ? 'No users found' : 'No users available'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  className="w-full p-4 hover:bg-gray-50 transition-colors text-left flex items-center space-x-3"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <User size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                  {user.role && (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {user.role}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};