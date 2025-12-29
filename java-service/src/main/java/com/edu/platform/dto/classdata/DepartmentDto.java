package com.edu.platform.dto.classdata;

import lombok.*;

/**
 * DTO for transferring department information.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentDto {
    private Long id;
    private String name;
    private String code;
    private String description;
}
