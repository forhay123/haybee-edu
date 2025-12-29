package com.edu.platform.dto.individual;

import lombok.*;
import java.util.List;

/**
 * Overview of all uploads and data for an INDIVIDUAL student
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IndividualStudentOverviewDto {
    private Long studentProfileId;
    private Integer totalTimetables;
    private Integer totalSchemes;
    private List<IndividualTimetableDto> timetables;
    private List<IndividualSchemeDto> schemes;
}