package com.edu.platform.event;

import com.edu.platform.model.chat.ChatMessage;
import com.edu.platform.model.enums.NotificationPriority;
import com.edu.platform.model.enums.NotificationType;

/**
 * Event fired when a chat message is sent.
 * Notifies the recipient(s) of the message.
 */
public class ChatMessageEvent extends NotificationEvent {

    private final ChatMessage chatMessage;
    private final Long recipientUserId;

    private ChatMessageEvent(
            Long recipientUserId,
            ChatMessage message) {
        super(
            recipientUserId,
            NotificationType.CHAT_MESSAGE,
            NotificationPriority.LOW, // Chat messages are low priority
            buildTitle(message),
            buildMessageContent(message),
            "/chat/rooms/" + message.getRoomId(),
            message.getId(),
            "CHAT_MESSAGE"
        );
        this.chatMessage = message;
        this.recipientUserId = recipientUserId;
    }

    private static String buildTitle(ChatMessage message) {
        return String.format("New message from %s", message.getSenderName());
    }

    private static String buildMessageContent(ChatMessage message) {
        String content = message.getContent();
        // Truncate long messages
        if (content.length() > 50) {
            content = content.substring(0, 50) + "...";
        }
        return content;
    }

    // ✅ FIXED: Renamed to avoid conflict with parent's getMessage()
    public ChatMessage getChatMessage() {
        return chatMessage;
    }

    public Long getRecipientUserId() {
        return recipientUserId;
    }

    /**
     * Factory method to create event for a single recipient
     */
    public static ChatMessageEvent forRecipient(ChatMessage message, Long recipientUserId) {
        return new ChatMessageEvent(recipientUserId, message);
    }
}