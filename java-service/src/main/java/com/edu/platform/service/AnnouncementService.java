package com.edu.platform.service;

import com.edu.platform.dto.notification.AnnouncementDTO;
import com.edu.platform.dto.notification.CreateAnnouncementRequest;
import com.edu.platform.dto.notification.SystemAlertRequest;
import com.edu.platform.event.NotificationEventPublisher;
import com.edu.platform.exception.ResourceNotFoundException;
import com.edu.platform.exception.UnauthorizedException;
import com.edu.platform.model.Announcement;
import com.edu.platform.model.User;
import com.edu.platform.repository.AnnouncementRepository;
import com.edu.platform.repository.EnrollmentRepository;
import com.edu.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Service for managing announcements and system alerts
 * Only admins can create/publish announcements
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final NotificationEventPublisher eventPublisher;

    /**
     * Create a new announcement (admin only)
     */
    @Transactional
    public AnnouncementDTO createAnnouncement(Long adminUserId, CreateAnnouncementRequest request) {
        log.info("Admin {} creating announcement: {}", adminUserId, request.getTitle());
        
        // Validate request
        request.validate();
        
        // Verify admin user
        User admin = verifyAdminUser(adminUserId);
        
        // Create announcement entity
        Announcement announcement = Announcement.builder()
                .title(request.getTitle())
                .message(request.getMessage())
                .priority(request.getPriority())
                .targetAudience(request.getTargetAudience())
                .targetClassIds(request.getTargetClassIds() != null ? request.getTargetClassIds() : new HashSet<>())
                .targetUserIds(request.getTargetUserIds() != null ? request.getTargetUserIds() : new HashSet<>())
                .actionUrl(request.getActionUrl())
                .expiresAt(request.getExpiresAt())
                .published(false)
                .createdBy(admin)
                .build();
        
        announcement = announcementRepository.save(announcement);
        
        // Publish immediately if requested
        if (request.isPublishImmediately()) {
            return publishAnnouncement(adminUserId, announcement.getId());
        }
        
        log.info("✅ Created announcement {} (draft)", announcement.getId());
        return AnnouncementDTO.fromEntity(announcement);
    }

    /**
     * Publish an announcement and send notifications to all target users
     */
    @Transactional
    public AnnouncementDTO publishAnnouncement(Long adminUserId, Long announcementId) {
        log.info("Admin {} publishing announcement {}", adminUserId, announcementId);
        
        // Verify admin
        verifyAdminUser(adminUserId);
        
        // Get announcement
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found"));
        
        if (announcement.isPublished()) {
            throw new IllegalStateException("Announcement already published");
        }
        
        // Mark as published
        announcement.publish();
        announcement = announcementRepository.save(announcement);
        
        // Get target users and send notifications
        List<Long> targetUserIds = getTargetUserIds(announcement);
        
        if (!targetUserIds.isEmpty()) {
            eventPublisher.publishAnnouncement(announcement, targetUserIds);
            log.info("📢 Published announcement to {} users", targetUserIds.size());
        } else {
            log.warn("⚠️ No target users found for announcement {}", announcementId);
        }
        
        return AnnouncementDTO.fromEntity(announcement);
    }

    /**
     * Send a system alert to all users (admin only)
     * System alerts are always HIGH priority and go to everyone
     */
    @Transactional
    public AnnouncementDTO sendSystemAlert(Long adminUserId, SystemAlertRequest request) {
        log.info("Admin {} sending system alert: {}", adminUserId, request.getTitle());
        
        // Validate request
        request.validate();
        
        // Verify admin
        User admin = verifyAdminUser(adminUserId);
        
        // Create announcement for the alert (with ALL_USERS target)
        Announcement announcement = Announcement.builder()
                .title(request.getTitle())
                .message(request.getMessage())
                .priority(com.edu.platform.model.enums.NotificationPriority.HIGH)
                .targetAudience(Announcement.TargetAudience.ALL_USERS)
                .actionUrl(request.getActionUrl())
                .expiresAt(request.getExpiresAt())
                .published(true)
                .publishedAt(LocalDateTime.now())
                .createdBy(admin)
                .build();
        
        announcement = announcementRepository.save(announcement);
        
        // Get all active users
        List<Long> allUserIds = userRepository.findAll().stream()
                .filter(User::isEnabled)
                .map(User::getId)
                .toList();
        
        if (!allUserIds.isEmpty()) {
            eventPublisher.publishSystemAlert(
                    request.getTitle(),
                    request.getMessage(),
                    request.getActionUrl(),
                    announcement.getId(),
                    allUserIds
            );
            log.info("🚨 Sent system alert to {} users", allUserIds.size());
        }
        
        return AnnouncementDTO.fromEntity(announcement);
    }

    /**
     * Get all announcements (admin view)
     */
    @Transactional(readOnly = true)
    public Page<AnnouncementDTO> getAllAnnouncements(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return announcementRepository.findAll(pageable)
                .map(AnnouncementDTO::fromEntity);
    }

    /**
     * Get published announcements
     */
    @Transactional(readOnly = true)
    public Page<AnnouncementDTO> getPublishedAnnouncements(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("publishedAt").descending());
        return announcementRepository.findByPublishedTrue(pageable)
                .map(AnnouncementDTO::fromEntity);
    }

    /**
     * Get active (published and not expired) announcements
     */
    @Transactional(readOnly = true)
    public List<AnnouncementDTO> getActiveAnnouncements() {
        return announcementRepository.findActiveAnnouncements(LocalDateTime.now())
                .stream()
                .map(AnnouncementDTO::fromEntity)
                .toList();
    }

    /**
     * Get announcement by ID
     */
    @Transactional(readOnly = true)
    public AnnouncementDTO getAnnouncementById(Long id) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found"));
        return AnnouncementDTO.fromEntity(announcement);
    }

    /**
     * Update announcement (admin only, only drafts can be updated)
     */
    @Transactional
    public AnnouncementDTO updateAnnouncement(
            Long adminUserId,
            Long announcementId,
            CreateAnnouncementRequest request) {
        
        log.info("Admin {} updating announcement {}", adminUserId, announcementId);
        
        // Verify admin
        verifyAdminUser(adminUserId);
        
        // Validate request
        request.validate();
        
        // Get announcement
        Announcement announcement = announcementRepository.findById(announcementId)
                .orElseThrow(() -> new ResourceNotFoundException("Announcement not found"));
        
        if (announcement.isPublished()) {
            throw new IllegalStateException("Cannot update published announcement");
        }
        
        // Update fields
        announcement.setTitle(request.getTitle());
        announcement.setMessage(request.getMessage());
        announcement.setPriority(request.getPriority());
        announcement.setTargetAudience(request.getTargetAudience());
        announcement.setTargetClassIds(request.getTargetClassIds() != null ? request.getTargetClassIds() : new HashSet<>());
        announcement.setTargetUserIds(request.getTargetUserIds() != null ? request.getTargetUserIds() : new HashSet<>());
        announcement.setActionUrl(request.getActionUrl());
        announcement.setExpiresAt(request.getExpiresAt());
        
        announcement = announcementRepository.save(announcement);
        
        log.info("✅ Updated announcement {}", announcementId);
        return AnnouncementDTO.fromEntity(announcement);
    }

    /**
     * Delete announcement (admin only)
     */
    @Transactional
    public void deleteAnnouncement(Long adminUserId, Long announcementId) {
        log.info("Admin {} deleting announcement {}", adminUserId, announcementId);
        
        // Verify admin
        verifyAdminUser(adminUserId);
        
        // Check announcement exists
        if (!announcementRepository.existsById(announcementId)) {
            throw new ResourceNotFoundException("Announcement not found");
        }
        
        announcementRepository.deleteById(announcementId);
        log.info("🗑️ Deleted announcement {}", announcementId);
    }

    // ==================== HELPER METHODS ====================

    /**
     * Verify user is an admin
     */
    private User verifyAdminUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        boolean isAdmin = user.getRoles().stream()
                .anyMatch(role -> "ADMIN".equalsIgnoreCase(role.getName()));
        
        if (!isAdmin) {
            throw new UnauthorizedException("Only admins can manage announcements");
        }
        
        return user;
    }

    /**
     * Get target user IDs based on announcement's target audience
     */
    private List<Long> getTargetUserIds(Announcement announcement) {
        Set<Long> userIds = new HashSet<>();
        
        switch (announcement.getTargetAudience()) {
            case ALL_USERS:
                // Get all active users
                userIds.addAll(userRepository.findAll().stream()
                        .filter(User::isEnabled)
                        .map(User::getId)
                        .toList());
                break;
                
            case ALL_STUDENTS:
                // Get all users with STUDENT role
                userIds.addAll(userRepository.findAll().stream()
                        .filter(User::isEnabled)
                        .filter(user -> user.getRoles().stream()
                                .anyMatch(role -> "STUDENT".equalsIgnoreCase(role.getName())))
                        .map(User::getId)
                        .toList());
                break;
                
            case ALL_TEACHERS:
                // Get all users with TEACHER role
                userIds.addAll(userRepository.findAll().stream()
                        .filter(User::isEnabled)
                        .filter(user -> user.getRoles().stream()
                                .anyMatch(role -> "TEACHER".equalsIgnoreCase(role.getName())))
                        .map(User::getId)
                        .toList());
                break;
                
            case SPECIFIC_CLASSES:
                // Get all students in the specified classes
                for (Long classId : announcement.getTargetClassIds()) {
                    try {
                        var enrollments = enrollmentRepository.findByClassEntityIdAndActiveTrue(classId);
                        enrollments.forEach(enrollment -> {
                            if (enrollment.getStudentProfile() != null 
                                    && enrollment.getStudentProfile().getUser() != null) {
                                userIds.add(enrollment.getStudentProfile().getUser().getId());
                            }
                        });
                    } catch (Exception e) {
                        log.error("Error getting students for class {}", classId, e);
                    }
                }
                break;
                
            case SPECIFIC_USERS:
                // Use the specified user IDs
                userIds.addAll(announcement.getTargetUserIds());
                break;
        }
        
        log.debug("Found {} target users for announcement {}", userIds.size(), announcement.getId());
        return new ArrayList<>(userIds);
    }
}