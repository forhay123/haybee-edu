// src/features/lessons/types/lessonAIQuestionsTypes.ts

export interface LessonAIQuestionDto {
  id: number;
  questionText: string;
  answerText?: string;
  difficulty?: string;
  maxScore?: number;
  
  // ✅ Add multiple-choice fields
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string; // 'A', 'B', 'C', 'D'
  
  studentType?: "SCHOOL" | "HOME" | "ASPIRANT" | null;
  lessonId: number; // ✅ This should be lessonId, not lessonTopicId based on your DTO
}