/**
 * Hook for building custom assessments
 * Manages state for the custom assessment creation wizard
 * 
 * ✅ FIXED: Infinite loop caused by missing dependencies in validation callbacks
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomAssessment, updateCustomAssessment } from '../api/customAssessmentsApi';
import type {
  CustomAssessmentRequest,
  CustomAssessmentBuilderState,
  CustomAssessmentValidation,
} from '../types/customAssessmentTypes';

interface UseCustomAssessmentBuilderOptions {
  initialState?: Partial<CustomAssessmentBuilderState>;
  onSuccess?: (assessmentId: number) => void;
  onError?: (error: any) => void;
}

export const useCustomAssessmentBuilder = (
  options: UseCustomAssessmentBuilderOptions = {}
) => {
  const { initialState, onSuccess, onError } = options;
  const queryClient = useQueryClient();

  // ============================================================
  // STATE
  // ============================================================

  const [state, setState] = useState<CustomAssessmentBuilderState>({
    // Step 1: Student and Context
    studentId: initialState?.studentId || 0,
    studentName: initialState?.studentName || '',
    subjectId: initialState?.subjectId || 0,
    subjectName: initialState?.subjectName || '',
    periodNumber: initialState?.periodNumber || 2,
    previousSubmissionId: initialState?.previousSubmissionId,
    
    // Step 2: Analysis
    submissionAnalysis: undefined,
    selectedWeakTopics: [],
    selectedIncorrectQuestions: [],
    
    // Step 3: Assessment Details
    title: initialState?.title || '',
    description: initialState?.description || '',
    totalMarks: initialState?.totalMarks || 100,
    passingMarks: initialState?.passingMarks || 50,
    durationMinutes: initialState?.durationMinutes || 60,
    scheduledDate: initialState?.scheduledDate,
    dueDate: initialState?.dueDate,
    
    // Step 4: Questions
    selectedQuestionIds: [],
    includeIncorrectQuestions: initialState?.includeIncorrectQuestions || false,
    focusOnWeakTopics: initialState?.focusOnWeakTopics || true,
    
    // Step 5: Review
    teacherNotes: '',
    
    // UI State
    currentStep: 1,
    isLoading: false,
    error: undefined,
    validationErrors: {},
  });

  // ============================================================
  // MUTATIONS
  // ============================================================

  const createMutation = useMutation({
    mutationFn: (request: CustomAssessmentRequest) => createCustomAssessment(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pendingCustomAssessments'] });
      queryClient.invalidateQueries({ queryKey: ['customAssessments'] });
      onSuccess?.(data.id);
    },
    onError: (error) => {
      setState((prev) => ({ ...prev, error: error.message }));
      onError?.(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: number; request: Partial<CustomAssessmentRequest> }) =>
      updateCustomAssessment(id, request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customAssessments'] });
      onSuccess?.(data.id);
    },
    onError: (error) => {
      setState((prev) => ({ ...prev, error: error.message }));
      onError?.(error);
    },
  });

  // ============================================================
  // VALIDATION
  // ✅ CRITICAL FIX: Accept state as parameter instead of closure
  // ============================================================

  const validateStep = useCallback((step: number, currentState: CustomAssessmentBuilderState): CustomAssessmentValidation => {
    const errors: Record<string, string> = {};
    let isValid = true;

    switch (step) {
      case 1: // Student and Context
        if (!currentState.studentId) {
          errors.general = 'Student is required';
          isValid = false;
        }
        if (!currentState.subjectId) {
          errors.general = 'Subject is required';
          isValid = false;
        }
        break;

      case 3: // Assessment Details
        if (!currentState.title || currentState.title.trim().length === 0) {
          errors.title = 'Title is required';
          isValid = false;
        }
        if (currentState.title && currentState.title.length > 255) {
          errors.title = 'Title cannot exceed 255 characters';
          isValid = false;
        }
        if (!currentState.totalMarks || currentState.totalMarks <= 0) {
          errors.totalMarks = 'Total marks must be greater than 0';
          isValid = false;
        }
        if (currentState.passingMarks && currentState.passingMarks > currentState.totalMarks) {
          errors.passingMarks = 'Passing marks cannot exceed total marks';
          isValid = false;
        }
        if (!currentState.durationMinutes || currentState.durationMinutes <= 0) {
          errors.durationMinutes = 'Duration must be at least 1 minute';
          isValid = false;
        }
        break;

      case 4: // Questions
        if (currentState.selectedQuestionIds.length === 0) {
          errors.questionIds = 'At least one question must be selected';
          isValid = false;
        }
        break;
    }

    // Update validation errors in state
    setState((prev) => ({ ...prev, validationErrors: errors }));
    return { isValid, errors };
  }, []); // ✅ Empty deps - pure function now

  const validateAll = useCallback((currentState: CustomAssessmentBuilderState): CustomAssessmentValidation => {
    const step1 = validateStep(1, currentState);
    const step3 = validateStep(3, currentState);
    const step4 = validateStep(4, currentState);

    const isValid = step1.isValid && step3.isValid && step4.isValid;
    const errors = {
      ...step1.errors,
      ...step3.errors,
      ...step4.errors,
    };

    return { isValid, errors };
  }, [validateStep]); // ✅ Only depends on validateStep

  // ============================================================
  // STEP NAVIGATION
  // ============================================================

  const goToStep = useCallback((step: number) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    setState((currentState) => {
      const validation = validateStep(currentState.currentStep, currentState);
      if (validation.isValid) {
        return { ...currentState, currentStep: currentState.currentStep + 1 };
      }
      return currentState;
    });
  }, [validateStep]);

  const previousStep = useCallback(() => {
    setState((prev) => ({ ...prev, currentStep: Math.max(1, prev.currentStep - 1) }));
  }, []);

  // ============================================================
  // STATE UPDATES
  // ============================================================

  const updateState = useCallback((updates: Partial<CustomAssessmentBuilderState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setStudentContext = useCallback((
    studentId: number,
    studentName: string,
    subjectId: number,
    subjectName: string,
    periodNumber: number,
    previousSubmissionId?: number
  ) => {
    setState((prev) => ({
      ...prev,
      studentId,
      studentName,
      subjectId,
      subjectName,
      periodNumber,
      previousSubmissionId,
    }));
  }, []);

  const setSubmissionAnalysis = useCallback((analysis: any) => {
    setState((prev) => ({ ...prev, submissionAnalysis: analysis }));
  }, []);

  const selectWeakTopic = useCallback((topic: string) => {
    setState((prev) => ({
      ...prev,
      selectedWeakTopics: [...prev.selectedWeakTopics, topic],
    }));
  }, []);

  const deselectWeakTopic = useCallback((topic: string) => {
    setState((prev) => ({
      ...prev,
      selectedWeakTopics: prev.selectedWeakTopics.filter((t) => t !== topic),
    }));
  }, []);

  const selectQuestion = useCallback((questionId: number) => {
    setState((prev) => ({
      ...prev,
      selectedQuestionIds: [...prev.selectedQuestionIds, questionId],
    }));
  }, []);

  const deselectQuestion = useCallback((questionId: number) => {
    setState((prev) => ({
      ...prev,
      selectedQuestionIds: prev.selectedQuestionIds.filter((id) => id !== questionId),
    }));
  }, []);

  const toggleQuestion = useCallback((questionId: number) => {
    setState((prev) => {
      const isSelected = prev.selectedQuestionIds.includes(questionId);
      return {
        ...prev,
        selectedQuestionIds: isSelected
          ? prev.selectedQuestionIds.filter((id) => id !== questionId)
          : [...prev.selectedQuestionIds, questionId],
      };
    });
  }, []);

  const selectAllQuestions = useCallback((questionIds: number[]) => {
    setState((prev) => ({ ...prev, selectedQuestionIds: questionIds }));
  }, []);

  const clearQuestions = useCallback(() => {
    setState((prev) => ({ ...prev, selectedQuestionIds: [] }));
  }, []);

  // ============================================================
  // SUBMISSION
  // ============================================================

  const buildRequest = useCallback((currentState: CustomAssessmentBuilderState): CustomAssessmentRequest => {
    return {
      studentProfileId: currentState.studentId,
      subjectId: currentState.subjectId,
      lessonTopicId: undefined, // Can be added if needed
      periodNumber: currentState.periodNumber,
      title: currentState.title,
      description: currentState.description,
      questionIds: currentState.selectedQuestionIds,
      totalMarks: currentState.totalMarks,
      passingMarks: currentState.passingMarks,
      durationMinutes: currentState.durationMinutes,
      dueDate: currentState.dueDate,
      scheduledDate: currentState.scheduledDate,
      previousSubmissionId: currentState.previousSubmissionId,
      teacherNotes: currentState.teacherNotes,
      includeIncorrectQuestions: currentState.includeIncorrectQuestions,
      focusOnWeakTopics: currentState.focusOnWeakTopics,
    };
  }, []);

  const submit = useCallback(async () => {
    // ✅ FIX: Get current state in callback
    let currentValidation: CustomAssessmentValidation | null = null;
    let requestToSubmit: CustomAssessmentRequest | null = null;
    
    setState((currentState) => {
      currentValidation = validateAll(currentState);
      if (currentValidation.isValid) {
        requestToSubmit = buildRequest(currentState);
        return { ...currentState, isLoading: true };
      }
      return currentState;
    });

    if (!currentValidation?.isValid) {
      return { success: false, errors: currentValidation?.errors || {} };
    }

    try {
      const result = await createMutation.mutateAsync(requestToSubmit!);
      setState((prev) => ({ ...prev, isLoading: false }));
      return { success: true, assessmentId: result.id };
    } catch (error: any) {
      setState((prev) => ({ ...prev, isLoading: false, error: error.message }));
      return { success: false, errors: { general: error.message } };
    }
  }, [validateAll, buildRequest, createMutation]);

  const reset = useCallback(() => {
    setState({
      studentId: 0,
      studentName: '',
      subjectId: 0,
      subjectName: '',
      periodNumber: 2,
      previousSubmissionId: undefined,
      submissionAnalysis: undefined,
      selectedWeakTopics: [],
      selectedIncorrectQuestions: [],
      title: '',
      description: '',
      totalMarks: 100,
      passingMarks: 50,
      durationMinutes: 60,
      scheduledDate: undefined,
      dueDate: undefined,
      selectedQuestionIds: [],
      includeIncorrectQuestions: false,
      focusOnWeakTopics: true,
      teacherNotes: '',
      currentStep: 1,
      isLoading: false,
      error: undefined,
      validationErrors: {},
    });
  }, []);

  // ============================================================
  // COMPUTED VALUES
  // ✅ FIX: These need to read current state, not capture it
  // ============================================================

  const isStepValid = useCallback((step: number) => {
    // ✅ Read state inline to avoid stale closure
    let result = false;
    setState((currentState) => {
      result = validateStep(step, currentState).isValid;
      return currentState; // No change
    });
    return result;
  }, [validateStep]);

  const canProceed = useCallback(() => {
    return isStepValid(state.currentStep);
  }, [isStepValid, state.currentStep]);

  const isComplete = useCallback(() => {
    let result = false;
    setState((currentState) => {
      result = validateAll(currentState).isValid;
      return currentState;
    });
    return result;
  }, [validateAll]);

  const progress = useCallback(() => {
    const totalSteps = 5;
    return (state.currentStep / totalSteps) * 100;
  }, [state.currentStep]);

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // State
    state,
    updateState,
    
    // Step navigation
    currentStep: state.currentStep,
    goToStep,
    nextStep,
    previousStep,
    
    // Context setup
    setStudentContext,
    setSubmissionAnalysis,
    
    // Question selection
    selectQuestion,
    deselectQuestion,
    toggleQuestion,
    selectAllQuestions,
    clearQuestions,
    selectedQuestionIds: state.selectedQuestionIds,
    
    // Topic selection
    selectWeakTopic,
    deselectWeakTopic,
    selectedWeakTopics: state.selectedWeakTopics,
    
    // Validation
    validateStep: (step: number) => validateStep(step, state),
    validateAll: () => validateAll(state),
    isStepValid,
    canProceed,
    isComplete,
    validationErrors: state.validationErrors,
    
    // Submission
    submit,
    buildRequest: () => buildRequest(state),
    reset,
    
    // Computed
    progress: progress(),
    
    // Status
    isLoading: state.isLoading || createMutation.isPending,
    error: state.error,
  };
};

export default useCustomAssessmentBuilder;