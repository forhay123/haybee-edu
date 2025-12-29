package com.edu.platform.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lesson_topics", schema = "academic")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class LessonTopic {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String topicTitle;
    
    @Column(length = 500)
    private String description;
    
    /** Entity relationship — Subject */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "department"})
    private Subject subject;
    
    /** Entity relationship — Term */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "term_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Term term;
    
    @Column(name = "week_number")
    private int weekNumber;
    
    @Column(name = "file_name", length = 255)
    private String fileName;
    
    @Column(name = "file_url", length = 500)
    private String fileUrl;
    
    @Column(name = "question_count")
    private Integer questionCount = 0;
    
    @Column(name = "is_aspirant_material", nullable = false)
    private boolean isAspirantMaterial = false;
    
    

    /**
     * Alias for topicTitle (used in VideoProcessingOrchestrator)
     */
    public String getTitle() {
        return this.topicTitle;
    }

    public void setTitle(String title) {
        this.topicTitle = title;
    }
}