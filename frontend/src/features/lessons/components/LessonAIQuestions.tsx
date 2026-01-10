// ✅ OPTIMIZED: LessonAIQuestions.tsx with Pagination & Workings Support

import React, { useState, useMemo, useEffect } from "react";
import { useLessonAIQuestions } from "../hooks/useLessonAIQuestions";
import { LessonAIQuestionDto, EnhancedQuestionDto, hasWorkings } from "../types/lessonAIQuestionsTypes";
import { useAuth } from "../../auth/useAuth";
import { useGetCurrentTermWithWeek } from "../../terms/api/termsApi";
import { Lock, Calculator, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "../../../api/axios";

interface LessonAIQuestionsProps {
  subjectIds: number[];
  selectedWeek?: string | null;
  currentPage: number;
  questionsPerPage: number;
  onPageChange: (page: number) => void;
}

const LessonAIQuestions: React.FC<LessonAIQuestionsProps> = ({ 
  subjectIds, 
  selectedWeek,
  currentPage,
  questionsPerPage,
  onPageChange,
}) => {
  const { data, isLoading, isError, error } = useLessonAIQuestions(subjectIds);
  const [showAnswers, setShowAnswers] = useState(false);
  const [enhancedQuestions, setEnhancedQuestions] = useState<EnhancedQuestionDto[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [expandedWorkings, setExpandedWorkings] = useState<Set<number>>(new Set());
  
  const { user } = useAuth();
  const { data: currentTermData } = useGetCurrentTermWithWeek();

  const isStudent = user?.roles?.includes('STUDENT') && 
                    !user?.roles?.includes('ADMIN') && 
                    !user?.roles?.includes('TEACHER');

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

  const extractWeekFromTitle = (title: string): { week: string | null; weekNumber: number | null } => {
    if (!title) return { week: null, weekNumber: null };
    
    const weekMatch = title.match(/[_\s-]?[Ww]eek[_\s-]?(\d+)/);
    
    if (weekMatch && weekMatch[1]) {
      const weekNum = parseInt(weekMatch[1]);
      return {
        week: `Week${weekNum}`,
        weekNumber: weekNum
      };
    }
    
    return { week: null, weekNumber: null };
  };

  useEffect(() => {
    if (!data || data.length === 0) {
      setEnhancedQuestions([]);
      return;
    }

    const fetchLessonTopicDetails = async () => {
      setLoadingLessons(true);
      try {
        const lessonTopicIds = [...new Set(data.map(q => q.lessonId))];
        
        const lessonPromises = lessonTopicIds.map(id =>
          axios.get(`/lesson-topics/${id}`).catch(err => {
            console.error(`Failed to fetch lesson topic ${id}:`, err);
            return null;
          })
        );
        
        const lessonResults = await Promise.all(lessonPromises);
        
        const lessonMap = new Map<number, { week: string | null; weekNumber: number | null; title: string }>();
        
        lessonResults.forEach((result, index) => {
          if (result && result.data) {
            const lesson = result.data;
            const weekInfo = extractWeekFromTitle(lesson.topicTitle || '');
            lessonMap.set(lessonTopicIds[index], {
              ...weekInfo,
              title: lesson.topicTitle || 'Unknown'
            });
          }
        });
        
        const enhanced = data.map(q => ({
          ...q,
          week: lessonMap.get(q.lessonId)?.week || null,
          weekNumber: lessonMap.get(q.lessonId)?.weekNumber || null,
          lessonTitle: lessonMap.get(q.lessonId)?.title || 'Unknown',
        }));
        
        setEnhancedQuestions(enhanced);
      } catch (err) {
        console.error('Error fetching lesson topic details:', err);
        setEnhancedQuestions(data.map(q => ({ 
          ...q, 
          week: null, 
          weekNumber: null,
          lessonTitle: 'Unknown'
        })));
      } finally {
        setLoadingLessons(false);
      }
    };

    fetchLessonTopicDetails();
  }, [data]);

  const currentWeek = useMemo(() => {
    if (!currentTermData || !currentTermData.currentWeek) {
      return 'Week1';
    }
    return `Week${currentTermData.currentWeek}`;
  }, [currentTermData]);

  const filteredQuestions = useMemo(() => {
    if (!enhancedQuestions || enhancedQuestions.length === 0) return [];
    if (!selectedWeek) return enhancedQuestions;
    return enhancedQuestions.filter(q => q.week === selectedWeek);
  }, [enhancedQuestions, selectedWeek]);

  // ✅ Pagination calculations
  const totalQuestions = filteredQuestions.length;
  const totalPages = Math.ceil(totalQuestions / questionsPerPage);
  const startIndex = (currentPage - 1) * questionsPerPage;
  const endIndex = Math.min(startIndex + questionsPerPage, totalQuestions);
  const currentPageQuestions = filteredQuestions.slice(startIndex, endIndex);

  // ✅ Pagination helpers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const canViewAnswerForQuestion = (question: EnhancedQuestionDto): boolean => {
    if (!isStudent) return true;
    if (!question.week) return true;
    return question.week !== currentWeek;
  };

  if (isLoading || loadingLessons) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loadingLessons ? 'Loading lesson details...' : 'Loading AI questions...'}
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 font-medium">Error loading AI questions</p>
        <p className="text-red-500 text-sm mt-1">{error?.message}</p>
      </div>
    );
  }

  if (!filteredQuestions || filteredQuestions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📚</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Questions Available
        </h3>
        <p className="text-gray-600">
          {selectedWeek 
            ? `No AI questions found for ${selectedWeek}. Try selecting a different week or subject.`
            : "No AI questions available for the selected subjects."}
        </p>
      </div>
    );
  }

  const isMultipleChoice = (q: LessonAIQuestionDto) =>
    q.optionA || q.optionB || q.optionC || q.optionD;

  const getOptionStyle = (optionLetter: string, correctOption?: string, canView?: boolean) =>
    showAnswers && canView && correctOption === optionLetter
      ? "bg-green-100 border-green-500 font-semibold"
      : "bg-gray-50 border-gray-300";

  const hasLockedQuestions = isStudent && filteredQuestions.some(q => !canViewAnswerForQuestion(q));
  const isViewingCurrentWeek = selectedWeek === currentWeek;
  const questionsWithWorkings = filteredQuestions.filter(q => hasWorkings(q)).length;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              AI Generated Questions
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {totalQuestions} question{totalQuestions !== 1 ? 's' : ''} found
              {selectedWeek && ` for ${selectedWeek}`}
              {questionsWithWorkings > 0 && (
                <span className="ml-2 text-indigo-600 font-medium">
                  • {questionsWithWorkings} with step-by-step workings
                </span>
              )}
            </p>
            {totalPages > 1 && (
              <p className="text-xs text-gray-500 mt-1">
                Showing {startIndex + 1}-{endIndex} of {totalQuestions}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showAnswers
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            {showAnswers ? "Hide Answers" : "Show Answers"}
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      {isStudent && hasLockedQuestions && (
        <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900 mb-1">
                Some Answers Are Hidden
              </h4>
              <p className="text-sm text-amber-800">
                {isViewingCurrentWeek 
                  ? `You're viewing questions for the current week (${currentWeek}). Answers for this week are locked.`
                  : `This view includes questions from the current week (${currentWeek}). Answers for current week questions are locked.`
                }
                <span className="block mt-1">
                  💪 Try your best to solve them on your own! Answers will be available next week.
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Questions Display */}
      <div className="space-y-6">
        {currentPageQuestions.map((q, pageIndex) => {
          const globalIndex = startIndex + pageIndex;
          const canViewThisAnswer = canViewAnswerForQuestion(q);
          const questionHasWorkings = hasWorkings(q);
          const isWorkingsExpanded = expandedWorkings.has(q.id);
          
          return (
            <div key={q.id} className="p-6 border-2 border-gray-200 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full font-bold text-sm flex-shrink-0">
                      {globalIndex + 1}
                    </span>
                    
                    {q.week && (
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        q.week === currentWeek
                          ? 'bg-orange-100 text-orange-700 border border-orange-300'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {q.week}
                        {q.week === currentWeek && ' (Current)'}
                      </span>
                    )}
                    
                    {q.difficulty && (
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          q.difficulty === "easy"
                            ? "bg-green-100 text-green-700"
                            : q.difficulty === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                      </span>
                    )}
                    {q.maxScore && (
                      <span className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
                        {q.maxScore} {q.maxScore === 1 ? "point" : "points"}
                      </span>
                    )}
                    
                    {questionHasWorkings && (
                      <span className="text-xs px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium flex items-center gap-1">
                        <Calculator className="w-3 h-3" />
                        Has Workings
                      </span>
                    )}
                    
                    {!canViewThisAnswer && (
                      <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-700 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Answer Locked
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-lg text-gray-900 leading-relaxed">
                    {q.questionText}
                  </p>
                </div>
              </div>

              {isMultipleChoice(q) ? (
                <div className="space-y-3 mb-4">
                  {q.optionA && (
                    <div className={`p-3 border-2 rounded-lg transition-all ${getOptionStyle("A", q.correctOption, canViewThisAnswer)}`}>
                      <span className="font-bold mr-3 text-gray-700">A.</span>
                      <span className="text-gray-900">{q.optionA}</span>
                    </div>
                  )}
                  {q.optionB && (
                    <div className={`p-3 border-2 rounded-lg transition-all ${getOptionStyle("B", q.correctOption, canViewThisAnswer)}`}>
                      <span className="font-bold mr-3 text-gray-700">B.</span>
                      <span className="text-gray-900">{q.optionB}</span>
                    </div>
                  )}
                  {q.optionC && (
                    <div className={`p-3 border-2 rounded-lg transition-all ${getOptionStyle("C", q.correctOption, canViewThisAnswer)}`}>
                      <span className="font-bold mr-3 text-gray-700">C.</span>
                      <span className="text-gray-900">{q.optionC}</span>
                    </div>
                  )}
                  {q.optionD && (
                    <div className={`p-3 border-2 rounded-lg transition-all ${getOptionStyle("D", q.correctOption, canViewThisAnswer)}`}>
                      <span className="font-bold mr-3 text-gray-700">D.</span>
                      <span className="text-gray-900">{q.optionD}</span>
                    </div>
                  )}
                  
                  {showAnswers && (
                    canViewThisAnswer && q.correctOption ? (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border-2 border-green-200 rounded-lg mt-3">
                        <span className="text-green-600 text-xl">✓</span>
                        <p className="text-sm text-green-800 font-semibold">
                          Correct Answer: <span className="text-green-900">{q.correctOption}</span>
                        </p>
                      </div>
                    ) : !canViewThisAnswer ? (
                      <div className="flex items-center gap-2 p-3 bg-gray-50 border-2 border-gray-200 rounded-lg mt-3">
                        <Lock className="w-4 h-4 text-gray-500" />
                        <p className="text-sm text-gray-600 font-medium">
                          Answer hidden for current week - available after {currentWeek} ends
                        </p>
                      </div>
                    ) : null
                  )}
                </div>
              ) : (
                showAnswers && (
                  canViewThisAnswer ? (
                    <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-600 text-xl">💡</span>
                        <p className="text-sm font-semibold text-blue-900">Expected Answer:</p>
                      </div>
                      <p className="text-gray-800 leading-relaxed">
                        {q.answerText ?? "Answer not available yet."}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-gray-500" />
                        <p className="text-sm text-gray-600 font-medium">
                          Answer hidden for current week - available after {currentWeek} ends
                        </p>
                      </div>
                    </div>
                  )
                )
              )}

              {/* Workings Display */}
              {showAnswers && canViewThisAnswer && questionHasWorkings && q.workings && (
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

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="font-semibold">Topic:</span> {q.lessonTitle || `ID ${q.lessonId}`}
                  </span>
                  {q.studentType && (
                    <span className="flex items-center gap-1">
                      <span className="font-semibold">Type:</span> {q.studentType}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  Question #{q.id}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-colors ${
                currentPage === 1
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="px-3 py-2 text-gray-400">...</span>
                  ) : (
                    <button
                      onClick={() => goToPage(page as number)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-colors ${
                currentPage === totalPages
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalPages}</span>
            </p>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-gray-700">
              <strong>{totalQuestions}</strong> questions total
            </span>
            {totalQuestions > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-sm text-gray-700">
                  <strong>{filteredQuestions.filter(q => isMultipleChoice(q)).length}</strong> multiple choice
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-sm text-gray-700">
                  <strong>{filteredQuestions.filter(q => !isMultipleChoice(q)).length}</strong> theory
                </span>
                {questionsWithWorkings > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-indigo-700 font-medium flex items-center gap-1">
                      <Calculator className="w-3 h-3" />
                      <strong>{questionsWithWorkings}</strong> with workings
                    </span>
                  </>
                )}
                {isStudent && hasLockedQuestions && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-amber-700 font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <strong>{filteredQuestions.filter(q => !canViewAnswerForQuestion(q)).length}</strong> locked
                    </span>
                  </>
                )}
              </>
            )}
          </div>
          {showAnswers && hasLockedQuestions && (
            <p className="text-xs text-amber-700 italic font-medium">
              🔒 Some answers are locked for the current week
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonAIQuestions;