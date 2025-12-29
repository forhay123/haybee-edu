/**
 * StudentMyPeriodsPage.tsx
 * Location: src/features/individual/pages/student/StudentMyPeriodsPage.tsx
 * Route: /student/individual/my-periods/:subjectId
 * 
 * Student's view of their own multi-period progress
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMultiPeriodProgress } from '@/features/assessments/hooks/useMultiPeriodProgress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Lock, Clock, AlertCircle } from 'lucide-react';

export const StudentMyPeriodsPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();

  // Use the hook directly, not with dynamic import
  const {
    periods,
    statistics,
    nextPeriod,
    periodsNeedingAttention,
    isLoading,
    error,
  } = useMultiPeriodProgress({ 
    subjectId: parseInt(subjectId!),
    enabled: !!subjectId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <div className="font-semibold text-red-900">Failed to load periods</div>
            <div className="text-sm text-red-700">Please try refreshing the page</div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'AVAILABLE':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'WAITING_ASSESSMENT':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'LOCKED':
        return <Lock className="w-5 h-5 text-gray-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'AVAILABLE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'WAITING_ASSESSMENT':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'LOCKED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Period Progress</h1>
        <p className="text-gray-600 mt-1">Track your progress across all periods</p>
      </div>

      {/* Progress Overview */}
      <Card className="p-6 mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-white">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Overall Progress</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Completion</div>
            <div className="text-3xl font-bold text-blue-600">
              {statistics.completionPercentage}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {statistics.completed} of {statistics.total} periods
            </div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Average Score</div>
            <div className="text-3xl font-bold text-green-600">
              {statistics.averageScore}%
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Across completed periods
            </div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Status</div>
            <div className="text-3xl font-bold text-orange-600">
              {statistics.available}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Available to complete
            </div>
          </div>
        </div>
      </Card>

      {/* Next Period Card */}
      {nextPeriod && (
        <Card className="p-6 mb-6 border-blue-300 bg-blue-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-blue-900">Next Period Available</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-lg text-gray-900">
                Period {nextPeriod.periodNumber}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Scheduled: {new Date(nextPeriod.scheduledDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              {nextPeriod.assessmentTitle && (
                <div className="text-sm text-gray-600 mt-1">
                  Assessment: {nextPeriod.assessmentTitle}
                </div>
              )}
            </div>
            <Button
              onClick={() => navigate(`/student/assessments/${nextPeriod.assessmentId}`)}
              className="ml-4"
              size="lg"
            >
              Start Assessment
            </Button>
          </div>
        </Card>
      )}

      {/* Waiting for Teacher Notice */}
      {periodsNeedingAttention.length > 0 && (
        <Card className="p-4 mb-6 border-orange-200 bg-orange-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <div>
              <div className="font-medium text-orange-900">
                {periodsNeedingAttention.length} period(s) waiting for teacher
              </div>
              <div className="text-sm text-orange-700">
                Your teacher is preparing custom assessments for these periods
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Periods List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">All Periods</h2>
        
        {periods.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <p className="text-lg font-medium">No periods found</p>
              <p className="text-sm mt-1">Check back later for new periods</p>
            </div>
          </Card>
        ) : (
          periods.map((period) => (
            <Card key={period.progressId} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Status Icon */}
                  <div className="mt-1">
                    {getStatusIcon(period.status)}
                  </div>

                  {/* Period Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Period {period.periodNumber}
                      </h3>
                      <Badge className={getStatusColor(period.status)}>
                        {period.status.replace('_', ' ')}
                      </Badge>
                      {period.isCustomAssessment && (
                        <Badge variant="outline" className="border-purple-300 text-purple-700">
                          Custom
                        </Badge>
                      )}
                    </div>

                    {/* Period Details */}
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>Scheduled:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(period.scheduledDate).toLocaleDateString()}
                        </span>
                      </div>

                      {period.isCompleted && period.completedAt && (
                        <>
                          <div className="flex items-center gap-2 text-gray-600">
                            <span>Completed:</span>
                            <span className="font-medium text-gray-900">
                              {new Date(period.completedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {period.score !== undefined && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <span>Score:</span>
                              <span className="font-semibold text-green-600">
                                {period.score}%
                              </span>
                            </div>
                          )}
                        </>
                      )}

                      {!period.isCompleted && !period.canAccess && (
                        <div className="flex items-center gap-2 text-orange-600">
                          <Lock className="w-4 h-4" />
                          <span className="font-medium">
                            {period.blockingReason || 'Not yet available'}
                          </span>
                        </div>
                      )}

                      {!period.isCompleted && period.canAccess && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Check className="w-4 h-4" />
                          <span className="font-medium">Ready to start</span>
                        </div>
                      )}

                      {period.requiresCustomAssessment && !period.customAssessmentCreated && (
                        <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                          <div className="text-sm text-yellow-800">
                            ⏳ Your teacher is creating a custom assessment for this period
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="ml-4 flex gap-2">
                  {period.canAccess && !period.isCompleted && period.assessmentId && (
                    <Button
                      onClick={() => navigate(`/student/assessments/${period.assessmentId}`)}
                    >
                      Start Assessment
                    </Button>
                  )}
                  {period.isCompleted && period.submissionId && (
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/student/submissions/${period.submissionId}`)}
                    >
                      View Results
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentMyPeriodsPage;