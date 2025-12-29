package com.edu.platform.model;

import com.edu.platform.model.enums.VideoStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "video_lessons", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoLesson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==================== Relationships ====================
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_topic_id")
    private LessonTopic lessonTopic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_recording_id")
    private SessionRecording sessionRecording;

    @OneToOne(mappedBy = "videoLesson", cascade = CascadeType.ALL, orphanRemoval = true)
    private VideoTranscript transcript;

    @OneToMany(mappedBy = "videoLesson", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<VideoChapter> chapters = new HashSet<>();

    @OneToMany(mappedBy = "videoLesson", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<VideoWatchHistory> watchHistories = new HashSet<>();

    // ==================== YouTube Details ====================
    
    @Column(name = "youtube_video_id", unique = true, length = 20)
    private String youtubeVideoId;

    @Column(name = "youtube_url", columnDefinition = "TEXT")
    private String youtubeUrl;

    @Column(name = "embed_url", columnDefinition = "TEXT")
    private String embedUrl;

    @Column(name = "youtube_channel_id", length = 50)
    private String youtubeChannelId;

    // ==================== Metadata ====================
    
    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "thumbnail_url", columnDefinition = "TEXT")
    private String thumbnailUrl;

    @Column(name = "thumbnail_custom_url", columnDefinition = "TEXT")
    private String thumbnailCustomUrl;

    // ==================== Processing Status ====================
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    @Builder.Default
    private VideoStatus status = VideoStatus.PENDING;

    @Column(name = "upload_date")
    private Instant uploadDate;

    @Column(name = "processing_completed_at")
    private Instant processingCompletedAt;

    // ==================== AI-Generated Content Flags ====================
    
    @Column(name = "has_transcript")
    @Builder.Default
    private Boolean hasTranscript = false;

    @Column(name = "has_chapters")
    @Builder.Default
    private Boolean hasChapters = false;

    @Column(name = "has_quiz")
    @Builder.Default
    private Boolean hasQuiz = false;

    @Column(name = "has_summary")
    @Builder.Default
    private Boolean hasSummary = false;

    // ==================== Access Control ====================
    
    @Column(name = "is_aspirant_material")
    @Builder.Default
    private Boolean isAspirantMaterial = false;

    @Column(name = "is_public")
    @Builder.Default
    private Boolean isPublic = false;

    @Column(name = "is_premium")
    @Builder.Default
    private Boolean isPremium = false;

    // ✅ NEW FIELD: Published status (teacher can control visibility)
    @Column(name = "published")
    @Builder.Default
    private Boolean published = false;

    // ==================== Analytics Summary ====================
    
    @Column(name = "total_views")
    @Builder.Default
    private Integer totalViews = 0;

    @Column(name = "average_completion_rate", precision = 5, scale = 2)
    private BigDecimal averageCompletionRate;

    // ==================== Audit Fields ====================
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.uploadDate == null) {
            this.uploadDate = Instant.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ==================== Helper Methods ====================
    
    /**
     * Alias for teacher (used in VideoProcessingOrchestrator)
     */
    public User getUploadedBy() {
        return this.teacher;
    }

    public void setUploadedBy(User user) {
        this.teacher = user;
    }

    /**
     * Set upload date (used in VideoProcessingOrchestrator)
     */
    public void setUploadedAt(Instant uploadedAt) {
        this.uploadDate = uploadedAt;
    }

    public Instant getUploadedAt() {
        return this.uploadDate;
    }
}