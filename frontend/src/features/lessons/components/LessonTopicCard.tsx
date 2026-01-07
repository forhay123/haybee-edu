import React, { useState, useEffect } from "react";
import { LessonTopicDto } from "../types/lessonTopicTypes";
import api from "../../../api/axios";
import { useAuth } from "../../auth/useAuth";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";

interface LessonTopicCardProps {
  topic: LessonTopicDto;
  onDeleted?: () => void;
  onRegenerated?: () => void;
  viewMode?: "admin" | "student";
}

const LessonTopicCard: React.FC<LessonTopicCardProps> = ({
  topic,
  onDeleted,
  onRegenerated,
  viewMode = "admin",
}) => {
  const { accessToken, refreshAccessToken } = useAuth();
  const user = useSelector((state: RootState) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<LessonTopicDto["status"]>(topic.status || "pending");
  const [aiProgress, setAiProgress] = useState(topic.progress || 0);
  const navigate = useNavigate();

  // Determine view mode from user role if not explicitly set
  const isStudent = user?.roles.includes("STUDENT");
  const isTeacher = user?.roles.includes("TEACHER");
  const effectiveViewMode = viewMode === "student" || isStudent ? "student" : "admin";

  // Poll AI status periodically if processing (admin only)
  useEffect(() => {
    if (effectiveViewMode === "student" || aiStatus !== "processing") return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const token = accessToken || (await refreshAccessToken());
        const { data } = await api.get(`/lesson-topics/${topic.id}/ai-status`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isMounted) return;

        setAiStatus(data.status);
        setAiProgress(data.progress ?? 0);

        if (data.status === "done" || data.status === "failed") {
          clearInterval(interval);
          onRegenerated?.();
        }
      } catch (err) {
        console.error("Polling AI status failed", err);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [aiStatus, topic.id, accessToken, refreshAccessToken, onRegenerated, effectiveViewMode]);

  const handleViewMaterial = () => {
    if (!topic.fileUrl) return alert("No file available for this lesson");
    
    // ✅ S3 URLs are public - just open them directly
    window.open(topic.fileUrl, "_blank");
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `🗑️ Delete "${topic.topicTitle}"?\n\nThis will remove:\n• The lesson material\n• All AI-generated questions\n• All student progress\n\nThis action cannot be undone.`
      )
    )
      return;
    setLoading(true);
    try {
      const token = accessToken || (await refreshAccessToken());
      await api.delete(`/lesson-topics/${topic.id}`, { headers: { Authorization: `Bearer ${token}` } });
      onDeleted?.();
    } catch (err: any) {
      console.error(err);
      alert("❌ Failed to delete lesson: " + (err.response?.data || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateAI = async () => {
    if (
      !window.confirm(
        `🔄 Regenerate AI for "${topic.topicTitle}"?\n\nThis will:\n• Delete existing questions\n• Re-process the lesson material\n• Generate new questions\n\nContinue?`
      )
    )
      return;
    setLoading(true);
    try {
      const token = accessToken || (await refreshAccessToken());
      await api.post(`/lesson-topics/${topic.id}/regenerate-ai`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAiStatus("processing");
      setAiProgress(0);
    } catch (err: any) {
      console.error(err);
      alert("❌ Failed to regenerate AI: " + (err.response?.data || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuestions = () => {
    if (!topic.subjectId) return alert("Subject ID not available");
    navigate(`/subjects/${topic.subjectId}/lessons/${topic.id}/questions`);
  };

  const handleCreateAssessment = () => {
    navigate(`/teacher/lessons/${topic.id}/create-assessment`);
  };

  // Status badge styling (simpler for students)
  const getStatusBadge = () => {
    if (effectiveViewMode === "student") {
      // Students see simpler status
      if (aiStatus === "done" && (topic.questionCount || 0) > 0) {
        return (
          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 px-3 py-1 rounded-full font-medium">
            ✅ {topic.questionCount} question{topic.questionCount !== 1 ? "s" : ""} available
          </span>
        );
      }
      return null; // Hide status for students if not ready
    }

    // Admin sees detailed status
    switch (aiStatus) {
      case "processing":
        return (
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Processing {aiProgress}%</span>
          </div>
        );
      case "done":
        return (
          <div className="flex items-center gap-2">
            <span className="text-green-500 text-xl">✅</span>
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">
              {topic.questionCount || 0} questions ready
            </span>
          </div>
        );
      case "failed":
        return (
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-xl">❌</span>
            <span className="text-sm text-red-700 dark:text-red-300 font-medium">Processing failed</span>
          </div>
        );
      default:
        return (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
            ⏳ Pending
          </span>
        );
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
            Week {topic.weekNumber}: {topic.topicTitle}
          </h3>
          {topic.description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{topic.description}</p>}
        </div>
        {topic.isAspirantMaterial && (
          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded font-medium">
            🎯 Aspirant
          </span>
        )}
      </div>

      {/* AI Status */}
      {getStatusBadge() && <div className="mb-3">{getStatusBadge()}</div>}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        {/* ✅ STUDENT VIEW: Practice Questions FIRST, then Material */}
        {effectiveViewMode === "student" ? (
          <>
            {/* View Questions - Navigate to Assessment Page */}
            {aiStatus === "done" && (topic.questionCount || 0) > 0 && (
              <button
                onClick={() => navigate(`/subjects/${topic.subjectId}/lessons/${topic.id}/assessment`)}
                className="w-full text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium shadow-md"
              >
                📝 Take Assessment ({topic.questionCount} questions)
              </button>
            )}

            {/* View Material - SECONDARY ACTION */}
            {topic.fileUrl && (
              <button
                onClick={handleViewMaterial}
                className="w-full text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                📄 View Lesson Material
              </button>
            )}

            {/* Show message if no questions yet */}
            {aiStatus !== "done" && topic.fileUrl && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-1">⏳ Questions being generated...</p>
            )}
          </>
        ) : (
          /* ✅ ADMIN/TEACHER VIEW: All management actions */
          <div className="flex flex-wrap gap-2">
            {topic.fileUrl && (
              <button
                onClick={handleViewMaterial}
                className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
              >
                📄 View Material
              </button>
            )}

            {aiStatus === "done" && (topic.questionCount || 0) > 0 && (
              <button
                onClick={handleViewQuestions}
                className="text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition"
              >
                📝 View Questions
              </button>
            )}

            {/* ✅ NEW: Create Assessment Button (Teachers only) */}
            {isTeacher && (
              <button
                onClick={handleCreateAssessment}
                className="text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1.5 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition font-medium"
              >
                ➕ Create Assessment
              </button>
            )}

            <button
              onClick={handleRegenerateAI}
              disabled={loading || aiStatus === "processing"}
              className="text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 Regenerate AI
            </button>

            <button
              onClick={handleDelete}
              disabled={loading}
              className="text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1.5 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50"
            >
              🗑️ Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonTopicCard;