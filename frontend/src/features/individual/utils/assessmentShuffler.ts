// frontend/src/features/individual/utils/assessmentShuffler.ts

/**
 * Assessment Shuffler Utility
 * Sprint 2: Handles randomization of assessment questions and options
 */

export interface Question {
  id: number;
  text: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "essay";
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
  order?: number;
}

export interface ShuffledQuestion extends Question {
  originalOrder: number;
  shuffledOptions?: string[];
  optionMapping?: Map<number, number>; // Maps shuffled index to original index
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Shuffle questions in an assessment
 */
export function shuffleQuestions(questions: Question[]): ShuffledQuestion[] {
  const questionsWithOrder = questions.map((q, index) => ({
    ...q,
    originalOrder: index,
  }));

  return shuffleArray(questionsWithOrder);
}

/**
 * Shuffle options within a question
 */
export function shuffleQuestionOptions(question: Question): ShuffledQuestion {
  if (!question.options || question.type !== "multiple_choice") {
    return {
      ...question,
      originalOrder: question.order || 0,
    };
  }

  const shuffledOptions = shuffleArray(question.options);
  const optionMapping = new Map<number, number>();

  // Create mapping of shuffled index to original index
  shuffledOptions.forEach((option, shuffledIndex) => {
    const originalIndex = question.options!.indexOf(option);
    optionMapping.set(shuffledIndex, originalIndex);
  });

  return {
    ...question,
    originalOrder: question.order || 0,
    shuffledOptions,
    optionMapping,
  };
}

/**
 * Shuffle both questions and their options
 */
export function shuffleAssessment(questions: Question[]): ShuffledQuestion[] {
  const shuffledQuestions = shuffleQuestions(questions);
  return shuffledQuestions.map((q) => shuffleQuestionOptions(q));
}

/**
 * Generate a seeded random number (for consistent shuffling)
 */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Shuffle array with seed for reproducibility
 */
export function shuffleArrayWithSeed<T>(array: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Shuffle questions with seed (for consistent student experience)
 */
export function shuffleQuestionsWithSeed(
  questions: Question[],
  studentId: number,
  assessmentId: number
): ShuffledQuestion[] {
  const seed = studentId * 1000 + assessmentId;
  const questionsWithOrder = questions.map((q, index) => ({
    ...q,
    originalOrder: index,
  }));

  return shuffleArrayWithSeed(questionsWithOrder, seed);
}

/**
 * Shuffle options with seed
 */
export function shuffleOptionsWithSeed(
  question: Question,
  studentId: number,
  questionId: number
): ShuffledQuestion {
  if (!question.options || question.type !== "multiple_choice") {
    return {
      ...question,
      originalOrder: question.order || 0,
    };
  }

  const seed = studentId * 10000 + questionId;
  const shuffledOptions = shuffleArrayWithSeed(question.options, seed);
  const optionMapping = new Map<number, number>();

  shuffledOptions.forEach((option, shuffledIndex) => {
    const originalIndex = question.options!.indexOf(option);
    optionMapping.set(shuffledIndex, originalIndex);
  });

  return {
    ...question,
    originalOrder: question.order || 0,
    shuffledOptions,
    optionMapping,
  };
}

/**
 * Shuffle entire assessment with seed
 */
export function shuffleAssessmentWithSeed(
  questions: Question[],
  studentId: number,
  assessmentId: number
): ShuffledQuestion[] {
  const shuffledQuestions = shuffleQuestionsWithSeed(questions, studentId, assessmentId);
  return shuffledQuestions.map((q) =>
    shuffleOptionsWithSeed(q, studentId, q.id)
  );
}

/**
 * Map shuffled answer back to original order
 */
export function mapAnswerToOriginal(
  shuffledQuestion: ShuffledQuestion,
  selectedOptionIndex: number
): number {
  if (!shuffledQuestion.optionMapping) {
    return selectedOptionIndex;
  }

  return shuffledQuestion.optionMapping.get(selectedOptionIndex) || selectedOptionIndex;
}

/**
 * Get original question order
 */
export function getOriginalQuestionOrder(shuffledQuestions: ShuffledQuestion[]): number[] {
  return shuffledQuestions.map((q) => q.originalOrder);
}

/**
 * Restore questions to original order
 */
export function restoreOriginalOrder(shuffledQuestions: ShuffledQuestion[]): Question[] {
  return [...shuffledQuestions].sort((a, b) => a.originalOrder - b.originalOrder);
}

/**
 * Validate shuffled assessment
 */
export function validateShuffledAssessment(
  original: Question[],
  shuffled: ShuffledQuestion[]
): boolean {
  if (original.length !== shuffled.length) {
    return false;
  }

  // Check that all original questions are present
  const originalIds = new Set(original.map((q) => q.id));
  const shuffledIds = new Set(shuffled.map((q) => q.id));

  return (
    originalIds.size === shuffledIds.size &&
    [...originalIds].every((id) => shuffledIds.has(id))
  );
}

/**
 * Calculate shuffle consistency score (for testing)
 */
export function calculateShuffleConsistency(
  original: Question[],
  shuffled: ShuffledQuestion[]
): number {
  let samePosition = 0;
  for (let i = 0; i < Math.min(original.length, shuffled.length); i++) {
    if (original[i].id === shuffled[i].id) {
      samePosition++;
    }
  }
  return (samePosition / original.length) * 100;
}