// src/features/assessments/types/gradebookTypes.ts

import { AssessmentType } from './assessmentTypes';


export { AssessmentType };
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

// ============================================================
// GRADEBOOK REPORT TYPES (NEW)
// ============================================================

/**
 * Assessment Weights Map
 * Maps each assessment type to its percentage weight
 */
export type AssessmentWeights = {
  [key in AssessmentType]: number;
};

/**
 * 📝 Component Score DTO
 * Represents score for ONE assessment type (e.g., all QUIZes)
 */
export interface ComponentScoreDto {
  type: AssessmentType;
  weight: number; // Percentage weight (20, 40, etc.)
  score: number; // Points earned
  totalPossible: number; // Total points possible
  percentage: number; // (score / total) * 100
  weightedScore: number; // Contribution to final grade
  submitted: boolean; // Has student submitted?
  count: number; // Number of assessments (if multiple)
  assessmentIds: number[]; // IDs of assessments in this component
}

/**
 * 📚 Subject Gradebook DTO
 * Contains weighted grade calculation for ONE subject
 */
export interface SubjectGradebookDto {
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  
  // Component scores (Quiz, Exam, etc.)
  components: {
    [key in AssessmentType]?: ComponentScoreDto;
  };
  
  // Calculated totals
  totalWeightedScore: number; // Sum of all weighted scores
  totalWeightCovered: number; // Total weight of submitted components
  finalPercentage: number; // Final calculated percentage
  
  gradeLetter: string; // A, B, C, D, F
  status: 'PASS' | 'FAIL' | 'INCOMPLETE';
  
  isComplete: boolean; // All components submitted?
  componentsSubmitted: number;
  totalComponents: number;
}

/**
 * 📊 Complete Gradebook Report DTO
 * Contains all subjects with weighted grades for a student
 */
export interface GradebookReportDto {
  studentId: number;
  studentName?: string;
  termName?: string;
  
  // Subject-level data
  subjects: SubjectGradebookDto[];
  
  // Overall statistics
  totalSubjects: number;
  completeSubjects: number;
  incompleteSubjects: number;
  passedSubjects: number;
  failedSubjects: number;
  
  overallAverage: number; // Average of all complete subjects
  overallGrade: string; // Letter grade (A, B, C, etc.)
}

/**
 * Grade Status Types
 */
export type GradeStatus = 'PASS' | 'FAIL' | 'INCOMPLETE';

/**
 * Grade Letter Types
 */
export type GradeLetter = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F' | 'N/A';

/**
 * Component Status
 */
export type ComponentStatus = 'SUBMITTED' | 'PENDING' | 'MISSING' | 'NOT_AVAILABLE';

/**
 * Helper type for filtering subjects
 */
export interface SubjectFilter {
  status?: GradeStatus;
  minPercentage?: number;
  maxPercentage?: number;
  complete?: boolean;
}