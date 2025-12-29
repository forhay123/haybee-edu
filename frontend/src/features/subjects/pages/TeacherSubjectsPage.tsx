import React, { useMemo, useState } from "react";
import { useGetTeacherSubjects } from "../api/subjectsApi";
import SubjectCard from "../components/SubjectCard";

const TeacherSubjectsPage = () => {
  const { data: subjects, isLoading, isError } = useGetTeacherSubjects();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredSubjects = useMemo(() => {
    if (!subjects) return [];
    return subjects.filter((subj) =>
      subj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subj.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [subjects, searchTerm]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your subjects...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load subjects</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📚 My Subjects
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and manage the subjects you teach. You can view lesson materials and upload new content for your students.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="🔍 Search by subject name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Subject Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Showing <strong>{filteredSubjects.length}</strong> of <strong>{subjects?.length || 0}</strong> subjects
        </p>
      </div>

      {/* Subjects Grid */}
      {!subjects || subjects.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            No subjects assigned
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Contact your administrator to have subjects assigned to you.
          </p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            No subjects match your search
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Try a different search term.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              isDeleting={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherSubjectsPage;