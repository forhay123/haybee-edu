// frontend/src/features/progress/components/IncompleteLessonCard.tsx
// ✅ CORRECTED VERSION - Replace the entire file with this

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomBadge as Badge } from '@/components/ui/custom-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, BookOpen, AlertCircle } from 'lucide-react';
import { IncompleteLessonInfo, IncompleteLessonReason } from '../types/types';
import { formatDate } from '@/lib/utils';

interface IncompleteLessonCardProps {
  lesson: IncompleteLessonInfo;
  onActionComplete?: () => void;
}

const IncompleteLessonCard: React.FC<IncompleteLessonCardProps> = ({ 
  lesson
}) => {
  const navigate = useNavigate();

  const getReasonBadge = (reason: IncompleteLessonReason) => {
    switch (reason) {
      case IncompleteLessonReason.NOT_ATTEMPTED:
        return {
          variant: 'danger' as const,
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Missed Grace Period',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case IncompleteLessonReason.INCOMPLETE_ASSESSMENT:
        return {
          variant: 'secondary' as const,
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Late Submission',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case IncompleteLessonReason.NOT_PASSED:
        return {
          variant: 'outline' as const,
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'No Submission',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
      default:
        return {
          variant: 'default' as const,
          icon: null,
          text: 'Unknown',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const reasonBadge = getReasonBadge(lesson.reason);

  const daysOverdue = React.useMemo(() => {
    const scheduledDate = new Date(lesson.scheduled_date);
    const today = new Date();
    const diffTime = today.getTime() - scheduledDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [lesson.scheduled_date]);

  return (
    <Card 
      className={`transition-all hover:shadow-lg cursor-pointer ${
        daysOverdue > 7 ? 'border-red-300' : ''
      } ${reasonBadge.borderColor}`}
      onClick={() => navigate(`/lessons/${lesson.lesson_id}`)}
    >
      <CardHeader className={reasonBadge.bgColor}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gray-500" />
              {lesson.lesson_title}
            </CardTitle>
            <CardDescription className="mt-1">
              {lesson.subject_name}
            </CardDescription>
          </div>
          <Badge variant={reasonBadge.variant} className="flex items-center gap-1">
            {reasonBadge.icon}
            {reasonBadge.text}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>Scheduled: {formatDate(lesson.scheduled_date)}</span>
        </div>

        {/* Overdue Warning */}
        {daysOverdue > 0 && (
          <Alert variant={daysOverdue > 7 ? 'destructive' : 'default'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This lesson is <strong>{daysOverdue} day{daysOverdue !== 1 ? 's' : ''}</strong> overdue
            </AlertDescription>
          </Alert>
        )}

        {/* Additional Info based on reason */}
        {lesson.reason === IncompleteLessonReason.NOT_ATTEMPTED && (
          <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-800 font-medium mb-1">
              <AlertCircle className="h-4 w-4" />
              Assessment Window Closed
            </div>
            <p className="text-red-700 text-xs">
              The grace period for this assessment has ended. Contact your instructor for assistance.
            </p>
          </div>
        )}

        {lesson.reason === IncompleteLessonReason.INCOMPLETE_ASSESSMENT && (
          <div className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800 font-medium mb-1">
              <AlertCircle className="h-4 w-4" />
              Late Submission
            </div>
            <p className="text-yellow-700 text-xs">
              Assessment was submitted after the deadline.
            </p>
          </div>
        )}

        {lesson.reason === IncompleteLessonReason.NOT_PASSED && (
          <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-800 font-medium mb-1">
              <AlertCircle className="h-4 w-4" />
              No Submission
            </div>
            <p className="text-gray-700 text-xs">
              No assessment submission was recorded for this lesson.
            </p>
          </div>
        )}

        {/* Score Info (if available) */}
        {lesson.reason === IncompleteLessonReason.NOT_PASSED && lesson.last_score !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Last Score:</span>
            <Badge variant="outline">{lesson.last_score}%</Badge>
            <span className="text-gray-500">
              (Passing: {lesson.passing_score}%)
            </span>
          </div>
        )}

        {/* Progress Info (if available) */}
        {lesson.reason === IncompleteLessonReason.INCOMPLETE_ASSESSMENT && lesson.questions_answered !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Progress:</span>
            <Badge variant="secondary">
              {lesson.questions_answered} / {lesson.total_questions} questions answered
            </Badge>
          </div>
        )}

        {/* Assessment Details (if available) */}
        {lesson.assessment_id && (
          <div className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="font-medium text-blue-900 mb-1">Assessment Details</div>
            <div className="space-y-1 text-xs">
              <div>Total Questions: {lesson.total_questions}</div>
              <div>Passing Score: {lesson.passing_score}%</div>
              {lesson.time_limit_minutes && (
                <div>Time Limit: {lesson.time_limit_minutes} minutes</div>
              )}
            </div>
          </div>
        )}

        {/* Click to view hint */}
        <div className="text-xs text-gray-500 italic text-center pt-2 border-t border-gray-200">
          Click anywhere on this card to view lesson details
        </div>
      </CardContent>
    </Card>
  );
};

export default IncompleteLessonCard;