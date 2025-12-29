export enum ChatRoomType {
  DIRECT = 'DIRECT',
  CLASS = 'CLASS',
  GROUP = 'GROUP'
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

export interface ChatRoom {
  id: number;
  type: ChatRoomType;
  name?: string;
  classId?: number;
  className?: string;
  user1Id?: number;
  user2Id?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Additional fields for direct chats
  otherUserName?: string;
  otherUserEmail?: string;
  otherUserAvatar?: string;
}

export interface ChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  senderName: string;
  content: string;
  status: MessageStatus;
  isEdited: boolean;
  replyToId?: number;
  replyToContent?: string;
  replyToSenderName?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  readBy?: string;
  createdAt: string;
  updatedAt?: string;
  isOwnMessage: boolean;
}

export interface CreateRoomRequest {
  type: ChatRoomType;
  name?: string;
  classId?: number;
  otherUserId?: number;
}

export interface SendMessageRequest {
  roomId: number;
  content: string;
  replyToId?: number;
  attachmentUrl?: string;
  attachmentType?: string;
}

export interface EditMessageRequest {
  messageId?: number; // Made optional since it's set in the API call
  newContent: string;
}

export interface DeleteMessageRequest {
  messageId: number;
  deleteForEveryone?: boolean;
}

export interface TypingIndicator {
  roomId: number;
  userId: number;
  userName: string;
  isTyping: boolean;
}