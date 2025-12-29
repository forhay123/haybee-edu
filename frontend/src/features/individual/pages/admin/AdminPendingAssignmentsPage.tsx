// frontend/src/features/individual/pages/admin/AdminPendingAssignmentsPage.tsx

import { useState } from "react";
import { PendingAssignmentsStats } from "../../components/admin/PendingAssignmentsStats";
import { PendingAssignmentsFilters } from "../../components/admin/PendingAssignmentsFilters";
import { PendingAssignmentsTable } from "../../components/admin/PendingAssignmentsTable";
import { AssignTopicModal } from "../../components/admin/AssignTopicModal";
import { BulkAssignTopicModal } from "../../components/admin/BulkAssignTopicModal";
import {
  usePendingAssignmentsWithAnalytics,
  usePendingAssignmentsSummary,
} from "../../hooks/admin/useMissingTopicAssignment";
import { useGetSubjects } from "../../../subjects/hooks/useSubjects";
import { useStudentProfiles } from "../../../studentProfiles/hooks/useStudentProfiles";
import type {
  PendingAssignmentsFilter,
  PendingAssignmentDto,
} from "../../types/assignmentTypes";

export default function AdminPendingAssignmentsPage() {
  const [filters, setFilters] = useState<PendingAssignmentsFilter>({});
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<PendingAssignmentDto | null>(null);

  // Fetch data
  const { assignments, analytics, isLoading: assignmentsLoading } =
    usePendingAssignmentsWithAnalytics(filters);
  
  const { data: summary, isLoading: summaryLoading } =
    usePendingAssignmentsSummary();
  
  const { data: subjects = [] } = useGetSubjects({ enabled: true });
  const { studentProfilesQuery } = useStudentProfiles();
  const studentProfiles = studentProfilesQuery.data || [];

  const handleAssignClick = (assignment: PendingAssignmentDto) => {
    setSelectedAssignment(assignment);
    setAssignModalOpen(true);
  };

  const handleBulkAssignClick = () => {
    setBulkAssignModalOpen(true);
  };

  const handleAssignmentComplete = () => {
    setAssignModalOpen(false);
    setBulkAssignModalOpen(false);
    setSelectedAssignment(null);
    setSelectedIds([]);
  };

  const subjectsForFilter = subjects.map((s: any) => ({
    id: s.id,
    name: s.name || s.subjectName,
  }));

  const studentsForFilter = studentProfiles.map((sp: any) => ({
    id: sp.id,
    name: sp.fullName || `${sp.firstName || ''} ${sp.lastName || ''}`.trim() || 'Unknown',
  }));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pending Topic Assignments</h1>
          <p className="text-gray-600 mt-1">
            Manage and assign lesson topics to student schedules
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {summary && (
        <PendingAssignmentsStats
          totalPending={summary.totalPending}
          bySubject={summary.bySubject}
          byWeek={summary.byWeek}
          byStudent={summary.byStudent}
          urgentCount={summary.urgentCount}
          withSuggestionsCount={summary.withSuggestionsCount}
          isLoading={summaryLoading}
        />
      )}

      {/* Filters */}
      <PendingAssignmentsFilters
        filters={filters}
        onFiltersChange={setFilters}
        subjects={subjectsForFilter}
        students={studentsForFilter}
      />

      {/* Assignments Table */}
      <PendingAssignmentsTable
        assignments={assignments || []}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onAssignClick={handleAssignClick}
        onBulkAssignClick={handleBulkAssignClick}
        isLoading={assignmentsLoading}
      />

      {/* Analytics Summary (Optional) */}
      {analytics && assignments && assignments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Showing:</span> {assignments.length}{" "}
            assignments
          </div>
          <div>
            <span className="font-medium">Urgent:</span> {analytics.urgent.length}
          </div>
          <div>
            <span className="font-medium">Avg Days Pending:</span>{" "}
            {analytics.avgDaysPending.toFixed(1)}
          </div>
          <div>
            <span className="font-medium">With Conflicts:</span>{" "}
            {analytics.withConflicts}
          </div>
        </div>
      )}

      {/* Assignment Modals */}
      <AssignTopicModal 
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        assignment={selectedAssignment}
        onSuccess={handleAssignmentComplete}
      />

      <BulkAssignTopicModal
        open={bulkAssignModalOpen}
        onClose={() => setBulkAssignModalOpen(false)}
        scheduleIds={selectedIds}
        assignments={assignments?.filter(a => selectedIds.includes(a.scheduleId))}
        onSuccess={handleAssignmentComplete}
      />
    </div>
  );
}