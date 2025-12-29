package com.edu.platform.dto.user;

import com.edu.platform.model.enums.StudentType;
import lombok.*;

import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentProfileDto {
    private Long id;
    private Long userId;
    private String fullName;
    private String email; // ✅ Add email
    private StudentType studentType;
    private Long classId;
    private String className;
    private Long departmentId;
    private String departmentName;
    private Set<Long> subjectIds;
    private Set<String> subjectNames;
    private String chosenLanguage;
}