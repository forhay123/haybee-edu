package com.edu.platform.util;

import com.edu.platform.model.WeeklySchedule;
import com.edu.platform.model.Subject;
import com.edu.platform.model.ClassEntity;
import com.edu.platform.model.enums.StudentType;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Utility class for generating weekly timetable schedules.
 */
public class TimetableGenerator {

    /**
     * Generates a weekly timetable for a given class and student type.
     */
    public static List<WeeklySchedule> generateDefaultTimetable(
            ClassEntity classEntity,
            StudentType studentType,
            List<Subject> subjects
    ) {
        List<WeeklySchedule> schedules = new ArrayList<>();

        int totalPeriods = 6;
        int periodMinutes = 45;
        LocalTime start = LocalTime.of(8, 0);

        switch (studentType) {
            case HOME -> {
                totalPeriods = 4;
                periodMinutes = 60;
                start = LocalTime.of(9, 0);
            }
            case ASPIRANT -> {
                totalPeriods = 5;
                periodMinutes = 50;
                start = LocalTime.of(10, 0);
            }
            default -> { /* SCHOOL defaults */ }
        }

        // Days as enums
        DayOfWeek[] days = {
            DayOfWeek.MONDAY, 
            DayOfWeek.TUESDAY, 
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY, 
            DayOfWeek.FRIDAY
        };

        int subjectIndex = 0;

        for (DayOfWeek day : days) {
            LocalTime currentTime = start;

            for (int period = 1; period <= totalPeriods; period++) {
                Subject subject = subjects.isEmpty()
                        ? null
                        : subjects.get(subjectIndex % subjects.size());

                WeeklySchedule schedule = WeeklySchedule.builder()
                        .classEntity(classEntity)
                        .dayOfWeek(day)
                        .periodNumber(period)
                        .subject(subject)
                        .startTime(currentTime)
                        .endTime(currentTime.plusMinutes(periodMinutes))
                        .build();

                schedules.add(schedule);

                currentTime = currentTime.plusMinutes(periodMinutes + 5); // 5-min break
                subjectIndex++;
            }
        }

        return schedules;
    }
}