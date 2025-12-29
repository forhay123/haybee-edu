import React, { useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import TimetableUpload from "../../components/TimetableUpload";
import SchemeUpload from "../../components/SchemeUpload";
import { useMyProfile } from "../../../studentProfiles/hooks/useStudentProfiles";
import { useStudentProcessingStatus } from "../../hooks/useProcessingStatus";
import { LiveProcessingIndicator } from "../../components/ProcessingStatusIndicator";
import { useAuth } from "../../../auth/useAuth";
import { isAdmin as checkIsAdmin } from "../../../auth/authHelpers";
import { Button } from "@/components/ui/button";

const IndividualUploadsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"timetable" | "scheme">("timetable");

  const { data: profile, isLoading, error } = useMyProfile();
  const { user } = useAuth();
  const isAdmin = checkIsAdmin(user);

  const { overview, hasProcessingItems, totalProcessing } = useStudentProcessingStatus(
    profile?.id || null
  );

  // Removed delete state and handlers here

  // ▶ Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // ▶ Error state
  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2 text-center">
            Error Loading Profile
          </h2>
          <p className="text-red-700 text-center">
            {error?.message || "Unable to load your student profile"}
          </p>
        </div>
      </div>
    );
  }

  // ▶ Restrict to INDIVIDUAL students only
  if (profile.studentType !== "INDIVIDUAL") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-yellow-900 mb-2 text-center">
            Access Restricted
          </h2>
          <p className="text-yellow-700 text-center">
            This feature is only available for INDIVIDUAL students.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Upload Learning Materials
            </h1>
            <p className="text-gray-600">
              Upload your timetable and scheme of work to generate your personalized learning schedule.
            </p>
          </div>

          {hasProcessingItems && (
            <div className="ml-4 flex-shrink-0">
              <LiveProcessingIndicator count={totalProcessing} />
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Upload className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">How it works</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>📅 <strong>Timetable:</strong> Upload your weekly schedule</li>
              <li>📚 <strong>Scheme of Work:</strong> Upload subject schemes</li>
              <li>🤖 AI processes files automatically</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("timetable")}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              activeTab === "timetable"
                ? "bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" /> Timetable
            </div>
          </button>

          <button
            onClick={() => setActiveTab("scheme")}
            className={`flex-1 px-6 py-4 text-sm font-medium ${
              activeTab === "scheme"
                ? "bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5" /> Scheme of Work
            </div>
          </button>
        </div>

        {/* Upload Components */}
        <div className="p-6">
          {activeTab === "timetable" ? (
            <TimetableUpload studentProfileId={profile.id!} isAdmin={isAdmin} />
          ) : (
            <SchemeUpload studentProfileId={profile.id!} />
          )}
        </div>
      </div>

      {/* Uploaded Files Overview */}
      {overview && (
        <div className="space-y-6">
          {/* Timetables */}
          {overview.timetables?.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Uploaded Timetables</h3>
              {overview.timetables.map((t) => (
                <div
                  key={t.id}
                  className="flex justify-between items-center p-4 border rounded-lg mb-3"
                >
                  <div>
                    <p className="font-medium">{t.originalFilename}</p>
                    <p className="text-sm text-gray-600">
                      Uploaded: {new Date(t.uploadedAt).toLocaleDateString()}
                    </p>

                    <span
                      className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                        t.processingStatus === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : t.processingStatus === "PROCESSING"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {t.processingStatus}
                    </span>
                  </div>

                  {/* Removed delete button */}
                </div>
              ))}
            </div>
          )}

          {/* Schemes */}
          {overview.schemes?.length > 0 && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Uploaded Schemes</h3>
              {overview.schemes.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between items-center p-4 border rounded-lg mb-3"
                >
                  <div>
                    <p className="font-medium">{s.originalFilename}</p>
                    <p className="text-sm text-gray-600">
                      Subject: {s.subjectName || "Not set"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Uploaded: {new Date(s.uploadedAt).toLocaleDateString()}
                    </p>

                    <span
                      className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                        s.processingStatus === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : s.processingStatus === "PROCESSING"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {s.processingStatus}
                    </span>
                  </div>

                  {/* Removed delete button */}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Removed delete confirmation modal */}

      {/* Help Section */}
      <div className="bg-gray-50 border rounded-lg p-6 mt-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-gray-600" /> Need Help?
        </h3>
        <p className="text-sm text-gray-600">
          Accepted formats: PDF, Excel, Word, JPG, PNG (max 10MB)
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Timetable deletion: Only admins can delete timetables.
        </p>
      </div>
    </div>
  );
};

export default IndividualUploadsPage;
