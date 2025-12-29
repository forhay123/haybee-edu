import React from 'react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AccessCheckAlert } from '../../../components/ui/accessCheckAlert';
import { CountdownTimer } from '../../../components/ui/countdownTimer';
import { useAssessmentAccess } from '../hooks/useAssessmentAccess';
import {
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Hourglass,
  Calendar,
  AlertCircle,
  Plus,
  Eye
} from 'lucide-react';
import type { Assessment } from '../types/assessmentTypes';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';

interface PendingAssessmentCardProps {
  assessment: PendingAssessment;
  onCreateAssessment: (assessment: PendingAssessment) => void;
  onViewSubmission?: (submissionId: number) => void;
}

export const PendingAssessmentCard: React.FC<PendingAssessmentCardProps> = ({
  assessment,
  onCreateAssessment,
  onViewSubmission
}) => {
  return (
    <Card className={`p-4 hover:shadow-md transition-shadow ${
      !assessment.canCreateNow ? 'opacity-75' : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Student Info */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{assessment.studentName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">{assessment.studentName}</h3>
              <p className="text-sm text-gray-600">{assessment.subjectName}</p>
            </div>
            <Badge className={getUrgencyColor(assessment.urgencyLevel)}>
              {assessment.urgencyLevel}
            </Badge>
            <Badge variant="outline">Period {assessment.periodNumber}</Badge>
          </div>

          {/* Assessment Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
            <div>
              <span className="text-gray-600">Topic:</span>
              <div className="font-medium">{assessment.topicName || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-600">Scheduled:</span>
              <div className="font-medium">
                {new Date(assessment.scheduledDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Previous Score:</span>
              <div className={`font-medium ${
                (assessment.previousScore || 0) >= 70 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {assessment.previousScore !== undefined ? `${assessment.previousScore}%` : 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <div className="font-medium">
                {assessment.canCreateNow ? 'Ready' : 'Blocked'}
              </div>
            </div>
          </div>

          {/* Weak Topics */}
          {assessment.suggestedFocusAreas && (
            <div className="p-2 bg-blue-50 rounded-md mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  Weak Area: {assessment.suggestedFocusAreas.topicName}
                </span>
                <span className="text-sm text-blue-700">
                  ({assessment.suggestedFocusAreas.questionsWrong} questions wrong)
                </span>
              </div>
            </div>
          )}

          {/* Blocking Reason */}
          {!assessment.canCreateNow && assessment.blockingReason && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="w-4 h-4" />
              <span>{assessment.blockingReason}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="ml-4 flex flex-col gap-2">
          <Button
            onClick={() => onCreateAssessment(assessment)}
            disabled={!assessment.canCreateNow}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Assessment
          </Button>
          {assessment.previousSubmissionId && onViewSubmission && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewSubmission(assessment.previousSubmissionId!)}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Submission
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};