
// ============================================================
// FILE 4: IncompleteLessonCard.tsx (FIXED - No changes needed)
// Location: frontend/src/features/progress/components/IncompleteLessonCard.tsx
// ============================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CustomBadge as Badge } from '@/components/ui/custom-badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, BookOpen, AlertCircle, Clock } from 'lucide-react';
import { IncompleteLessonInfo, IncompleteLessonReason } from '../types/types';
import { formatDate } from '@/lib/utils';

interface IncompleteLessonCardProps {
  lesson: IncompleteLessonInfo;
  onActionComplete?: () => void;
}

const IncompleteLessonCard: React.FC<IncompleteLessonCardProps> = ({ 
  lesson, 
  onActionComplete 
}) => {
  const navigate = useNavigate();

  const getReasonBadge = (reason: IncompleteLessonReason) => {
    switch (reason) {
      case IncompleteLessonReason.NOT_ATTEMPTED:
        return {
          variant: 'danger' as const,
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Not Attempted'
        };
      case IncompleteLessonReason.INCOMPLETE_ASSESSMENT:
        return {
          variant: 'secondary' as const,
          icon: <Clock className="h-3 w-3" />,
          text: 'Assessment Incomplete'
        };
      case IncompleteLessonReason.NOT_PASSED:
        return {
          variant: 'outline' as const,
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Not Passed'
        };
      default:
        return {
          variant: 'default' as const,
          icon: null,
          text: 'Unknown'
        };
    }
  };

  const reasonBadge = getReasonBadge(lesson.reason);

  const getActionButton = () => {
    switch (lesson.reason) {
      case IncompleteLessonReason.NOT_ATTEMPTED:
        return {
          text: 'Start Lesson',
          handler: () => navigate(`/lessons/${lesson.lesson_id}`)
        };
      case IncompleteLessonReason.INCOMPLETE_ASSESSMENT:
        return {
          text: 'Continue Assessment',
          handler: () => navigate(`/assessments/lesson/${lesson.assessment_id}`)
        };
      case IncompleteLessonReason.NOT_PASSED:
        return {
          text: 'Retake Assessment',
          handler: () => navigate(`/assessments/lesson/${lesson.assessment_id}`)
        };
      default:
        return {
          text: 'View Lesson',
          handler: () => navigate(`/lessons/${lesson.lesson_id}`)
        };
    }
  };

  const actionButton = getActionButton();

  const daysOverdue = React.useMemo(() => {
    const scheduledDate = new Date(lesson.scheduled_date);
    const today = new Date();
    const diffTime = today.getTime() - scheduledDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [lesson.scheduled_date]);

  return (
    <Card className={daysOverdue > 7 ? 'border-red-300' : undefined}>
      <CardHeader>
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

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>Scheduled: {formatDate(lesson.scheduled_date)}</span>
        </div>

        {/* ✅ FIXED: Alert now supports variant prop */}
        {daysOverdue > 0 && (
          <Alert variant={daysOverdue > 7 ? 'destructive' : 'default'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This lesson is {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
            </AlertDescription>
          </Alert>
        )}

        {lesson.reason === IncompleteLessonReason.NOT_PASSED && lesson.last_score !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Last Score:</span>
            <Badge variant="outline">{lesson.last_score}%</Badge>
            <span className="text-gray-500">
              (Passing: {lesson.passing_score}%)
            </span>
          </div>
        )}

        {lesson.reason === IncompleteLessonReason.INCOMPLETE_ASSESSMENT && lesson.questions_answered !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Progress:</span>
            <Badge variant="secondary">
              {lesson.questions_answered} / {lesson.total_questions} questions answered
            </Badge>
          </div>
        )}

        {lesson.assessment_id && (
          <div className="text-sm text-gray-500">
            <div>Assessment: {lesson.total_questions} questions</div>
            <div>Passing Score: {lesson.passing_score}%</div>
            {lesson.time_limit_minutes && (
              <div>Time Limit: {lesson.time_limit_minutes} minutes</div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/lessons/${lesson.lesson_id}`)}
        >
          View Details
        </Button>
        <Button
          onClick={() => {
            actionButton.handler();
            onActionComplete?.();
          }}
        >
          {actionButton.text}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default IncompleteLessonCard;
