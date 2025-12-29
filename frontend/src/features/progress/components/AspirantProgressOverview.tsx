// src/features/progress/components/AspirantProgressOverview.tsx

import React from 'react';
import { LessonProgressDto } from '../api/dailyPlannerApi';
import { Award, TrendingUp, Target, BookOpen } from 'lucide-react';

interface AspirantProgressOverviewProps {
  lessons: LessonProgressDto[];
}

interface SubjectProgress {
  subjectName: string;
  total: number;
  completed: number;
  completionRate: number;
  totalWeight: number;
  completedWeight: number;
}

export const AspirantProgressOverview: React.FC<AspirantProgressOverviewProps> = ({ lessons }) => {
  // Calculate weighted progress
  const totalWeight = lessons.reduce((sum, l) => sum + (l.weight || 1), 0);
  const completedWeight = lessons
    .filter((l) => l.completed)
    .reduce((sum, l) => sum + (l.weight || 1), 0);
  const weightedProgress = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;

  // Priority breakdown
  const criticalLessons = lessons.filter((l) => l.priority === 1);
  const highPriorityLessons = lessons.filter((l) => l.priority === 2);
  const completedCritical = criticalLessons.filter((l) => l.completed).length;
  const completedHigh = highPriorityLessons.filter((l) => l.completed).length;

  const criticalProgress = criticalLessons.length > 0 
    ? (completedCritical / criticalLessons.length) * 100 
    : 0;
  const highProgress = highPriorityLessons.length > 0 
    ? (completedHigh / highPriorityLessons.length) * 100 
    : 0;

  // Subject breakdown
  const subjectMap = new Map<string, SubjectProgress>();
  
  lessons.forEach((lesson) => {
    const subject = lesson.subjectName;
    const weight = lesson.weight || 1;
    
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, {
        subjectName: subject,
        total: 0,
        completed: 0,
        completionRate: 0,
        totalWeight: 0,
        completedWeight: 0,
      });
    }
    
    const subjectData = subjectMap.get(subject)!;
    subjectData.total += 1;
    subjectData.totalWeight += weight;
    
    if (lesson.completed) {
      subjectData.completed += 1;
      subjectData.completedWeight += weight;
    }
  });

  // Calculate completion rates
  const subjects = Array.from(subjectMap.values()).map((s) => ({
    ...s,
    completionRate: s.total > 0 ? (s.completed / s.total) * 100 : 0,
  }));

  // Sort by completion rate
  const sortedSubjects = [...subjects].sort((a, b) => b.completionRate - a.completionRate);
  const topSubject = sortedSubjects[0];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weighted Progress */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award size={24} />
              <h3 className="text-sm font-medium opacity-90">Weighted Progress</h3>
            </div>
          </div>
          <div className="text-4xl font-bold mb-2">{weightedProgress.toFixed(1)}%</div>
          <div className="text-sm opacity-90">
            {completedWeight.toFixed(1)} / {totalWeight.toFixed(1)} points
          </div>
        </div>

        {/* Critical Priority */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={24} />
              <h3 className="text-sm font-medium opacity-90">Critical Priority</h3>
            </div>
          </div>
          <div className="text-4xl font-bold mb-2">{criticalProgress.toFixed(0)}%</div>
          <div className="text-sm opacity-90">
            {completedCritical} / {criticalLessons.length} lessons
          </div>
        </div>

        {/* High Priority */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={24} />
              <h3 className="text-sm font-medium opacity-90">High Priority</h3>
            </div>
          </div>
          <div className="text-4xl font-bold mb-2">{highProgress.toFixed(0)}%</div>
          <div className="text-sm opacity-90">
            {completedHigh} / {highPriorityLessons.length} lessons
          </div>
        </div>
      </div>

      {/* Subject Breakdown */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Subject Breakdown</h3>
        </div>

        {subjects.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No subjects to display</p>
        ) : (
          <div className="space-y-4">
            {/* Top Performing Subject Highlight */}
            {topSubject && topSubject.completionRate > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-300 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={20} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700">Top Performing Subject</span>
                </div>
                <div className="text-xl font-bold text-gray-800">{topSubject.subjectName}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {topSubject.completionRate.toFixed(0)}% completion rate
                </div>
              </div>
            )}

            {/* All Subjects */}
            {subjects.map((subject) => (
              <div key={subject.subjectName} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">{subject.subjectName}</span>
                  <span className="text-sm text-gray-600">
                    {subject.completed} / {subject.total} lessons ({subject.completionRate.toFixed(0)}%)
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                    style={{ width: `${subject.completionRate}%` }}
                  />
                </div>
                
                {/* Weighted Stats */}
                <div className="text-xs text-gray-500">
                  Weighted: {subject.completedWeight.toFixed(1)} / {subject.totalWeight.toFixed(1)} points
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};