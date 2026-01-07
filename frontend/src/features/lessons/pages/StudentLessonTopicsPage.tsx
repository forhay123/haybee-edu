// src/features/lessons/pages/StudentLessonTopicsPage.tsx
import React, { useMemo } from "react";
import { useStudentLessonsByProfileId } from "../hooks/useLessonTopics"; // ✅ Use the new hook
import { useAuth } from "../../auth/useAuth";
import { useStudentProfiles } from "../../studentProfiles/hooks/useStudentProfiles";
import { useGetEnrolledSubjects } from "../../subjects/api/subjectsApi";
import LessonTopicCard from "../components/LessonTopicCard";

const getUserIdFromAuth = (user: any): number | undefined => {
  if (!user) return undefined;
  const id = typeof user.id === "string" ? parseInt(user.id, 10) : user.id;
  return isNaN(id) ? undefined : id;
};

const StudentLessonTopicsPage: React.FC = () => {
  const { user } = useAuth();
  const userId = getUserIdFromAuth(user);

  // ✅ Hooks for students only
  const { studentProfilesQuery } = useStudentProfiles();
  const { data: enrolledSubjects } = useGetEnrolledSubjects();

  // ✅ Get student profile
  const profile = useMemo(() => {
    if (!userId || !studentProfilesQuery.data) return undefined;
    return studentProfilesQuery.data.find((p) => p.userId === userId);
  }, [studentProfilesQuery.data, userId]);

  // ✅ Get enrolled subject IDs
  const subjectIds = useMemo(() => {
    if (!enrolledSubjects) return [];
    return enrolledSubjects.map((s) => s.id);
  }, [enrolledSubjects]);

  // ✅ Fetch lessons using the NEW hook with profile ID
  const { data: lessons, isLoading, isError, error } = useStudentLessonsByProfileId(
    profile?.id // Pass the student profile ID, not subject IDs
  );

  // ✅ Filter lessons to only show enrolled subjects
  const filteredLessons = useMemo(() => {
    if (!lessons || subjectIds.length === 0) return [];
    return lessons.filter((lesson) => subjectIds.includes(lesson.subjectId));
  }, [lessons, subjectIds]);

  // ✅ Group lessons by subject
  const groupedLessons = useMemo(() => {
    if (!filteredLessons.length) return {};
    return filteredLessons.reduce((acc, lesson) => {
      const subjectName = lesson.subjectName || `Subject ${lesson.subjectId}`;
      if (!acc[subjectName]) acc[subjectName] = [];
      acc[subjectName].push(lesson);
      return acc;
    }, {} as Record<string, typeof filteredLessons>);
  }, [filteredLessons]);

  // ---- Conditional renders ----
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

  if (studentProfilesQuery.isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-amber-600 dark:text-amber-400 font-medium">
            No student profile found.
          </p>
          <p className="text-amber-500 dark:text-amber-500 text-sm mt-1">
            Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading lesson materials...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">
            Error loading lessons
          </p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">
            {error instanceof Error ? error.message : "Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📚 My Lesson Materials
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Access your lesson PDFs and practice questions organized by subject
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          ℹ️ How to Use
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>
            • Click <strong>"View Lesson Material"</strong> to read the PDF for
            each topic
          </li>
          <li>
            • Click <strong>"Take Assessment"</strong> to test your
            understanding
          </li>
          <li>
            • Complete lessons week by week for best results
          </li>
        </ul>
      </div>

      {/* Lessons by Subject */}
      {Object.keys(groupedLessons).length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            No lesson materials available yet
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Your teacher will upload lessons soon. Check back later!
          </p>
          {subjectIds.length > 0 && (
            <p className="text-gray-400 dark:text-gray-600 text-xs mt-3">
              You're enrolled in {subjectIds.length} subject(s), but no lessons have been uploaded yet.
            </p>
          )}
        </div>
      ) : (
        Object.entries(groupedLessons).map(([subjectName, subjectLessons]) => (
          <div key={subjectName} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1 flex-1 bg-gradient-to-r from-purple-200 to-pink-200 dark:from-purple-800 dark:to-pink-800 rounded"></div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                {subjectName}
              </h2>
              <div className="h-1 flex-1 bg-gradient-to-r from-pink-200 to-purple-200 dark:from-pink-800 dark:to-purple-800 rounded"></div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subjectLessons
                .sort((a, b) => a.weekNumber - b.weekNumber)
                .map((lesson) => (
                  <LessonTopicCard
                    key={lesson.id}
                    topic={lesson}
                    viewMode="student"
                  />
                ))}
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-2">
              {subjectLessons.length} lesson
              {subjectLessons.length !== 1 ? "s" : ""} •{" "}
              {
                subjectLessons.filter(
                  (l) => l.status === "done" && (l.questionCount || 0) > 0
                ).length
              }{" "}
              with practice questions
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default StudentLessonTopicsPage;