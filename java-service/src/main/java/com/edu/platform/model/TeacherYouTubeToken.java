package com.edu.platform.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "teacher_youtube_tokens", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherYouTubeToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ==================== Relationship ====================
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", unique = true, nullable = false)
    private User teacher;

    // ==================== OAuth Tokens (should be encrypted in real implementation) ====================
    
    @Column(name = "access_token", nullable = false, columnDefinition = "TEXT")
    private String accessToken;

    @Column(name = "refresh_token", nullable = false, columnDefinition = "TEXT")
    private String refreshToken;

    @Column(name = "token_type", length = 20)
    @Builder.Default
    private String tokenType = "Bearer";

    // ==================== Token Metadata ====================
    
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "scope", columnDefinition = "TEXT")
    private String scope;

    // ==================== YouTube Channel Info ====================
    
    @Column(name = "youtube_channel_id", length = 50)
    private String youtubeChannelId;

    @Column(name = "youtube_channel_name", length = 200)
    private String youtubeChannelName;

    // ==================== Audit Fields ====================
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ==================== Helper Methods ====================
    
    public boolean isExpired() {
        return Instant.now().isAfter(this.expiresAt);
    }

    public boolean needsRefresh() {
        // Refresh if token expires in next 5 minutes
        return Instant.now().plusSeconds(300).isAfter(this.expiresAt);
    }
}