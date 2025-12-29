package com.edu.platform.dto.individual;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.edu.platform.model.enums.StudentType;


@lombok.Data
@lombok.Builder
@lombok.NoArgsConstructor
@lombok.AllArgsConstructor
public class TimetableValidationStatusDto {
    private Long studentProfileId;
    private StudentType studentType;
    private boolean valid;
    private boolean entriesValid;
    private boolean canUpload;
    private boolean uploadAllowed;
    private String uploadBlockReason;
    private Long timetableId;
    private Instant uploadedAt;
    private Integer totalPeriodsExtracted;
    private Integer subjectsIdentified;
    private List<String> issues = new ArrayList<>();
    
    public void addIssue(String issue) {
        this.issues.add(issue);
    }
}