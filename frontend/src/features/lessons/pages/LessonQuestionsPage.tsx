// src/features/lessons/pages/LessonQuestionsPage.tsx
// ✅ ENHANCED: Added workings support

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import api from "../../../api/axios";
import { LessonAIQuestionDto } from "../types/lessonAIQuestionsTypes";

const LessonQuestionsPage: React.FC = () => {
  const { subjectId, lessonId } = useParams<{ subjectId: string; lessonId: string }>();
  const navigate = useNavigate();
  const [showAnswers, setShowAnswers] = useState(false);
  
  // ✅ NEW: Track expanded workings per question
  const [expandedWorkings, setExpandedWorkings] = useState<Set<number>>(new Set());

  // Fetch questions for this specific lesson topic
  const { data: questions, isLoading, isError, error } = useQuery<LessonAIQuestionDto[]>({
    queryKey: ["lesson-questions", lessonId],
    queryFn: async () => {
      const res = await api.get(`/ai-questions/lesson-topic/${lessonId}`);
      return res.data;
    },
    enabled: !!lessonId,
  });

  // ✅ Toggle workings for a specific question
  const toggleWorkings = (questionId: number) => {
    setExpandedWorkings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // ✅ Check if question has workings
  const hasWorkings = (q: LessonAIQuestionDto): boolean => {
    return q.workings !== null && q.workings !== undefined && q.workings.trim() !== '';
  };

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

  // ✅ Count questions with workings
  const questionsWithWorkings = questions.filter(q => hasWorkings(q)).length;

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
          <p className="text-muted-foreground mt-1">
            {questions.length} questions available
            {questionsWithWorkings > 0 && (
              <span className="ml-2 text-indigo-600 font-medium">
                • {questionsWithWorkings} with step-by-step workings
              </span>
            )}
          </p>
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
        {questions.map((q, index) => {
          const questionHasWorkings = hasWorkings(q);
          const isWorkingsExpanded = expandedWorkings.has(q.id);

          return (
            <div key={q.id} className="p-6 border-2 border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow">
              {/* Question Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-blue-600 font-bold text-lg">Q{index + 1}:</span>
                    
                    {q.difficulty && (
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          q.difficulty === "easy"
                            ? "bg-green-100 text-green-800"
                            : q.difficulty === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                      </span>
                    )}

                    {/* ✅ NEW: Workings indicator */}
                    {questionHasWorkings && (
                      <span className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium flex items-center gap-1">
                        <Calculator className="w-3 h-3" />
                        Has Workings
                      </span>
                    )}
                  </div>
                  
                  <p className="font-medium text-lg text-gray-900">
                    {q.questionText}
                  </p>
                </div>
              </div>

              {/* Multiple Choice Options */}
              {isMultipleChoice(q) ? (
                <div className="space-y-2 mb-3">
                  {q.optionA && (
                    <div className={`p-3 border-2 rounded-lg ${getOptionStyle("A", q.correctOption)}`}>
                      <span className="font-semibold mr-2">A)</span>
                      {q.optionA}
                    </div>
                  )}
                  {q.optionB && (
                    <div className={`p-3 border-2 rounded-lg ${getOptionStyle("B", q.correctOption)}`}>
                      <span className="font-semibold mr-2">B)</span>
                      {q.optionB}
                    </div>
                  )}
                  {q.optionC && (
                    <div className={`p-3 border-2 rounded-lg ${getOptionStyle("C", q.correctOption)}`}>
                      <span className="font-semibold mr-2">C)</span>
                      {q.optionC}
                    </div>
                  )}
                  {q.optionD && (
                    <div className={`p-3 border-2 rounded-lg ${getOptionStyle("D", q.correctOption)}`}>
                      <span className="font-semibold mr-2">D)</span>
                      {q.optionD}
                    </div>
                  )}
                  {showAnswers && q.correctOption && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border-2 border-green-200 rounded-lg mt-3">
                      <span className="text-green-600 text-xl">✓</span>
                      <p className="text-sm text-green-800 font-semibold">
                        Correct Answer: <span className="text-green-900">{q.correctOption}</span>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Theory Question */
                showAnswers && (
                  <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-600 text-xl">💡</span>
                      <p className="text-sm font-semibold text-blue-900">Expected Answer:</p>
                    </div>
                    <p className="text-gray-800 leading-relaxed">
                      {q.answerText ?? "Answer not available yet."}
                    </p>
                  </div>
                )
              )}

              {/* ✅ NEW: Workings Display */}
              {showAnswers && questionHasWorkings && q.workings && (
                <div className="mt-4">
                  <button
                    onClick={() => toggleWorkings(q.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 rounded-lg transition-all w-full text-left font-medium text-indigo-900"
                  >
                    <Calculator className="w-5 h-5 text-indigo-600" />
                    <span>{isWorkingsExpanded ? 'Hide' : 'Show'} Step-by-Step Workings</span>
                    {isWorkingsExpanded ? (
                      <ChevronUp className="w-5 h-5 ml-auto text-indigo-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 ml-auto text-indigo-600" />
                    )}
                  </button>

                  {isWorkingsExpanded && (
                    <div className="mt-3 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-indigo-200">
                        <Calculator className="w-5 h-5 text-indigo-600" />
                        <h4 className="font-bold text-indigo-900">Solution Steps:</h4>
                      </div>
                      
                      <div className="space-y-2 font-mono text-sm">
                        {q.workings.split('\n').filter(line => line.trim() !== '').map((line, idx) => {
                          const isStepHeader = /^Step \d+:/i.test(line.trim());
                          
                          return (
                            <div
                              key={idx}
                              className={`${
                                isStepHeader
                                  ? 'font-bold text-indigo-900 text-base mt-4 first:mt-0'
                                  : 'text-gray-800 pl-4 leading-relaxed'
                              }`}
                            >
                              {line}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-3 border-t-2 border-indigo-200">
                        <p className="text-xs text-indigo-700 italic flex items-center gap-1">
                          <span>💡</span>
                          <span>Follow these steps to understand how the answer was derived</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Info */}
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
                <span>Max Score: {q.maxScore ?? 1}</span>
                {q.studentType && <span>Type: {q.studentType}</span>}
                <span className="text-gray-400">Question #{q.id}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LessonQuestionsPage;