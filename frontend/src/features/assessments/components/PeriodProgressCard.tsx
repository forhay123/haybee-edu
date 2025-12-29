// =================================================================
// PeriodProgressCard.tsx - FIXED BUTTON LOGIC
// ✅ Fixed: Shows "Create Assessment" for AVAILABLE + requiresCustomAssessment
// ✅ Fixed: Only shows "Start Assessment" for non-custom assessments
// =================================================================

import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Lock, 
  AlertCircle,
  Award,
  Target,
  BookOpen,
  TrendingDown
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

// Safe date formatter
const safeFormatDate = (dateValue: any, formatStr: string = 'MM/dd/yyyy'): string => {
  if (!dateValue) return 'N/A';
  try {
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
    if (!isValid(date)) return 'Invalid Date';
    return format(date, formatStr);
  } catch (error) {
    return 'Invalid Date';
  }
};

// Types
interface TopicPerformance {
  topicName: string;
  totalQuestions: number;
  correctAnswers: number;
  successRate: number;
}

interface PeriodProgressData {
  progressId: number;
  periodNumber: number;
  status: 'COMPLETED' | 'AVAILABLE' | 'WAITING_ASSESSMENT' | 'LOCKED';
  scheduledDate: string;
  completedAt?: string;
  score?: number;
  assessmentId?: number;
  assessmentTitle?: string;
  submissionId?: number;
  canAccess: boolean;
  blockingReason?: string;
  requiresCustomAssessment: boolean;
  assessmentCreated: boolean;
  totalQuestions?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  pendingGrading?: number;
  percentage?: number;
  passed?: boolean;
  submittedAt?: string;
  graded?: boolean;
  weakTopics?: string[];
  topicPerformance?: Record<string, TopicPerformance>;
}

interface PeriodProgressCardProps {
  period: PeriodProgressData;
  studentId: number;
  subjectId: number;
  previousPeriodSubmissionId?: number;
  isLastCompleted?: boolean;
}

