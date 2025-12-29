package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

/**
 * Request to update subject mapping
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubjectMappingUpdateRequest {
    private Long timetableId;
    private Integer entryIndex;
    private Long newSubjectId;
    private String reason; // Optional: why the mapping was corrected
}