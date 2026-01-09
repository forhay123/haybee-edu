// src/features/assessments/types/gradebookTypes.ts

import { AssessmentType } from './assessmentTypes';

/**
 * Access status for gradebook assessments (due-date based)
 */
export enum GradebookAccessStatus {
  OPEN = 'OPEN',           // More than 24 hours until due
  DUE_SOON = 'DUE_SOON',   // Less than 24 hours until due
  OVERDUE = 'OVERDUE',     // Past due date and not submitted
  COMPLETED = 'COMPLETED'  // Already submitted
}

/**
 * Gradebook assessment DTO (matches backend)
 */
export interface GradebookAssessmentDto {
  // Basic Info
  id: number;
  title: string;
  description?: string;
  type: AssessmentType;
  
  subjectId: number;
  subjectName: string;
  subjectCode?: string;
  
  termId?: number;
  termName?: string;
  
  createdById?: number;
  createdByName?: string;
  
  totalMarks: number;
  passingMarks: number;
  durationMinutes?: number;
  questionCount: number;
  
  autoGrade: boolean;
  published: boolean;
  
  dueDate?: string;
  createdAt: string;
  
  // Submission Status
  hasSubmitted: boolean;
  submissionId?: number;
  score?: number;
  percentage?: number;
  passed?: boolean;
  submittedAt?: string;
  graded?: boolean;
  
  // Access Status (Due Date Based)
  accessStatus: GradebookAccessStatus;
  hoursUntilDue?: number;
  daysUntilDue?: number;
  isAccessible: boolean;
  timeMessage: string;
  gradebookWeight: number;
}

/**
 * Helper to check if assessment is a gradebook type
 */
export const isGradebookAssessment = (type: AssessmentType): boolean => {
  return [
    AssessmentType.QUIZ,
    AssessmentType.CLASSWORK,
    AssessmentType.TEST1,
    AssessmentType.TEST2,
    AssessmentType.ASSIGNMENT,
    AssessmentType.EXAM
  ].includes(type);
};

/**
 * Helper to check if assessment is a lesson assessment
 */
export const isLessonAssessment = (type: AssessmentType): boolean => {
  return type === AssessmentType.LESSON_TOPIC_ASSESSMENT;
};

/**
 * Get display color for access status
 */
export const getGradebookStatusColor = (status: GradebookAccessStatus): string => {
  switch (status) {
    case GradebookAccessStatus.OPEN:
      return 'bg-green-100 text-green-800 border-green-200';
    case GradebookAccessStatus.DUE_SOON:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case GradebookAccessStatus.OVERDUE:
      return 'bg-red-100 text-red-800 border-red-200';
    case GradebookAccessStatus.COMPLETED:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Get display icon for access status
 */
export const getGradebookStatusIcon = (status: GradebookAccessStatus): string => {
  switch (status) {
    case GradebookAccessStatus.OPEN:
      return '📂';
    case GradebookAccessStatus.DUE_SOON:
      return '⏰';
    case GradebookAccessStatus.OVERDUE:
      return '❌';
    case GradebookAccessStatus.COMPLETED:
      return '✅';
    default:
      return '📋';
  }
};

/**
 * Get gradebook weight display
 */
export const getGradebookWeightDisplay = (type: AssessmentType): string => {
  switch (type) {
    case AssessmentType.QUIZ:
      return '20%';
    case AssessmentType.CLASSWORK:
      return '10%';
    case AssessmentType.TEST1:
      return '10%';
    case AssessmentType.TEST2:
      return '10%';
    case AssessmentType.ASSIGNMENT:
      return '10%';
    case AssessmentType.EXAM:
      return '40%';
    default:
      return 'N/A';
  }
};

/**
 * Format due date for display
 */
export const formatDueDate = (dueDate: string | undefined): string => {
  if (!dueDate) return 'No due date';
  
  const due = new Date(dueDate);
  const now = new Date();
  
  // If today, show time
  if (due.toDateString() === now.toDateString()) {
    return `Today at ${due.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    })}`;
  }
  
  // If tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (due.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${due.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    })}`;
  }
  
  // Otherwise show date
  return due.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};