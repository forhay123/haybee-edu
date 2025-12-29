export interface LessonTopicDto {
  id: number;
  topicTitle: string;
  description?: string;
  weekNumber: number;
  subjectId: number;
  termId?: number;
  fileUrl?: string;

  termName?: string;
  subjectName?: string; 
  // AI-generated lesson processing fields
  status?: "pending" | "processing" | "done" | "failed";
  progress?: number;

  // Number of AI-generated questions
  questionCount?: number;

  // New field to indicate aspirant material
  isAspirantMaterial?: boolean;
}
