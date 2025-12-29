// frontend/src/features/individual/components/student/IncompleteLessonDetail.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, Clock, AlertTriangle, BookOpen, XCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { IncompleteProgressDto } from "../../types/incompleteTrackingTypes";

interface IncompleteLessonDetailProps {
  incomplete: IncompleteProgressDto;
  onRetry?: () => void;
  showFullDetails?: boolean;
}

export function IncompleteLessonDetail({
  incomplete,
  onRetry,
  showFullDetails = true,
}: IncompleteLessonDetailProps) {
  // Safety check: return early if incomplete data is not provided
  if (!incomplete) {
    return null;
  }
  const getUrgencyConfig = () => {
    if (incomplete.daysOverdue > 7) {
      return {
        color: "bg-red-500/10 text-red-700 border-red-300",
        icon: XCircle,
        urgency: "Critical",
        urgencyClass: "text-red-700",
      };
    }
    if (incomplete.daysOverdue > 3) {
      return {
        color: "bg-orange-500/10 text-orange-700 border-orange-300",
        icon: AlertTriangle,
        urgency: "High",
        urgencyClass: "text-orange-700",
      };
    }
    if (incomplete.daysOverdue > 1) {
      return {
        color: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
        icon: AlertTriangle,
        urgency: "Medium",
        urgencyClass: "text-yellow-700",
      };
    }
    return {
      color: "bg-blue-500/10 text-blue-700 border-blue-300",
      icon: Clock,
      urgency: "Low",
      urgencyClass: "text-blue-700",
    };
  };

  const config = getUrgencyConfig();
  const UrgencyIcon = config.icon;

  const formatReason = (reason: string) => {
    const reasonMap: Record<string, string> = {
      MISSED_GRACE_PERIOD: "Missed Grace Period - Window expired without submission",
      NO_SUBMISSION: "No Submission - Assessment not attempted",
      HOLIDAY_RESCHEDULE_FAILED: "Holiday Rescheduling - Could not reschedule lesson",
      TOPIC_NOT_ASSIGNED: "Topic Not Assigned - No lesson topic available",
    };
    return reasonMap[reason] || reason.replace(/_/g, " ");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{incomplete.lessonTopicTitle}</CardTitle>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{incomplete.subjectName}</span>
              <span>•</span>
              <span>Week {incomplete.weekNumber}</span>
            </div>
          </div>
          <Badge variant="outline" className={config.color}>
            <UrgencyIcon className="h-3.5 w-3.5 mr-1" />
            {config.urgency}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Critical Alert */}
        <Alert variant="destructive" className={config.color}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">
              {incomplete.daysOverdue} day{incomplete.daysOverdue !== 1 ? "s" : ""} overdue
            </span>
            {" - "}
            {formatReason(incomplete.incompleteReason)}
          </AlertDescription>
        </Alert>

        {/* Schedule Information */}
        {showFullDetails && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Scheduled Date</div>
                  <div className="font-medium">
                    {format(new Date(incomplete.scheduledDate), "MMM d, yyyy")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {incomplete.dayOfWeek}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Period</div>
                  <div className="font-medium">Period {incomplete.periodNumber}</div>
                </div>
              </div>
            </div>

            {/* Assessment Window */}
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                Assessment Window
              </div>
              <div className="space-y-1 text-sm">
                {incomplete.assessmentWindowStart && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Opened:</span>
                    <span>
                      {format(new Date(incomplete.assessmentWindowStart), "MMM d, h:mm a")}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Closed:</span>
                  <span className="text-red-600 font-semibold">
                    {format(new Date(incomplete.assessmentWindowEnd), "MMM d, h:mm a")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Marked Incomplete:</span>
                  <span>
                    {formatDistanceToNow(new Date(incomplete.autoMarkedIncompleteAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Multi-Period Info */}
            {incomplete.totalPeriodsInSequence && incomplete.totalPeriodsInSequence > 1 && (
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <div className="text-xs font-semibold text-muted-foreground">
                    Multi-Period Assessment
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Period:</span>
                    <span>
                      {incomplete.periodSequence} of {incomplete.totalPeriodsInSequence}
                    </span>
                  </div>
                  {incomplete.allPeriodsCompleted !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">All Periods:</span>
                      <Badge
                        variant="outline"
                        className={
                          incomplete.allPeriodsCompleted
                            ? "bg-green-500/10 text-green-700 border-green-200"
                            : "bg-yellow-500/10 text-yellow-700 border-yellow-200"
                        }
                      >
                        {incomplete.allPeriodsCompleted ? "Complete" : "Incomplete"}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Assessment Details */}
            {incomplete.assessmentId && (
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2">
                  Assessment Details
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span className="font-medium">{incomplete.assessmentTitle}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Accessible:</span>
                    <Badge
                      variant="outline"
                      className={
                        incomplete.assessmentAccessible
                          ? "bg-green-500/10 text-green-700 border-green-200"
                          : "bg-red-500/10 text-red-700 border-red-200"
                      }
                    >
                      {incomplete.assessmentAccessible ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {incomplete.notes && (
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-1">
                  Notes
                </div>
                <div className="text-sm text-muted-foreground">{incomplete.notes}</div>
              </div>
            )}
          </div>
        )}

        {/* Action Recommendation */}
        <div className="rounded-lg bg-blue-500/10 border border-blue-200 p-3">
          <div className="text-sm text-blue-700">
            <span className="font-semibold">💡 Recommendation: </span>
            {incomplete.assessmentAccessible
              ? "Contact your teacher to request access or makeup opportunity."
              : "This assessment is no longer accessible. Speak with your teacher about alternatives."}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}