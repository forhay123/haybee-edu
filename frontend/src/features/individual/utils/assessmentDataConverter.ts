// ============================================================
// FILE 1: Assessment Data Converter Utility
// frontend/src/features/individual/utils/assessmentDataConverter.ts
// ============================================================

import type { AssessmentInstance } from '../api/assessmentInstancesApi';

interface WeeklyData {
  weekNumber: number;
  completionRate: number;
  averageScore?: number;
  completedLessons: number;
  totalLessons: number;
}

/**
 * Convert AssessmentInstance[] to WeeklyData[] for ProgressHistoryChart
 */
export function convertToWeeklyData(
  assessments: AssessmentInstance[]
): WeeklyData[] {
  if (!assessments || assessments.length === 0) return [];

  // Group by week
  const weekMap = new Map<number, AssessmentInstance[]>();
  
  assessments.forEach((assessment) => {
    // Calculate week number from date (simple version)
    const date = new Date(assessment.scheduledDate);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );
    
    if (!weekMap.has(weekNumber)) {
      weekMap.set(weekNumber, []);
    }
    weekMap.get(weekNumber)!.push(assessment);
  });

  // Convert to WeeklyData array
  return Array.from(weekMap.entries())
    .map(([weekNumber, weekAssessments]) => {
      const completedLessons = weekAssessments.filter(
        a => a.status === 'COMPLETED'
      ).length;
      const totalLessons = weekAssessments.length;
      const completionRate = totalLessons > 0 
        ? (completedLessons / totalLessons) * 100 
        : 0;

      // Calculate average score
      const completedWithScores = weekAssessments.filter(
        a => a.status === 'COMPLETED' && a.score !== undefined && a.score !== null
      );
      const averageScore = completedWithScores.length > 0
        ? completedWithScores.reduce((sum, a) => sum + (a.score || 0), 0) / completedWithScores.length
        : undefined;

      return {
        weekNumber,
        completionRate,
        averageScore,
        completedLessons,
        totalLessons,
      };
    })
    .sort((a, b) => a.weekNumber - b.weekNumber);
}
