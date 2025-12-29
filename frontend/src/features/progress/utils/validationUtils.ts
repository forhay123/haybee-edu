import type { ValidationResult } from '../../assessments/types/assessmentTypes';

export const MIN_QUESTIONS_REQUIRED = 5;

export const formatValidationError = (result: ValidationResult): string => {
  if (result.canCreate) return '';

  const missing = Math.max(0, MIN_QUESTIONS_REQUIRED - result.questionCount);

  if (result.questionCount === 0) {
    return `No questions available for "${result.lessonTopicTitle}" in ${result.subjectName}. Please add questions first.`;
  }

  if (missing > 0) {
    return `Insufficient questions: Found ${result.questionCount}/${MIN_QUESTIONS_REQUIRED} required. Need ${missing} more question${missing > 1 ? 's' : ''}.`;
  }

  // Normalize reason to array, then join for display
  const reasons = Array.isArray(result.reason)
    ? result.reason
    : result.reason
    ? [result.reason]
    : [];

  return reasons.join('; ') || 'Schedule validation failed';
};

// ✅ Get all validation errors as array
export const getValidationErrors = (result: ValidationResult): string[] => {
  if (result.canCreate) return [];

  if (!result.reason) return [];

  return Array.isArray(result.reason)
    ? result.reason.map(r => r?.toString().trim()).filter(Boolean)
    : [result.reason.toString().trim()];
};

export const isValidationSuccessful = (result: ValidationResult): boolean => {
  return result.canCreate;
};
