// src/features/progress/components/DailyPlannerList.tsx

import React from 'react';
import { LessonProgressDto } from '../api/dailyPlannerApi';
import { DailyLessonCard } from './DailyLessonCard';
import { BookOpen, Trophy, Lock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomBadge as Badge } from '@/components/ui/custom-badge';

interface DailyPlannerListProps {
  lessons: LessonProgressDto[];
  onMarkComplete?: (lesson: LessonProgressDto) => void;
  isMarkingComplete?: boolean;
}

export const DailyPlannerList: React.FC<DailyPlannerListProps> = ({
  lessons,
  onMarkComplete,
  isMarkingComplete = false,
}) => {
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((l) => l.completed).length;
  const completionPercentage = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  const allCompleted = totalLessons > 0 && completedLessons === totalLessons;

  // Calculate weighted progress
  const totalWeight = lessons.reduce((sum, l) => sum + (l.weight || 1), 0);
  const completedWeight = lessons
    .filter((l) => l.completed)
    .reduce((sum, l) => sum + (l.weight || 1), 0);
  const weightedPercentage = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;

  // Priority breakdown
  const criticalLessons = lessons.filter((l) => l.priority === 1);
  const highPriorityLessons = lessons.filter((l) => l.priority === 2);
  const completedCritical = criticalLessons.filter((l) => l.completed).length;
  const completedHigh = highPriorityLessons.filter((l) => l.completed).length;

  // Assessment statistics
  const lessonsWithAssessments = lessons.filter(l => l.assessmentId);
  const lockedAssessments = lessonsWithAssessments.filter(l => !l.completed && !l.assessmentId);
  const availableAssessments = lessonsWithAssessments.filter(l => !l.completed && l.assessmentId);

  if (totalLessons === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <BookOpen size={64} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">No lessons scheduled</h3>
        <p className="text-gray-500">You have no lessons scheduled for this day.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Progress</CardTitle>
          <CardDescription>
            {completedLessons} / {totalLessons} lessons completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Completion</span>
              <span className="text-sm font-medium text-gray-600">
                {completionPercentage.toFixed(0)}%
              </span>
            </div>
            
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Weighted Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Weighted Progress</span>
              <span className="text-sm text-gray-600">
                {completedWeight.toFixed(1)} / {totalWeight.toFixed(1)} points
              </span>
            </div>
            
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 ease-out"
                style={{ width: `${weightedPercentage}%` }}
              />
            </div>
          </div>

          {/* Priority Stats Grid */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-xs text-red-600 font-medium mb-1">Critical Priority</div>
              <div className="text-2xl font-bold text-red-700">
                {completedCritical} / {criticalLessons.length}
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="text-xs text-orange-600 font-medium mb-1">High Priority</div>
              <div className="text-2xl font-bold text-orange-700">
                {completedHigh} / {highPriorityLessons.length}
              </div>
            </div>
          </div>

          {/* Assessment Access Status */}
          {lessonsWithAssessments.length > 0 && (
            <div className="pt-4 border-t space-y-2">
              <div className="text-sm font-medium text-gray-700 mb-2">Assessment Status</div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <BookOpen size={14} />
                  {lessonsWithAssessments.length} with assessments
                </Badge>
                {availableAssessments.length > 0 && (
                  <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                    {availableAssessments.length} available now
                  </Badge>
                )}
                {lockedAssessments.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Lock size={14} />
                    {lockedAssessments.length} locked
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Control Alert */}
      {availableAssessments.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {availableAssessments.length} assessment{availableAssessments.length !== 1 ? 's' : ''} available to take now. 
            Complete them before the time window closes!
          </AlertDescription>
        </Alert>
      )}

      {/* Celebration Message */}
      {allCompleted && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6 text-center">
          <Trophy size={48} className="mx-auto text-yellow-500 mb-3" />
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            Amazing Work! 🎉
          </h3>
          <p className="text-gray-600">
            You've completed all lessons for today. Keep up the excellent progress!
          </p>
        </div>
      )}

      {/* Lessons List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Today's Lessons</h3>
          {isMarkingComplete && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Updating...</span>
            </div>
          )}
        </div>
        
        {lessons.map((lesson) => (
          <DailyLessonCard
            key={lesson.id}
            lesson={lesson}
            onMarkComplete={onMarkComplete}
            isLoading={isMarkingComplete}
          />
        ))}
      </div>
    </div>
  );
};