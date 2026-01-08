// src/features/lessons/pages/StudentLessonTopicsPage.tsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../../api/axios";
import { useAuth } from "../../auth/useAuth";
import { useMyProfile } from "../../studentProfiles/hooks/useStudentProfiles";
import { useGetEnrolledSubjects } from "../api/subjectsApi";
import { LessonTopicDto } from "../types/lessonTopicTypes";
import { BookOpen, FileText, Calendar, Clock, Search, Filter } from "lucide-react";

const StudentLessonTopicsPage: React.FC = () => {
  const { user } = useAuth();
  const { data: profile, isLoading: loadingProfile } = useMyProfile({ enabled: true });
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ Fetch student's enrolled subjects using the existing hook
  const { data: studentSubjects, isLoading: loadingSubjects } = useGetEnrolledSubjects();

  // ✅ Fetch all lesson topics
  const { data: lessons, isLoading: loadingLessons } = useQuery<LessonTopicDto[]>({
    queryKey: ["student-lessons", selectedSubjectId],
    queryFn: async () => {
      const url = selectedSubjectId 
        ? `/lesson-topics?subjectId=${selectedSubjectId}`
        : "/lesson-topics";
      const res = await api.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!studentSubjects,
  });

  // ✅ Filter lessons to only show student's enrolled subjects
  const filteredLessons = useMemo(() => {
    if (!lessons || !studentSubjects) return [];
    
    const studentSubjectIds = new Set(studentSubjects.map((s: any) => s.id));
    let filtered = lessons.filter(lesson => studentSubjectIds.has(lesson.subjectId));

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lesson => 
        lesson.topicTitle?.toLowerCase().includes(query) ||
        lesson.subjectName?.toLowerCase().includes(query) ||
        lesson.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [lessons, studentSubjects, searchQuery]);

  // ✅ Group lessons by subject
  const groupedLessons = useMemo(() => {
    const grouped = filteredLessons.reduce((acc, lesson) => {
      const subjectName = lesson.subjectName || `Subject ${lesson.subjectId}`;
      if (!acc[subjectName]) {
        acc[subjectName] = {
          lessons: [],
          subjectId: lesson.subjectId
        };
      }
      acc[subjectName].lessons.push(lesson);
      return acc;
    }, {} as Record<string, { lessons: typeof filteredLessons; subjectId: number }>);

    // Sort lessons within each subject by week number
    Object.values(grouped).forEach(group => {
      group.lessons.sort((a, b) => a.weekNumber - b.weekNumber);
    });

    return grouped;
  }, [filteredLessons]);

  // ✅ Handle viewing lesson material
  const handleViewMaterial = (lesson: LessonTopicDto) => {
    if (lesson.fileUrl) {
      window.open(lesson.fileUrl, '_blank');
    } else {
      alert('No material available for this lesson yet.');
    }
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

  if (loadingProfile || loadingSubjects) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your subjects...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-600 dark:text-yellow-400 font-medium">
            Student profile not found. Please complete your profile setup.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              📚 My Lesson Materials
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Access study materials and resources for all your subjects
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              {studentSubjects?.length || 0} Subjects
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search lessons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Subject Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedSubjectId || "all"}
              onChange={(e) => setSelectedSubjectId(e.target.value === "all" ? null : Number(e.target.value))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subjects ({studentSubjects?.length || 0})</option>
              {studentSubjects?.map((subject: any) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {searchQuery && (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Found {filteredLessons.length} lesson{filteredLessons.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          About Lesson Materials
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Access study materials uploaded by your teachers</li>
          <li>• Materials are organized by subject and week</li>
          <li>• Click "View Material" to open and read lesson PDFs</li>
          <li>• Download materials for offline study</li>
        </ul>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredLessons.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Lessons</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredLessons.filter(l => l.fileUrl).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">With Materials</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {Object.keys(groupedLessons).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Subjects</div>
            </div>
          </div>
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
            {searchQuery ? `No lessons found matching "${searchQuery}"` : "No lessons available yet"}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            {searchQuery ? "Try a different search term" : "Check back later for new materials from your teachers"}
          </p>
        </div>
      ) : (
        Object.entries(groupedLessons).map(([subjectName, { lessons: subjectLessons, subjectId }]) => (
          <div key={subjectName} className="space-y-4">
            {/* Subject Header */}
            <div className="flex items-center gap-3">
              <div className="h-1 flex-1 bg-gradient-to-r from-blue-200 to-indigo-200 dark:from-blue-800 dark:to-indigo-800 rounded"></div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                {subjectName}
              </h2>
              <div className="h-1 flex-1 bg-gradient-to-r from-indigo-200 to-blue-200 dark:from-indigo-800 dark:to-blue-800 rounded"></div>
            </div>

            {/* Lesson Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subjectLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-white/20 rounded text-xs font-semibold">
                            Week {lesson.weekNumber}
                          </span>
                          {lesson.status === "done" && (
                            <span className="px-2 py-1 bg-green-500 rounded text-xs font-semibold">
                              ✓ Complete
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg line-clamp-2">
                          {lesson.topicTitle || "Untitled Lesson"}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Description */}
                    {lesson.description && (
                      <div className="flex items-start gap-2">
                        <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {lesson.description}
                        </p>
                      </div>
                    )}

                    {/* Subject Info */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{lesson.subjectName || 'Subject'}</span>
                    </div>

                    {/* Material Status */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      {lesson.fileUrl ? (
                        <button
                          onClick={() => handleViewMaterial(lesson)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          View Material
                        </button>
                      ) : (
                        <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg">
                          <FileText className="w-4 h-4" />
                          No Material Yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Subject Summary */}
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-2">
              {subjectLessons.length} lesson{subjectLessons.length !== 1 ? "s" : ""} •{" "}
              {subjectLessons.filter((l) => l.fileUrl).length}{" "}
              with materials available
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default StudentLessonTopicsPage;