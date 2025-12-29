package com.edu.platform.dto.classdata;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubjectDto {
    private Long id;
    private String name;
    private String code;
    private String level;      // JUNIOR, SENIOR
    private String grade;      // JSS1, JSS2, JSS3, SSS1, SSS2, SSS3
    private boolean compulsory;
    private Long departmentId;
    private Long classId;
}