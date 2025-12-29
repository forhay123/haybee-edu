import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { chatApi } from '../api/chatApi';
import { 
  ChatRoom, 
  ChatMessage, 
  CreateRoomRequest, 
  SendMessageRequest,
  EditMessageRequest 
} from '../types/chat';

interface UseChatOptions {
  currentUserId?: number;
  autoFetchRooms?: boolean;
}

export const useChat = (options: UseChatOptions = {}) => {
  const { currentUserId, autoFetchRooms = true } = options;

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const [wsClient, setWsClient] = useState<Client | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [roomSubscription, setRoomSubscription] = useState<StompSubscription | null>(null);
  const [typingSubscription, setTypingSubscription] = useState<StompSubscription | null>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const processedMessageIdsRef = useRef<Set<number>>(new Set());

  const getToken = useCallback(() => {
    return localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  }, []);

  const getCurrentUserEmail = useCallback(() => {
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.email || '';
      } catch (error) {
        console.error('Failed to decode token:', error);
      }
    }
    return '';
  }, [getToken]);

  // ✅ UPDATED WEBSOCKET CONNECTION (dynamic env variable)
  const connectWebSocket = useCallback(() => {
    const token = getToken();
    if (!token) {
      console.error('❌ No JWT token found');
      return;
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
    const wsUrl = `${baseUrl}/ws-chat`;

    console.log('🔌 Connecting to WebSocket at:', wsUrl);

    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),

      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },

      debug: (str) => {
        console.log('📡 WebSocket:', str);
      },

      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,

      onConnect: () => {
        console.log('✅ WebSocket connected to', wsUrl);
        setWsConnected(true);
      },

      onStompError: (frame) => {
        console.error('❌ WebSocket STOMP error:', frame.headers['message']);
        console.error('Frame body:', frame.body);
        setWsConnected(false);
      },

      onWebSocketClose: (evt) => {
        console.warn('⚠️ WebSocket connection closed', evt);
        setWsConnected(false);
      },

      onWebSocketError: (evt) => {
        console.error('❌ WebSocket error:', evt);
      },
    });

    client.activate();
    setWsClient(client);
  }, [getToken]);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await chatApi.getUserRooms();
      setRooms(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rooms');
      console.error('Error fetching rooms:', err);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await chatApi.getTotalUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  const subscribeToRoom = useCallback((roomId: number) => {
    if (!wsClient?.connected) {
      console.error('❌ WebSocket not connected, cannot subscribe to room', roomId);
      return;
    }

    if (roomSubscription) roomSubscription.unsubscribe();
    if (typingSubscription) typingSubscription.unsubscribe();

    processedMessageIdsRef.current.clear();
    setTypingUsers([]);
    typingTimersRef.current.forEach(t => clearTimeout(t));
    typingTimersRef.current.clear();

    const messageDestination = `/topic/chat.room.${roomId}`;
    console.log(`📬 Subscribing to messages: ${messageDestination}`);

    const msgSub = wsClient.subscribe(messageDestination, (message) => {
      try {
        const data = JSON.parse(message.body);

        if (processedMessageIdsRef.current.has(data.id)) return;
        processedMessageIdsRef.current.add(data.id);

        if (data.type === 'MESSAGE_DELETED') {
          setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
          processedMessageIdsRef.current.delete(data.messageId);
          return;
        }

        const messageWithOwnership = {
          ...data,
          isOwnMessage: currentUserId ? data.senderId === currentUserId : false
        };

        setMessages(prev => {
          const exists = prev.some(m => m.id === data.id);
          if (!exists) return [...prev, messageWithOwnership];
          return prev;
        });

        setRooms(prev => prev.map(room => 
          room.id === roomId
            ? { 
                ...room, 
                lastMessage: data.content,
                lastMessageAt: data.sentAt || new Date().toISOString(),
                unreadCount: messageWithOwnership.isOwnMessage ? 0 : room.unreadCount
              }
            : room
        ));

        fetchUnreadCount();
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    });

    const typingDestination = `/topic/chat.typing.${roomId}`;
    console.log(`⌨️ Subscribing to typing: ${typingDestination}`);

    const typingSub = wsClient.subscribe(typingDestination, (message) => {
      try {
        const typingData = JSON.parse(message.body);
        const { senderEmail, displayName } = typingData;

        const currentUserEmail = getCurrentUserEmail();
        if (senderEmail === currentUserEmail) return;

        const existingTimer = typingTimersRef.current.get(senderEmail);
        if (existingTimer) clearTimeout(existingTimer);

        setTypingUsers(prev => {
          if (!prev.includes(displayName)) return [...prev, displayName];
          return prev;
        });

        const timer = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u !== displayName));
          typingTimersRef.current.delete(senderEmail);
        }, 3000);

        typingTimersRef.current.set(senderEmail, timer);
      } catch (error) {
        console.error('❌ Error parsing typing indicator:', error);
      }
    });

    setRoomSubscription(msgSub);
    setTypingSubscription(typingSub);

    console.log('✅ Subscribed to room', roomId);
  }, [wsClient, getCurrentUserEmail, fetchUnreadCount, currentUserId]);

  const sendTypingIndicator = useCallback((roomId: number) => {
    if (!wsClient?.connected) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    wsClient.publish({
      destination: `/app/chat.typing/${roomId}`,
      body: ''
    });

    typingTimeoutRef.current = setTimeout(() => {}, 3000);
  }, [wsClient]);

  const fetchMessages = useCallback(async (roomId: number, page = 0) => {
    try {
      setLoading(true);
      const data = await chatApi.getRoomMessages(roomId, page);
      
      const messagesWithOwnership = data.map(msg => ({
        ...msg,
        isOwnMessage: currentUserId ? msg.senderId === currentUserId : (msg.isOwnMessage ?? false)
      }));
      
      setMessages(messagesWithOwnership.reverse());
      
      data.forEach(msg => processedMessageIdsRef.current.add(msg.id));
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const createOrGetRoom = useCallback(async (request: CreateRoomRequest) => {
    try {
      setLoading(true);
      const room = await chatApi.createOrGetRoom(request);
      setSelectedRoom(room);
      await fetchRooms();
      await fetchMessages(room.id);
      setError(null);
      return room;
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
      console.error('Error creating room:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchRooms, fetchMessages]);

  const sendMessage = useCallback(async (request: SendMessageRequest) => {
    try {
      const message = await chatApi.sendMessage(request);

      setRooms(prev => prev.map(room => 
        room.id === request.roomId
          ? {
              ...room,
              lastMessage: request.content,
              lastMessageAt: new Date().toISOString()
            }
          : room
      ));
      
      setError(null);
      return message;
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      console.error('Error sending message:', err);
      throw err;
    }
  }, []);

  const editMessage = useCallback(async (messageId: number, newContent: string) => {
    try {
      const request: EditMessageRequest = { messageId, newContent };
      const updatedMessage = await chatApi.editMessage(messageId, request);
      
      const messageWithOwnership = {
        ...updatedMessage,
        isOwnMessage: currentUserId ? updatedMessage.senderId === currentUserId : (updatedMessage.isOwnMessage ?? false)
      };
      
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? messageWithOwnership : msg
      ));
      
      setError(null);
      return messageWithOwnership;
    } catch (err: any) {
      setError(err.message || 'Failed to edit message');
      console.error('Error editing message:', err);
      throw err;
    }
  }, [currentUserId]);

  const deleteMessage = useCallback(async (messageId: number) => {
    try {
      await chatApi.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      processedMessageIdsRef.current.delete(messageId);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete message');
      console.error('Error deleting message:', err);
      throw err;
    }
  }, []);

  const markAsRead = useCallback(async (roomId: number) => {
    try {
      await chatApi.markMessagesAsRead(roomId);
      
      setRooms(prev => prev.map(room =>
        room.id === roomId ? { ...room, unreadCount: 0 } : room
      ));
      
      setMessages(prev => prev.map(msg =>
        msg.roomId === roomId && !msg.isOwnMessage
          ? { ...msg, status: 'READ' as any }
          : msg
      ));
      
      await fetchUnreadCount();
    } catch (err: any) {
      console.error('Error marking messages as read:', err);
    }
  }, [fetchUnreadCount]);

  const selectRoom = useCallback(async (room: ChatRoom) => {
    setSelectedRoom(room);
    setReplyingTo(null);
    setTypingUsers([]);
    processedMessageIdsRef.current.clear();
    
    await fetchMessages(room.id);
    await markAsRead(room.id);
    
    if (wsClient?.connected) {
      subscribeToRoom(room.id);
    }
  }, [fetchMessages, markAsRead, subscribeToRoom, wsClient]);

  const setReplyTo = useCallback((message: ChatMessage | null) => {
    setReplyingTo(message);
  }, []);

  const clearSelectedRoom = useCallback(() => {
    if (roomSubscription) roomSubscription.unsubscribe();
    if (typingSubscription) typingSubscription.unsubscribe();
    
    setSelectedRoom(null);
    setMessages([]);
    setReplyingTo(null);
    setTypingUsers([]);
    processedMessageIdsRef.current.clear();
    
    typingTimersRef.current.forEach(timer => clearTimeout(timer));
    typingTimersRef.current.clear();
  }, [roomSubscription, typingSubscription]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (roomSubscription) roomSubscription.unsubscribe();
      if (typingSubscription) typingSubscription.unsubscribe();
      if (wsClient) wsClient.deactivate();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (autoFetchRooms) {
      fetchRooms();
      fetchUnreadCount();
    }
  }, [autoFetchRooms, fetchRooms, fetchUnreadCount]);

  useEffect(() => {
    if (!autoFetchRooms) return;
    const interval = setInterval(() => {
      if (!selectedRoom) {
        fetchRooms();
      }
      fetchUnreadCount();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoFetchRooms, fetchRooms, fetchUnreadCount, selectedRoom]);

  return {
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
    fetchRooms,
    fetchMessages,
    fetchUnreadCount,
    setReplyTo,
    clearSelectedRoom,
    sendTypingIndicator
  };
};
