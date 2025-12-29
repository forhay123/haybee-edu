package com.edu.platform.dto.classdata;

import com.edu.platform.model.WeeklySchedule;
import com.edu.platform.model.enums.StudentType;
import lombok.Builder;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Builder
public record WeeklyScheduleDto(
    Long id,
    Long classId,
    String className,
    Long subjectId,
    String subjectName,
    Long lessonTopicId,
    String lessonTopicTitle,
    Integer weekNumber,
    DayOfWeek dayOfWeek,
    Integer periodNumber,
    LocalTime startTime,
    LocalTime endTime,
    Integer priority,
    Double weight,
    Long teacherId,
    String teacherName,
    StudentType studentType,      // ✅ NEW: Enum value
    String studentTypeName        // ✅ NEW: Display name
) {
    public static WeeklyScheduleDto fromEntity(WeeklySchedule schedule) {
        return WeeklyScheduleDto.builder()
            .id(schedule.getId())
            .classId(schedule.getClassEntity() != null ? schedule.getClassEntity().getId() : null)
            .className(schedule.getClassEntity() != null ? schedule.getClassEntity().getName() : null)
            .subjectId(schedule.getSubject() != null ? schedule.getSubject().getId() : null)
            .subjectName(schedule.getSubject() != null ? schedule.getSubject().getName() : null)
            .lessonTopicId(schedule.getLessonTopic() != null ? schedule.getLessonTopic().getId() : null)
            .lessonTopicTitle(schedule.getLessonTopic() != null ? schedule.getLessonTopic().getTopicTitle() : null)
            .weekNumber(schedule.getWeekNumber())
            .dayOfWeek(schedule.getDayOfWeek())
            .periodNumber(schedule.getPeriodNumber())
            .startTime(schedule.getStartTime())
            .endTime(schedule.getEndTime())
            .priority(schedule.getPriority())
            .weight(schedule.getWeight())
            .teacherId(schedule.getTeacher() != null ? schedule.getTeacher().getId() : null)
            .teacherName(schedule.getTeacher() != null ? schedule.getTeacher().getFullName() : null)
            .studentType(schedule.getStudentType())  // ✅ NEW
            .studentTypeName(schedule.getStudentType() != null ? formatStudentTypeName(schedule.getStudentType()) : null)  // ✅ NEW
            .build();
    }
    
    private static String formatStudentTypeName(StudentType type) {
        if (type == null) return null;
        String name = type.name();
        return name.charAt(0) + name.substring(1).toLowerCase();
    }
    
    public WeeklySchedule toEntity() {
        WeeklySchedule schedule = new WeeklySchedule();
        schedule.setId(this.id);
        schedule.setWeekNumber(this.weekNumber);
        schedule.setDayOfWeek(this.dayOfWeek());
        schedule.setPeriodNumber(this.periodNumber());
        schedule.setStartTime(this.startTime());
        schedule.setEndTime(this.endTime());
        schedule.setPriority(this.priority());
        schedule.setWeight(this.weight());
        schedule.setStudentType(this.studentType());  // ✅ NEW
        return schedule;
    }
}