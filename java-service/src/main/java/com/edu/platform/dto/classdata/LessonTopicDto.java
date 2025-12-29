package com.edu.platform.dto.classdata;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LessonTopicDto {
    private Long id;
    private Long subjectId;
    private String subjectName;
    private Long termId;
    private String termName;
    private Integer weekNumber;  // ✅ Change to Integer for consistency
    
    // ✅ ADD THESE FIELDS (alternate names for compatibility)
    private String topicTitle;
    private String title;  // Alias for topicTitle
    
    private String description;
    private String fileUrl;
    private Integer questionCount;
    private boolean isAspirantMaterial;

    // ✅ AI processing status fields
    private String status; // "pending", "processing", "done", "failed"
    private Double progress; // 0.0 to 100.0
    
    // ✅ ADD TIMESTAMP
    private LocalDateTime createdAt;
    
    // ✅ Helper method to ensure both title fields are set
    public void setTopicTitle(String topicTitle) {
        this.topicTitle = topicTitle;
        this.title = topicTitle;
    }
    
    public void setTitle(String title) {
        this.title = title;
        this.topicTitle = title;
    }
}