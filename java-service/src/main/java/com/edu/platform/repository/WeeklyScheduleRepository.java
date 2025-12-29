package com.edu.platform.repository;

import com.edu.platform.model.ClassEntity;
import com.edu.platform.model.WeeklySchedule;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.util.List;

@Repository
public interface WeeklyScheduleRepository extends JpaRepository<WeeklySchedule, Long> {
    
    List<WeeklySchedule> findByClassEntityId(Long classId);
    
    List<WeeklySchedule> findByDayOfWeek(DayOfWeek dayOfWeek);
    
    List<WeeklySchedule> findByClassEntityIdAndDayOfWeek(Long classId, DayOfWeek dayOfWeek);
    
    /**
     * ✅ NEW: Find schedules by class and week number
     */
    List<WeeklySchedule> findByClassEntityIdAndWeekNumber(Long classId, Integer weekNumber);
    
    /**
     * ✅ NEW: Find schedules by week number
     */
    List<WeeklySchedule> findByWeekNumber(Integer weekNumber);
    
    List<WeeklySchedule> findByClassEntity(ClassEntity classEntity);
    
    @Transactional
    void deleteByClassEntity(ClassEntity classEntity);
    
    /**
     * ✅ UPDATED: Check if schedule exists for class, week, day, and period
     * This prevents duplicate schedules for the same time slot in the same week
     */
    boolean existsByClassEntityIdAndWeekNumberAndDayOfWeekAndPeriodNumber(
            Long classId, Integer weekNumber, DayOfWeek dayOfWeek, Integer periodNumber);
    
    /**
     * ✅ NEW: Find schedules for multiple classes on a specific day and week
     */
    @EntityGraph(attributePaths = {"classEntity", "subject", "subject.department", "lessonTopic", "teacher"})
    @Query("SELECT ws FROM WeeklySchedule ws " +
           "WHERE ws.dayOfWeek = :dayOfWeek " +
           "AND ws.weekNumber = :weekNumber " +
           "AND ws.classEntity.id IN :classIds " +
           "ORDER BY ws.periodNumber ASC")
    List<WeeklySchedule> findByWeekNumberAndDayOfWeekAndClassIdIn(
            @Param("weekNumber") Integer weekNumber,
            @Param("dayOfWeek") DayOfWeek dayOfWeek,
            @Param("classIds") List<Long> classIds
    );
    
    /**
     * ✅ UPDATED: Find schedules for multiple classes on a specific day (all weeks)
     */
    @EntityGraph(attributePaths = {"classEntity", "subject", "subject.department", "lessonTopic", "teacher"})
    @Query("SELECT ws FROM WeeklySchedule ws " +
           "WHERE ws.dayOfWeek = :dayOfWeek " +
           "AND ws.classEntity.id IN :classIds " +
           "ORDER BY ws.weekNumber ASC, ws.periodNumber ASC")
    List<WeeklySchedule> findByDayOfWeekAndClassIdIn(
            @Param("dayOfWeek") DayOfWeek dayOfWeek,
            @Param("classIds") List<Long> classIds
    );
    
    /**
     * ✅ NEW: Find all schedules for multiple classes (all weeks)
     */
    @EntityGraph(attributePaths = {"classEntity", "subject", "subject.department", "lessonTopic", "teacher"})
    @Query("SELECT ws FROM WeeklySchedule ws " +
           "WHERE ws.classEntity.id IN :classIds " +
           "ORDER BY ws.weekNumber ASC, ws.dayOfWeek ASC, ws.periodNumber ASC")
    List<WeeklySchedule> findByClassIdIn(@Param("classIds") List<Long> classIds);
}