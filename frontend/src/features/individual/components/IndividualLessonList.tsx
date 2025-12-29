// ============================================================================
// FILE 3: frontend/src/features/individual/components/IndividualLessonList.tsx
// ============================================================================

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Filter, Search, AlertCircle } from "lucide-react";
import { lessonTopicApi } from "../api/individualApi";
import { IndividualLessonTopicDto } from "../types/individualTypes";

interface IndividualLessonListProps {
  studentProfileId: number;
}

const IndividualLessonList: React.FC<IndividualLessonListProps> = ({ studentProfileId }) => {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["individual-lessons", studentProfileId],
    queryFn: () => lessonTopicApi.getByStudent(studentProfileId),
  });

  const subjects = lessons
    ? Array.from(
        new Map(
          lessons.map((lesson) => [lesson.subjectId, lesson.subjectName])
        ).entries()
      ).map(([id, name]) => ({ id, name }))
    : [];

  const filteredLessons = lessons?.filter((lesson) => {
    const matchesSubject = !selectedSubject || lesson.subjectId === selectedSubject;
    const matchesSearch =
      !searchQuery ||
      lesson.topicTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const lessonsBySubject = filteredLessons?.reduce((acc, lesson) => {
    const key = lesson.subjectId;
    if (!acc[key]) {
      acc[key] = {
        subjectId: lesson.subjectId,
        subjectName: lesson.subjectName,
        lessons: [],
      };
    }
    acc[key].lessons.push(lesson);
    return acc;
  }, {} as Record<number, { subjectId: number; subjectName: string; lessons: IndividualLessonTopicDto[] }>);

  const sortedSubjects = Object.values(lessonsBySubject || {}).map((subject) => ({
    ...subject,
    lessons: subject.lessons.sort((a, b) => a.weekNumber - b.weekNumber),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Lesson Topics</h2>
        <p className="text-sm text-gray-600">
          View all topics from your uploaded schemes of work
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedSubject || ""}
              onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-gray-500">Loading lessons...</div>
        </div>
      ) : !filteredLessons || filteredLessons.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-2">
            {searchQuery || selectedSubject ? "No lessons found" : "No lessons yet"}
          </p>
          <p className="text-sm text-gray-500">
            {searchQuery || selectedSubject
              ? "Try adjusting your filters"
              : "Upload schemes of work to see your lesson topics"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedSubjects.map((subject) => (
            <div key={subject.subjectId} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{subject.subjectName}</h3>
                  <p className="text-sm text-gray-600">{subject.lessons.length} topics</p>
                </div>
              </div>

              <div className="space-y-3">
                {subject.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <span className="bg-indigo-600 text-white text-xs font-semibold px-2 py-1 rounded">
                            Week {lesson.weekNumber}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                              {lesson.topicTitle}
                            </h4>
                            {lesson.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {lesson.description}
                              </p>
                            )}
                            {lesson.fileName && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                <FileText className="w-3 h-3" />
                                <span>{lesson.fileName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {lesson.mappingConfidence && (
                        <div className="flex-shrink-0">
                          <div className="text-xs text-gray-500">
                            {Math.round(lesson.mappingConfidence * 100)}% match
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IndividualLessonList;