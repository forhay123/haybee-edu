// frontend/src/features/individual/components/teacher/PendingAssignmentsList.tsx

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { CheckCircle2, Edit, User, Clock, AlertTriangle } from "lucide-react";
import type { PendingAssignmentDto } from "../../types/assignmentTypes";
import { getUrgencyLevel } from "../../types/assignmentTypes";

interface PendingAssignmentsListProps {
  assignments: PendingAssignmentDto[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onAssignClick: (assignment: PendingAssignmentDto) => void;
  isLoading?: boolean;
}

export function PendingAssignmentsList({
  assignments,
  selectedIds,
  onSelectionChange,
  onAssignClick,
  isLoading = false,
}: PendingAssignmentsListProps) {
  // Group assignments by student
  const groupedByStudent = assignments.reduce((acc, assignment) => {
    const studentName = assignment.studentName;
    if (!acc[studentName]) {
      acc[studentName] = [];
    }
    acc[studentName].push(assignment);
    return acc;
  }, {} as Record<string, PendingAssignmentDto[]>);

  const handleSelectStudent = (studentAssignments: PendingAssignmentDto[], checked: boolean) => {
    const ids = studentAssignments.map((a) => a.scheduleId);
    if (checked) {
      onSelectionChange([...new Set([...selectedIds, ...ids])]);
    } else {
      onSelectionChange(selectedIds.filter((id) => !ids.includes(id)));
    }
  };

  const handleSelectOne = (scheduleId: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, scheduleId]);
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== scheduleId));
    }
  };

  const getUrgencyBadge = (daysPending: number) => {
    const urgency = getUrgencyLevel(daysPending);
    
    const styles = {
      critical: "bg-red-100 text-red-800 border-red-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      low: "bg-blue-100 text-blue-800 border-blue-200",
    };

    const labels = {
      critical: "Overdue",
      high: "Today",
      medium: "Tomorrow",
      low: `${daysPending}d`,
    };

    return (
      <Badge className={styles[urgency]} variant="outline">
        {labels[urgency]}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            All Caught Up!
          </h3>
          <p className="text-sm text-gray-500">
            No pending topic assignments for your subjects.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedByStudent).map(([studentName, studentAssignments]) => {
        const allSelected = studentAssignments.every((a) =>
          selectedIds.includes(a.scheduleId)
        );
        const someSelected = studentAssignments.some((a) =>
          selectedIds.includes(a.scheduleId)
        );

        return (
          <Card key={studentName} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) =>
                    handleSelectStudent(studentAssignments, checked as boolean)
                  }
                  aria-label={`Select all for ${studentName}`}
                />
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">{studentName}</h3>
                  <Badge variant="secondary">
                    {studentAssignments.length} pending
                  </Badge>
                </div>
              </div>
              {someSelected && (
                <Badge variant="outline">
                  {studentAssignments.filter((a) =>
                    selectedIds.includes(a.scheduleId)
                  ).length}{" "}
                  selected
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {studentAssignments.map((assignment) => (
                <div
                  key={assignment.scheduleId}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border transition-all
                    ${
                      selectedIds.includes(assignment.scheduleId)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }
                  `}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={selectedIds.includes(assignment.scheduleId)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(assignment.scheduleId, checked as boolean)
                      }
                      aria-label={`Select ${assignment.subjectName} - ${assignment.scheduledDate}`}
                    />

                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Subject</p>
                        <Badge variant="outline">{assignment.subjectName}</Badge>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Week & Date</p>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium">
                            Week {assignment.weekNumber || "N/A"}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-sm">
                            {new Date(assignment.scheduledDate).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Period & Time</p>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span>Period {assignment.periodNumber}</span>
                          <span className="text-xs text-gray-400">
                            ({assignment.startTime})
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Urgency</p>
                        {getUrgencyBadge(assignment.daysPending)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {assignment.suggestedTopics &&
                      assignment.suggestedTopics.length > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          {assignment.suggestedTopics.length} suggestions
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          No suggestions
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAssignClick(assignment)}
                    className="ml-4"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}