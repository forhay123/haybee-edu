// src/features/lessons/pages/SubjectLessonsPage.tsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLessonTopics } from "../hooks/useLessonTopics";
import { useGetSubject } from "../../subjects/api/subjectsApi";

const SubjectLessonsPage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const numericSubjectId = Number(subjectId);

  const { getAll: lessonsQuery } = useLessonTopics(numericSubjectId);
  const { data: subject } = useGetSubject(numericSubjectId);

  if (!subjectId || isNaN(numericSubjectId)) {
    return (
      <div className="p-6">
        <p className="text-red-600">Invalid subject ID</p>
      </div>
    );
  }

  if (lessonsQuery.isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading lessons...</p>
          </div>
        </div>
      </div>
    );
  }

  if (lessonsQuery.isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">Failed to load lessons.</p>
          <p className="text-red-500 text-sm mt-1">
            {lessonsQuery.error?.message || "Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  const lessons = lessonsQuery.data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:underline mb-2 flex items-center gap-2"
          >
            ← Back to Subjects
          </button>
          <h1 className="text-2xl font-bold text-foreground">
            {subject?.name || "Subject"} - Lesson Topics
          </h1>
          <p className="text-muted-foreground mt-1">
            {lessons.length} lesson{lessons.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>

      {/* Lessons List */}
      {lessons.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-600 font-medium">No lessons available yet.</p>
          <p className="text-blue-500 text-sm mt-1">
            Lessons will appear here once your teacher uploads them.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="bg-card rounded-2xl shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-semibold text-foreground">
                  Week {lesson.weekNumber}: {lesson.topicTitle}
                </h3>
                {lesson.isAspirantMaterial && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Aspirant
                  </span>
                )}
              </div>

              {lesson.description && (
                <p className="text-sm text-muted-foreground mb-3">{lesson.description}</p>
              )}

              {/* AI Status Badge */}
              {lesson.status === "done" && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    ✅ AI Processed
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lesson.questionCount || 0} questions
                  </span>
                </div>
              )}
              {lesson.status === "processing" && (
                <div className="mb-3">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    🔄 Processing... {lesson.progress || 0}%
                  </span>
                </div>
              )}
              {lesson.status === "failed" && (
                <div className="mb-3">
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    ❌ Processing Failed
                  </span>
                </div>
              )}

              {/* View Questions Button */}
              {lesson.status === "done" && (lesson.questionCount || 0) > 0 && (
                <button
                  onClick={() =>
                    navigate(`/subjects/${subjectId}/lessons/${lesson.id}/questions`)
                  }
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  📝 View Questions ({lesson.questionCount})
                </button>
              )}

              {/* View Material Button */}
              {lesson.fileUrl && (
                <button
                  onClick={() => window.open(lesson.fileUrl, "_blank")}
                  className="w-full mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  📄 View Material
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectLessonsPage;