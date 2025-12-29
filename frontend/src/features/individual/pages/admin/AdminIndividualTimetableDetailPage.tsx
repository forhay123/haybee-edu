// frontend/src/features/individual/pages/admin/AdminIndividualTimetableDetailPage.tsx

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { timetableApi } from "../../api/individualApi";
import {
  useAdminReprocess,
  useAdminBulkDelete,
} from "../../hooks/admin/useAdminTimetables";
import { useWeeklySchedule, useWeeklyScheduleStats } from "../../hooks/useIndividualSchedule";
import { useAuth } from "../../../auth/useAuth";
import { isAdmin as checkIsAdmin } from "../../../auth/authHelpers";
import TimetableDetailView from "../../components/admin/TimetableDetailView";
import SubjectMappingEditor from "../../components/admin/SubjectMappingEditor";
import WeeklyScheduleDisplay from "../../components/WeeklyScheduleDisplay";
import { ProcessingStatusIndicator } from "../../components/ProcessingStatusIndicator";
import {
  formatFileSize,
  getStatusBadgeProps,
  formatConfidenceScore,
} from "../../types/individualTypes";

/**
 * Admin page for detailed view of a single timetable with editing capabilities
 */
const AdminIndividualTimetableDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const timetableId = id ? parseInt(id, 10) : null;

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
  const [showMappingEditor, setShowMappingEditor] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedule" | "raw">("schedule");

  // ============================================================
  // DATA FETCHING
  // ============================================================
  const {
    data: timetable,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["timetable", timetableId],
    queryFn: () => timetableApi.getById(timetableId!),
    enabled: !!timetableId,
    refetchInterval: (data) => {
      return data?.processingStatus === "PROCESSING" ||
        data?.processingStatus === "PENDING"
        ? 5000
        : false;
    },
  });

  // Fetch weekly schedule for the student
  const {
    weeklySchedule,
    isLoading: scheduleLoading,
  } = useWeeklySchedule(timetable?.studentProfileId || 0);

  const scheduleStats = useWeeklyScheduleStats(weeklySchedule);

  // ============================================================
  // MUTATIONS
  // ============================================================
  const reprocessMutation = useAdminReprocess();
  const deleteMutation = useAdminBulkDelete();

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleReprocess = async () => {
    if (!timetableId) return;

    const confirmed = window.confirm(
      "Are you sure you want to reprocess this timetable? This will queue it for re-extraction."
    );

    if (!confirmed) return;

    try {
      await reprocessMutation.mutateAsync(timetableId);
      refetch();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!timetableId) return;

    try {
      await deleteMutation.mutateAsync([timetableId]);
      toast.success("Timetable deleted successfully");
      navigate("/admin/individual/timetables");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleBack = () => {
    navigate("/admin/individual/timetables");
  };

  const handleDownload = () => {
    if (!timetable?.fileUrl) {
      toast.error("File URL not available");
      return;
    }

    window.open(timetable.fileUrl, "_blank");
  };

  // ============================================================
  // RENDER: LOADING STATE
  // ============================================================
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timetable details...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: ERROR STATE
  // ============================================================
  if (error || !timetable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Timetable Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            {error instanceof Error
              ? error.message
              : "The requested timetable could not be found"}
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // STATUS BADGE
  // ============================================================
  const statusProps = getStatusBadgeProps(timetable.processingStatus);

  // ============================================================
  // RENDER: MAIN UI
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <span className="mr-2">←</span>
            Back to All Timetables
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Timetable Details
              </h1>
              <p className="text-gray-600">
                Uploaded by {timetable.studentName} •{" "}
                {new Date(timetable.uploadedAt).toLocaleDateString()}
              </p>
            </div>

            {/* Status Badge */}
            <div
              className={`px-4 py-2 rounded-full text-sm font-medium ${statusProps.bgClass} ${statusProps.textClass}`}
            >
              <span className="mr-2">{statusProps.icon}</span>
              {statusProps.text}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details & Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* File Information Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                File Information
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Filename
                  </label>
                  <p className="text-sm text-gray-900 break-all">
                    {timetable.originalFilename}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    File Type
                  </label>
                  <p className="text-sm text-gray-900">{timetable.fileType}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    File Size
                  </label>
                  <p className="text-sm text-gray-900">
                    {formatFileSize(timetable.fileSizeBytes)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Uploaded At
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(timetable.uploadedAt).toLocaleString()}
                  </p>
                </div>

                {timetable.processedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Processed At
                    </label>
                    <p className="text-sm text-gray-900">
                      {new Date(timetable.processedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {timetable.termName && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Term
                    </label>
                    <p className="text-sm text-gray-900">
                      {timetable.termName}
                    </p>
                  </div>
                )}

                {timetable.academicYear && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Academic Year
                    </label>
                    <p className="text-sm text-gray-900">
                      {timetable.academicYear}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleDownload}
                className="w-full mt-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center justify-center"
              >
                <span className="mr-2">📥</span>
                Download Original File
              </button>
            </div>

            {/* Processing Statistics Card */}
            {timetable.processingStatus === "COMPLETED" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Processing Statistics
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Periods Extracted
                    </label>
                    <p className="text-2xl font-bold text-gray-900">
                      {timetable.totalPeriodsExtracted || 0}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Subjects Identified
                    </label>
                    <p className="text-2xl font-bold text-gray-900">
                      {timetable.subjectsIdentified || 0}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Confidence Score
                    </label>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatConfidenceScore(timetable.confidenceScore)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Statistics Card */}
            {timetable.processingStatus === "COMPLETED" && weeklySchedule.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Weekly Schedule Stats
                </h2>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Total Periods
                    </label>
                    <p className="text-2xl font-bold text-gray-900">
                      {scheduleStats.totalPeriods}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Completion Rate
                    </label>
                    <p className="text-2xl font-bold text-gray-900">
                      {scheduleStats.completionRate.toFixed(0)}%
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Days with Classes
                    </label>
                    <p className="text-2xl font-bold text-gray-900">
                      {scheduleStats.daysWithClasses}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Actions
              </h2>

              <div className="space-y-3">
                {/* Reprocess Button */}
                {timetable.processingStatus === "FAILED" && (
                  <button
                    onClick={handleReprocess}
                    disabled={reprocessMutation.isPending}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reprocessMutation.isPending
                      ? "Reprocessing..."
                      : "🔄 Reprocess Timetable"}
                  </button>
                )}

                {/* Edit Mappings Button */}
                {timetable.processingStatus === "COMPLETED" && (
                  <button
                    onClick={() => setShowMappingEditor(!showMappingEditor)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {showMappingEditor
                      ? "Close Mapping Editor"
                      : "✏️ Edit Subject Mappings"}
                  </button>
                )}

                {/* Delete Button */}
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={deleteMutation.isPending}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteMutation.isPending
                    ? "Deleting..."
                    : "🗑️ Delete Timetable"}
                </button>
              </div>
            </div>

            {/* Error Card */}
            {timetable.processingError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-red-800 mb-2">
                  Processing Error
                </h3>
                <p className="text-sm text-red-700">
                  {timetable.processingError}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Timetable Content */}
          <div className="lg:col-span-2">
            {timetable.processingStatus === "COMPLETED" && (
              <>
                {showMappingEditor ? (
                  <SubjectMappingEditor
                    timetableId={timetable.id}
                    onClose={() => setShowMappingEditor(false)}
                  />
                ) : (
                  <>
                    {/* Tab Navigation */}
                    <div className="bg-white rounded-t-lg shadow-sm border border-gray-200 border-b-0">
                      <div className="flex border-b border-gray-200">
                        <button
                          onClick={() => setActiveTab("schedule")}
                          className={`px-6 py-3 font-medium text-sm transition-colors ${
                            activeTab === "schedule"
                              ? "border-b-2 border-indigo-600 text-indigo-600"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          📅 Weekly Schedule
                        </button>
                        <button
                          onClick={() => setActiveTab("raw")}
                          className={`px-6 py-3 font-medium text-sm transition-colors ${
                            activeTab === "raw"
                              ? "border-b-2 border-indigo-600 text-indigo-600"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          📋 Raw Entries
                        </button>
                      </div>
                    </div>

                    {/* Tab Content */}
                    <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 p-6">
                      {activeTab === "schedule" ? (
                        scheduleLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                            <span className="ml-3 text-gray-600">Loading schedule...</span>
                          </div>
                        ) : (
                          <WeeklyScheduleDisplay studentProfileId={timetable.studentProfileId} />
                        )
                      ) : (
                        <TimetableDetailView timetableId={timetable.id} />
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {timetable.processingStatus === "PENDING" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <ProcessingStatusIndicator status="PENDING" />
                <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
                  Queued for Processing
                </h3>
                <p className="text-gray-600">
                  This timetable is in the processing queue and will be
                  extracted shortly.
                </p>
              </div>
            )}

            {timetable.processingStatus === "PROCESSING" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <ProcessingStatusIndicator status="PROCESSING" />
                <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">
                  Processing in Progress
                </h3>
                <p className="text-gray-600">
                  AI is currently extracting schedule data from this timetable.
                  This page will auto-refresh.
                </p>
              </div>
            )}

            {timetable.processingStatus === "FAILED" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-red-600 text-6xl mb-4">❌</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Processing Failed
                </h3>
                <p className="text-gray-600 mb-4">
                  An error occurred while processing this timetable. Click
                  "Reprocess" to try again.
                </p>
                {timetable.processingError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
                    <p className="text-sm text-red-700">
                      {timetable.processingError}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirm Delete
              </h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this timetable? This action
                cannot be undone and will also delete all associated schedule
                entries.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    handleDelete();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auto-refresh indicator */}
        {(timetable.processingStatus === "PROCESSING" ||
          timetable.processingStatus === "PENDING") && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span className="text-sm">Auto-refreshing...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminIndividualTimetableDetailPage;