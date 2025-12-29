// ============================================================
// FILE 2: Updated ProgressHistoryPage.tsx
// ============================================================

// frontend/src/features/individual/pages/student/ProgressHistoryPage.tsx

import React, { useState, useMemo } from 'react';
import { TrendingUp, Calendar, Award, BookOpen, Download, AlertCircle } from 'lucide-react';
import { useProgressHistory } from '../../hooks/student/useProgressHistory';
import { useMyProfile } from '../../../studentProfiles/hooks/useStudentProfiles';
import { ProgressHistoryChart } from '../../components/student/ProgressHistoryChart';
import { AssessmentTimelineView } from '../../components/student/AssessmentTimelineView';
import { convertAssessmentInstancesToPeriodDtos } from '../../utils/assessmentConverters';
import { convertToWeeklyData } from '../../utils/assessmentDataConverter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

type TimeRange = 'week' | 'month' | 'term' | 'custom';
type ViewMode = 'chart' | 'timeline' | 'stats';

const ProgressHistoryPage: React.FC = () => {
  const { data: profile } = useMyProfile();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calculate date range
  const dateRange = useMemo(() => {
    const today = new Date();
    let startDate: Date;
    let endDate = today;

    switch (timeRange) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'term':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          startDate = new Date(today);
          startDate.setMonth(today.getMonth() - 1);
        }
        break;
      default:
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
    }

    return {
      from: startDate.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0],
    };
  }, [timeRange, customStartDate, customEndDate]);

  const { useMyHistory } = useProgressHistory();
  const { data: progressHistory, isLoading, error } = useMyHistory(
    dateRange.from,
    dateRange.to
  );

  // Calculate statistics
  const stats = useMemo(() => {
    if (!progressHistory || !Array.isArray(progressHistory)) {
      return {
        totalLessons: 0,
        completedLessons: 0,
        averageScore: 0,
        completionRate: 0,
        subjectStats: [],
      };
    }

    const total = progressHistory.length;
    const completed = progressHistory.filter(
      (p: any) => p.status === 'COMPLETED' || p.completed === true
    ).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    const completedWithScores = progressHistory.filter(
      (p: any) => (p.status === 'COMPLETED' || p.completed === true) && 
                 p.score !== undefined && p.score !== null
    );
    const averageScore = completedWithScores.length > 0
      ? completedWithScores.reduce((sum: number, p: any) => sum + (p.score || 0), 0) / completedWithScores.length
      : 0;

    const bySubject = progressHistory.reduce((acc: any, progress: any) => {
      const subject = progress.subjectName || 'Unknown';
      if (!acc[subject]) {
        acc[subject] = [];
      }
      acc[subject].push(progress);
      return acc;
    }, {} as Record<string, any[]>);

    const subjectStats = (Object.entries(bySubject) as [string, any[]][]).map(([subject, records]) => {
      const subjectCompleted = records.filter(
        (r: any) => r.status === 'COMPLETED' || r.completed === true
      ).length;
      const subjectTotal = records.length;
      const subjectRate = subjectTotal > 0 ? (subjectCompleted / subjectTotal) * 100 : 0;

      const subjectScores = records.filter(
        (r: any) => (r.status === 'COMPLETED' || r.completed === true) && 
                    r.score !== undefined && r.score !== null
      );
      const subjectAvg = subjectScores.length > 0
        ? subjectScores.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / subjectScores.length
        : 0;

      return {
        subject,
        total: subjectTotal,
        completed: subjectCompleted,
        completionRate: subjectRate,
        averageScore: subjectAvg,
      };
    }).sort((a, b) => b.completionRate - a.completionRate);

    return {
      totalLessons: total,
      completedLessons: completed,
      averageScore,
      completionRate,
      subjectStats,
    };
  }, [progressHistory]);

  const handleExportData = () => {
    if (!progressHistory || progressHistory.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Date', 'Subject', 'Topic', 'Status', 'Score', 'Grade'];
    const rows = progressHistory.map((item: any) => [
      item.scheduledDate || item.date || '',
      item.subjectName || '',
      item.lessonTopicTitle || item.topicTitle || '',
      item.status || (item.completed ? 'COMPLETED' : 'PENDING'),
      item.score !== undefined ? item.score : '',
      item.grade || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `progress_history_${dateRange.from}_to_${dateRange.to}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your progress history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load progress history: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Progress History
            </h1>
            <p className="text-gray-600">
              Track your learning journey and performance over time
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleExportData}
            disabled={!progressHistory || progressHistory.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Time Range:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(['week', 'month', 'term', 'custom'] as TimeRange[]).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>

            {timeRange === 'custom' && (
              <div className="flex flex-wrap gap-2 ml-0 sm:ml-4 w-full sm:w-auto">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-500 self-center">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Mode Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['chart', 'timeline', 'stats'] as ViewMode[]).map((mode) => (
          <Button
            key={mode}
            variant={viewMode === mode ? 'default' : 'outline'}
            onClick={() => setViewMode(mode)}
          >
            {mode === 'chart' && <TrendingUp className="w-4 h-4 mr-2" />}
            {mode === 'timeline' && <Calendar className="w-4 h-4 mr-2" />}
            {mode === 'stats' && <Award className="w-4 h-4 mr-2" />}
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Button>
        ))}
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Lessons</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLessons}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedLessons}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.completionRate.toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.averageScore > 0 ? stats.averageScore.toFixed(1) : '0.0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      {!progressHistory || progressHistory.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Progress Data Available
            </h3>
            <p className="text-gray-600">
              No progress records found for the selected time period.
              Try selecting a different date range.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'chart' && (
            <ProgressHistoryChart 
              data={convertToWeeklyData(progressHistory)} 
            />
          )}

          {viewMode === 'timeline' && (
            <AssessmentTimelineView 
              periods={convertAssessmentInstancesToPeriodDtos(progressHistory)} 
            />
          )}

          {viewMode === 'stats' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Subject Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.subjectStats.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No subject data available
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {stats.subjectStats.map((subject) => (
                        <div key={subject.subject} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{subject.subject}</h3>
                            <div className="flex gap-4 text-sm">
                              <span className="text-gray-600">
                                {subject.completed}/{subject.total} completed
                              </span>
                              <span className="font-medium text-indigo-600">
                                {subject.completionRate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(subject.completionRate, 100)}%` }}
                            ></div>
                          </div>
                          {subject.averageScore > 0 && (
                            <p className="text-sm text-gray-600">
                              Average Score: <span className="font-medium">{subject.averageScore.toFixed(1)}%</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProgressHistoryPage;