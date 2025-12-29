// frontend/src/features/individual/components/student/AssessmentInstanceCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, BookOpen, PlayCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { AssessmentCountdownTimer } from "./AssessmentCountdownTimer";
import { WindowStatusIndicator } from "./WindowStatusIndicator";
import type { AssessmentPeriodDto } from "../../types/assessmentInstanceTypes";

interface AssessmentInstanceCardProps {
  period: AssessmentPeriodDto;
  onStart?: () => void;
  onView?: () => void;
  showCountdown?: boolean;
  variant?: "default" | "compact";
}

export function AssessmentInstanceCard({
  period,
  onStart,
  onView,
  showCountdown = true,
  variant = "default",
}: AssessmentInstanceCardProps) {
  const isCompleted = period.completed;
  const canStart = period.canStart;
  const isAvailable = period.isWindowOpen;

  const getScoreColor = (score?: number, maxScore?: number) => {
    if (!score || !maxScore) return "text-gray-600";
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className={variant === "compact" ? "shadow-sm" : "shadow-md"}>
      <CardHeader className={variant === "compact" ? "pb-3" : "pb-4"}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className={variant === "compact" ? "text-base" : "text-lg"}>
              {period.assessmentTitle}
            </CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              Period {period.periodSequence} of {period.totalPeriodsInSequence}
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              isCompleted
                ? "bg-green-500/10 text-green-700 border-green-200"
                : period.isMissed
                ? "bg-red-500/10 text-red-700 border-red-200"
                : "bg-blue-500/10 text-blue-700 border-blue-200"
            }
          >
            {period.status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Schedule Info */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(period.scheduledDate), "EEE, MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{period.timeSlot}</span>
          </div>
        </div>

        {/* Window Status */}
        {!isCompleted && (
          <WindowStatusIndicator
            startDate={period.windowStart}
            endDate={period.windowEnd}
            isCompleted={false}
            showDaysRemaining={true}
            variant="card"
          />
        )}

        {/* Countdown Timer */}
        {showCountdown && !isCompleted && isAvailable && (
          <AssessmentCountdownTimer
            targetDate={period.windowEnd}
            label="Window Closes In"
            variant="default"
            showIcon={true}
          />
        )}

        {/* Progress Info */}
        {variant !== "compact" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BookOpen className="h-4 w-4" />
                <span>Questions</span>
              </div>
              <span className="font-semibold">
                {period.attemptedQuestions} / {period.totalQuestions}
              </span>
            </div>

            {isCompleted && period.score !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Score</span>
                <span className={`font-bold text-lg ${getScoreColor(period.score, period.maxScore)}`}>
                  {period.score} / {period.maxScore}
                  {period.grade && (
                    <Badge variant="outline" className="ml-2">
                      {period.grade}
                    </Badge>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Incomplete Reason */}
        {period.isMissed && period.incompleteReason && (
          <div className="rounded-lg bg-red-500/10 border border-red-200 p-3">
            <div className="text-sm text-red-700">
              <span className="font-semibold">Missed: </span>
              {period.incompleteReason}
            </div>
          </div>
        )}

        {/* Previous Period Dependency */}
        {period.hasPreviousPeriod && !period.previousPeriodCompleted && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-200 p-3">
            <div className="text-sm text-yellow-700">
              ⚠️ Complete previous period first
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {isCompleted && onView && (
            <Button onClick={onView} variant="outline" className="flex-1 gap-2">
              <CheckCircle2 className="h-4 w-4" />
              View Results
            </Button>
          )}

          {!isCompleted && canStart && isAvailable && onStart && (
            <Button onClick={onStart} className="flex-1 gap-2">
              <PlayCircle className="h-4 w-4" />
              Start Assessment
            </Button>
          )}

          {!isCompleted && !canStart && !isAvailable && (
            <Button disabled className="flex-1">
              Not Available Yet
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}