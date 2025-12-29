// src/features/lessons/pages/TeacherLessonTopicsPage.tsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../../api/axios";
import { useAuth } from "../../auth/useAuth";
import LessonTopicCard from "../components/LessonTopicCard";
import LessonTopicForm from "../components/LessonTopicForm";
import { LessonTopicDto } from "../types/lessonTopicTypes";

const TeacherLessonTopicsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // ✅ Fetch teacher's subjects
  const { data: teacherSubjects, isLoading: loadingSubjects } = useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: async () => {
      const res = await api.get("/subjects/teacher/my-subjects");
      return res.data;
    },
  });

  // ✅ Fetch lessons for selected subject (or all if none selected)
  const { data: lessons, isLoading: loadingLessons, refetch } = useQuery<LessonTopicDto[]>({
    queryKey: ["teacher-lessons", selectedSubjectId],
    queryFn: async () => {
      const url = selectedSubjectId 
        ? `/lesson-topics?subjectId=${selectedSubjectId}`
        : "/lesson-topics";
      const res = await api.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!teacherSubjects,
  });

  // ✅ Filter lessons to only show teacher's subjects
  const filteredLessons = useMemo(() => {
    if (!lessons || !teacherSubjects) return [];
    
    const teacherSubjectIds = new Set(teacherSubjects.map((s: any) => s.id));
    return lessons.filter(lesson => teacherSubjectIds.has(lesson.subjectId));
  }, [lessons, teacherSubjects]);

  // ✅ Group lessons by subject
  const groupedLessons = useMemo(() => {
    return filteredLessons.reduce((acc, lesson) => {
      const subjectName = lesson.subjectName || `Subject ${lesson.subjectId}`;
      if (!acc[subjectName]) acc[subjectName] = [];
      acc[subjectName].push(lesson);
      return acc;
    }, {} as Record<string, typeof filteredLessons>);
  }, [filteredLessons]);

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    refetch();
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">
            You are not logged in.
          </p>
        </div>
      </div>
    );
  }

  if (loadingSubjects) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              📚 Lesson Topics Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload and manage lesson materials, AI questions, and assessments for your subjects
            </p>
          </div>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className={`px-6 py-3 rounded-lg font-medium transition shadow-lg ${
              showUploadForm
                ? "bg-gray-500 hover:bg-gray-600 text-white"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
            }`}
          >
            {showUploadForm ? "✖ Close Upload Form" : "📤 Upload New Lesson"}
          </button>
        </div>
      </div>

      {/* Upload Form (Collapsible) */}
      {showUploadForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-slideDown">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-2xl">📤</span>
            Upload New Lesson
          </h2>
          <LessonTopicForm
            onSuccess={handleUploadSuccess}
          />
        </div>
      )}

      {/* Subject Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Subject:
          </label>
          <select
            value={selectedSubjectId || "all"}
            onChange={(e) => setSelectedSubjectId(e.target.value === "all" ? null : Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Your Subjects ({teacherSubjects?.length || 0})</option>
            {teacherSubjects?.map((subject: any) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredLessons.length} lesson{filteredLessons.length !== 1 ? 's' : ''} total
          </span>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          🎯 Teacher Actions
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• <strong>Upload Lesson:</strong> Upload PDF materials for your subjects</li>
          <li>• <strong>View Material:</strong> Preview lesson PDFs</li>
          <li>• <strong>View Questions:</strong> See AI-generated questions</li>
          <li>• <strong>Create Assessment:</strong> Build assessments with AI + custom questions</li>
          <li>• <strong>Regenerate AI:</strong> Re-process lesson and generate new questions</li>
          <li>• <strong>Delete:</strong> Remove lesson and all associated data</li>
        </ul>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {filteredLessons.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Lessons</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {filteredLessons.filter(l => l.status === "done").length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">AI Processed</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {filteredLessons.reduce((sum, l) => sum + (l.questionCount || 0), 0)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">AI Questions</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {filteredLessons.filter(l => l.status === "processing").length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Processing</div>
        </div>
      </div>

      {/* Lessons by Subject */}
      {loadingLessons ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading lessons...</p>
          </div>
        </div>
      ) : Object.keys(groupedLessons).length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            No lessons found for your subjects
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Click "Upload New Lesson" to get started
          </p>
        </div>
      ) : (
        Object.entries(groupedLessons).map(([subjectName, subjectLessons]) => (
          <div key={subjectName} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1 flex-1 bg-gradient-to-r from-blue-200 to-indigo-200 dark:from-blue-800 dark:to-indigo-800 rounded"></div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                {subjectName}
              </h2>
              <div className="h-1 flex-1 bg-gradient-to-r from-indigo-200 to-blue-200 dark:from-indigo-800 dark:to-blue-800 rounded"></div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subjectLessons
                .sort((a, b) => a.weekNumber - b.weekNumber)
                .map((lesson) => (
                  <LessonTopicCard
                    key={lesson.id}
                    topic={lesson}
                    viewMode="admin"
                    onDeleted={() => refetch()}
                    onRegenerated={() => refetch()}
                  />
                ))}
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-2">
              {subjectLessons.length} lesson{subjectLessons.length !== 1 ? "s" : ""} •{" "}
              {subjectLessons.filter((l) => l.status === "done" && (l.questionCount || 0) > 0).length}{" "}
              with AI questions ready
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TeacherLessonTopicsPage;