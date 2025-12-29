package com.edu.platform.dto.user;

import java.util.List;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeacherProfileDto {
    private Long id;
    private Long userId;
    private String userEmail;
    private String userName;
    private Long departmentId;
    private String departmentName;
    private String specialization; // Keep for backward compatibility
    private List<Long> subjectIds; // ✅ NEW: Array of subject IDs
    private List<Long> assignedClassIds;
}