package com.edu.platform.repository;

import com.edu.platform.model.PublicHoliday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository for public holidays
 * Used for Saturday schedule rescheduling
 */
@Repository
public interface PublicHolidayRepository extends JpaRepository<PublicHoliday, Long> {

    // ============================================================
    // BASIC QUERIES
    // ============================================================
    
    /**
     * Find holiday by exact date
     */
    Optional<PublicHoliday> findByHolidayDate(LocalDate date);
    
    /**
     * Check if a date is a holiday
     */
    boolean existsByHolidayDate(LocalDate date);
    
    /**
     * Check if a date is a school-closed holiday
     */
    boolean existsByHolidayDateAndIsSchoolClosedTrue(LocalDate date);
    
    /**
     * Find all holidays in a date range
     */
    List<PublicHoliday> findByHolidayDateBetweenOrderByHolidayDateAsc(
            LocalDate fromDate, 
            LocalDate toDate
    );
    
    /**
     * Find all future holidays
     */
    List<PublicHoliday> findByHolidayDateGreaterThanEqualOrderByHolidayDateAsc(LocalDate fromDate);
    
    /**
     * Find all past holidays
     */
    List<PublicHoliday> findByHolidayDateLessThanOrderByHolidayDateDesc(LocalDate beforeDate);

    // ============================================================
    // SCHOOL CLOSED QUERIES
    // ============================================================
    
    /**
     * Find all school-closed holidays
     */
    List<PublicHoliday> findByIsSchoolClosedTrueOrderByHolidayDateAsc();
    
    /**
     * Find school-closed holidays in date range
     */
    List<PublicHoliday> findByHolidayDateBetweenAndIsSchoolClosedTrueOrderByHolidayDateAsc(
            LocalDate fromDate, 
            LocalDate toDate
    );
    
    /**
     * Find upcoming school-closed holidays
     */
    List<PublicHoliday> findByHolidayDateGreaterThanEqualAndIsSchoolClosedTrueOrderByHolidayDateAsc(
            LocalDate fromDate
    );
    
    /**
     * Find next school-closed holiday after a date
     */
    @Query("SELECT h FROM PublicHoliday h " +
           "WHERE h.holidayDate > :fromDate " +
           "AND h.isSchoolClosed = true " +
           "ORDER BY h.holidayDate ASC")
    Optional<PublicHoliday> findNextSchoolClosedHoliday(@Param("fromDate") LocalDate fromDate);

    // ============================================================
    // SATURDAY HOLIDAY QUERIES (FOR RESCHEDULING)
    // ============================================================
    
    /**
     * Find all Saturdays that are holidays in a date range
     */
    @Query("SELECT h FROM PublicHoliday h " +
           "WHERE h.holidayDate BETWEEN :fromDate AND :toDate " +
           "AND h.isSchoolClosed = true " +
           "AND FUNCTION('DAYOFWEEK', h.holidayDate) = 7 " + // 7 = Saturday
           "ORDER BY h.holidayDate ASC")
    List<PublicHoliday> findSaturdayHolidaysBetween(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );
    
    /**
     * Check if a specific Saturday is a school-closed holiday
     */
    @Query("SELECT CASE WHEN COUNT(h) > 0 THEN true ELSE false END " +
           "FROM PublicHoliday h " +
           "WHERE h.holidayDate = :date " +
           "AND h.isSchoolClosed = true " +
           "AND FUNCTION('DAYOFWEEK', h.holidayDate) = 7")
    boolean isSaturdayHoliday(@Param("date") LocalDate date);
    
    /**
     * Find all upcoming Saturday holidays (next 3 months)
     */
    @Query("SELECT h FROM PublicHoliday h " +
           "WHERE h.holidayDate >= :fromDate " +
           "AND h.holidayDate <= :toDate " +
           "AND h.isSchoolClosed = true " +
           "AND FUNCTION('DAYOFWEEK', h.holidayDate) = 7 " +
           "ORDER BY h.holidayDate ASC")
    List<PublicHoliday> findUpcomingSaturdayHolidays(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    // ============================================================
    // MANAGEMENT QUERIES
    // ============================================================
    
    /**
     * Find holidays created by a specific user
     */
    List<PublicHoliday> findByCreatedByUserIdOrderByHolidayDateDesc(Long userId);
    
    /**
     * Find holidays by name (partial match)
     */
    @Query("SELECT h FROM PublicHoliday h " +
           "WHERE LOWER(h.holidayName) LIKE LOWER(CONCAT('%', :name, '%')) " +
           "ORDER BY h.holidayDate ASC")
    List<PublicHoliday> findByHolidayNameContainingIgnoreCase(@Param("name") String name);
    
    /**
     * Get all holidays for current year
     */
    @Query("SELECT h FROM PublicHoliday h " +
           "WHERE YEAR(h.holidayDate) = :year " +
           "ORDER BY h.holidayDate ASC")
    List<PublicHoliday> findByYear(@Param("year") int year);
    
    /**
     * Get all school-closed holidays for current year
     */
    @Query("SELECT h FROM PublicHoliday h " +
           "WHERE YEAR(h.holidayDate) = :year " +
           "AND h.isSchoolClosed = true " +
           "ORDER BY h.holidayDate ASC")
    List<PublicHoliday> findSchoolClosedHolidaysByYear(@Param("year") int year);

    // ============================================================
    // STATISTICS QUERIES
    // ============================================================
    
    /**
     * Count holidays in a year
     */
    @Query("SELECT COUNT(h) FROM PublicHoliday h " +
           "WHERE YEAR(h.holidayDate) = :year")
    long countByYear(@Param("year") int year);
    
    /**
     * Count school-closed holidays in a year
     */
    @Query("SELECT COUNT(h) FROM PublicHoliday h " +
           "WHERE YEAR(h.holidayDate) = :year " +
           "AND h.isSchoolClosed = true")
    long countSchoolClosedByYear(@Param("year") int year);
    
    /**
     * Count Saturday holidays in a date range
     */
    @Query("SELECT COUNT(h) FROM PublicHoliday h " +
           "WHERE h.holidayDate BETWEEN :fromDate AND :toDate " +
           "AND h.isSchoolClosed = true " +
           "AND FUNCTION('DAYOFWEEK', h.holidayDate) = 7")
    long countSaturdayHolidaysBetween(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate
    );

    // ============================================================
    // UTILITY QUERIES
    // ============================================================
    
    /**
     * Get all holidays ordered by date
     */
    List<PublicHoliday> findAllByOrderByHolidayDateAsc();
    
    /**
     * Get all holidays ordered by date descending
     */
    List<PublicHoliday> findAllByOrderByHolidayDateDesc();
    
    /**
     * Delete holiday by date
     */
    void deleteByHolidayDate(LocalDate date);
    
    /**
     * Delete old holidays before a date
     */
    void deleteByHolidayDateBefore(LocalDate beforeDate);
}