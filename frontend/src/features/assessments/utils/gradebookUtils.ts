// src/features/assessments/utils/gradebookUtils.ts

import { GradeStatus, GradeLetter } from '../types/gradebookTypes';

/**
 * 🧮 Gradebook Utility Functions
 * Helper functions for gradebook calculations and formatting
 */

/**
 * Calculate weighted score
 * @param score - Points earned
 * @param total - Total points possible
 * @param weight - Weight percentage (e.g., 20 for 20%)
 * @returns Weighted score contribution
 * 
 * @example
 * calculateWeightedScore(18, 20, 20) // 18.0
 * // Student scored 18/20 (90%) on a quiz worth 20% = 18.0 weighted points
 */
export const calculateWeightedScore = (
  score: number,
  total: number,
  weight: number
): number => {
  if (total === 0) return 0;
  const percentage = (score / total) * 100;
  return (percentage / 100) * weight;
};

/**
 * Get color class based on percentage
 * @param percentage - Grade percentage
 * @returns Tailwind color classes
 * 
 * @example
 * getGradeColor(85) // 'text-green-600 bg-green-50'
 * getGradeColor(65) // 'text-yellow-600 bg-yellow-50'
 * getGradeColor(45) // 'text-red-600 bg-red-50'
 */
export const getGradeColor = (percentage: number): string => {
  if (percentage >= 90) return 'text-green-700 bg-green-50 border-green-200';
  if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
  if (percentage >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (percentage >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  if (percentage >= 50) return 'text-orange-600 bg-orange-50 border-orange-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

/**
 * Get background color for progress bars
 * @param percentage - Grade percentage
 * @returns Tailwind background color class
 */
export const getProgressBarColor = (percentage: number): string => {
  if (percentage >= 70) return 'bg-green-500';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
};

/**
 * Format grade letter for display
 * @param grade - Grade letter (A, B+, etc.)
 * @returns Formatted grade string
 * 
 * @example
 * formatGrade('A+') // 'A+'
 * formatGrade('N/A') // 'Not Graded'
 * formatGrade(null) // 'Pending'
 */
export const formatGrade = (grade?: string | null): string => {
  if (!grade) return 'Pending';
  if (grade === 'N/A') return 'Not Graded';
  return grade;
};

/**
 * Get status badge color
 * @param status - Grade status (PASS, FAIL, INCOMPLETE)
 * @returns Tailwind color classes for badge
 * 
 * @example
 * getStatusBadgeColor('PASS') // 'bg-green-100 text-green-800...'
 */
export const getStatusBadgeColor = (status: GradeStatus | string): string => {
  switch (status) {
    case 'PASS':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'FAIL':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'INCOMPLETE':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

/**
 * Get grade letter from percentage
 * @param percentage - Grade percentage
 * @returns Grade letter (A+, A, B+, etc.)
 * 
 * @example
 * getGradeLetter(95) // 'A+'
 * getGradeLetter(72) // 'B'
 * getGradeLetter(45) // 'D'
 */
export const getGradeLetter = (percentage: number): GradeLetter => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'A-';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'B-';
  if (percentage >= 60) return 'C+';
  if (percentage >= 55) return 'C';
  if (percentage >= 50) return 'C-';
  if (percentage >= 45) return 'D';
  return 'F';
};

/**
 * Format percentage for display
 * @param percentage - Raw percentage number
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercentage(85.6789) // '85.7%'
 * formatPercentage(85.6789, 2) // '85.68%'
 */
export const formatPercentage = (percentage: number, decimals: number = 1): string => {
  return `${percentage.toFixed(decimals)}%`;
};

/**
 * Format score for display
 * @param score - Points earned
 * @param total - Total points possible
 * @returns Formatted score string
 * 
 * @example
 * formatScore(18, 20) // '18/20'
 * formatScore(85.5, 100) // '85.5/100'
 */
export const formatScore = (score: number, total: number): string => {
  return `${score.toFixed(1)}/${total.toFixed(1)}`;
};

/**
 * Check if grade is passing
 * @param percentage - Grade percentage
 * @param passingThreshold - Minimum passing percentage (default: 50)
 * @returns True if passing
 */
export const isPassing = (percentage: number, passingThreshold: number = 50): boolean => {
  return percentage >= passingThreshold;
};

/**
 * Calculate overall average from subject percentages
 * @param subjectPercentages - Array of subject percentages
 * @returns Overall average percentage
 * 
 * @example
 * calculateOverallAverage([85, 90, 78]) // 84.33
 */
export const calculateOverallAverage = (subjectPercentages: number[]): number => {
  if (subjectPercentages.length === 0) return 0;
  const sum = subjectPercentages.reduce((acc, curr) => acc + curr, 0);
  return sum / subjectPercentages.length;
};

/**
 * Get status from percentage
 * @param percentage - Grade percentage
 * @param isComplete - Whether all components are submitted
 * @returns Grade status
 */
export const getStatusFromPercentage = (
  percentage: number,
  isComplete: boolean
): GradeStatus => {
  if (!isComplete) return 'INCOMPLETE';
  return isPassing(percentage) ? 'PASS' : 'FAIL';
};

/**
 * Format component count display
 * @param submitted - Number of components submitted
 * @param total - Total number of components
 * @returns Formatted string
 * 
 * @example
 * formatComponentCount(5, 6) // '5/6 completed'
 * formatComponentCount(6, 6) // 'All 6 completed'
 */
export const formatComponentCount = (submitted: number, total: number): string => {
  if (submitted === total) {
    return `All ${total} completed`;
  }
  return `${submitted}/${total} completed`;
};

/**
 * Get emoji for grade
 * @param grade - Grade letter
 * @returns Emoji representation
 */
export const getGradeEmoji = (grade: string): string => {
  if (grade.startsWith('A')) return '🌟';
  if (grade.startsWith('B')) return '👍';
  if (grade.startsWith('C')) return '👌';
  if (grade.startsWith('D')) return '😐';
  if (grade === 'F') return '😞';
  return '📊';
};

/**
 * Get status emoji
 * @param status - Grade status
 * @returns Emoji representation
 */
export const getStatusEmoji = (status: GradeStatus | string): string => {
  switch (status) {
    case 'PASS':
      return '✅';
    case 'FAIL':
      return '❌';
    case 'INCOMPLETE':
      return '⏳';
    default:
      return '📋';
  }
};

/**
 * Round to specified decimal places
 * @param value - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
export const roundTo = (value: number, decimals: number = 2): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Clamp value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Get component type display name
 * @param type - Assessment type
 * @returns Human-readable name
 */
export const getComponentTypeName = (type: string): string => {
  const names: Record<string, string> = {
    QUIZ: 'Quiz',
    CLASSWORK: 'Classwork',
    TEST1: 'Test 1',
    TEST2: 'Test 2',
    ASSIGNMENT: 'Assignment',
    EXAM: 'Exam',
    LESSON_TOPIC_ASSESSMENT: 'Lesson Assessment',
  };
  return names[type] || type;
};