// ============================================================
// FILE: useScheduleValidation.ts (COMPLETE FIXED VERSION)
// Location: frontend/src/features/assessments/hooks/useScheduleValidation.ts
// ============================================================

import { useMutation } from '@tanstack/react-query';
import { useCallback } from 'react'; // ✅ FIXED: Import from 'react', not '@tanstack/react-query'
import { scheduleValidationApi } from '../api/scheduleValidationApi';
import type { ValidationResult } from '../types/assessmentTypes';

export const scheduleValidationKeys = {
  all: ['schedule-validation'] as const,
  validate: (classId: number, subjectId: number) => 
    [...scheduleValidationKeys.all, 'validate', classId, subjectId] as const,
};

/**
 * Hook for schedule validation before creation
 * Used in: WeeklyScheduleForm.tsx
 * 
 * ✅ ENHANCED: Now returns helper properties for easier usage
 */
export const useScheduleValidation = () => {
  const mutation = useMutation({
    mutationFn: (scheduleData: {
      classId: number;
      subjectId: number;
      lessonTopicId?: number;
      weekNumber: number;
      dayOfWeek: string;
      periodNumber: number;
    }) => scheduleValidationApi.validateScheduleCreation(scheduleData),
  });

  // ✅ ADD helper properties that were missing
  return {
    ...mutation,
    validationResult: mutation.data, // Access validation result directly
    isValidating: mutation.isPending, // Check if validating
    validateSchedule: mutation.mutate, // Trigger validation
    validateScheduleAsync: mutation.mutateAsync, // Async validation with promise
  };
};

/**
 * Hook to validate and handle validation result
 * Returns structured data for UI consumption
 * 
 * Usage:
 * const { validate, isLoading } = useValidateBeforeScheduleCreate();
 * const result = await validate(scheduleData);
 */
export const useValidateBeforeScheduleCreate = () => {
  const mutation = useScheduleValidation();

  const validate = useCallback(async (
    scheduleData: Parameters<typeof scheduleValidationApi.validateScheduleCreation>[0]
  ) => {
    try {
      const result = await scheduleValidationApi.validateScheduleCreation(scheduleData);
      
      return {
        isValid: result.canCreate,
        result,
        error: result.canCreate ? null : result.reason,
        questionSummary: {
          total: result.questionCount,
          ai: result.aiQuestions,
          teacher: result.teacherQuestions,
          missing: Math.max(0, 5 - result.questionCount)
        }
      };
    } catch (error: any) {
      return {
        isValid: false,
        result: null,
        error: error.response?.data?.message || 'Validation failed',
        questionSummary: null
      };
    }
  }, []);

  return { 
    ...mutation, 
    validate,
    validationResult: mutation.data,
    isValidating: mutation.isPending,
    validateSchedule: mutation.mutate,
  };
};

/**
 * Hook to provide validation error formatting
 * Helps format validation results for display
 * 
 * Usage:
 * const { formatValidationResult, formatErrorMessage } = useValidationErrorFormatter();
 */
export const useValidationErrorFormatter = () => {
  return {
    formatValidationResult: (result: ValidationResult) => {
      if (result.canCreate) {
        return {
          status: 'success' as const,
          message: `Ready to create! Found ${result.questionCount} MCQs`,
          details: `${result.aiQuestions} AI + ${result.teacherQuestions} Teacher questions`
        };
      }

      return {
        status: 'error' as const,
        message: result.reason,
        details: `Current: ${result.questionCount} questions | Required: 5 minimum`
      };
    },

    formatErrorMessage: (error: string) => {
      if (error.includes('Insufficient')) {
        return 'Not enough questions available for this lesson topic. Please add more questions or choose a different topic.';
      }
      if (error.includes('No questions')) {
        return 'This subject/lesson has no questions yet. Please create questions first.';
      }
      return error;
    }
  };
};

/**
 * Simple validation status checker
 * 
 * Usage:
 * const { canCreate, hasEnoughQuestions } = useValidationStatus(validationResult);
 */
export const useValidationStatus = (validationResult?: ValidationResult | null) => {
  return {
    canCreate: validationResult?.canCreate ?? false,
    hasEnoughQuestions: (validationResult?.questionCount ?? 0) >= 5,
    questionCount: validationResult?.questionCount ?? 0,
    reason: validationResult?.reason ?? '',
    isReady: validationResult?.canCreate === true,
  };
};

/**
 * Hook to check if schedule data is complete before validation
 * 
 * Usage:
 * const { isComplete, missingFields } = useScheduleDataCompletion(formData);
 */
export const useScheduleDataCompletion = (scheduleData: {
  classId?: number;
  subjectId?: number;
  lessonTopicId?: number;
  weekNumber?: number;
  dayOfWeek?: string;
  periodNumber?: number;
}) => {
  const missingFields: string[] = [];

  if (!scheduleData.classId) missingFields.push('Class');
  if (!scheduleData.subjectId) missingFields.push('Subject');
  if (!scheduleData.weekNumber) missingFields.push('Week Number');
  if (!scheduleData.dayOfWeek) missingFields.push('Day of Week');
  if (!scheduleData.periodNumber) missingFields.push('Period Number');

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    canValidate: scheduleData.classId && scheduleData.subjectId && scheduleData.lessonTopicId,
  };
};

// ============================================================
// TYPE EXPORTS
// ============================================================

export type ValidateScheduleData = Parameters<typeof scheduleValidationApi.validateScheduleCreation>[0];

export interface ValidateResult {
  isValid: boolean;
  result: ValidationResult | null;
  error: string | null;
  questionSummary: {
    total: number;
    ai: number;
    teacher: number;
    missing: number;
  } | null;
}