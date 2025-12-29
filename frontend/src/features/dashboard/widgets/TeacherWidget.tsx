import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../../../api/axios";
import { 
  Calendar, Video, TrendingUp, Clock, Users, PlayCircle, 
  UploadCloud, BarChart2, FileCheck, AlertTriangle, FileText 
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

// ----------------------
// INTERFACES
// ----------------------
interface LiveSession {
  id: number;
  title: string;
  scheduledStartTime: string;
  scheduledDurationMinutes: number;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  subjectName: string;
  attendanceCount?: number;
  joinUrl?: string;
}

interface RecentVideo {
  id: number;
  title: string;
  uploadedAt?: string;
  uploadDate?: string;
  status: "PROCESSING" | "PUBLISHED" | "DRAFT" | "PENDING" | "FAILED";
  viewCount?: number;
  totalViews?: number;
  duration?: number;
  durationSeconds?: number;
  subjectName: string;
}

interface VideoAnalyticsSummary {
  totalVideos: number;
  totalViews: number;
  averageCompletionRate: number;
  totalWatchTimeHours: number;
}

// ✅ NEW: Grading stats interface
interface GradingStats {
  totalPendingSubmissions: number;
  totalPendingAnswers: number;
  uniqueStudents: number;
  recentSubmissions: {
    id: number;
    assessmentTitle: string;
    studentName: string;
    submittedAt: string;
    pendingAnswersCount: number;
  }[];
}

// ----------------------
// HELPER FUNCTIONS
// ----------------------

/**
 * Safely format date - returns fallback if invalid
 */
const safeFormatDate = (
  dateString: string | undefined | null,
  formatString: string,
  fallback: string = "N/A"
): string => {
  if (!dateString) return fallback;

  try {
    const date = typeof dateString === "string" ? parseISO(dateString) : new Date(dateString);
    if (isValid(date)) {
      return format(date, formatString);
    }
  } catch (error) {
    console.warn("Invalid date:", dateString);
  }

  return fallback;
};

/**
 * Safely format duration - handles 0, null, undefined, and NaN
 */
const formatDuration = (seconds: number | undefined | null): string => {
  if (!seconds || isNaN(seconds) || seconds === 0) {
    return "Processing...";
  }
  
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Safely get view count (preferring viewCount if present)
 */
const getViewCount = (video: RecentVideo): number => {
  return video.viewCount ?? video.totalViews ?? 0;
};

/**
 * Safely get duration (preferring durationSeconds if present)
 */
const getDuration = (video: RecentVideo): number | null => {
  return video.durationSeconds ?? video.duration ?? null;
};

/**
 * Safely get upload date string (preferring uploadedAt)
 */
const getUploadDate = (video: RecentVideo): string | null => {
  return video.uploadedAt ?? video.uploadDate ?? null;
};

// ----------------------
// COMPONENT
// ----------------------
const TeacherWidget: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  const isTeacher = user?.roles.includes("TEACHER") ?? false;

  // ---
  // QUERY: Today's live sessions
  // ---
  const { data: todaySessions = [], isLoading: loadingSessions } = useQuery<LiveSession[]>({
    queryKey: ["teacher-today-sessions"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await axiosInstance.get(`/live-sessions/teacher/my-sessions`, {
        params: { date: today },
      });
      return (res.data || []).slice(0, 3);
    },
    enabled: isTeacher,
    retry: 1,
  });

  // ---
  // QUERY: Recent video uploads
  // ---
  const { data: recentVideos = [], isLoading: loadingVideos } = useQuery<RecentVideo[]>({
    queryKey: ["teacher-recent-videos"],
    queryFn: async () => {
      const res = await axiosInstance.get("/videos", {
        params: { limit: 5, sortBy: "uploadedAt", order: "DESC" },
      });
      return (res.data || []).slice(0, 4);
    },
    enabled: isTeacher,
    retry: 1,
  });

  // ---
  // QUERY: Video analytics summary
  // ---
  const { data: videoStats, isLoading: loadingStats } = useQuery<VideoAnalyticsSummary>({
    queryKey: ["teacher-video-stats"],
    queryFn: async () => {
      const res = await axiosInstance.get("/video-analytics/teacher/summary");
      return res.data;
    },
    enabled: isTeacher,
    retry: 1,
  });

  // ✅ NEW: QUERY: Grading stats
  const { data: gradingStats, isLoading: loadingGrading } = useQuery<GradingStats>({
    queryKey: ["teacher-grading-stats"],
    queryFn: async () => {
      const res = await axiosInstance.get("/assessments/grading-stats");
      return res.data;
    },
    enabled: isTeacher,
    retry: 1,
    refetchInterval: 30000, // ✅ Refresh every 30 seconds
  });

  if (!isTeacher) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
        ⚠ You must be a <strong>TEACHER</strong> to see this section.
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">

      {/* ---------------------- */}
      {/* TODAY'S LIVE SESSIONS */}
      {/* ---------------------- */}
      {loadingSessions ? (
        <SessionSkeleton />
      ) : todaySessions.length > 0 && (
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md border border-blue-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Today's Sessions
            </h3>
            <Link to="/live-classes" className="text-sm text-blue-600 hover:underline font-medium">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate text-sm">{session.title}</p>
                    {session.status === "LIVE" && (
                      <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                        LIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {safeFormatDate(session.scheduledStartTime, "h:mm a")}
                    </span>

                    {session.attendanceCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {session.attendanceCount} students
                      </span>
                    )}
                  </div>
                </div>

                {session.status === "LIVE" ? (
                  <Link
                    to={session.joinUrl || `/live-sessions/${session.id}`}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-xs font-medium flex-shrink-0 ml-2"
                  >
                    Join
                  </Link>
                ) : session.status === "SCHEDULED" ? (
                  <Link
                    to={`/live-sessions/${session.id}`}
                    className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition text-xs font-medium flex-shrink-0 ml-2"
                  >
                    Start
                  </Link>
                ) : (
                  <span className="text-xs text-gray-500 flex-shrink-0 ml-2">Ended</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/* ✅ NEW: PENDING GRADING STATS */}
      {/* ---------------------- */}
      {loadingGrading ? (
        <GradingSkeleton />
      ) : gradingStats && gradingStats.totalPendingSubmissions > 0 && (
        <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow-md border border-yellow-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Pending Grading
            </h3>
            <Link to="/teacher/pending-grading" className="text-sm text-yellow-600 hover:underline font-medium">
              Grade Now →
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-3 rounded-lg border border-yellow-100">
              <p className="text-xs text-gray-600 font-medium mb-1">Submissions</p>
              <p className="text-2xl font-bold text-yellow-600">
                {gradingStats.totalPendingSubmissions}
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-yellow-100">
              <p className="text-xs text-gray-600 font-medium mb-1">Answers</p>
              <p className="text-2xl font-bold text-orange-600">
                {gradingStats.totalPendingAnswers}
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-yellow-100">
              <p className="text-xs text-gray-600 font-medium mb-1">Students</p>
              <p className="text-2xl font-bold text-yellow-700">
                {gradingStats.uniqueStudents}
              </p>
            </div>
          </div>

          {/* Recent Pending Submissions */}
          {gradingStats.recentSubmissions && gradingStats.recentSubmissions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 mb-2">Recent Submissions:</p>
              {gradingStats.recentSubmissions.slice(0, 3).map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200 hover:border-yellow-400 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {submission.assessmentTitle}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                      <span>{submission.studentName}</span>
                      <span>•</span>
                      <span className="text-yellow-700 font-medium">
                        {submission.pendingAnswersCount} pending
                      </span>
                      <span>•</span>
                      <span>{safeFormatDate(submission.submittedAt, "MMM d, h:mm a")}</span>
                    </div>
                  </div>
                  <Link
                    to={`/teacher/grade-submission/${submission.id}`}
                    className="bg-yellow-600 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-700 transition text-xs font-medium flex-shrink-0 ml-2"
                  >
                    Grade
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Action Button */}
          <Link
            to="/teacher/pending-grading"
            className="block text-center mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium text-sm"
          >
            View All Pending ({gradingStats.totalPendingSubmissions})
          </Link>
        </div>
      )}

      {/* ---------------------- */}
      {/* VIDEO ANALYTICS SUMMARY */}
      {/* ---------------------- */}
      {loadingStats ? (
        <StatsSkeleton />
      ) : videoStats && (
        <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-md border border-purple-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-purple-600" />
              Video Analytics Summary
            </h3>

            <Link to="/videos/analytics" className="text-sm text-purple-600 hover:underline font-medium">
              View Details
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"> 
            <StatCard icon={Video} label="Total Videos" value={videoStats.totalVideos || 0} color="purple" />
            <StatCard icon={PlayCircle} label="Total Views" value={(videoStats.totalViews || 0).toLocaleString()} color="purple" />
            <StatCard icon={TrendingUp} label="Avg. Completion" value={`${(videoStats.averageCompletionRate || 0).toFixed(0)}%`} color="purple" />
            <StatCard icon={Clock} label="Watch Time" value={`${(videoStats.totalWatchTimeHours || 0).toFixed(0)}h`} color="purple" />
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/* RECENT VIDEO UPLOADS */}
      {/* ---------------------- */}
      {loadingVideos ? (
        <VideoSkeleton />
      ) : recentVideos.length > 0 && (
        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md border border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-green-600" />
              Recent Uploads
            </h3>

            <Link to="/videos/upload" className="text-sm text-green-600 hover:underline font-medium">
              Upload new →
            </Link>
          </div>

          <div className="space-y-3">
            {recentVideos.map((video) => {
              const uploadDate = getUploadDate(video);
              const viewCount = getViewCount(video);
              const duration = getDuration(video);
              const dateDisplay = safeFormatDate(uploadDate, "MMM d", "Recent");

              return (
                <Link
                  key={video.id}
                  to={`/videos/${video.id}`}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200 hover:border-green-400 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 truncate text-sm">
                        {video.title || "Untitled Video"}
                      </p>

                      {video.status === "PUBLISHED" ? (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                          Published
                        </span>
                      ) : video.status === "PROCESSING" ? (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">
                          Processing...
                        </span>
                      ) : video.status === "DRAFT" ? (
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                          Draft
                        </span>
                      ) : video.status === "FAILED" ? (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                          Failed
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="font-medium text-green-700">{video.subjectName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <PlayCircle className="w-3 h-3" />
                        {viewCount.toLocaleString()} views
                      </span>
                      <span>•</span>
                      <span>{formatDuration(duration)}</span>
                      <span>•</span>
                      <span>{dateDisplay}</span>
                    </div>
                  </div>

                  <span className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition text-xs font-medium flex-shrink-0 ml-2">
                    View
                  </span>
                </Link>
              );
            })}
          </div>

          <Link
            to="/videos"
            className="block text-center text-sm text-green-600 hover:underline font-medium mt-3"
          >
            View all videos →
          </Link>
        </div>
      )}

      {/* ---------------------- */}
      {/* QUICK ACTIONS */}
      {/* ---------------------- */}
      <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to="/live-classes/create"
            className="flex flex-col items-center justify-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-xs font-medium h-24 text-center border border-blue-200"
          >
            <Calendar className="w-5 h-5" />
            Schedule Session
          </Link>

          <Link
            to="/videos/upload"
            className="flex flex-col items-center justify-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-xs font-medium h-24 text-center border border-green-200"
          >
            <UploadCloud className="w-5 h-5" />
            Upload Video
          </Link>

          {/* ✅ NEW: Pending Grading Quick Action with Badge */}
          <Link
            to="/teacher/pending-grading"
            className="flex flex-col items-center justify-center gap-2 p-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition text-xs font-medium h-24 text-center border border-yellow-200 relative"
          >
            <FileCheck className="w-5 h-5" />
            Grade Submissions
            {gradingStats && gradingStats.totalPendingSubmissions > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {gradingStats.totalPendingSubmissions}
              </span>
            )}
          </Link>

          <Link
            to="/assessments/create"
            className="flex flex-col items-center justify-center gap-2 p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-xs font-medium h-24 text-center border border-purple-200"
          >
            <FileText className="w-5 h-5" />
            Create Assessment
          </Link>
        </div>
      </div>
    </div>
  );
};

// ---
// Helper Components (Skeletons and StatCard)
// ---

const SessionSkeleton: React.FC = () => (
  <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md border border-blue-200">
    <div className="animate-pulse space-y-3">
      <div className="h-6 bg-blue-200 rounded w-1/3"></div>
      <div className="h-16 bg-blue-100 rounded"></div>
      <div className="h-16 bg-blue-100 rounded"></div>
    </div>
  </div>
);

const StatsSkeleton: React.FC = () => (
  <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-md border border-purple-200">
    <div className="animate-pulse space-y-3">
      <div className="h-6 bg-purple-200 rounded w-1/3"></div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-purple-100 rounded"></div>
        ))}
      </div>
    </div>
  </div>
);

const VideoSkeleton: React.FC = () => (
  <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md border border-green-200">
    <div className="animate-pulse space-y-3">
      <div className="h-6 bg-green-200 rounded w-1/3"></div>
      <div className="h-16 bg-green-100 rounded"></div>
      <div className="h-16 bg-green-100 rounded"></div>
    </div>
  </div>
);

// ✅ NEW: Grading Skeleton
const GradingSkeleton: React.FC = () => (
  <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg shadow-md border border-yellow-200">
    <div className="animate-pulse space-y-3">
      <div className="h-6 bg-yellow-200 rounded w-1/3"></div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-yellow-100 rounded"></div>
        ))}
      </div>
      <div className="h-20 bg-yellow-100 rounded"></div>
    </div>
  </div>
);

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white p-4 rounded-lg border border-purple-100 flex flex-col justify-between h-24">
    <p className="text-xs text-gray-600 font-medium mb-1 truncate">{label}</p>
    <div className="flex items-center justify-between">
      <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
      <Icon className={`w-6 h-6 text-${color}-400 opacity-60 flex-shrink-0`} />
    </div>
  </div>
);

export default TeacherWidget;