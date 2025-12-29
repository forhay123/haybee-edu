import axios from '@/api/axios';
import { getUserRole } from '@/utils/auth';

const BASE_URL = '/live-sessions';

// ===== SessionStatus Enum =====
export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export interface CreateSessionRequest {
  subjectId: number;
  lessonTopicId?: number;
  classId: number;
  termId: number;
  scheduledStartTime: string;
  scheduledDurationMinutes: number;
  title: string;
  description?: string;
  maxParticipants?: number;
  meetingPassword?: string;
  timezone?: string;
}

export interface LiveSessionDto {
  id: number;
  title: string;
  description?: string;
  status: SessionStatus;
  scheduledStartTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  scheduledDurationMinutes: number;
  zoomMeetingId?: string;
  joinUrl?: string;
  startUrl?: string;
  meetingPassword?: string;
  teacherId: number;
  teacherName: string;
  subjectId: number;
  subjectName: string;
  classId: number;
  className: string;
  lessonTopicId?: number;
  lessonTopicTitle?: string;
  attendanceCount?: number;
  maxParticipants: number;
  hasRecording?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionDetailsDto extends LiveSessionDto {
  teacherEmail?: string;
  termId?: number;
  termName?: string;
  enrolledStudentsCount?: number;
  attendanceList: SessionAttendance[];
  recordings: Recording[];
}

export interface SessionAttendance {
  id: number;
  sessionId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  joinedAt: string;
  leftAt?: string;
  durationMinutes: number;
  createdAt: string;
}

export interface Recording {
  id: number;
  sessionId: number;
  zoomRecordingId?: string;
  zoomDownloadUrl?: string;
  status: string;
  fileType: string;
  fileSizeBytes: number;
  durationSeconds: number;
  youtubeVideoId?: string;
  downloadStartedAt?: string;
  downloadCompletedAt?: string;
  processingCompletedAt?: string;
  createdAt: string;
}

export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  scheduledStartTime?: string;
  scheduledDurationMinutes?: number;
  maxParticipants?: number;
}

export interface LiveSessionJoinDto {
  sessionId: number;
  joinUrl: string;
  meetingPassword?: string;
}

export interface SessionRecordingDto {
  id: number;
  sessionId: number;
  recordingUrl: string;
  downloadUrl: string;
  durationSeconds: number;
  fileSizeBytes: number;
  hasTranscript: boolean;
  recordedAt: string;
  createdAt: string;
}

export interface SessionAttendanceDto {
  id: number;
  sessionId: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  joinedAt: string;
  leftAt?: string;
  durationMinutes: number;
}

// Create session
export const createSession = (data: CreateSessionRequest) =>
  axios.post<LiveSessionDto>(BASE_URL, data);

// ✅ FIXED - Role-aware session fetching with multi-status support
export const getSessions = (params?: {
  status?: string | string[];
  subjectId?: number;
  teacherId?: number;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const userRole = getUserRole();

  console.log('🔍 getSessions called with:', {
    userRole,
    params,
  });

  const query = new URLSearchParams();

  // Handle status parameter - can be string or array
  if (params?.status) {
    if (Array.isArray(params.status)) {
      params.status.forEach((s) => query.append('status', s));
    } else {
      query.append('status', params.status);
    }
  }

  if (params?.subjectId) {
    query.append('subjectId', params.subjectId.toString());
  }
  if (params?.teacherId) {
    query.append('teacherId', params.teacherId.toString());
  }
  if (params?.dateFrom) {
    query.append('dateFrom', params.dateFrom);
  }
  if (params?.dateTo) {
    query.append('dateTo', params.dateTo);
  }

  const queryString = query.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

  console.log('📡 Fetching from:', url);
  return axios.get<LiveSessionDto[]>(url);
};

// Get session details
export const getSessionDetails = (id: number) =>
  axios.get<SessionDetailsDto>(`${BASE_URL}/${id}`);

// Update session
export const updateSession = (id: number, data: UpdateSessionRequest) =>
  axios.put<LiveSessionDto>(`${BASE_URL}/${id}`, data);

// Start session
export const startSession = (id: number) =>
  axios.post<LiveSessionDto>(`${BASE_URL}/${id}/start`, {});

// End session
export const endSession = (id: number) =>
  axios.post<LiveSessionDto>(`${BASE_URL}/${id}/end`, {});

// Cancel session
export const cancelSession = (id: number) =>
  axios.delete(`${BASE_URL}/${id}`);

// Get upcoming sessions (role-aware endpoint)
export const getUpcomingSessions = () =>
  axios.get<LiveSessionDto[]>(`${BASE_URL}/upcoming`);

// Join session
export const joinSession = (sessionId: number) =>
  axios.post<LiveSessionJoinDto>(`${BASE_URL}/${sessionId}/join`, {});

// Mark attendance
export const markAttendance = (sessionId: number) =>
  axios.post(`${BASE_URL}/${sessionId}/attendance`, {});

// Get attendance
export const getAttendance = (sessionId: number) =>
  axios.get<SessionAttendanceDto[]>(`${BASE_URL}/${sessionId}/attendance`);

// Get recordings
export const getRecordings = (sessionId: number) =>
  axios.get<SessionRecordingDto[]>(`${BASE_URL}/${sessionId}/recordings`);

// Get sessions by subject
export const getSessionsBySubject = (
  subjectId: number,
  dateFrom?: string,
  dateTo?: string
) => {
  const params = new URLSearchParams();
  if (dateFrom) params.append('startDate', dateFrom);
  if (dateTo) params.append('endDate', dateTo);

  const query = params.toString();
  const url = query
    ? `${BASE_URL}/subject/${subjectId}?${query}`
    : `${BASE_URL}/subject/${subjectId}`;

  return axios.get<LiveSessionDto[]>(url);
};

// Get sessions by class
export const getSessionsByClass = (
  classId: number,
  dateFrom?: string,
  dateTo?: string
) => {
  const params = new URLSearchParams();
  if (dateFrom) params.append('startDate', dateFrom);
  if (dateTo) params.append('endDate', dateTo);

  const query = params.toString();
  const url = query
    ? `${BASE_URL}/class/${classId}?${query}`
    : `${BASE_URL}/class/${classId}`;

  return axios.get<LiveSessionDto[]>(url);
};

// Get teacher sessions
export const getTeacherSessions = (
  dateFrom?: string,
  dateTo?: string
) => {
  const params = new URLSearchParams();
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);

  const query = params.toString();
  const url = query
    ? `${BASE_URL}/teacher/my-sessions?${query}`
    : `${BASE_URL}/teacher/my-sessions`;

  return axios.get<LiveSessionDto[]>(url);
};