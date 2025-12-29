// ============================================================
// FILE 5: Conversion Utility for AssessmentInstance to AssessmentPeriodDto
// frontend/src/features/individual/utils/assessmentConverters.ts
// ============================================================

import type { AssessmentInstance } from '../api/assessmentInstancesApi';
import type { AssessmentPeriodDto } from '../types/assessmentInstanceTypes';

/**
 * Convert AssessmentInstance to AssessmentPeriodDto
 */
export function convertAssessmentInstanceToPeriodDto(
  instance: AssessmentInstance,
  index: number = 0
): AssessmentPeriodDto {
  // Parse dates
  const scheduledDate = instance.scheduledDate;
  const windowStart = instance.assessmentWindowStart;
  const windowEnd = instance.assessmentWindowEnd;
  
  // Calculate day of week
  const date = new Date(scheduledDate);
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  
  // Extract time from datetime
  const startTime = new Date(windowStart).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const endTime = new Date(windowEnd).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Map status
  const status = instance.status === 'SCHEDULED' ? 'PENDING' as const :
                 instance.status === 'COMPLETED' ? 'COMPLETED' as const :
                 instance.status === 'MISSED' ? 'MISSED' as const :
                 'PENDING' as const;
  
  // Calculate minutes until deadline
  const now = new Date();
  const deadline = new Date(windowEnd);
  const minutesUntilDeadline = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60)));
  
  return {
    scheduleId: instance.id,
    progressId: instance.id,
    periodSequence: index + 1,
    totalPeriodsInSequence: 1,
    scheduledDate,
    dayOfWeek,
    startTime,
    endTime,
    timeSlot: `${startTime} - ${endTime}`,
    periodNumber: instance.periodNumber,
    windowStart,
    windowEnd,
    graceDeadline: windowEnd,
    isWindowOpen: instance.canStillComplete,
    isGracePeriodActive: false,
    minutesUntilDeadline,
    status,
    completed: instance.status === 'COMPLETED',
    completedAt: instance.completedAt,
    submittedAt: instance.completedAt,
    assessmentInstanceId: instance.id,
    assessmentTitle: instance.lessonTopicTitle,
    totalQuestions: 10,
    attemptedQuestions: instance.status === 'COMPLETED' ? 10 : 0,
    score: instance.score,
    maxScore: instance.maxScore || 100,
    grade: instance.grade,
    isMissed: instance.status === 'MISSED',
    incompleteReason: instance.incompleteReason,
    markedIncompleteAt: instance.autoMarkedIncompleteAt,
    hasPreviousPeriod: false,
    previousPeriodCompleted: true,
    previousPeriodStatus: undefined,
    canStart: instance.canStillComplete && instance.status === 'SCHEDULED',
    actionUrl: undefined,
    actionLabel: instance.status === 'SCHEDULED' ? 'Start Assessment' : 'View Results',
    statusIcon: instance.status === 'COMPLETED' ? '✅' : 
                instance.status === 'MISSED' ? '❌' : '⏳',
    statusColor: instance.status === 'COMPLETED' ? 'success' : 
                 instance.status === 'MISSED' ? 'danger' : 'info',
    progressLabel: `Period ${index + 1}`,
  };
}

/**
 * Convert array of AssessmentInstances to AssessmentPeriodDtos
 */
export function convertAssessmentInstancesToPeriodDtos(
  instances: AssessmentInstance[]
): AssessmentPeriodDto[] {
  return instances.map((instance, index) => 
    convertAssessmentInstanceToPeriodDto(instance, index)
  );
}