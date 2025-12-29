package com.edu.platform.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Entity
@Table(name = "video_chapters", schema = "academic",
       uniqueConstraints = @UniqueConstraint(columnNames = {"video_lesson_id", "chapter_number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoChapter {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_lesson_id", nullable = false)
    private VideoLesson videoLesson;
    
    @Column(name = "chapter_number", nullable = false)
    private Integer chapterNumber;
    
    @Column(name = "title", nullable = false, length = 200)
    private String title;
    
    @Column(name = "start_time_seconds", nullable = false)
    private Integer startTimeSeconds;
    
    @Column(name = "end_time_seconds", nullable = false)
    private Integer endTimeSeconds;
    
    // ✅ Use List<String> instead of String[] - works better with Hibernate 6
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "key_concepts", columnDefinition = "text[]")
    private List<String> keyConcepts;
    
    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;
}