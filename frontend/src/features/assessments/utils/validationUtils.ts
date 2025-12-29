// ============================================================
// FILE: validationUtils.ts
// Location: frontend/src/features/progress/utils/validationUtils.ts
// ============================================================

import type { ValidationResult } from '../../assessments/types/assessmentTypes';

/**
 * Minimum number of questions required for assessment
 */
export const MIN_QUESTIONS_REQUIRED = 5;

/**
 * Validate if question count meets minimum requirement
 */
export const hasEnoughQuestions = (questionCount: number): boolean => {
  return questionCount >= MIN_QUESTIONS_REQUIRED;
};

/**
 * Calculate missing question count
 */
export const getMissingQuestionsCount = (questionCount: number): number => {
  return Math.max(0, MIN_QUESTIONS_REQUIRED - questionCount);
};

/**
 * Format validation error message for UI display
 */
export const formatValidationError = (result: ValidationResult): string => {
  if (result.canCreate) {
    return '';
  }

  const missing = getMissingQuestionsCount(result.questionCount);
  
  if (result.questionCount === 0) {
    return `No questions available for "${result.lessonTopicTitle}" in ${result.subjectName}. Please add questions first.`;
  }

  if (missing > 0) {
    return `Insufficient questions: Found ${result.questionCount}/${MIN_QUESTIONS_REQUIRED} required. Need ${missing} more question${missing > 1 ? 's' : ''}.`;
  }

  // Normalize reason (string OR string[])
  if (Array.isArray(result.reason)) {
    return result.reason.join('; ');
  }

  return result.reason || 'Schedule validation failed';

};

/**
 * Format validation success message
 */
export const formatValidationSuccess = (result: ValidationResult): string => {
  return `✓ Ready to schedule! Found ${result.questionCount} questions (${result.aiQuestions} AI + ${result.teacherQuestions} Teacher)`;
};

/**
 * Get validation status color
 */
export const getValidationStatusColor = (canCreate: boolean): string => {
  return canCreate ? 'text-green-600' : 'text-red-600';
};

/**
 * Get validation status background color
 */
export const getValidationStatusBg = (canCreate: boolean): string => {
  return canCreate ? 'bg-green-50' : 'bg-red-50';
};

/**
 * Get validation status border color
 */
export const getValidationStatusBorder = (canCreate: boolean): string => {
  return canCreate ? 'border-green-300' : 'border-red-300';
};

/**
 * Format question breakdown for display
 */
export const formatQuestionBreakdown = (result: ValidationResult): string => {
  return `${result.aiQuestions} AI-generated + ${result.teacherQuestions} Teacher-created = ${result.questionCount} total`;
};

/**
 * Check if validation result has warnings
 */
export const hasValidationWarnings = (result: ValidationResult): boolean => {
  // Warning if we have minimum questions but not much buffer
  return result.canCreate && result.questionCount < MIN_QUESTIONS_REQUIRED + 3;
};

/**
 * Get validation warning message
 */
export const getValidationWarning = (result: ValidationResult): string | null => {
  if (!hasValidationWarnings(result)) {
    return null;
  }

  const buffer = result.questionCount - MIN_QUESTIONS_REQUIRED;
  return `Only ${buffer} extra question${buffer > 1 ? 's' : ''} available. Consider adding more for variety.`;
};

/**
 * Validate schedule data before submission
 */
