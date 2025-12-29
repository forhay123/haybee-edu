// frontend/src/features/individual/pages/teacher/TeacherPendingAssignmentsPage.tsx

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import {
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Filter,
} from "lucide-react";
import { MySubjectsTabs } from "../../components/teacher/MySubjectsTabs";
import { WeekNavigator } from "../../components/teacher/WeekNavigator";
import { PendingAssignmentsList } from "../../components/teacher/PendingAssignmentsList";
import { AssignTopicModal } from "../../components/admin/AssignTopicModal";
import { BulkAssignmentPanel } from "../../components/teacher/BulkAssignmentPanel";
import { useMyPendingAssignmentsWithSummary } from "../../hooks/teacher/usePendingAssignments";
import type { PendingAssignmentDto } from "../../types/assignmentTypes";

export default function TeacherPendingAssignmentsPage() {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [assignmentToEdit, setAssignmentToEdit] = useState<PendingAssignmentDto | null>(null);
  const [showBulkPanel, setShowBulkPanel] = useState(false);

  const {
    pending: assignments,
    summary,
    isLoading,
    error,
    refetch,
  } = useMyPendingAssignmentsWithSummary();

  // Safely handle assignments array
  const safeAssignments = Array.isArray(assignments) ? assignments : [];

  // Filter assignments by selected subject and week
  const filteredAssignments = safeAssignments.filter((assignment) => {
    if (selectedSubject && assignment.subjectId !== selectedSubject) {
      return false;
    }
    if (selectedWeek !== null && assignment.weekNumber !== selectedWeek) {
      return false;
    }
    return true;
  });

  const handleAssignSuccess = () => {
    setAssignmentToEdit(null);
    setSelectedIds([]);
    refetch();
  };

  const handleBulkAssignSuccess = () => {
    setShowBulkPanel(false);
    setSelectedIds([]);
    refetch();
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load pending assignments. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Create subject counts for tabs (subject name -> count)
  const subjectsWithCounts = summary?.bySubject?.reduce((acc, item) => {
    acc[item.subjectName] = item.count;
    return acc;
  }, {} as Record<string, number>) || {};

  // Create week counts for navigator
  const weeksWithCounts = summary?.byWeek?.reduce((acc, item) => {
    acc[item.weekNumber] = item.count;
    return acc;
  }, {} as Record<number, number>) || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Assign Lesson Topics
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Assign topics to your students' scheduled periods
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Pending</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">With Suggestions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.withSuggestionsCount}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Urgent</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.urgentCount}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Subjects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.bySubject?.length || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>

        {selectedSubject && (
          <Badge variant="secondary" className="gap-1">
            {summary?.bySubject?.find(s => s.subjectId === selectedSubject)?.subjectName || 'Subject'}
            <button
              onClick={() => setSelectedSubject(null)}
              className="ml-1 hover:text-gray-900"
            >
              ×
            </button>
          </Badge>
        )}

        {selectedWeek !== null && (
          <Badge variant="secondary" className="gap-1">
            Week {selectedWeek}
            <button
              onClick={() => setSelectedWeek(null)}
              className="ml-1 hover:text-gray-900"
            >
              ×
            </button>
          </Badge>
        )}

        {(selectedSubject || selectedWeek !== null) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedSubject(null);
              setSelectedWeek(null);
            }}
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Subject Tabs */}
      {summary && summary.bySubject && summary.bySubject.length > 0 && (
        <MySubjectsTabs
          subjectsWithCounts={subjectsWithCounts}
          selectedSubject={selectedSubject}
          onSubjectSelect={setSelectedSubject}
        />
      )}

      {/* Week Navigator */}
      {Object.keys(weeksWithCounts).length > 0 && (
        <WeekNavigator
          weeksWithCounts={weeksWithCounts}
          selectedWeek={selectedWeek}
          onWeekSelect={setSelectedWeek}
        />
      )}

      {/* Bulk Actions Panel */}
      {selectedIds.length > 0 && (
        <BulkAssignmentPanel
          selectedIds={selectedIds}
          assignments={filteredAssignments.filter((a) =>
            selectedIds.includes(a.scheduleId)
          )}
          onCancel={() => setSelectedIds([])}
          onSuccess={handleBulkAssignSuccess}
        />
      )}

      {/* Pending Assignments List */}
      <PendingAssignmentsList
        assignments={filteredAssignments}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onAssignClick={(assignment) => setAssignmentToEdit(assignment)}
        isLoading={isLoading}
      />

      {/* Assignment Modal */}
      <AssignTopicModal
        open={!!assignmentToEdit}
        onClose={() => setAssignmentToEdit(null)}
        assignment={assignmentToEdit}
        onSuccess={handleAssignSuccess}
      />

      {/* Empty State */}
      {!isLoading && filteredAssignments.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              All Caught Up!
            </h3>
            <p className="text-sm text-gray-500">
              {selectedSubject || selectedWeek !== null
                ? "No pending assignments match your filters"
                : "No pending topic assignments at the moment"}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}