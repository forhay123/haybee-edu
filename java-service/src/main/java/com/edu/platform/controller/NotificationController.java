package com.edu.platform.controller;

import com.edu.platform.dto.notification.NotificationDTO;
import com.edu.platform.dto.notification.NotificationPageDTO;
import com.edu.platform.dto.notification.UnreadCountDTO;
import com.edu.platform.model.Notification;
import com.edu.platform.model.User;
import com.edu.platform.repository.UserRepository;
import com.edu.platform.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }

        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    @GetMapping
    public ResponseEntity<NotificationPageDTO> getUserNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        User user = getCurrentUser();

        Pageable pageable = PageRequest.of(page, size);
        Page<Notification> notificationPage =
                notificationService.getUserNotifications(user.getId(), pageable);

        List<NotificationDTO> notificationDTOs = notificationPage.getContent().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        NotificationPageDTO response = NotificationPageDTO.builder()
                .notifications(notificationDTOs)
                .currentPage(notificationPage.getNumber())
                .totalPages(notificationPage.getTotalPages())
                .totalItems(notificationPage.getTotalElements())
                .pageSize(notificationPage.getSize())
                .hasNext(notificationPage.hasNext())
                .hasPrevious(notificationPage.hasPrevious())
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/recent")
    public ResponseEntity<List<NotificationDTO>> getRecentNotifications() {
        User user = getCurrentUser();
        List<Notification> notifications = notificationService.getRecentNotifications(user.getId());

        List<NotificationDTO> dtoList = notifications.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtoList);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountDTO> getUnreadCount() {
        User user = getCurrentUser();
        long count = notificationService.getUnreadCount(user.getId());

        UnreadCountDTO response = UnreadCountDTO.builder()
                .count(count)
                .userId(user.getId())
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationDTO> getNotification(@PathVariable Long id) {
        User user = getCurrentUser();
        Notification notification =
                notificationService.getNotificationById(id, user.getId());
        return ResponseEntity.ok(convertToDTO(notification));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationDTO> markAsRead(@PathVariable Long id) {
        User user = getCurrentUser();
        Notification notification =
                notificationService.markAsRead(id, user.getId());
        return ResponseEntity.ok(convertToDTO(notification));
    }

    @PostMapping("/read-all")
    public ResponseEntity<?> markAllAsRead() {
        User user = getCurrentUser();
        int count = notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok(new MarkAllAsReadResponse(count, "All notifications marked as read"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id) {
        User user = getCurrentUser();
        notificationService.deleteNotification(id, user.getId());
        return ResponseEntity.ok(new DeleteResponse("Notification deleted successfully"));
    }

    @DeleteMapping("/all")
    public ResponseEntity<?> deleteAllNotifications() {
        User user = getCurrentUser();
        notificationService.deleteAllUserNotifications(user.getId());
        return ResponseEntity.ok(new DeleteResponse("All notifications deleted successfully"));
    }

    private NotificationDTO convertToDTO(Notification notification) {
        return NotificationDTO.builder()
                .id(notification.getId())
                .type(notification.getType())
                .priority(notification.getPriority())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .actionUrl(notification.getActionUrl())
                .relatedEntityId(notification.getRelatedEntityId())
                .relatedEntityType(notification.getRelatedEntityType())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .expiresAt(notification.getExpiresAt())
                .build();
    }

    record MarkAllAsReadResponse(int count, String message) {}
    record DeleteResponse(String message) {}
}
