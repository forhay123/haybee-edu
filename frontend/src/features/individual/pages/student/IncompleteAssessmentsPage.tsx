// frontend/src/features/individual/pages/student/IncompleteAssessmentsPage.tsx

import React, { useState, useMemo } from 'react';
import { AlertTriangle, Clock, RefreshCw, Filter, Calendar } from 'lucide-react';
import { useMyIncompleteLessons } from '../../hooks/student/useMyIncompleteLessons';
import { useSyncIncompleteLessons } from '../../hooks/useAssessmentInstances';
import {IncompleteLessonDetail} from '../../components/student/IncompleteLessonDetail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CustomBadge as Badge } from '@/components/ui/custom-badge';

type FilterOption = 'all' | 'recoverable' | 'missed';

const IncompleteAssessmentsPage: React.FC = () => {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [dateRange, setDateRange] = useState<'all' | 'week' | 'month'>('all');

  // Calculate date range
  const dates = useMemo(() => {
    const today = new Date();
    let fromDate: string | undefined;
    let toDate = today.toISOString().split('T')[0];

    if (dateRange === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      fromDate = weekAgo.toISOString().split('T')[0];
    } else if (dateRange === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      fromDate = monthAgo.toISOString().split('T')[0];
    }

    return { fromDate, toDate };
  }, [dateRange]);

  // Fetch incomplete lessons
  const { data: incompleteLessons, isLoading, error, refetch } = useMyIncompleteLessons(
    dates.fromDate,
    dates.toDate
  );

  // Sync mutation
  const syncMutation = useSyncIncompleteLessons();

  // Filter and group incomplete lessons
  const { filteredLessons, groupedByReason, stats } = useMemo(() => {
    if (!incompleteLessons) {
      return {
        filteredLessons: [],
        groupedByReason: {},
        stats: { total: 0, recoverable: 0, missed: 0 },
      };
    }

    const allLessons = Object.values(incompleteLessons.incompleteByReason).flat();
    
    let filtered = allLessons;
    if (filter === 'recoverable') {
      filtered = allLessons.filter(l => l.canStillComplete);
    } else if (filter === 'missed') {
      filtered = allLessons.filter(l => !l.canStillComplete);
    }

    const grouped = filtered.reduce((acc, lesson) => {
      const reason = lesson.incompleteReason || 'Unknown';
      if (!acc[reason]) {
        acc[reason] = [];
      }
      acc[reason].push(lesson);
      return acc;
    }, {} as Record<string, typeof filtered>);

    const statsData = {
      total: allLessons.length,
      recoverable: allLessons.filter(l => l.canStillComplete).length,
      missed: allLessons.filter(l => !l.canStillComplete).length,
    };

    return {
      filteredLessons: filtered,
      groupedByReason: grouped,
      stats: statsData,
    };
  }, [incompleteLessons, filter]);

  const handleSync = async () => {
    await syncMutation.mutateAsync();
    refetch();
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading incomplete assessments...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load incomplete assessments: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Incomplete Assessments
            </h1>
            <p className="text-gray-600">
              Track and recover from missed or incomplete assessments
            </p>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncMutation.isPending}
            variant="outline"
          >
            {syncMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Status
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Incomplete</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Recoverable</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recoverable}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Missed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.missed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <div className="flex gap-2">
                {(['all', 'recoverable', 'missed'] as FilterOption[]).map((option) => (
                  <Button
                    key={option}
                    variant={filter === option ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(option)}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2 ml-4">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Period:</span>
              <div className="flex gap-2">
                {(['all', 'week', 'month'] as typeof dateRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={dateRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDateRange(range)}
                  >
                    {range === 'all' ? 'All Time' : `Last ${range}`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert for Recoverable Items */}
      {stats.recoverable > 0 && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            You have {stats.recoverable} assessment{stats.recoverable !== 1 ? 's' : ''} that can still be completed.
            These assessments are within their grace period - complete them now to avoid missing them!
          </AlertDescription>
        </Alert>
      )}

      {/* Incomplete Lessons List */}
      {filteredLessons.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {filter === 'all' 
                ? 'No Incomplete Assessments'
                : filter === 'recoverable'
                ? 'No Recoverable Assessments'
                : 'No Missed Assessments'}
            </h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? "Great job! You're keeping up with all your assessments."
                : filter === 'recoverable'
                ? 'All incomplete assessments are past their grace period.'
                : 'You have no permanently missed assessments in this period.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByReason).map(([reason, lessons]) => (
            <Card key={reason}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {reason}
                  </CardTitle>
                  <Badge variant="secondary">
                    {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lessons.map((lesson) => (
                    <IncompleteLessonDetail
                      key={lesson.progressId}
                      lesson={lesson}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Help Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Understanding Incomplete Assessments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <strong className="text-gray-900">Recoverable:</strong> Assessments that are past their scheduled time
              but still within the grace period (2 hours). You can still complete these.
            </div>
            <div>
              <strong className="text-gray-900">Missed:</strong> Assessments that are past their grace period.
              These cannot be completed anymore and will count toward your incomplete record.
            </div>
            <div>
              <strong className="text-gray-900">Common Reasons:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Window Expired: Assessment window closed before completion</li>
                <li>Auto-Marked: System automatically marked as incomplete after grace period</li>
                <li>Manual Mark: Teacher or admin marked as incomplete</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <strong className="text-gray-900">💡 Tip:</strong> Click "Sync Status" to refresh incomplete
              assessments from the server. This ensures you have the most up-to-date information.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncompleteAssessmentsPage;