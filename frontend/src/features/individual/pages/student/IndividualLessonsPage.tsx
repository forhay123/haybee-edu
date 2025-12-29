// frontend/src/features/individual/pages/IndividualLessonsPage.tsx

import React, { useState } from "react";
import { AlertCircle, Search, Filter, BookOpen } from "lucide-react";
import IndividualLessonList from "../../components/IndividualLessonList";
import { useMyProfile } from "../../../studentProfiles/hooks/useStudentProfiles";
import { 
  useIndividualLessons, 
  useLessonStats, 
  useFilteredLessons, 
  useSortedLessons 
} from "../../hooks/useIndividualLessons";

const IndividualLessonsPage: React.FC = () => {
  const { data: profile, isLoading: profileLoading, error: profileError } = useMyProfile();
  const { lessons, isLoading: lessonsLoading } = useIndividualLessons(profile?.id || 0);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>();
  const [selectedWeek, setSelectedWeek] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<"week" | "subject" | "date" | "title">("week");

  const stats = useLessonStats(lessons);
  
  const filteredLessons = useFilteredLessons(lessons, {
    subjectId: selectedSubject,
    weekNumber: selectedWeek,
    searchQuery,
  });
  
  const sortedLessons = useSortedLessons(filteredLessons, sortBy);

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2 text-center">
            Error Loading Profile
          </h2>
          <p className="text-red-700 text-center">
            {profileError?.message || "Unable to load your student profile"}
          </p>
        </div>
      </div>
    );
  }

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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Lesson Topics</h1>
        <p className="text-gray-600">
          Browse and track your personalized lesson topics generated from your schemes of work
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Lessons</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLessons}</p>
            </div>
            <BookOpen className="w-8 h-8 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Subjects</p>
              <p className="text-2xl font-bold text-green-600">{stats.subjects.length}</p>
            </div>
            <div className="text-3xl">📚</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Weeks Covered</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalWeeks}</p>
            </div>
            <div className="text-3xl">📅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Confidence</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.averageConfidence ? `${stats.averageConfidence.toFixed(0)}%` : "N/A"}
              </p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search lessons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={selectedSubject || ""}
              onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Subjects</option>
              {stats.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.count})
                </option>
              ))}
            </select>
          </div>

          {/* Week Filter */}
          <div>
            <select
              value={selectedWeek || ""}
              onChange={(e) => setSelectedWeek(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Weeks</option>
              {stats.weeks.map((week) => (
                <option key={week} value={week}>
                  Week {week}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-3 mt-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-600">Sort by:</span>
          <div className="flex gap-2">
            {[
              { value: "week", label: "Week" },
              { value: "subject", label: "Subject" },
              { value: "date", label: "Date" },
              { value: "title", label: "Title" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as any)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === option.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {lessonsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading lessons...</p>
          </div>
        ) : sortedLessons.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">
              {lessons.length === 0 ? "No lessons found" : "No matching lessons"}
            </p>
            <p className="text-sm text-gray-500">
              {lessons.length === 0 
                ? "Upload schemes of work to generate lesson topics"
                : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <IndividualLessonList lessons={sortedLessons} />
        )}
      </div>

      {/* Subject Breakdown */}
      {stats.subjects.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lessons by Subject</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(selectedSubject === subject.id ? undefined : subject.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedSubject === subject.id
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-200 hover:border-indigo-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{subject.name}</h4>
                  <span className="text-2xl">📚</span>
                </div>
                <p className="text-2xl font-bold text-indigo-600">{subject.count}</p>
                <p className="text-sm text-gray-600">lesson topics</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualLessonsPage;