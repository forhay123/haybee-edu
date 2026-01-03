// frontend/src/features/individual/pages/admin/AdminIndividualTimetablesPage.tsx

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  useAdminTimetablesWithPolling,
  useAdminBulkDelete,
  useAdminSystemStats,
  useAdminTimetableFilters,
  useAdminReprocess,
} from "../../hooks/admin/useAdminTimetables";
import { useAuth } from "../../../auth/useAuth";
import { isAdmin as checkIsAdmin } from "../../../auth/authHelpers";
import TimetableListTable from "../../components/admin/TimetableListTable";
import BulkActionsToolbar from "../../components/admin/BulkActionsToolbar";
import SystemStatsCards from "../../components/admin/SystemStatsCards";
import { ProcessingStatus } from "../../types/individualTypes";
import axiosInstance from "@/api/axios";
import { useMultipleStudentHealth } from "../../hooks/admin/useStudentHealth"; // ✅ NEW

// ✅ Interface for repair result
interface StudentRepairResultData {
  success: boolean;
  message: string;
  studentId: number;
  studentName: string;
  weeksProcessed: number;
  step0_assessmentsCleared: number;
  step1_orphanedLinked: number;
  step2_progressLinked: number;
  step3_progressCreated: number;
  step4_submissionsLinked: number;
  step5_windowsFixed: number;
  step6_metadataSet: number;
  validation: {
    allGood: boolean;
    remainingOrphaned: number;
    remainingNoAssessment: number;
    remainingNoWindows: number;
    remainingNoMetadata: number;
    remainingUnlinkedSubmissions: number;
  };
  fullyFixed: boolean;
}

/**
 * Admin page to view and manage ALL student timetables system-wide
 */
const AdminIndividualTimetablesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ============================================================
  // PERMISSION CHECK
  // ============================================================
  const isAdminUser = checkIsAdmin(user);

  if (!isAdminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You do not have permission to view this page.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // STATE
  // ============================================================
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProcessingStatus | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ✅ Repair state
  const [repairResult, setRepairResult] = useState<StudentRepairResultData | null>(null);
  const [repairingStudentId, setRepairingStudentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // DATA FETCHING
  // ============================================================
  const {
    timetables: allTimetables,
    isLoading,
    error: fetchError,
    processingCount,
    failedCount,
    completedCount,
    totalCount,
  } = useAdminTimetablesWithPolling();

  const { data: systemStats, isLoading: statsLoading } = useAdminSystemStats();

  const { applyFilters } = useAdminTimetableFilters();

  // ============================================================
  // MUTATIONS
  // ============================================================
  const bulkDeleteMutation = useAdminBulkDelete();
  const reprocessMutation = useAdminReprocess();

  // ============================================================
  // FILTERED DATA
  // ============================================================
  const filteredTimetables = useMemo(() => {
    return applyFilters(allTimetables, {
      status: statusFilter,
      searchQuery,
      dateFrom,
      dateTo,
    });
  }, [allTimetables, statusFilter, searchQuery, dateFrom, dateTo, applyFilters]);

  // ✅ NEW: Fetch health status for all students
  const studentIds = useMemo(
    () => filteredTimetables.map((t) => t.studentProfileId),
    [filteredTimetables]
  );

  const { data: studentHealthMap } = useMultipleStudentHealth(studentIds);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedIds(filteredTimetables.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.error("No timetables selected");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.length} timetable${
        selectedIds.length > 1 ? "s" : ""
      }? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await bulkDeleteMutation.mutateAsync(selectedIds);
      setSelectedIds([]);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this timetable? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      await bulkDeleteMutation.mutateAsync([id]);
      toast.success("Timetable deleted successfully");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleReprocess = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to reprocess this timetable? This will queue it for re-extraction."
    );

    if (!confirmed) return;

    try {
      await reprocessMutation.mutateAsync(id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // ✅ Repair handler
  const handleRepair = async (studentId: number, studentName: string) => {
    const confirmed = window.confirm(
      `Repair all schedules for ${studentName}?\n\n` +
      `This will:\n` +
      `- Fix all weeks where this student has schedules\n` +
      `- Link orphaned progress records\n` +
      `- Link assessments\n` +
      `- Create missing progress records\n` +
      `- Link submissions\n` +
      `- Fix assessment windows\n` +
      `- Set multi-period metadata\n\n` +
      `This will NOT affect other students.`
    );

    if (!confirmed) return;

    setRepairingStudentId(studentId);
    setRepairResult(null);
    setError(null);

    try {
      const response = await axiosInstance.post<StudentRepairResultData>(
        `/admin/maintenance/progress/complete-fix/student/${studentId}`
      );

      if (response.data.success) {
        setRepairResult(response.data);
        toast.success(`Successfully repaired schedules for ${studentName}!`);
      } else {
        setError(`Repair failed: ${response.data.message || 'Unknown error'}`);
        toast.error(`Failed to repair schedules for ${studentName}`);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
      setError(`Failed to repair schedules: ${errorMsg}`);
      toast.error(`Failed to repair schedules: ${errorMsg}`);
    } finally {
      setRepairingStudentId(null);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleView = (timetableId: number) => {
    navigate(`/admin/individual/timetables/${timetableId}`);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setDateFrom("");
    setDateTo("");
  };

  // ============================================================
  // RENDER: LOADING STATE
  // ============================================================
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timetables...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: ERROR STATE
  // ============================================================
  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Error Loading Data
          </h1>
          <p className="text-gray-600 mb-4">
            {fetchError instanceof Error ? fetchError.message : "An error occurred"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: MAIN UI
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Individual Student Timetables
          </h1>
          <p className="text-gray-600">
            Manage and monitor all individual student timetable uploads system-wide
          </p>
        </div>

        {/* System Stats Cards */}
        <div className="mb-8">
          <SystemStatsCards
            stats={systemStats}
            isLoading={statsLoading}
            processingCount={processingCount}
            failedCount={failedCount}
            completedCount={completedCount}
            totalCount={totalCount}
          />
        </div>

        {/* ✅ Repair Result Display */}
        {repairResult && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Repair Complete for {repairResult.studentName}
              </h3>
              <button
                onClick={() => setRepairResult(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className={`p-4 rounded-lg ${
              repairResult.fullyFixed 
                ? "bg-green-50 border border-green-200" 
                : "bg-amber-50 border border-amber-200"
            }`}>
              <div className="flex items-center gap-2 mb-4">
                {repairResult.fullyFixed ? (
                  <>
                    <span className="text-2xl">✅</span>
                    <span className="font-semibold text-green-800">
                      All issues resolved!
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">⚠️</span>
                    <span className="font-semibold text-amber-800">
                      Mostly fixed - some issues remain
                    </span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-xs text-gray-600">Weeks Processed</div>
                  <div className="text-xl font-bold text-blue-600">
                    {repairResult.weeksProcessed}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-xs text-gray-600">Orphaned Linked</div>
                  <div className="text-xl font-bold text-green-600">
                    {repairResult.step1_orphanedLinked}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-xs text-gray-600">Progress Created</div>
                  <div className="text-xl font-bold text-blue-600">
                    {repairResult.step3_progressCreated}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <div className="text-xs text-gray-600">Submissions Linked</div>
                  <div className="text-xl font-bold text-purple-600">
                    {repairResult.step4_submissionsLinked}
                  </div>
                </div>
              </div>

              {!repairResult.fullyFixed && repairResult.validation && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Remaining Issues:
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {repairResult.validation.remainingOrphaned > 0 && (
                      <div className="text-red-600">
                        • {repairResult.validation.remainingOrphaned} orphaned records
                      </div>
                    )}
                    {repairResult.validation.remainingNoAssessment > 0 && (
                      <div className="text-red-600">
                        • {repairResult.validation.remainingNoAssessment} missing assessments
                      </div>
                    )}
                    {repairResult.validation.remainingNoWindows > 0 && (
                      <div className="text-red-600">
                        • {repairResult.validation.remainingNoWindows} missing windows
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">❌</span>
              <span className="text-red-800 font-semibold">{error}</span>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Student name or filename..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ProcessingStatus | "ALL")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            {/* Date From */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date To */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Reset
            </button>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredTimetables.length} of {totalCount} timetables
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedIds.length > 0 && (
          <div className="mb-6">
            <BulkActionsToolbar
              selectedCount={selectedIds.length}
              onDelete={handleBulkDelete}
              onClearSelection={handleClearSelection}
              isDeleting={bulkDeleteMutation.isPending}
            />
          </div>
        )}

        {/* Timetables Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <TimetableListTable
            timetables={filteredTimetables}
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onSelect={handleSelect}
            onView={handleView}
            onDelete={handleDelete}
            onReprocess={handleReprocess}
            onRepair={handleRepair}
            studentHealthMap={studentHealthMap} {/* ✅ NEW: Pass health data */}
          />
        </div>

        {/* Empty State */}
        {filteredTimetables.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No timetables found
            </h3>
            <p className="text-gray-600">
              {searchQuery || statusFilter !== "ALL"
                ? "Try adjusting your filters"
                : "No students have uploaded timetables yet"}
            </p>
          </div>
        )}

        {/* Auto-refresh indicator */}
        {processingCount > 0 && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span className="text-sm">
              Auto-refreshing ({processingCount} processing)
            </span>
          </div>
        )}

        {/* ✅ Loading indicator for repair */}
        {repairingStudentId && (
          <div className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span className="text-sm">Repairing schedules...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminIndividualTimetablesPage;