// frontend/src/features/individual/components/student/AssessmentTimelineView.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { CheckCircle2, Circle, XCircle, Clock, AlertCircle } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import type { AssessmentPeriodDto } from "../../types/assessmentInstanceTypes";

interface AssessmentTimelineViewProps {
  periods: AssessmentPeriodDto[];
  title?: string;
  onPeriodClick?: (period: AssessmentPeriodDto) => void;
}

export function AssessmentTimelineView({
  periods,
  title = "Assessment Timeline",
  onPeriodClick,
}: AssessmentTimelineViewProps) {
  const sortedPeriods = [...periods].sort(
    (a, b) =>
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );

  const getStatusIcon = (period: AssessmentPeriodDto) => {
    if (period.completed) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (period.isMissed) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
    if (period.isWindowOpen) {
      return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
    }
    if (isPast(new Date(period.windowEnd))) {
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
    return <Circle className="h-5 w-5 text-gray-400" />;
  };

  const getStatusColor = (period: AssessmentPeriodDto) => {
    if (period.completed) {
      return "bg-green-500/10 text-green-700 border-green-200";
    }
    if (period.isMissed) {
      return "bg-red-500/10 text-red-700 border-red-200";
    }
    if (period.isWindowOpen) {
      return "bg-blue-500/10 text-blue-700 border-blue-200";
    }
    if (isPast(new Date(period.windowEnd))) {
      return "bg-orange-500/10 text-orange-700 border-orange-200";
    }
    return "bg-gray-500/10 text-gray-700 border-gray-200";
  };

  const isCurrentPeriod = (period: AssessmentPeriodDto) => {
    return period.isWindowOpen && !period.completed;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-[29px] top-6 bottom-6 w-0.5 bg-border" />

          {/* Timeline Items */}
          <div className="space-y-6">
            {sortedPeriods.map((period, index) => (
              <div
                key={period.scheduleId}
                className={`relative ${isCurrentPeriod(period) ? "scale-105" : ""}`}
              >
                {/* Timeline Node */}
                <div className="relative z-10 flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(period)}
                  </div>

                  {/* Period Card */}
                  <button
                    onClick={() => onPeriodClick?.(period)}
                    className="flex-1 text-left"
                  >
                    <div
                      className={`rounded-lg border p-4 transition-all ${
                        isCurrentPeriod(period)
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border bg-card hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">
                            Period {period.periodSequence} of{" "}
                            {period.totalPeriodsInSequence}
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {format(new Date(period.scheduledDate), "EEEE, MMMM d, yyyy")}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(period)} text-xs`}
                        >
                          {period.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{period.timeSlot}</span>
                        </div>

                        {period.completed && period.score !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Score:</span>
                            <span className="font-semibold text-primary">
                              {period.score} / {period.maxScore}
                              {period.grade && (
                                <span className="ml-2 text-xs">({period.grade})</span>
                              )}
                            </span>
                          </div>
                        )}

                        {period.isWindowOpen && !period.completed && (
                          <div className="mt-2 rounded-md bg-blue-500/10 border border-blue-200 p-2">
                            <div className="text-xs text-blue-700 font-medium">
                              ⏰ Window open - {period.minutesUntilDeadline} minutes remaining
                            </div>
                          </div>
                        )}

                        {period.isMissed && period.incompleteReason && (
                          <div className="mt-2 rounded-md bg-red-500/10 border border-red-200 p-2">
                            <div className="text-xs text-red-700">
                              <span className="font-semibold">Missed: </span>
                              {period.incompleteReason}
                            </div>
                          </div>
                        )}

                        {period.hasPreviousPeriod && !period.previousPeriodCompleted && (
                          <div className="mt-2 rounded-md bg-yellow-500/10 border border-yellow-200 p-2">
                            <div className="text-xs text-yellow-700">
                              ⚠️ Previous period must be completed first
                            </div>
                          </div>
                        )}
                      </div>

                      {period.canStart && (
                        <div className="mt-3 text-xs font-semibold text-primary">
                          → {period.actionLabel}
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                {/* Connection Line to Next Item */}
                {index < sortedPeriods.length - 1 && (
                  <div className="absolute left-[29px] top-12 h-6 w-0.5 bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">
                {periods.filter((p) => p.completed).length}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {periods.filter((p) => p.isWindowOpen && !p.completed).length}
              </div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-600">
                {
                  periods.filter(
                    (p) =>
                      isFuture(new Date(p.windowStart)) &&
                      !p.completed &&
                      !p.isMissed
                  ).length
                }
              </div>
              <div className="text-xs text-muted-foreground">Upcoming</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {periods.filter((p) => p.isMissed).length}
              </div>
              <div className="text-xs text-muted-foreground">Missed</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}