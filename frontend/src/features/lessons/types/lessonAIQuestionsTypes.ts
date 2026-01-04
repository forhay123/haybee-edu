// src/features/lessons/types/lessonAIQuestionsTypes.ts
// ✅ ENHANCED: Added workings field for step-by-step solutions

export interface LessonAIQuestionDto {
  id: number;
  questionText: string;
  answerText?: string;
  difficulty?: string;
  maxScore?: number;
  
  // Multiple-choice fields
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string; // 'A', 'B', 'C', 'D'
  
  // ✅ NEW: Step-by-step workings for calculation-based questions
  workings?: string | null;
  
  studentType?: "SCHOOL" | "HOME" | "ASPIRANT" | null;
  lessonId: number;
}

// ✅ Enhanced question with week information
export interface EnhancedQuestionDto extends LessonAIQuestionDto {
  week?: string | null;
  weekNumber?: number | null;
  lessonTitle?: string;
}

// ✅ Helper function to check if question has workings
export const hasWorkings = (question: LessonAIQuestionDto): boolean => {
  return question.workings !== null && 
         question.workings !== undefined && 
         question.workings.trim() !== '';
};

// ✅ Helper function to check if question is MCQ
export const isMCQ = (question: LessonAIQuestionDto): boolean => {
  return !!(question.optionA || question.optionB || question.optionC || question.optionD);
};

// ✅ Helper function to check if question is theory
export const isTheory = (question: LessonAIQuestionDto): boolean => {
  return !isMCQ(question);
};