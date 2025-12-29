// frontend/src/features/individual/components/TimetableUpload.tsx

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Trash2,
  Eye,
  X,
  Lock,
  GraduationCap,
} from "lucide-react";
import { timetableApi } from "../api/individualApi";
import { useFileDelete } from "../hooks/useFileUpload";
import type { IndividualTimetableDto } from "../types/individualTypes";
import { getStatusColor, formatFileSize } from "../types/individualTypes";
import TimetableEntriesDisplay from "./TimetableEntriesDisplay";
import { classesApi } from "../../classes/api/classesApi";
import SimpleTimetableUpload from "./SimpleTimetableUpload"; // ✅ Handles device detection internally

interface TimetableUploadProps {
  studentProfileId: number;
  isAdmin?: boolean;
}

export default function TimetableUpload({
  studentProfileId,
  isAdmin = false,
}: TimetableUploadProps) {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedTimetable, setSelectedTimetable] =
    useState<IndividualTimetableDto | null>(null);
  const [viewingEntries, setViewingEntries] = useState<number | null>(null);

  const { deleteTimetable } = useFileDelete();

  // Fetch INDIVIDUAL classes only
  const { data: allClasses = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ["individual-classes"],
    queryFn: () => classesApi.getAll(),
  });

  const individualClasses = allClasses.filter(
    (c) => c.studentType === "INDIVIDUAL"
  );

  const { data: timetables = [], refetch } = useQuery<IndividualTimetableDto[]>({
    queryKey: ["individual-timetables", studentProfileId],
    queryFn: () => timetableApi.getByStudent(studentProfileId),
    enabled: !!studentProfileId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || !Array.isArray(data)) return false;
      
      const hasProcessing = data.some(
        (t) => t.processingStatus === "PROCESSING" || t.processingStatus === "PENDING"
      );
      return hasProcessing ? 5000 : false;
    },
  });

  const hasExistingTimetable = timetables.length > 0;
  const canUpload = isAdmin || !hasExistingTimetable;

  // ✅ Callback handlers
  const handleUploadSuccess = (response: any) => {
    console.log("✅ Upload successful:", response);
    setSelectedClassId(null);
    refetch();
  };

  const handleUploadError = (error: string) => {
    console.error("❌ Upload failed:", error);
    // Error is already displayed in SimpleTimetableUpload component
  };

  const handleDelete = (id: number) => {
    if (!isAdmin) {
      alert("Only administrators can delete timetables.");
      return;
    }
    
    if (confirm("Are you sure you want to delete this timetable?")) {
      deleteTimetable.mutate(id, {
        onSuccess: () => refetch(),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Upload Timetable
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload your school timetable (PDF, Excel, or Image) to generate your
          personalized schedule
        </p>

        {/* Restriction Warning */}
        {!canUpload && !isAdmin && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 mb-1">
                  Timetable Already Uploaded
                </h4>
                <p className="text-sm text-amber-700">
                  You can only have one active timetable at a time. Contact an
                  administrator if you need to upload a new timetable.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* CLASS SELECTOR */}
        {canUpload && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <GraduationCap className="inline w-4 h-4 mr-1" />
              Select Your Class <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClassId || ""}
              onChange={(e) => setSelectedClassId(Number(e.target.value) || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoadingClasses}
            >
              <option value="">
                {isLoadingClasses
                  ? "Loading classes..."
                  : "Select your class for accurate subject mapping"}
              </option>
              {individualClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.level && `(${cls.level})`}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-blue-600">
              💡 Selecting your class helps us accurately identify subjects in your timetable
            </p>
            {individualClasses.length === 0 && !isLoadingClasses && (
              <p className="mt-1 text-xs text-amber-600">
                ⚠️ No INDIVIDUAL classes found. Please contact an administrator.
              </p>
            )}
          </div>
        )}

        {/* ✅ SimpleTimetableUpload handles everything (camera/file based on device) */}
        {canUpload && selectedClassId && (
          <SimpleTimetableUpload
            studentId={studentProfileId}
            classId={selectedClassId}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
        )}
      </div>

      {/* Uploaded Timetables List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Uploaded Timetables
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {timetables.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                No timetables uploaded yet
              </p>
              <p className="text-xs text-gray-500">
                Upload your first timetable to get started
              </p>
            </div>
          ) : (
            timetables.map((timetable) => (
              <div
                key={timetable.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {timetable.originalFilename}
                      </h4>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        {formatFileSize(timetable.fileSizeBytes)}
                      </span>
                      <span>•</span>
                      <span>{timetable.fileType}</span>
                      <span>•</span>
                      <span>
                        Uploaded{" "}
                        {new Date(timetable.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          timetable.processingStatus
                        )}`}
                      >
                        {timetable.processingStatus}
                      </span>
                    </div>
                    {timetable.processingStatus === "COMPLETED" && (
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                        <span>
                          📊 {timetable.totalPeriodsExtracted || 0} periods
                        </span>
                        <span>📚 {timetable.subjectsIdentified || 0} subjects</span>
                        {timetable.confidenceScore && (
                          <span>
                            ✅{" "}
                            {(timetable.confidenceScore * 100).toFixed(0)}% confidence
                          </span>
                        )}
                      </div>
                    )}
                    {timetable.processingStatus === "FAILED" && timetable.processingError && (
                      <div className="mt-2 text-xs text-red-600">
                        Error: {timetable.processingError}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {timetable.processingStatus === "COMPLETED" && (
                      <button
                        onClick={() => setViewingEntries(timetable.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="View entries"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedTimetable(timetable)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View details"
                    >
                      <FileText className="h-5 w-5" />
                    </button>
                    
                    {isAdmin ? (
                      <button
                        onClick={() => handleDelete(timetable.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete (Admin only)"
                        disabled={deleteTimetable.isPending}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          alert("Only administrators can delete timetables.")
                        }
                        className="p-2 text-gray-400 cursor-not-allowed rounded-lg"
                        title="Delete (Admin only)"
                      >
                        <Lock className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* View Entries Modal */}
      {viewingEntries && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingEntries(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">
                Timetable Entries
              </h3>
              <button
                onClick={() => setViewingEntries(null)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <TimetableEntriesDisplay timetableId={viewingEntries} />
            </div>
          </div>
        </div>
      )}

      {/* Timetable Details Modal */}
      {selectedTimetable && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTimetable(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Timetable Details
              </h3>
              <button
                onClick={() => setSelectedTimetable(null)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Filename</p>
                <p className="text-sm text-gray-900">{selectedTimetable.originalFilename}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    selectedTimetable.processingStatus
                  )}`}
                >
                  {selectedTimetable.processingStatus}
                </span>
              </div>
              {selectedTimetable.processingStatus === "COMPLETED" && (
                <>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Periods Extracted</p>
                    <p className="text-sm text-gray-900">{selectedTimetable.totalPeriodsExtracted || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Subjects Identified</p>
                    <p className="text-sm text-gray-900">{selectedTimetable.subjectsIdentified || 0}</p>
                  </div>
                  {selectedTimetable.confidenceScore && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Confidence Score</p>
                      <p className="text-sm text-gray-900">
                        {(selectedTimetable.confidenceScore * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              {selectedTimetable.processingStatus === "COMPLETED" && (
                <button
                  onClick={() => {
                    setSelectedTimetable(null);
                    setViewingEntries(selectedTimetable.id);
                  }}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                >
                  View Entries
                </button>
              )}
              <button
                onClick={() => setSelectedTimetable(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}