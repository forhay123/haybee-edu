// src/features/lessons/pages/LessonQuestionsPage.tsx
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../../api/axios";
import { LessonAIQuestionDto } from "../types/lessonAIQuestionsTypes";

const LessonQuestionsPage: React.FC = () => {
  const { subjectId, lessonId } = useParams<{ subjectId: string; lessonId: string }>();
  const navigate = useNavigate();
  const [showAnswers, setShowAnswers] = useState(false);

  // Fetch questions for this specific lesson topic
  const { data: questions, isLoading, isError, error } = useQuery<LessonAIQuestionDto[]>({
    queryKey: ["lesson-questions", lessonId],
    queryFn: async () => {
      const res = await api.get(`/ai-questions/lesson-topic/${lessonId}`);
      return res.data;
    },
    enabled: !!lessonId,
  });

  const isMultipleChoice = (q: LessonAIQuestionDto) => {
    return q.optionA || q.optionB || q.optionC || q.optionD;
  };

  const getOptionStyle = (optionLetter: string, correctOption?: string) => {
    if (!showAnswers) return "bg-gray-50 border-gray-300";
    if (correctOption === optionLetter) {
      return "bg-green-100 border-green-500 font-semibold";
    }
    return "bg-gray-50 border-gray-300";
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">Failed to load questions.</p>
          <p className="text-red-500 text-sm mt-1">
            {error instanceof Error ? error.message : "Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate(`/subjects/${subjectId}/lessons`)}
          className="text-blue-600 hover:underline mb-4 flex items-center gap-2"
        >
          ← Back to Lessons
        </button>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-600 font-medium">No questions available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(`/subjects/${subjectId}/lessons`)}
            className="text-blue-600 hover:underline mb-2 flex items-center gap-2"
          >
            ← Back to Lessons
          </button>
          <h1 className="text-2xl font-bold text-foreground">Lesson Questions</h1>
          <p className="text-muted-foreground mt-1">{questions.length} questions available</p>
        </div>

        <button
          onClick={() => setShowAnswers(!showAnswers)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showAnswers ? "Hide" : "Show"} Answers
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={q.id} className="p-4 border rounded shadow-sm bg-white">
            {/* Question Header */}
            <div className="flex items-start justify-between mb-3">
              <p className="font-medium text-lg">
                <span className="text-blue-600 mr-2">Q{index + 1}:</span>
                {q.questionText}
              </p>
              {q.difficulty && (
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    q.difficulty === "easy"
                      ? "bg-green-100 text-green-800"
                      : q.difficulty === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {q.difficulty}
                </span>
              )}
            </div>

            {/* Multiple Choice Options */}
            {isMultipleChoice(q) ? (
              <div className="space-y-2 mb-3">
                {q.optionA && (
                  <div className={`p-2 border rounded ${getOptionStyle("A", q.correctOption)}`}>
                    <span className="font-semibold mr-2">A)</span>
                    {q.optionA}
                  </div>
                )}
                {q.optionB && (
                  <div className={`p-2 border rounded ${getOptionStyle("B", q.correctOption)}`}>
                    <span className="font-semibold mr-2">B)</span>
                    {q.optionB}
                  </div>
                )}
                {q.optionC && (
                  <div className={`p-2 border rounded ${getOptionStyle("C", q.correctOption)}`}>
                    <span className="font-semibold mr-2">C)</span>
                    {q.optionC}
                  </div>
                )}
                {q.optionD && (
                  <div className={`p-2 border rounded ${getOptionStyle("D", q.correctOption)}`}>
                    <span className="font-semibold mr-2">D)</span>
                    {q.optionD}
                  </div>
                )}
                {showAnswers && q.correctOption && (
                  <p className="text-sm text-green-700 mt-2">
                    ✓ Correct Answer: <strong>{q.correctOption}</strong>
                  </p>
                )}
              </div>
            ) : (
              /* Theory Question */
              showAnswers && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-gray-600 mb-1">Expected Answer:</p>
                  <p className="text-gray-800">{q.answerText ?? "Answer not available yet."}</p>
                </div>
              )
            )}

            {/* Footer Info */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t text-xs text-gray-500">
              <span>Max Score: {q.maxScore ?? 1}</span>
              {q.studentType && <span>Type: {q.studentType}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LessonQuestionsPage;