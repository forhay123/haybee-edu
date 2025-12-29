package com.edu.platform.controller;

import com.edu.platform.dto.chat.ChatMessageDTO;
import com.edu.platform.dto.chat.SendMessageRequest;
import com.edu.platform.service.ChatService;
import com.edu.platform.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatWebSocketController {

    private final ChatService chatService;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Handle sending messages via WebSocket
     * Endpoint: /app/chat.sendMessage/{roomId}
     */
    @MessageMapping("/chat.sendMessage/{roomId}")
    public void sendMessage(
            @DestinationVariable Long roomId,
            @Payload SendMessageRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        try {
            log.info("📨 WebSocket message received for room {} from {}",
                    roomId, principal.getUsername());

            // Get user ID from email
            Long userId = userService.findByEmail(principal.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"))
                    .getId();

            // Set room ID in request
            request.setRoomId(roomId);

            // Save message to database
            ChatMessageDTO message = chatService.sendMessage(userId, request);

            // Broadcast to all subscribers of this room
            messagingTemplate.convertAndSend(
                    "/topic/chat.room." + roomId,
                    message
            );

            log.info("✅ Message {} broadcasted to room {}", message.getId(), roomId);
        } catch (Exception e) {
            log.error("❌ Error processing WebSocket message: {}", e.getMessage(), e);
        }
    }

    /**
     * ✅ FIXED: Typing indicator - use Principal instead of @AuthenticationPrincipal
     * Frontend sends empty body, so we use SimpMessageHeaderAccessor to get user
     */
    @MessageMapping("/chat.typing/{roomId}")
    public void userTyping(
            @DestinationVariable Long roomId,
            Principal principal) {  // ✅ Changed from @AuthenticationPrincipal UserDetails
        try {
            if (principal == null) {
                log.warn("⚠️ Typing indicator received with no authenticated user");
                return;
            }
            
            String userEmail = principal.getName();
            log.info("⌨️ Typing indicator received for room {} from {}", roomId, userEmail);

            // Get user's display name
            String displayName = userService.findByEmail(userEmail)
                    .map(user -> user.getFullName())
                    .orElse(userEmail);

            // Prepare JSON payload
            Map<String, String> typingData = new HashMap<>();
            typingData.put("senderEmail", userEmail);
            typingData.put("displayName", displayName);

            // Broadcast typing event
            messagingTemplate.convertAndSend(
                    "/topic/chat.typing." + roomId,
                    typingData
            );

            log.info("⌨️ Typing indicator broadcasted: {} ({}) in room {}",
                    displayName, userEmail, roomId);
        } catch (Exception e) {
            log.error("❌ Error processing typing indicator: {}", e.getMessage(), e);
        }
    }
}