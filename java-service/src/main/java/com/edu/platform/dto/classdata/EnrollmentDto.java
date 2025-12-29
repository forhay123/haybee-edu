package com.edu.platform.dto.classdata;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnrollmentDto {
    private Long id;
    private Long studentProfileId;
    private String studentName;      // ✅ Student's full name
    private String studentType;      // ✅ SCHOOL, HOME, or ASPIRANT
    private Long classEntityId;
    private String className;        // ✅ Class name
    private Long sessionId;
    private String sessionName;      // ✅ Session name
    private boolean active;
    private String enrolledOn;       // ✅ Enrollment date
}