const PeriodProgressCardComponent: React.FC<PeriodProgressCardProps> = ({
  period,
  studentId,
  subjectId,
  previousPeriodSubmissionId,
  isLastCompleted = false
}) => {
  const navigate = useNavigate();

  // ✅ Memoize ALL handlers with useCallback
  const handleViewResults = useCallback(() => {
    console.log('👁️ View Results clicked:', period.submissionId);
    if (period.submissionId) {
      navigate(`/submissions/${period.submissionId}/results`);
    }
  }, [period.submissionId, navigate]);

  const handleStartAssessment = useCallback(() => {
    console.log('▶️ Start Assessment clicked:', period.assessmentId);
    if (period.assessmentId) {
      navigate(`/student/individual/assessment/start/${period.progressId}`);
    }
  }, [period.assessmentId, period.progressId, navigate]);

  const handleCreateAssessment = useCallback(() => {
    console.log('🎯 Create Assessment clicked:', {
      studentId,
      subjectId,
      periodNumber: period.periodNumber,
      previousSubmissionId: previousPeriodSubmissionId
    });
    
    const url = `/teacher/assessments/create-custom?studentId=${studentId}&subjectId=${subjectId}&periodNumber=${period.periodNumber}${previousPeriodSubmissionId ? `&previousSubmissionId=${previousPeriodSubmissionId}` : ''}`;
    
    console.log('🚀 Navigating to:', url);
    navigate(url);
  }, [studentId, subjectId, period.periodNumber, previousPeriodSubmissionId, navigate]);

  // Status helpers
  const getStatusColor = () => {
    switch (period.status) {
      case 'COMPLETED': return 'border-green-500 bg-green-50';
      case 'AVAILABLE': return 'border-blue-500 bg-blue-50';
      case 'WAITING_ASSESSMENT': return 'border-yellow-500 bg-yellow-50';
      case 'LOCKED': return 'border-gray-300 bg-gray-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getStatusIcon = () => {
    switch (period.status) {
      case 'COMPLETED': return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'AVAILABLE': return <Clock className="w-6 h-6 text-blue-600" />;
      case 'WAITING_ASSESSMENT': return <AlertCircle className="w-6 h-6 text-yellow-600" />;
      case 'LOCKED': return <Lock className="w-6 h-6 text-gray-400" />;
      default: return null;
    }
  };

  const getStatusLabel = () => {
    switch (period.status) {
      case 'COMPLETED': return 'Completed';
      case 'AVAILABLE': return 'Available';
      case 'WAITING_ASSESSMENT': return 'Waiting for Teacher';
      case 'LOCKED': return 'Locked';
      default: return 'Unknown';
    }
  };

  return (
    <Card className={`${getStatusColor()} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-xl">Period {period.periodNumber}</CardTitle>
              <p className="text-sm text-gray-600">{getStatusLabel()}</p>
            </div>
          </div>
          {period.requiresCustomAssessment && (
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
              Custom Assessment
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Scheduled Date */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Scheduled:</span>
          <span className="font-medium">{safeFormatDate(period.scheduledDate)}</span>
        </div>

        {/* COMPLETED: Show submission statistics */}
        {period.status === 'COMPLETED' && period.totalQuestions !== undefined && period.totalQuestions !== null && (
          <div className="space-y-3">
            <div className={`rounded-lg p-4 ${
              period.passed ? 'bg-green-100 border-2 border-green-300' : 'bg-red-100 border-2 border-red-300'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Score:</span>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${
                    period.passed ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {period.percentage?.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {period.score?.toFixed(1)} points
                  </div>
                </div>
              </div>
              {period.passed !== undefined && (
                <Badge className={`w-full justify-center py-2 text-sm ${
                  period.passed ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                  {period.passed ? '✓ Passed' : '✗ Failed'}
                </Badge>
              )}
            </div>

            {/* Question Statistics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 bg-white rounded-lg border-2 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-600">{period.correctAnswers || 0}</div>
                <div className="text-xs text-gray-600 mt-1">Correct</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border-2 border-red-200">
                <XCircle className="w-4 h-4 text-red-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-red-600">{period.incorrectAnswers || 0}</div>
                <div className="text-xs text-gray-600 mt-1">Wrong</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border-2 border-gray-200">
                <BookOpen className="w-4 h-4 text-gray-600 mx-auto mb-1" />
                <div className="text-2xl font-bold text-gray-900">{period.totalQuestions || 0}</div>
                <div className="text-xs text-gray-600 mt-1">Total</div>
              </div>
            </div>

            {/* Weak Topics */}
            {period.weakTopics && period.weakTopics.length > 0 && (
              <Alert className="bg-amber-50 border-amber-200">
                <TrendingDown className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  <div className="text-sm font-semibold text-amber-900 mb-2">Areas to Improve:</div>
                  <div className="space-y-1">
                    {period.weakTopics.map((topic) => {
                      const topicData = period.topicPerformance?.[topic];
                      return (
                        <div key={topic} className="flex items-center justify-between text-xs">
                          <span className="text-amber-800 flex-1">{topic}</span>
                          {topicData && (
                            <div className="flex items-center gap-2">
                              <span className="text-amber-700">
                                {topicData.correctAnswers}/{topicData.totalQuestions}
                              </span>
                              <Badge variant="outline" className="bg-white text-amber-700 border-amber-300">
                                {topicData.successRate.toFixed(0)}%
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Pending Grading */}
            {period.pendingGrading !== undefined && period.pendingGrading > 0 && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm text-yellow-800">
                  {period.pendingGrading} question{period.pendingGrading > 1 ? 's' : ''} pending teacher review
                </AlertDescription>
              </Alert>
            )}

            {/* Perfect Score */}
            {period.percentage === 100 && (
              <Alert className="bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-300">
                <Award className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm font-semibold text-yellow-900">
                  🎉 Perfect Score! Excellent work!
                </AlertDescription>
              </Alert>
            )}

            {/* Submission Date */}
            {period.submittedAt && (
              <div className="text-xs text-gray-500 text-center">
                Submitted: {safeFormatDate(period.submittedAt, 'MMM dd, yyyy • hh:mm a')}
              </div>
            )}

            <Button onClick={handleViewResults} className="w-full bg-indigo-600 hover:bg-indigo-700" size="lg">
              <BookOpen className="w-4 h-4 mr-2" />
              View Detailed Results
            </Button>
          </div>
        )}

        {/* COMPLETED but no stats */}
        {period.status === 'COMPLETED' && (period.totalQuestions === undefined || period.totalQuestions === null) && (
          <div className="space-y-3">
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                This period has been completed.
                {period.score !== undefined && period.score !== null && (
                  <div className="mt-2 font-semibold">Score: {period.score.toFixed(1)} points</div>
                )}
              </AlertDescription>
            </Alert>
            {period.submissionId && (
              <Button onClick={handleViewResults} className="w-full" variant="outline">
                <BookOpen className="w-4 h-4 mr-2" />
                View Results
              </Button>
            )}
          </div>
        )}

        {/* WAITING_ASSESSMENT, AVAILABLE, or COMPLETED but needs custom assessment */}
        {((period.status === 'WAITING_ASSESSMENT') || 
          (period.status === 'AVAILABLE' && period.requiresCustomAssessment && !period.assessmentCreated) ||
          (period.status === 'COMPLETED' && period.requiresCustomAssessment && !period.assessmentCreated)) && (
          <div className="space-y-3">
            <Alert className={`${
              period.status === 'COMPLETED' ? 'bg-orange-100 border-orange-300' : 'bg-yellow-100 border-yellow-300'
            }`}>
              <AlertCircle className={`h-4 w-4 ${
                period.status === 'COMPLETED' ? 'text-orange-700' : 'text-yellow-700'
              }`} />
              <AlertDescription className={`text-sm ${
                period.status === 'COMPLETED' ? 'text-orange-800' : 'text-yellow-800'
              }`}>
                {period.blockingReason || 'Teacher needs to create custom assessment'}
              </AlertDescription>
            </Alert>
            {/* ✅ ALWAYS show button if assessment not created */}
            <Button 
              onClick={handleCreateAssessment} 
              className="w-full bg-purple-600 hover:bg-purple-700" 
              size="lg"
            >
              <Target className="w-4 h-4 mr-2" />
              Create Assessment
            </Button>
          </div>
        )}

        {/* AVAILABLE - only show if NOT requiring custom assessment */}
        {period.status === 'AVAILABLE' && period.canAccess && !period.requiresCustomAssessment && (
          <Button onClick={handleStartAssessment} className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
            <Clock className="w-4 h-4 mr-2" />
            Start Assessment
          </Button>
        )}

        {/* LOCKED */}
        {period.status === 'LOCKED' && (
          <Alert className="bg-gray-100 border-gray-300">
            <Lock className="h-4 w-4 text-gray-500" />
            <AlertDescription className="text-sm text-gray-700">
              {period.blockingReason || 'Complete previous period first'}
            </AlertDescription>
          </Alert>
        )}

        {/* Assessment Info */}
        {!period.assessmentCreated && period.requiresCustomAssessment && (
          <div className="text-xs text-gray-500 italic text-center">
            No assessment assigned to this period
          </div>
        )}
        {period.assessmentTitle && (
          <div className="text-xs text-gray-600 text-center p-2 bg-white rounded border">
            📝 {period.assessmentTitle}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ✅ Memo comparison
export const PeriodProgressCard = React.memo(
  PeriodProgressCardComponent,
  (prevProps, nextProps) => {
    const propsAreEqual = 
      prevProps.period.progressId === nextProps.period.progressId &&
      prevProps.period.status === nextProps.period.status &&
      prevProps.period.percentage === nextProps.period.percentage &&
      prevProps.studentId === nextProps.studentId &&
      prevProps.subjectId === nextProps.subjectId &&
      prevProps.previousPeriodSubmissionId === nextProps.previousPeriodSubmissionId &&
      prevProps.isLastCompleted === nextProps.isLastCompleted;

    return propsAreEqual;
  }
);

PeriodProgressCard.displayName = 'PeriodProgressCard';

export default PeriodProgressCard;