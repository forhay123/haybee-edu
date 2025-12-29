// frontend/src/features/individual/components/student/WeeklyScheduleCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Calendar, Clock, BookOpen, AlertCircle } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";

// Using the correct types from weeklyGenerationTypes
interface AssessmentTopic {
  id: number;
  name: string;
  subject: {
    id: number;
    code: string;
    name: string;
  };
}

interface Assessment {
  id: number;
  topic: AssessmentTopic;
}

interface AssessmentInstance {
  id: number;
  scheduled_date: string; // ISO string
  period_number: number;
  completion_status: "completed" | "incomplete" | "pending";
  assessment: Assessment;
  window_start: string;
  window_end: string;
}

interface WeeklySchedule {
  id: number;
  week_number: number;
  week_start_date: string; // ISO string
  week_end_date: string;
  instances: AssessmentInstance[];
}

interface WeeklyScheduleCardProps {
  schedule: WeeklySchedule;
  onAssessmentClick?: (instance: AssessmentInstance) => void;
  compact?: boolean;
}

export function WeeklyScheduleCard({
  schedule,
  onAssessmentClick,
  compact = false,
}: WeeklyScheduleCardProps) {
  const weekStart = startOfWeek(new Date(schedule.week_start_date), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const getInstancesForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return schedule.instances.filter(
      (inst) => format(new Date(inst.scheduled_date), "yyyy-MM-dd") === dayStr
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-700 border-green-200";
      case "incomplete":
        return "bg-red-500/10 text-red-700 border-red-200";
      case "pending":
        return "bg-blue-500/10 text-blue-700 border-blue-200";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200";
    }
  };

  const completionRate = schedule.instances.length > 0
    ? (schedule.instances.filter(i => i.completion_status === "completed").length / schedule.instances.length) * 100
    : 0;

  return (
    <Card className={compact ? "shadow-sm" : "shadow-md"}>
      <CardHeader className={compact ? "pb-3" : "pb-4"}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              Week {schedule.week_number}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(weekStart, "MMM d")} - {format(addDays(weekStart, 4), "MMM d, yyyy")}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {Math.round(completionRate)}%
            </div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Daily Schedule */}
        <div className="space-y-2">
          {weekDays.map((day) => {
            const dayInstances = getInstancesForDay(day);
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

            return (
              <div
                key={day.toISOString()}
                className={`rounded-lg border p-3 transition-colors ${
                  isToday ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {format(day, "EEEE")}
                    </span>
                    {isToday && (
                      <Badge variant="outline" className="text-xs">
                        Today
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(day, "MMM d")}
                  </span>
                </div>

                {dayInstances.length > 0 ? (
                  <div className="space-y-1.5">
                    {dayInstances.map((instance) => (
                      <button
                        key={instance.id}
                        onClick={() => onAssessmentClick?.(instance)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-2 rounded-md border border-border bg-card p-2 hover:bg-accent transition-colors">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {instance.assessment.topic.subject.code} - Period {instance.period_number}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {instance.assessment.topic.name}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(instance.completion_status)}`}
                          >
                            {instance.completion_status}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>No assessments scheduled</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        {!compact && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold">
                {schedule.instances.length}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {schedule.instances.filter(i => i.completion_status === "completed").length}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {schedule.instances.filter(i => i.completion_status === "incomplete").length}
              </div>
              <div className="text-xs text-muted-foreground">Incomplete</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}