export const validateScheduleData = (data: {
  classId?: number;
  subjectId?: number;
  lessonTopicId?: number;
  weekNumber?: number;
  dayOfWeek?: string;
  periodNumber?: number;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.classId || data.classId <= 0) {
    errors.push('Class is required');
  }

  if (!data.subjectId || data.subjectId <= 0) {
    errors.push('Subject is required');
  }

  if (!data.weekNumber || data.weekNumber <= 0) {
    errors.push('Week number is required');
  }

  if (!data.dayOfWeek || data.dayOfWeek.trim() === '') {
    errors.push('Day of week is required');
  }

  if (!data.periodNumber || data.periodNumber <= 0) {
    errors.push('Period number is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format multiple validation errors for display
 */
export const formatValidationErrors = (errors: string[]): string => {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  
  return `Multiple errors:\n${errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n')}`;
};

/**
 * Check if lesson topic has been selected
 */
export const hasLessonTopicSelected = (lessonTopicId?: number): boolean => {
  return !!lessonTopicId && lessonTopicId > 0;
};

/**
 * Get question count status
 */
export const getQuestionCountStatus = (
  questionCount: number
): 'insufficient' | 'minimum' | 'good' | 'excellent' => {
  if (questionCount < MIN_QUESTIONS_REQUIRED) return 'insufficient';
  if (questionCount === MIN_QUESTIONS_REQUIRED) return 'minimum';
  if (questionCount < MIN_QUESTIONS_REQUIRED + 5) return 'good';
  return 'excellent';
};

/**
 * Get status badge color based on question count
 */
export const getQuestionCountBadgeColor = (questionCount: number): string => {
  const status = getQuestionCountStatus(questionCount);
  
  switch (status) {
    case 'insufficient':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'minimum':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'good':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'excellent':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

/**
 * Format validation result for analytics
 */
export const formatValidationResultForAnalytics = (result: ValidationResult) => {
  return {
    canCreate: result.canCreate,
    questionCount: result.questionCount,
    aiQuestions: result.aiQuestions,
    teacherQuestions: result.teacherQuestions,
    hasEnoughQuestions: hasEnoughQuestions(result.questionCount),
    missingQuestions: getMissingQuestionsCount(result.questionCount),
    status: getQuestionCountStatus(result.questionCount),
    subject: result.subjectName,
    lesson: result.lessonTopicTitle
  };
};

/**
 * Check if schedule can be created based on validation
 */
export const canCreateSchedule = (validationResult?: ValidationResult | null): boolean => {
  return validationResult?.canCreate ?? false;
};

/**
 * Get detailed validation summary
 */
export const getValidationSummary = (result: ValidationResult): {
  title: string;
  message: string;
  details: string[];
  canProceed: boolean;
} => {
  if (result.canCreate) {
    return {
      title: 'Validation Passed',
      message: formatValidationSuccess(result),
      details: [
        `Subject: ${result.subjectName}`,
        `Lesson: ${result.lessonTopicTitle}`,
        formatQuestionBreakdown(result)
      ],
      canProceed: true
    };
  }

  return {
    title: 'Validation Failed',
    message: formatValidationError(result),
    details: [
      `Subject: ${result.subjectName}`,
      `Lesson: ${result.lessonTopicTitle}`,
      `Available: ${result.questionCount} questions`,
      `Required: ${MIN_QUESTIONS_REQUIRED} questions minimum`
    ],
    canProceed: false
  };
};

/**
 * Extract lesson and subject info from validation result
 */
export const extractValidationInfo = (result?: ValidationResult | null): {
  subjectName: string;
  lessonTitle: string;
  questionCount: number;
} => {
  return {
    subjectName: result?.subjectName || 'Unknown Subject',
    lessonTitle: result?.lessonTopicTitle || 'Unknown Lesson',
    questionCount: result?.questionCount || 0
  };
};

/**
 * Compare two validation results
 */
export const compareValidationResults = (
  prev?: ValidationResult,
  current?: ValidationResult
): {
  hasChanged: boolean;
  improvements: string[];
  regressions: string[];
} => {
  if (!prev || !current) {
    return { hasChanged: false, improvements: [], regressions: [] };
  }

  const improvements: string[] = [];
  const regressions: string[] = [];

  if (current.questionCount > prev.questionCount) {
    improvements.push(`Question count increased from ${prev.questionCount} to ${current.questionCount}`);
  } else if (current.questionCount < prev.questionCount) {
    regressions.push(`Question count decreased from ${prev.questionCount} to ${current.questionCount}`);
  }

  if (!prev.canCreate && current.canCreate) {
    improvements.push('Schedule can now be created');
  } else if (prev.canCreate && !current.canCreate) {
    regressions.push('Schedule can no longer be created');
  }

  return {
    hasChanged: improvements.length > 0 || regressions.length > 0,
    improvements,
    regressions
  };
};