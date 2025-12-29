package com.edu.platform.dto.progress;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyProgressDto {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private String date;              // yyyy-MM-dd
    private List<LessonProgressDto> lessons;

    public DailyProgressDto(LocalDate date, List<LessonProgressDto> lessons) {
        this.date = date.format(DATE_FORMATTER);
        this.lessons = lessons;
    }
}