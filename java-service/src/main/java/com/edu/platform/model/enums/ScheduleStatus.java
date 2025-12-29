package com.edu.platform.model.enums;

/**
 * Status of a daily schedule
 */
public enum ScheduleStatus {
    /**
     * Schedule has lesson topic assigned and assessment ready
     */
    READY,

    /**
     * Schedule waiting for lesson topic assignment (INDIVIDUAL students)
     */
    IN_PROGRESS,

    /**
     * Schedule and all linked assessments completed
     */
    COMPLETED,

    /**
     * Schedule has conflicts that need resolution
     */
    CONFLICT,

    /**
     * Schedule cancelled or voided
     */
    CANCELLED
}