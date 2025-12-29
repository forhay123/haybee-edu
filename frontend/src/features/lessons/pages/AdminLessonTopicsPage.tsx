import React, { useState, useMemo } from "react";
import LessonTopicForm from "../components/LessonTopicForm";
import LessonTopicList from "../components/LessonTopicList";
import { useLessonTopics } from "../hooks/useLessonTopics";

const AdminLessonTopicsPage: React.FC = () => {
  // State for filters
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);

  // ✅ Fetch ALL lessons initially (no subjectId filter in the query)
  const { getAll: allLessonsQuery, refetch } = useLessonTopics(undefined);

  // ✅ Filter lessons client-side based on form selections
  const filteredLessons = useMemo(() => {
    const lessons = allLessonsQuery.data || [];

    return lessons.filter((lesson) => {
      // Filter by subject if selected (this is the main filter)
      if (selectedSubjectId && lesson.subjectId !== selectedSubjectId) {
        return false;
      }

      // Filter by term if selected
      if (selectedTermId && lesson.termId !== selectedTermId) {
        return false;
      }

      return true;
    });
  }, [allLessonsQuery.data, selectedSubjectId, selectedTermId]);

  const handleUploadSuccess = () => {
    refetch();
  };

  const handleLessonDeleted = () => {
    refetch();
  };

  const handleLessonRegenerated = () => {
    refetch();
  };

  const handleFiltersChanged = (classId: number | null, subjectId: number | null, termId: number | null) => {
    setSelectedClassId(classId);
    setSelectedSubjectId(subjectId);
    setSelectedTermId(termId);
  };

  const clearFilters = () => {
    setSelectedClassId(null);
    setSelectedSubjectId(null);
    setSelectedTermId(null);
  };

  // Get filter display info
  const hasActiveFilters = selectedSubjectId || selectedTermId;
  const totalLessons = allLessonsQuery.data?.length || 0;
  const filteredCount = filteredLessons.length;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📚 Manage Lesson Topics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload lesson materials and manage AI-generated questions for each subject
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Upload Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-2xl">📤</span>
            Upload New Lesson
          </h2>
          <LessonTopicForm
            onSuccess={handleUploadSuccess}
            onFiltersChanged={handleFiltersChanged}
          />
        </div>

        {/* RIGHT: Lesson Topics List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          {/* Header with stats and actions */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Existing Lessons
              </h2>
              {hasActiveFilters ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Showing <strong className="text-blue-600 dark:text-blue-400">{filteredCount}</strong> of{" "}
                  <strong>{totalLessons}</strong> lessons
                </p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Total: <strong>{totalLessons}</strong> lessons
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center gap-1"
                  title="Clear all filters"
                >
                  <span>✖</span>
                  <span>Clear</span>
                </button>
              )}
              <button
                onClick={() => refetch()}
                className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition flex items-center gap-1"
                title="Refresh lessons list"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">Active Filters:</p>
              <div className="flex flex-wrap gap-2">
                {selectedSubjectId && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    <span>Subject ID: {selectedSubjectId}</span>
                    <button
                      onClick={() => setSelectedSubjectId(null)}
                      className="hover:text-blue-600"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {selectedTermId && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    <span>Term ID: {selectedTermId}</span>
                    <button
                      onClick={() => setSelectedTermId(null)}
                      className="hover:text-blue-600"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Lessons List */}
          {allLessonsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading lessons...</p>
              </div>
            </div>
          ) : allLessonsQuery.isError ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-400 font-medium">❌ Failed to load lessons</p>
              <p className="text-red-500 dark:text-red-500 text-sm mt-1">
                {allLessonsQuery.error?.message || "Please try again"}
              </p>
            </div>
          ) : (
            <LessonTopicList
              topics={filteredLessons}
              onDeleted={handleLessonDeleted}
              onRegenerated={handleLessonRegenerated}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLessonTopicsPage;