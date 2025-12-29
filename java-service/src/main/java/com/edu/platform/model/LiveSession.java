package com.edu.platform.model;

import com.edu.platform.model.enums.SessionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "live_sessions", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LiveSession {

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassEntity classEntity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id")
    private Term term;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @OneToMany(mappedBy = "liveSession", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<SessionRecording> recordings = new HashSet<>();

    @OneToMany(mappedBy = "liveSession", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<SessionAttendance> attendances = new HashSet<>();

    // ==================== Zoom Meeting Details ====================
    
    @Column(name = "zoom_meeting_id", unique = true, nullable = false, length = 50)
    private String zoomMeetingId;

    @Column(name = "zoom_meeting_uuid", length = 100)
    private String zoomMeetingUuid;

    @Column(name = "meeting_password", length = 50)
    private String meetingPassword;

    @Column(name = "join_url", nullable = false, columnDefinition = "TEXT")
    private String joinUrl;

    @Column(name = "start_url", nullable = false, columnDefinition = "TEXT")
    private String startUrl;

    // ==================== Scheduling ====================
    
    @Column(name = "scheduled_start_time", nullable = false)
    private Instant scheduledStartTime;

    @Column(name = "scheduled_duration_minutes", nullable = false)
    @Builder.Default
    private Integer scheduledDurationMinutes = 60;

    @Column(name = "actual_start_time")
    private Instant actualStartTime;

    @Column(name = "actual_end_time")
    private Instant actualEndTime;

    // ==================== Status & Metadata ====================
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private SessionStatus status = SessionStatus.SCHEDULED;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "max_participants")
    @Builder.Default
    private Integer maxParticipants = 100;

    // ==================== Recording References ====================
    
    @Column(name = "has_recording")
    @Builder.Default
    private Boolean hasRecording = false;

    @Column(name = "recording_processed")
    @Builder.Default
    private Boolean recordingProcessed = false;

    // ==================== Audit Fields ====================
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}