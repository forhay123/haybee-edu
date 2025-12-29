package com.edu.platform.service;

import com.edu.platform.dto.chat.*;
import com.edu.platform.event.NotificationEventPublisher;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.exception.UnauthorizedException;
import com.edu.platform.model.ClassEntity;
import com.edu.platform.model.User;
import com.edu.platform.model.chat.*;
import com.edu.platform.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for handling chat room and message operations.
 * Supports direct messages and class group chats.
 * ✅ FIXED: Added WebSocket real-time broadcasting for REST API requests
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {
    
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final ClassRepository classRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final StudentProfileService studentProfileService;
    private final TeacherProfileService teacherProfileService;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationEventPublisher eventPublisher;
    
    /**
     * Create a new chat room or retrieve existing one
     */
    @Transactional
    public ChatRoomDTO createOrGetRoom(Long currentUserId, CreateRoomRequest request) {
        log.info("Creating/getting room for user {} with request type: {}", currentUserId, request.getType());
        
        // Validate request
        request.validate();
        
        ChatRoom room;
        
        if (request.getType() == ChatRoomType.DIRECT) {
            // Check if direct room already exists
            var existingRoom = chatRoomRepository.findDirectRoomBetweenUsers(
                currentUserId, request.getOtherUserId());
            
            if (existingRoom.isPresent()) {
                room = existingRoom.get();
                log.info("Found existing direct chat room: {}", room.getId());
            } else {
                // Create new direct room
                User user1 = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
                User user2 = userRepository.findById(request.getOtherUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Other user not found"));
                
                room = ChatRoom.builder()
                    .type(ChatRoomType.DIRECT)
                    .user1(user1)
                    .user2(user2)
                    .isActive(true)
                    .build();
                
                room = chatRoomRepository.save(room);
                log.info("Created new direct chat room: {} between users {} and {}", 
                         room.getId(), currentUserId, request.getOtherUserId());
            }
        } else if (request.getType() == ChatRoomType.CLASS) {
            // Check if class room exists
            var existingRoom = chatRoomRepository.findByTypeAndClassId(
                ChatRoomType.CLASS, request.getClassId());
            
            if (existingRoom.isPresent()) {
                room = existingRoom.get();
                log.info("Found existing class chat room: {}", room.getId());
            } else {
                // Verify user has access to this class
                verifyClassAccess(currentUserId, request.getClassId());
                
                ClassEntity classEntity = classRepository.findById(request.getClassId())
                    .orElseThrow(() -> new ResourceNotFoundException("Class not found"));
                
                // Create new class room
                room = ChatRoom.builder()
                    .type(ChatRoomType.CLASS)
                    .classEntity(classEntity)
                    .name(request.getName() != null ? request.getName() : classEntity.getName() + " Chat")
                    .isActive(true)
                    .build();
                
                room = chatRoomRepository.save(room);
                log.info("Created new class chat room: {} for class {}", room.getId(), classEntity.getName());
            }
        } else {
            throw new IllegalArgumentException("Unsupported room type: " + request.getType());
        }
        
        return mapToDTO(room, currentUserId);
    }
    
    /**
     * Get all chat rooms accessible by a user
     */
    @Transactional(readOnly = true)
    public List<ChatRoomDTO> getUserRooms(Long userId) {
        log.info("Fetching rooms for user {}", userId);
        
        // Get user's enrolled class IDs
        List<Long> classIds = getClassIdsForUser(userId);
        
        List<ChatRoom> rooms = chatRoomRepository.findActiveRoomsForUser(userId, classIds);
        log.info("Found {} rooms for user {}", rooms.size(), userId);
        
        return rooms.stream()
            .map(room -> {
                ChatRoomDTO dto = mapToDTO(room, userId);
                // Get unread count
                Long unreadCount = chatMessageRepository.countUnreadMessages(room.getId(), userId);
                dto.setUnreadCount(unreadCount);
                return dto;
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Send a message to a chat room
     * ✅ FIXED: Re-enabled WebSocket broadcast for REST API requests
     * ✅ FIXED: Don't include isOwnMessage in broadcast - let frontend calculate it
     */
    @Transactional
    public ChatMessageDTO sendMessage(Long userId, SendMessageRequest request) {
        log.info("User {} sending message to room {}", userId, request.getRoomId());
        
        ChatRoom room = chatRoomRepository.findById(request.getRoomId())
            .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));
        
        // Verify user has access to this room
        verifyRoomAccess(userId, room);
        
        User sender = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Build the message
        ChatMessage.ChatMessageBuilder messageBuilder = ChatMessage.builder()
            .room(room)
            .sender(sender)
            .senderName(sender.getFullName())
            .content(request.getContent())
            .status(MessageStatus.SENT)
            .isEdited(false);
        
        // Handle reply-to
        if (request.getReplyToId() != null) {
            ChatMessage replyToMessage = chatMessageRepository.findById(request.getReplyToId())
                .orElseThrow(() -> new ResourceNotFoundException("Reply-to message not found"));
            messageBuilder.replyTo(replyToMessage);
        }
        
        // Handle attachment
        if (request.getAttachmentUrl() != null) {
            messageBuilder.attachmentUrl(request.getAttachmentUrl());
        }
        
        ChatMessage message = messageBuilder.build();
        message = chatMessageRepository.save(message);
        
        // Update room's last message
        room.setLastMessage(truncate(request.getContent(), 100));
        room.setLastMessageAt(LocalDateTime.now());
        chatRoomRepository.save(room);
        
        // Convert to DTO for API response (includes isOwnMessage for sender)
        ChatMessageDTO messageDTO = mapMessageToDTO(message, userId);
        
        // Create broadcast DTO WITHOUT isOwnMessage (let frontend calculate it)
        ChatMessageDTO broadcastDTO = mapMessageToDTOForBroadcast(message);
        
        // Broadcast via WebSocket for REST API requests
        try {
            String destination = "/topic/chat.room." + room.getId();
            messagingTemplate.convertAndSend(destination, broadcastDTO);
            log.info("📡 Message {} broadcasted via WebSocket to {}", message.getId(), destination);
        } catch (Exception e) {
            log.error("❌ Failed to broadcast message via WebSocket: {}", e.getMessage());
        }
        
        // ✅ NEW: Send notifications to recipients
        try {
            List<Long> recipientIds = getRecipientIdsForRoom(room, userId);
            if (!recipientIds.isEmpty()) {
                eventPublisher.publishChatMessage(message, recipientIds);
                log.info("📢 Published chat message notifications to {} recipients", recipientIds.size());
            }
        } catch (Exception e) {
            log.error("❌ Failed to publish chat message notifications: {}", e.getMessage());
            // Don't fail message sending if notification fails
        }
        
        log.info("Message {} sent successfully to room {}", message.getId(), room.getId());
        
        return messageDTO;
    }

    /**
     * ✅ NEW: Get recipient user IDs for a chat room (excluding sender)
     */
    private List<Long> getRecipientIdsForRoom(ChatRoom room, Long senderId) {
        List<Long> recipientIds = new ArrayList<>();
        
        if (room.getType() == ChatRoomType.DIRECT) {
            // For direct messages, the recipient is the other user
            Long recipientId = senderId.equals(room.getUser1Id()) 
                ? room.getUser2Id() 
                : room.getUser1Id();
            recipientIds.add(recipientId);
            
        } else if (room.getType() == ChatRoomType.CLASS) {
            // For class rooms, get all enrolled users except the sender
            List<Long> classIds = List.of(room.getClassId());
            
            // Get all users in the class
            List<Long> allClassMembers = new ArrayList<>();
            
            // Add students
            try {
                var students = enrollmentRepository.findStudentsByClassId(room.getClassId());
                students.forEach(student -> {
                    if (student.getUser() != null && !student.getUser().getId().equals(senderId)) {
                        allClassMembers.add(student.getUser().getId());
                    }
                });
            } catch (Exception e) {
                log.error("Failed to get students for class {}", room.getClassId(), e);
            }
            
            // Add teachers for the class
            try {
                var teachers = teacherProfileService.getTeachersForClass(room.getClassId());
                teachers.forEach(teacher -> {
                    if (!teacher.getUserId().equals(senderId)) {
                        allClassMembers.add(teacher.getUserId());
                    }
                });
            } catch (Exception e) {
                log.error("Failed to get teachers for class {}", room.getClassId(), e);
            }
            
            recipientIds.addAll(allClassMembers);
        }
        
        log.debug("Found {} recipients for room {} (excluding sender {})", 
                recipientIds.size(), room.getId(), senderId);
        
        return recipientIds;
    }
    
    /**
     * Get messages from a chat room (paginated)
     */
    @Transactional(readOnly = true)
    public List<ChatMessageDTO> getRoomMessages(Long userId, Long roomId, int page, int size) {
        log.info("Fetching messages for room {} by user {} (page: {}, size: {})", 
                 roomId, userId, page, size);
        
        ChatRoom room = chatRoomRepository.findById(roomId)
            .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));
        
        verifyRoomAccess(userId, room);
        
        Pageable pageable = PageRequest.of(page, size);
        Page<ChatMessage> messages = chatMessageRepository.findByRoomIdOrderByCreatedAtDesc(roomId, pageable);
        
        log.info("Found {} messages for room {}", messages.getTotalElements(), roomId);
        
        return messages.getContent().stream()
            .map(msg -> mapMessageToDTO(msg, userId))
            .collect(Collectors.toList());
    }
    
    /**
     * Mark all messages in a room as read for the current user
     */
    @Transactional
    public void markMessagesAsRead(Long userId, Long roomId) {
        log.info("Marking messages as read in room {} for user {}", roomId, userId);
        
        ChatRoom room = chatRoomRepository.findById(roomId)
            .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));
        
        verifyRoomAccess(userId, room);
        
        chatMessageRepository.markMessagesAsRead(roomId, userId, MessageStatus.READ);
        log.info("Messages marked as read in room {} for user {}", roomId, userId);
    }
    
    /**
     * Get total unread message count for a user
     */
    @Transactional(readOnly = true)
    public Long getTotalUnreadCount(Long userId) {
        List<Long> classIds = getClassIdsForUser(userId);
        return chatMessageRepository.countTotalUnreadMessages(userId, classIds);
    }
    
    /**
     * Edit an existing message
     * ✅ Broadcasts edit via WebSocket
     */
    @Transactional
    public ChatMessageDTO editMessage(Long userId, EditMessageRequest request) {
        log.info("User {} editing message {}", userId, request.getMessageId());
        
        ChatMessage message = chatMessageRepository.findById(request.getMessageId())
            .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
        
        // Verify user owns this message
        if (!message.getSenderId().equals(userId)) {
            throw new UnauthorizedException("You can only edit your own messages");
        }
        
        // Update message content
        message.setContent(request.getNewContent());
        message.markAsEdited();
        
        message = chatMessageRepository.save(message);
        
        ChatMessageDTO messageDTO = mapMessageToDTO(message, userId);
        
        // ✅ Broadcast without isOwnMessage
        ChatMessageDTO broadcastDTO = mapMessageToDTOForBroadcast(message);
        
        // Broadcast edit via WebSocket
        try {
            String destination = "/topic/chat.room." + message.getRoomId();
            messagingTemplate.convertAndSend(destination, broadcastDTO);
            log.info("📡 Message edit {} broadcasted via WebSocket", message.getId());
        } catch (Exception e) {
            log.error("❌ Failed to broadcast message edit: {}", e.getMessage());
        }
        
        log.info("Message {} edited successfully", message.getId());
        
        return messageDTO;
    }
    
    /**
     * Delete a message
     * ✅ Broadcasts deletion via WebSocket
     */
    @Transactional
    public void deleteMessage(Long userId, Long messageId) {
        log.info("User {} deleting message {}", userId, messageId);
        
        ChatMessage message = chatMessageRepository.findById(messageId)
            .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
        
        // Verify user owns this message
        if (!message.getSenderId().equals(userId)) {
            throw new UnauthorizedException("You can only delete your own messages");
        }
        
        Long roomId = message.getRoomId();
        
        chatMessageRepository.deleteById(messageId);
        
        // Broadcast deletion via WebSocket
        try {
            String destination = "/topic/chat.room." + roomId;
            messagingTemplate.convertAndSend(destination, 
                java.util.Map.of(
                    "type", "MESSAGE_DELETED",
                    "messageId", messageId,
                    "roomId", roomId
                ));
            log.info("📡 Message deletion broadcasted via WebSocket");
        } catch (Exception e) {
            log.error("❌ Failed to broadcast message deletion: {}", e.getMessage());
        }
        
        log.info("Message {} deleted successfully", messageId);
    }
    
    // ==================== HELPER METHODS ====================
    
    /**
     * Verify user has access to a chat room
     */
    private void verifyRoomAccess(Long userId, ChatRoom room) {
        if (room.getType() == ChatRoomType.DIRECT) {
            Long user1Id = room.getUser1Id();
            Long user2Id = room.getUser2Id();
            
            if (!userId.equals(user1Id) && !userId.equals(user2Id)) {
                throw new UnauthorizedException("You don't have access to this chat room");
            }
        } else if (room.getType() == ChatRoomType.CLASS) {
            // Check if user is enrolled in the class
            List<Long> userClassIds = getClassIdsForUser(userId);
            Long roomClassId = room.getClassId();
            
            if (roomClassId == null || !userClassIds.contains(roomClassId)) {
                throw new UnauthorizedException("You don't have access to this chat room");
            }
        }
    }
    
    /**
     * Verify user has access to a specific class (for creating class rooms)
     */
    private void verifyClassAccess(Long userId, Long classId) {
        List<Long> userClassIds = getClassIdsForUser(userId);
        
        if (!userClassIds.contains(classId)) {
            throw new UnauthorizedException("You don't have access to this class");
        }
    }
    
    /**
     * Get class IDs for a user (handles both students and teachers)
     */
    private List<Long> getClassIdsForUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        List<Long> classIds = new ArrayList<>();
        
        // Check if user is a student
        var studentProfile = studentProfileService.getStudentProfile(userId);
        if (studentProfile.isPresent() && studentProfile.get().getClassLevel() != null) {
            classIds.add(studentProfile.get().getClassLevel().getId());
            log.debug("User {} is a student in class {}", userId, studentProfile.get().getClassLevel().getId());
        }
        
        // Check if user is a teacher
        try {
            List<Long> teacherClassIds = teacherProfileService.getTeacherClassIds(user.getEmail());
            if (teacherClassIds != null && !teacherClassIds.isEmpty()) {
                classIds.addAll(teacherClassIds);
                log.debug("User {} is a teacher for {} classes", userId, teacherClassIds.size());
            }
        } catch (Exception e) {
            // User is not a teacher, which is fine
            log.debug("User {} is not a teacher", userId);
        }
        
        return classIds;
    }
    
    /**
     * Map ChatRoom entity to DTO
     */
    private ChatRoomDTO mapToDTO(ChatRoom room, Long currentUserId) {
        ChatRoomDTO.ChatRoomDTOBuilder builder = ChatRoomDTO.builder()
            .id(room.getId())
            .type(room.getType())
            .name(room.getName())
            .classId(room.getClassId())
            .user1Id(room.getUser1Id())
            .user2Id(room.getUser2Id())
            .lastMessage(room.getLastMessage())
            .lastMessageAt(room.getLastMessageAt())
            .isActive(room.getIsActive())
            .createdAt(room.getCreatedAt())
            .updatedAt(room.getUpdatedAt());
        
        // Set class name for class rooms
        if (room.getType() == ChatRoomType.CLASS && room.getClassId() != null) {
            classRepository.findById(room.getClassId()).ifPresent(classEntity -> {
                builder.className(classEntity.getName());
            });
        }
        
        // Set other user info for direct chats
        if (room.getType() == ChatRoomType.DIRECT) {
            Long otherUserId = currentUserId.equals(room.getUser1Id()) ? 
                room.getUser2Id() : room.getUser1Id();
            
            userRepository.findById(otherUserId).ifPresent(otherUser -> {
                builder.otherUserName(otherUser.getFullName());
                builder.otherUserEmail(otherUser.getEmail());
            });
        }
        
        return builder.build();
    }
    
    /**
     * Map ChatMessage entity to DTO
     */
    private ChatMessageDTO mapMessageToDTO(ChatMessage message, Long currentUserId) {
        ChatMessageDTO.ChatMessageDTOBuilder builder = ChatMessageDTO.builder()
            .id(message.getId())
            .roomId(message.getRoomId())
            .senderId(message.getSenderId())
            .senderName(message.getSenderName())
            .content(message.getContent())
            .status(message.getStatus())
            .isEdited(message.getIsEdited())
            .replyToId(message.getReplyToId())
            .attachmentUrl(message.getAttachmentUrl())
            .readBy(message.getReadBy())
            .createdAt(message.getCreatedAt())
            .updatedAt(message.getUpdatedAt())
            .isOwnMessage(message.getSenderId().equals(currentUserId));
        
        // Add reply-to message info if present
        if (message.getReplyToId() != null) {
            chatMessageRepository.findById(message.getReplyToId()).ifPresent(replyMsg -> {
                builder.replyToContent(truncate(replyMsg.getContent(), 50));
                builder.replyToSenderName(replyMsg.getSenderName());
            });
        }
        
        return builder.build();
    }
    
    /**
     * ✅ NEW: Map ChatMessage to DTO for WebSocket broadcast (without isOwnMessage)
     * Frontend will calculate isOwnMessage based on their own userId
     */
    private ChatMessageDTO mapMessageToDTOForBroadcast(ChatMessage message) {
        ChatMessageDTO.ChatMessageDTOBuilder builder = ChatMessageDTO.builder()
            .id(message.getId())
            .roomId(message.getRoomId())
            .senderId(message.getSenderId())
            .senderName(message.getSenderName())
            .content(message.getContent())
            .status(message.getStatus())
            .isEdited(message.getIsEdited())
            .replyToId(message.getReplyToId())
            .attachmentUrl(message.getAttachmentUrl())
            .readBy(message.getReadBy())
            .createdAt(message.getCreatedAt())
            .updatedAt(message.getUpdatedAt())
            // ✅ Don't set isOwnMessage - let frontend calculate it
            .isOwnMessage(null);
        
        // Add reply-to message info if present
        if (message.getReplyToId() != null) {
            chatMessageRepository.findById(message.getReplyToId()).ifPresent(replyMsg -> {
                builder.replyToContent(truncate(replyMsg.getContent(), 50));
                builder.replyToSenderName(replyMsg.getSenderName());
            });
        }
        
        return builder.build();
    }
    
    /**
     * Truncate text for preview
     */
    private String truncate(String text, int length) {
        if (text == null) return null;
        return text.length() > length ? text.substring(0, length) + "..." : text;
    }
}