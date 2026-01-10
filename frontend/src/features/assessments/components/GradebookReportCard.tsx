// src/features/assessments/components/GradebookReportCard.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GradebookReportDto } from '../types/gradebookTypes';
import { GradeLetterBadge } from './GradeLetterBadge';
import { BookOpen, CheckCircle, XCircle, Clock } from 'lucide-react';

interface GradebookReportCardProps {
  report: GradebookReportDto;
}

/**
 * 📊 Overall Gradebook Summary Card
 * Displays overall statistics for student's complete gradebook
 */
export const GradebookReportCard: React.FC<GradebookReportCardProps> = ({ report }) => {
  const stats = [
    {
      label: 'Overall Average',
      value: `${report.overallAverage.toFixed(1)}%`,
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Total Subjects',
      value: report.totalSubjects,
      icon: BookOpen,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
    {
      label: 'Passed',
      value: report.passedSubjects,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Failed',
      value: report.failedSubjects,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Incomplete',
      value: report.incompleteSubjects,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">
            📊 Gradebook Summary
          </CardTitle>
          <GradeLetterBadge grade={report.overallGrade} size="large" />
        </div>
        {report.studentName && (
          <p className="text-sm text-muted-foreground mt-1">
            {report.studentName}
            {report.termName && ` • ${report.termName}`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`${stat.bgColor} rounded-lg p-4 flex flex-col items-center justify-center text-center`}
              >
                <Icon className={`h-6 w-6 ${stat.color} mb-2`} />
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};