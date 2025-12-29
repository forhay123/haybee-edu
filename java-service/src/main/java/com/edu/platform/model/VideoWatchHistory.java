package com.edu.platform.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "video_watch_history",
    schema = "academic",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_video_student",
        columnNames = {"video_lesson_id", "student_id"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoWatchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_lesson_id", nullable = false)
    private VideoLesson videoLesson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @Column(name = "watch_started_at", nullable = false)
    private Instant watchStartedAt;

    @Column(name = "watch_ended_at")
    private Instant watchEndedAt;

    @Column(name = "last_position_seconds")
    @Builder.Default
    private Integer lastPositionSeconds = 0;

    @Column(name = "total_watch_time_seconds")
    @Builder.Default
    private Integer totalWatchTimeSeconds = 0;

    @Column(name = "completed")
    @Builder.Default
    private Boolean completed = false;

    @Column(name = "completion_percentage", precision = 5, scale = 2)
    private BigDecimal completionPercentage;

    // Keep sessionId, but DON'T include in unique constraint
    @Column(name = "session_id")
    @Builder.Default
    private UUID sessionId = UUID.randomUUID();

    @Column(name = "device_type", length = 20)
    private String deviceType;

    @PrePersist
    protected void onCreate() {
        if (this.watchStartedAt == null) {
            this.watchStartedAt = Instant.now();
        }
        if (this.sessionId == null) {
            this.sessionId = UUID.randomUUID();
        }
    }
}