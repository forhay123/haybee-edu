
// ===== src/features/live/types/sessionTypes.ts =====
export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export interface ISession {
  id: number;
  title: string;
  description?: string;
  status: SessionStatus;
  scheduledStartTime: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  scheduledDurationMinutes: number;
  subjectId: number;
  lessonTopicId: number;
  teacherId: number;
  maxParticipants: number;
  participantCount?: number;
}
