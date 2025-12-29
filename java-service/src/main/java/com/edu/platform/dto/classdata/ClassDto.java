package com.edu.platform.dto.classdata;

import lombok.*;

/**
 * Data Transfer Object for ClassEntity.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassDto {

    private Long id;
    private String name;            // e.g. "JSS1"
    private String level;           // e.g. "JUNIOR"
    private Long departmentId;      // ✅ Added this
    private String departmentName;  // optional
    private String studentType;     // SCHOOL / HOME / ASPIRANT
}
