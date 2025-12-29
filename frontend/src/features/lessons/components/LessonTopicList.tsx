import React, { useState, useEffect } from "react";
import LessonTopicCard from "./LessonTopicCard";
import { LessonTopicDto } from "../types/lessonTopicTypes";
import api from "../../../api/axios";

interface LessonTopicListProps {
  topics: LessonTopicDto[];
  onDeleted?: () => void;
  onRegenerated?: () => void;
}

const LessonTopicList: React.FC<LessonTopicListProps> = ({ topics, onDeleted, onRegenerated }) => {
  const [subjects, setSubjects] = useState<Record<number, string>>({});
  const [terms, setTerms] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  // Fetch subject and term names for display
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [subjectsRes, termsRes] = await Promise.all([
          api.get("/subjects"),
          api.get("/terms"),
        ]);

        const subjectsMap = (Array.isArray(subjectsRes.data) ? subjectsRes.data : []).reduce(
          (acc: Record<number, string>, s: any) => {
            acc[s.id] = s.name;
            return acc;
          },
          {}
        );

        const termsMap = (Array.isArray(termsRes.data) ? termsRes.data : []).reduce(
          (acc: Record<number, string>, t: any) => {
            acc[t.id] = t.name;
            return acc;
          },
          {}
        );

        setSubjects(subjectsMap);
        setTerms(termsMap);
      } catch (err) {
        console.error("Failed to fetch metadata:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📭</div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">No lesson topics found</p>
        <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
          {topics && topics.length === 0 ? "Select a subject or upload a new lesson to get started" : "Loading..."}
        </p>
      </div>
    );
  }

  // Sort by subject, then term, then week
  const sortedTopics = [...topics].sort((a, b) => {
    if (a.subjectId !== b.subjectId) return a.subjectId - b.subjectId;
    if (a.termId !== b.termId) return (a.termId || 0) - (b.termId || 0);
    return a.weekNumber - b.weekNumber;
  });

  // Group by subject and term
  const groupedTopics = sortedTopics.reduce((acc, topic) => {
    const key = `${topic.subjectId}-${topic.termId || 0}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(topic);
    return acc;
  }, {} as Record<string, LessonTopicDto[]>);

  return (
    <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
      {Object.entries(groupedTopics).map(([key, groupTopics]) => {
        const firstTopic = groupTopics[0];
        const subjectName = subjects[firstTopic.subjectId] || `Subject ${firstTopic.subjectId}`;
        const termName = firstTopic.termId ? terms[firstTopic.termId] || `Term ${firstTopic.termId}` : "No Term";

        return (
          <div key={key} className="space-y-3">
            {/* Group Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 pb-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg">
                  📚 {subjectName}
                </span>
                <span className="text-gray-400">•</span>
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg">
                  📅 {termName}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {groupTopics.length} lesson{groupTopics.length !== 1 ? "s" : ""}
                </span>
              </h3>
            </div>
            
            {/* Lessons in this group */}
            {groupTopics.map((topic) => (
              <LessonTopicCard
                key={topic.id}
                topic={topic}
                onDeleted={onDeleted}
                onRegenerated={onRegenerated}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default LessonTopicList;