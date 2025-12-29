// ============================================================
// FILE 1: PendingAssignmentsSidebar.tsx
// Path: frontend/src/features/individual/components/teacher/PendingAssignmentsSidebar.tsx
// ============================================================

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import {
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { useMyPendingAssignmentsWithSummary } from "../../hooks/teacher/usePendingAssignments";
import { useNavigate } from "react-router-dom";

export function PendingAssignmentsSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const { assignments, summary, isLoading } = useMyPendingAssignmentsWithSummary();

  // Get urgent assignments (today or overdue)
  const urgentAssignments = assignments.filter((a) => {
    const scheduledDate = new Date(a.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return scheduledDate <= today && a.missingLessonTopic;
  });

  // Get upcoming assignments (next 3 days)
  const upcomingAssignments = assignments.filter((a) => {
    const scheduledDate = new Date(a.scheduledDate);
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    return scheduledDate > today && scheduledDate <= threeDaysFromNow;
  }).slice(0, 5);

  if (isCollapsed) {
    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-blue-600 text-white p-3 rounded-l-lg shadow-lg hover:bg-blue-700 transition-colors"
        >
          <div className="flex flex-col items-center gap-1">
            <ChevronLeft className="h-5 w-5" />
            {summary && summary.total > 0 && (
              <Badge variant="danger" className="text-xs px-1">
                {summary.total}
              </Badge>
            )}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-20 bottom-4 w-80 z-40">
      <Card className="h-full flex flex-col shadow-xl border-l-4 border-blue-600">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-blue-50">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Pending Assignments</h3>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-blue-100 rounded transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Summary */}
        {summary && (
          <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{summary.total}</p>
                <p className="text-xs text-gray-600">Total Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {urgentAssignments.length}
                </p>
                <p className="text-xs text-gray-600">Urgent</p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Urgent Assignments */}
          {urgentAssignments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <h4 className="font-medium text-sm text-gray-900">
                  Urgent ({urgentAssignments.length})
                </h4>
              </div>
              <div className="space-y-2">
                {urgentAssignments.slice(0, 3).map((assignment) => (
                  <div
                    key={assignment.scheduleId}
                    className="p-2 bg-orange-50 border border-orange-200 rounded-lg text-sm"
                  >
                    <p className="font-medium text-gray-900">
                      {assignment.studentName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {assignment.subjectName} - Period {assignment.periodNumber}
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      {new Date(assignment.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Assignments */}
          {upcomingAssignments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium text-sm text-gray-900">
                  Upcoming ({upcomingAssignments.length})
                </h4>
              </div>
              <div className="space-y-2">
                {upcomingAssignments.map((assignment) => (
                  <div
                    key={assignment.scheduleId}
                    className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                  >
                    <p className="font-medium text-gray-900">
                      {assignment.studentName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {assignment.subjectName} - Period {assignment.periodNumber}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {new Date(assignment.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {urgentAssignments.length === 0 && upcomingAssignments.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                All Caught Up!
              </p>
              <p className="text-xs text-gray-500">
                No pending assignments at the moment
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <Button
            onClick={() => navigate("/teacher/pending-assignments")}
            className="w-full"
            size="sm"
          >
            View All Assignments
          </Button>
        </div>
      </Card>
    </div>
  );
}
