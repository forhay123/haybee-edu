// frontend/src/features/individual/components/student/MultiAssessmentProgressCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, XCircle, Clock, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import type { MultiAssessmentProgressDto, AssessmentPeriodDto } from "../../types/assessmentInstanceTypes";

interface MultiAssessmentProgressCardProps {
  progress: MultiAssessmentProgressDto;
  onPeriodClick?: (period: AssessmentPeriodDto) => void;
  onStartNext?: () => void;
  compact?: boolean;
}

export function MultiAssessmentProgressCard({
  progress,
  onPeriodClick,
  onStartNext,
  compact = false,
}: MultiAssessmentProgressCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "MISSED":
      case "GRACE_EXPIRED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "AVAILABLE":
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500/10 text-green-700 border-green-200";
      case "MISSED":
      case "GRACE_EXPIRED":
        return "bg-red-500/10 text-red-700 border-red-200";
      case "AVAILABLE":
      case "IN_PROGRESS":
        return "bg-blue-500/10 text-blue-700 border-blue-200";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200";
    }
  };

  const completionPercentage = progress.completionPercentage;

  return (
    <Card className={compact ? "shadow-sm" : "shadow-md"}>
      <CardHeader className={compact ? "pb-3" : "pb-4"}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className={compact ? "text-base" : "text-lg"}>
              {progress.lessonTopicTitle}
            </CardTitle>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{progress.subjectCode}</span>
              <span>•</span>
              <span>Week {progress.weekNumber}</span>
            </div>
          </div>
          <Badge
            variant="outline"
            className={getStatusColor(progress.completionStatus)}
          >
            {progress.completionStatus.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-semibold">{Math.round(completionPercentage)}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {progress.completedPeriods} of {progress.totalPeriods} periods completed
            </span>
            {progress.averageScore !== undefined && (
              <span className="font-semibold text-primary">
                Avg: {Math.round(progress.averageScore)}%
              </span>
            )}
          </div>
        </div>

        {/* Period List */}
        {!compact && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Assessment Periods</div>
            <div className="space-y-1.5">
              {progress.periods.map((period) => (
                <button
                  key={period.scheduleId}
                  onClick={() => onPeriodClick?.(period)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent transition-colors">
                    {getStatusIcon(period.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          Period {period.periodSequence}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(period.scheduledDate), "MMM d")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {period.timeSlot}
                        {period.score !== undefined && (
                          <span className="ml-2 text-primary font-semibold">
                            Score: {period.score}/{period.maxScore}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(period.status)}`}>
                      {period.status.replace("_", " ")}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {progress.completedPeriods}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {progress.pendingPeriods}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {progress.missedPeriods}
            </div>
            <div className="text-xs text-muted-foreground">Missed</div>
          </div>
        </div>

        {/* Alerts */}
        {progress.hasUpcomingDeadline && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-200 p-3">
            <div className="flex items-center gap-2 text-sm text-yellow-700">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Upcoming deadline for next period</span>
            </div>
          </div>
        )}

        {progress.hasMissedPeriods && (
          <div className="rounded-lg bg-red-500/10 border border-red-200 p-3">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <XCircle className="h-4 w-4" />
              <span className="font-medium">You have missed periods</span>
            </div>
          </div>
        )}

        {/* Action Button */}
        {progress.canStartNextPeriod && onStartNext && (
          <Button onClick={onStartNext} className="w-full gap-2">
            <PlayCircle className="h-4 w-4" />
            Start Next Period
          </Button>
        )}
      </CardContent>
    </Card>
  );
}