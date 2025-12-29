import axios from '../../../api/axios'; // ← Use your shared axios instance (same as notifications)
import { 
  ChatRoom, 
  ChatMessage, 
  CreateRoomRequest, 
  SendMessageRequest,
  EditMessageRequest 
} from '../types/chat';

const BASE_URL = '/chat';

/**
 * Chat API client
 * Uses shared axios instance with automatic auth token handling
 */
export const chatApi = {
  /**
   * Create or get a chat room
   * @param request Room creation request
   * @returns Created or existing chat room
   */
  createOrGetRoom: async (request: CreateRoomRequest): Promise<ChatRoom> => {
    const response = await axios.post<ChatRoom>(
      `${BASE_URL}/rooms`,
      request
    );
    return response.data;
  },

  /**
   * Get all rooms for current user
   * @returns Array of accessible chat rooms
   */
  getUserRooms: async (): Promise<ChatRoom[]> => {
    const response = await axios.get<ChatRoom[]>(`${BASE_URL}/rooms`);
    return response.data;
  },

  /**
   * Send a message to a chat room
   * @param request Message send request
   * @returns Sent message
   */
  sendMessage: async (request: SendMessageRequest): Promise<ChatMessage> => {
    const response = await axios.post<ChatMessage>(
      `${BASE_URL}/messages`,
      request
    );
    return response.data;
  },

  /**
   * Get messages for a room (paginated)
   * @param roomId Chat room ID
   * @param page Page number (0-indexed)
   * @param size Page size
   * @returns Array of messages
   */
  getRoomMessages: async (
    roomId: number,
    page: number = 0,
    size: number = 50
  ): Promise<ChatMessage[]> => {
    const response = await axios.get<ChatMessage[]>(
      `${BASE_URL}/rooms/${roomId}/messages`,
      {
        params: { page, size }
      }
    );
    return response.data;
  },

  /**
   * Mark messages as read in a room
   * @param roomId Chat room ID
   */
  markMessagesAsRead: async (roomId: number): Promise<void> => {
    await axios.put(`${BASE_URL}/rooms/${roomId}/read`, {});
  },

  /**
   * Get total unread count across all rooms
   * @returns Unread message count
   */
  getTotalUnreadCount: async (): Promise<number> => {
    const response = await axios.get<number>(`${BASE_URL}/unread-count`);
    return response.data;
  },

  /**
   * Edit a message (only by message owner)
   * @param messageId Message ID to edit
   * @param request Edit request with new content
   * @returns Updated message
   */
  editMessage: async (
    messageId: number,
    request: EditMessageRequest
  ): Promise<ChatMessage> => {
    const response = await axios.put<ChatMessage>(
      `${BASE_URL}/messages/${messageId}`,
      { newContent: request.newContent }
    );
    return response.data;
  },

  /**
   * Delete a message (only by message owner)
   * @param messageId Message ID to delete
   */
  deleteMessage: async (messageId: number): Promise<void> => {
    await axios.delete(`${BASE_URL}/messages/${messageId}`);
  }
};

export default chatApi;