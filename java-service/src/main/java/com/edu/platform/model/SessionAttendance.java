package com.edu.platform.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "session_attendance", schema = "academic",
       uniqueConstraints = @UniqueConstraint(columnNames = {"live_session_id", "student_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionAttendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==================== Relationships ====================
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "live_session_id", nullable = false)
    private LiveSession liveSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    // ==================== Attendance Details ====================
    
    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    @Column(name = "left_at")
    private Instant leftAt;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    // ==================== Engagement Metrics ====================
    
    @Column(name = "was_present")
    @Builder.Default
    private Boolean wasPresent = true;

    @Column(name = "asked_questions")
    @Builder.Default
    private Integer askedQuestions = 0;

    @Column(name = "participation_score")
    private Integer participationScore;

    @PrePersist
    protected void onCreate() {
        if (this.joinedAt == null) {
            this.joinedAt = Instant.now();
        }
    }
}