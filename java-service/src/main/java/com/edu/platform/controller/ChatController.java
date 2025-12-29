package com.edu.platform.controller;

import com.edu.platform.dto.chat.*;
import com.edu.platform.security.JwtTokenUtil;
import com.edu.platform.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for chat functionality.
 * Handles chat rooms and messages for students and teachers.
 */
@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
@Tag(name = "Chat", description = "Chat Management APIs")
@SecurityRequirement(name = "bearerAuth")
public class ChatController {
    
    private final ChatService chatService;
    private final JwtTokenUtil jwtTokenUtil;
    
    /**
     * Create or get a chat room
     */
    @PostMapping("/rooms")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Create or get a chat room", 
               description = "Creates a new chat room or returns existing one. Supports direct messages and class group chats.")
    public ResponseEntity<ChatRoomDTO> createOrGetRoom(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody CreateRoomRequest request) {
        
        Long userId = jwtTokenUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        ChatRoomDTO room = chatService.createOrGetRoom(userId, request);
        return ResponseEntity.ok(room);
    }
    
    /**
     * Get all chat rooms for current user
     */
    @GetMapping("/rooms")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get all chat rooms", 
               description = "Retrieves all active chat rooms accessible by the current user")
    public ResponseEntity<List<ChatRoomDTO>> getUserRooms(
            @RequestHeader("Authorization") String token) {
        
        Long userId = jwtTokenUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        List<ChatRoomDTO> rooms = chatService.getUserRooms(userId);
        return ResponseEntity.ok(rooms);
    }
    
    /**
     * Send a message
     */
    @PostMapping("/messages")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Send a message", 
               description = "Sends a new message to a chat room")
    public ResponseEntity<ChatMessageDTO> sendMessage(
            @RequestHeader("Authorization") String token,
            @Valid @RequestBody SendMessageRequest request) {
        
        Long userId = jwtTokenUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        ChatMessageDTO message = chatService.sendMessage(userId, request);
        return ResponseEntity.ok(message);
    }
    
    /**
     * Get messages for a room
     */
    @GetMapping("/rooms/{roomId}/messages")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get messages for a room", 
               description = "Retrieves paginated messages from a chat room")
    public ResponseEntity<List<ChatMessageDTO>> getRoomMessages(
            @RequestHeader("Authorization") String token,
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        
        Long userId = jwtTokenUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        List<ChatMessageDTO> messages = chatService.getRoomMessages(userId, roomId, page, size);
        return ResponseEntity.ok(messages);
    }
    
    /**
     * Mark messages as read
     */
    @PutMapping("/rooms/{roomId}/read")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Mark messages as read", 
               description = "Marks all unread messages in a room as read")
    public ResponseEntity<Void> markMessagesAsRead(
            @RequestHeader("Authorization") String token,
            @PathVariable Long roomId) {
        
        Long userId = jwtTokenUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        chatService.markMessagesAsRead(userId, roomId);
        return ResponseEntity.ok().build();
    }
    
    /**
     * Get total unread message count
     */
    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Get total unread count", 
               description = "Returns the total number of unread messages across all rooms")
    public ResponseEntity<Long> getTotalUnreadCount(
            @RequestHeader("Authorization") String token) {
        
        Long userId = jwtTokenUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        Long count = chatService.getTotalUnreadCount(userId);
        return ResponseEntity.ok(count);
    }
    
    /**
     * Edit a message
     */
    @PutMapping("/messages/{messageId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Edit a message", 
               description = "Edits an existing message (only by message owner)")
    public ResponseEntity<ChatMessageDTO> editMessage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long messageId,
            @Valid @RequestBody EditMessageRequest request) {
        
        Long userId = jwtTokenUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        request.setMessageId(messageId); // Ensure consistency
        ChatMessageDTO message = chatService.editMessage(userId, request);
        return ResponseEntity.ok(message);
    }
    
    /**
     * Delete a message
     */
    @DeleteMapping("/messages/{messageId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'TEACHER', 'ADMIN')")
    @Operation(summary = "Delete a message", 
               description = "Deletes a message (only by message owner)")
    public ResponseEntity<Void> deleteMessage(
            @RequestHeader("Authorization") String token,
            @PathVariable Long messageId) {
        
        Long userId = jwtTokenUtil.getUserIdFromToken(token.replace("Bearer ", ""));
        chatService.deleteMessage(userId, messageId);
        return ResponseEntity.noContent().build();
    }
}