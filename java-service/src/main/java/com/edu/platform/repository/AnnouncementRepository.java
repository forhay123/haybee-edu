package com.edu.platform.repository;

import com.edu.platform.model.Announcement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for Announcement operations
 */
@Repository
public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    /**
     * Find all published announcements
     */
    List<Announcement> findByPublishedTrueOrderByPublishedAtDesc();

    /**
     * Find all unpublished (draft) announcements
     */
    List<Announcement> findByPublishedFalseOrderByCreatedAtDesc();

    /**
     * Find announcements created by a specific admin
     */
    List<Announcement> findByCreatedByIdOrderByCreatedAtDesc(Long adminUserId);

    /**
     * Find published announcements that are not expired
     */
    @Query("SELECT a FROM Announcement a WHERE a.published = true " +
           "AND (a.expiresAt IS NULL OR a.expiresAt > :now) " +
           "ORDER BY a.publishedAt DESC")
    List<Announcement> findActiveAnnouncements(@Param("now") LocalDateTime now);

    /**
     * Find published announcements (paginated)
     */
    Page<Announcement> findByPublishedTrue(Pageable pageable);

    /**
     * Find announcements by target audience
     */
    List<Announcement> findByTargetAudienceAndPublishedTrueOrderByPublishedAtDesc(
        Announcement.TargetAudience targetAudience
    );

    /**
     * Count unpublished announcements
     */
    long countByPublishedFalse();
}