package com.edu.platform.dto.progress;

public record LessonPeriodDto(
        Long id,
        int periodNumber,
        String startTime,
        String endTime
) {}
