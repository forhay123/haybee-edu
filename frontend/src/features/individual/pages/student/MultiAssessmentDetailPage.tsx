// frontend/src/features/individual/pages/student/MultiAssessmentDetailPage.tsx

import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, Clock, Award, TrendingUp, AlertCircle } from 'lucide-react';
import { useMultiPeriodProgress } from '../../hooks/student/useMultiPeriodProgress';
import { AssessmentInstanceCard } from '../../components/student/AssessmentInstanceCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CustomBadge as Badge } from '@/components/ui/custom-badge';
import type { AssessmentPeriodDto } from '../../types/assessmentInstanceTypes';

const MultiAssessmentDetailPage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();

  // Fetch multi-period progress
  const { 
    multiPeriodLessons, 
    isLoading, 
    error,
    getLessonById 
  } = useMultiPeriodProgress();

  // Find the specific topic's progress
  const topicProgress = useMemo(() => {
    if (!topicId) return null;
    return getLessonById(parseInt(topicId));
  }, [topicId, getLessonById]);

  // Calculate detailed statistics
  const detailedStats = useMemo(() => {
    if (!topicProgress) return null;

    const periods = topicProgress.periods;
    const completed = periods.filter(p => p.status === 'COMPLETED');
    const pending = periods.filter(p => p.isPending);
    const missed = periods.filter(p => p.status === 'MISSED');
    const incomplete = periods.filter(p => p.status === 'INCOMPLETE');

    // Calculate score statistics
    const scores = completed
      .filter(p => p.score !== undefined && p.score !== null)
      .map(p => p.score!);
    
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    // Calculate time spent (if available)
    const totalTimeSpent = completed.reduce((sum, p) => {
      if (p.completedAt && p.assessmentWindowStart) {
        const start = new Date(p.assessmentWindowStart);
        const end = new Date(p.completedAt);
        const minutes = (end.getTime() - start.getTime()) / (1000 * 60);
        return sum + (minutes > 0 ? minutes : 0);
      }
      return sum;
    }, 0);

    return {
      completed: completed.length,
      pending: pending.length,
      missed: missed.length,
      incomplete: incomplete.length,
      highestScore,
      lowestScore,
      averageTimePerAssessment: completed.length > 0 ? Math.round(totalTimeSpent / completed.length) : 0,
    };
  }, [topicProgress]);

  // Convert PeriodProgress to AssessmentPeriodDto
  const convertToAssessmentPeriodDto = (period: any, index: number, totalPeriods: number): AssessmentPeriodDto => {
    return {
      scheduleId: period.progressId,
      progressId: period.progressId,
      periodSequence: index + 1,
      totalPeriodsInSequence: totalPeriods,
      scheduledDate: period.scheduledDate,
      dayOfWeek: period.dayOfWeek,
      startTime: period.startTime,
      endTime: period.endTime,
      timeSlot: `${period.startTime} - ${period.endTime}`,
      periodNumber: period.periodNumber,
      windowStart: period.assessmentWindowStart,
      windowEnd: period.assessmentWindowEnd,
      graceDeadline: period.assessmentWindowEnd,
      isWindowOpen: period.isAccessible,
      isGracePeriodActive: false,
      minutesUntilDeadline: 0,
      status: period.status === 'SCHEDULED' ? 'PENDING' : 
              period.status === 'COMPLETED' ? 'COMPLETED' :
              period.status === 'MISSED' ? 'MISSED' : 'PENDING',
      completed: period.status === 'COMPLETED',
      completedAt: period.completedAt,
      submittedAt: period.completedAt,
      assessmentInstanceId: parseInt(period.assessmentInstanceId),
      assessmentTitle: topicProgress?.lessonTopicTitle || '',
      totalQuestions: 10,
      attemptedQuestions: period.status === 'COMPLETED' ? 10 : 0,
      score: period.score,
      maxScore: period.maxScore || 100,
      grade: period.grade,
      isMissed: period.status === 'MISSED',
      incompleteReason: period.incompleteReason,
      markedIncompleteAt: period.autoMarkedIncompleteAt,
      hasPreviousPeriod: index > 0,
      previousPeriodCompleted: index === 0 || topicProgress?.periods[index - 1].status === 'COMPLETED',
      previousPeriodStatus: index > 0 ? topicProgress?.periods[index - 1].status : undefined,
      canStart: period.isAccessible && period.isPending,
      actionUrl: undefined,
      actionLabel: period.isPending ? 'Start Assessment' : 'View Results',
      statusIcon: period.status === 'COMPLETED' ? '✅' : period.status === 'MISSED' ? '❌' : '⏳',
      statusColor: period.status === 'COMPLETED' ? 'success' : period.status === 'MISSED' ? 'danger' : 'info',
      progressLabel: `Period ${index + 1} of ${totalPeriods}`,
    };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assessment details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !topicProgress) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error ? `Failed to load assessment: ${error.message}` : 'Assessment not found'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8 text-indigo-600 flex-shrink-0" />
              <h1 className="text-3xl font-bold text-gray-900">
                {topicProgress.lessonTopicTitle}
              </h1>
            </div>
            <p className="text-gray-600 mb-3">
              {topicProgress.subjectName}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={topicProgress.isFullyCompleted ? 'default' : 'secondary'}>
                {topicProgress.totalPeriods} Period{topicProgress.totalPeriods !== 1 ? 's' : ''}
              </Badge>
              <Badge variant={topicProgress.isFullyCompleted ? 'default' : 'secondary'}>
                {topicProgress.completedPeriods}/{topicProgress.totalPeriods} Completed
              </Badge>
              {topicProgress.incompletePeriods > 0 && (
                <Badge variant="danger">
                  {topicProgress.incompletePeriods} Incomplete
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      {detailedStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{detailedStats.pending}</p>
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
                  <p className="text-sm text-gray-600">Highest Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {detailedStats.highestScore > 0 ? `${detailedStats.highestScore}%` : '-'}
                  </p>
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
                  <p className="text-sm text-gray-600">Lowest Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {detailedStats.lowestScore > 0 ? `${detailedStats.lowestScore}%` : '-'}
                  </p>
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
                  <p className="text-sm text-gray-600">Avg Time</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {detailedStats.averageTimePerAssessment > 0
                      ? `${detailedStats.averageTimePerAssessment}m`
                      : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Completion</span>
                <span className="font-medium text-gray-900">
                  {topicProgress.completionPercentage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    topicProgress.isFullyCompleted ? 'bg-green-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${Math.min(topicProgress.completionPercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {topicProgress.averageScore !== undefined && topicProgress.averageScore !== null && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Average Score</span>
                  <span className="font-medium text-gray-900">
                    {topicProgress.averageScore.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-yellow-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(topicProgress.averageScore, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Individual Assessment Periods */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Periods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topicProgress.periods.length > 0 ? (
              topicProgress.periods.map((period, index) => (
                <AssessmentInstanceCard
                  key={period.progressId}
                  period={convertToAssessmentPeriodDto(period, index, topicProgress.totalPeriods)}
                  periodNumber={index + 1}
                  totalPeriods={topicProgress.totalPeriods}
                  lessonTopicTitle={topicProgress.lessonTopicTitle}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No assessment periods found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Banners */}
      {!topicProgress.isFullyCompleted && detailedStats && detailedStats.pending > 0 && (
        <Alert className="mt-6">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            You have {detailedStats.pending} pending assessment{detailedStats.pending !== 1 ? 's' : ''} for this topic.
            Complete them before the assessment windows close!
          </AlertDescription>
        </Alert>
      )}

      {detailedStats && detailedStats.missed > 0 && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {detailedStats.missed} missed assessment{detailedStats.missed !== 1 ? 's' : ''} for this topic.
            Contact your teacher for assistance.
          </AlertDescription>
        </Alert>
      )}

      {topicProgress.isFullyCompleted && (
        <Alert className="mt-6 border-green-200 bg-green-50">
          <Award className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            🎉 Congratulations! You've completed all assessments for this topic
            {topicProgress.averageScore !== undefined && topicProgress.averageScore !== null && 
              ` with an average score of ${topicProgress.averageScore.toFixed(1)}%`}!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MultiAssessmentDetailPage;