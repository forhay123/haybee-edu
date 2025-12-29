// src/services/websocketService.ts
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  /**
   * Get WebSocket URL from environment variable
   * ✅ FIXED: Use the base API URL and add /ws-chat endpoint
   */
  private getWebSocketUrl(): string {
    // Get base API URL from .env (e.g., http://172.20.10.3:8080/api/v1)
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
    
    // WebSocket endpoint is at /api/v1/ws-chat
    const wsUrl = `${baseUrl}/ws-chat`;
    
    console.log('🔌 WebSocket URL:', wsUrl);
    return wsUrl;
  }

  /**
   * Connect to WebSocket server
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.getWebSocketUrl();
      console.log('🔌 Connecting to WebSocket at:', wsUrl);

      this.client = new Client({
        webSocketFactory: () => new SockJS(wsUrl), // ✅ Use dynamic URL
        
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },

        debug: (str) => {
          console.log('📡 WebSocket:', str);
        },

        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,

        onConnect: () => {
          console.log('✅ WebSocket connected to', wsUrl);
          this.reconnectAttempts = 0;
          resolve();
        },

        onStompError: (frame) => {
          console.error('❌ WebSocket STOMP error:', frame.headers['message']);
          console.error('Frame body:', frame.body);
          reject(new Error(frame.headers['message']));
        },

        onWebSocketClose: (evt) => {
          console.warn('⚠️ WebSocket connection closed', evt);
          this.handleReconnect(token);
        },

        onWebSocketError: (evt) => {
          console.error('❌ WebSocket error:', evt);
        },
      });

      this.client.activate();
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect(token).catch(console.error);
      }, this.reconnectDelay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  /**
   * Subscribe to a chat room
   */
  subscribeToRoom(roomId: number, callback: (message: any) => void): void {
    if (!this.client?.connected) {
      console.error('❌ WebSocket not connected');
      return;
    }

    const destination = `/topic/chat.room.${roomId}`;
    
    // Unsubscribe if already subscribed
    if (this.subscriptions.has(destination)) {
      this.subscriptions.get(destination)?.unsubscribe();
    }

    console.log(`📬 Subscribing to ${destination}`);

    const subscription = this.client.subscribe(destination, (message) => {
      try {
        const data = JSON.parse(message.body);
        console.log('📨 Received message:', data);
        callback(data);
      } catch (error) {
        console.error('❌ Error parsing message:', error);
      }
    });

    this.subscriptions.set(destination, subscription);
  }

  /**
   * Unsubscribe from a chat room
   */
  unsubscribeFromRoom(roomId: number): void {
    const destination = `/topic/chat.room.${roomId}`;
    
    if (this.subscriptions.has(destination)) {
      console.log(`📭 Unsubscribing from ${destination}`);
      this.subscriptions.get(destination)?.unsubscribe();
      this.subscriptions.delete(destination);
    }
  }

  /**
   * Send a message via WebSocket
   */
  sendMessage(roomId: number, content: string, replyToId?: number): void {
    if (!this.client?.connected) {
      console.error('❌ WebSocket not connected');
      throw new Error('WebSocket not connected');
    }

    const destination = `/app/chat.sendMessage/${roomId}`;
    const message = {
      content,
      replyToId: replyToId || null,
    };

    console.log(`📤 Sending message to ${destination}:`, message);

    this.client.publish({
      destination,
      body: JSON.stringify(message),
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(roomId: number): void {
    if (!this.client?.connected) {
      return;
    }

    this.client.publish({
      destination: `/app/chat.typing/${roomId}`,
      body: '',
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    console.log('🔌 Disconnecting WebSocket...');
    
    // Unsubscribe from all rooms
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions.clear();

    // Deactivate client
    this.client?.deactivate();
    this.client = null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client?.connected || false;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();