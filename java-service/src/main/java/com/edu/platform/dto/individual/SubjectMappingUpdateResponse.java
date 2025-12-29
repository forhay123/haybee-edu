
package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

/**
 * Response after updating subject mapping
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubjectMappingUpdateResponse {
    private Long timetableId;
    private Integer entryIndex;
    private Long oldSubjectId;
    private Long newSubjectId;
    private String message;
}