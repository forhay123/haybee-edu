import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import axiosInstance from "../../../api/axios";
import {
  Calendar,
  Video,
  TrendingUp,
  Clock,
  Users,
  PlayCircle,
  ShieldCheck,
  BarChart3,
  Settings,
  Eye,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import toast from "react-hot-toast";

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
  teacherName: string;
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
  teacherName?: string;
}

interface PlatformAnalytics {
  totalTeachers: number;
  totalStudents: number;
  totalSessions: number;
  activeSessions: number;
  totalVideos: number;
  totalViews: number;
  averageCompletionRate: number;
  totalWatchTimeHours: number;
}

// ----------------------
// HELPER FUNCTIONS
// ----------------------

/**
 * ✅ Safely format date - returns fallback if invalid
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
 * ✅ FIXED: Safely format duration - handles 0, null, undefined, and NaN
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
 * ✅ Safely get view count
 */
const getViewCount = (video: RecentVideo): number => {
  return video.viewCount ?? video.totalViews ?? 0;
};

/**
 * ✅ Safely get duration
 */
const getDuration = (video: RecentVideo): number | null => {
  return video.durationSeconds ?? video.duration ?? null;
};

/**
 * ✅ Safely get upload date
 */
const getUploadDate = (video: RecentVideo): string | null => {
  return video.uploadedAt ?? video.uploadDate ?? null;
};

// ----------------------
// COMPONENT
// ----------------------
const AdminWidget: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes("ADMIN");
  const [processingMissed, setProcessingMissed] = useState(false);

  // ✅ Mutation for processing missed assessments
  const processMissedMutation = useMutation({
    mutationFn: async () => {
      const response = await axiosInstance.post('/assessments/admin/process-missed-assessments');
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(
        `✅ Processed ${data.assessmentsProcessed} assessments. Created ${data.zeroSubmissionsCreated} zero-score submissions.`,
        { duration: 5000 }
      );
      setProcessingMissed(false);
    },
    onError: (error: any) => {
      toast.error(
        `❌ Failed to process missed assessments: ${error.response?.data?.message || error.message}`,
        { duration: 5000 }
      );
      setProcessingMissed(false);
    }
  });

  const handleProcessMissedAssessments = () => {
    if (processingMissed) return;
    
    const confirmed = window.confirm(
      'This will create zero-score submissions for all students who missed gradebook assessment deadlines. Continue?'
    );
    
    if (confirmed) {
      setProcessingMissed(true);
      processMissedMutation.mutate();
    }
  };

  // ----------------------
  // QUERY: Today's all live sessions
  // ----------------------
  const { data: todaySessions = [], isLoading: loadingSessions } = useQuery<LiveSession[]>({
    queryKey: ["admin-today-sessions"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const res = await axiosInstance.get(`/live-sessions`, {
        params: {
          status: ["SCHEDULED", "LIVE"],
          dateFrom: today,
          dateTo: today,
        },
      });
      return (res.data || []).slice(0, 3);
    },
    enabled: isAdmin,
    retry: 1,
  });

  // ----------------------
  // QUERY: Recent video uploads (all teachers)
  // ----------------------
  const { data: recentVideos = [], isLoading: loadingVideos } = useQuery<RecentVideo[]>({
    queryKey: ["admin-recent-videos"],
    queryFn: async () => {
      const res = await axiosInstance.get("/videos", {
        params: { limit: 5, sortBy: "uploadedAt", order: "DESC" },
      });
      return (res.data || []).slice(0, 4);
    },
    enabled: isAdmin,
    retry: 1,
  });

  // ----------------------
  // QUERY: Platform-wide analytics
  // ----------------------
  const { data: platformStats, isLoading: loadingStats } = useQuery<PlatformAnalytics>({
    queryKey: ["admin-platform-stats"],
    queryFn: async () => {
      // Fetch platform-wide stats using correct endpoints
      const [videosRes, allUsersRes, allSessionsRes] = await Promise.all([
        axiosInstance.get("/video-analytics/admin/platform-stats").catch(() => ({ data: {} })),
        axiosInstance.get("/users").catch(() => ({ data: [] })),
        axiosInstance.get("/live-sessions", { 
          params: { 
            status: ["SCHEDULED", "LIVE", "ENDED", "CANCELLED"] 
          } 
        }).catch(() => ({ data: [] })),
      ]);

      // Calculate stats from actual data
      const allUsers = Array.isArray(allUsersRes.data) ? allUsersRes.data : [];
      const allSessions = Array.isArray(allSessionsRes.data) ? allSessionsRes.data : [];
      
      const totalTeachers = allUsers.filter((u: any) => 
        u.roles?.includes("TEACHER") || u.roles?.includes("ROLE_TEACHER")
      ).length;
      
      const totalStudents = allUsers.filter((u: any) => 
        u.roles?.includes("STUDENT") || u.roles?.includes("ROLE_STUDENT")
      ).length;
      
      const activeSessions = allSessions.filter((s: any) => 
        s.status === "LIVE"
      ).length;

      return {
        totalTeachers,
        totalStudents,
        totalSessions: allSessions.length,
        activeSessions,
        totalVideos: videosRes.data?.totalVideos || 0,
        totalViews: videosRes.data?.totalViews || 0,
        averageCompletionRate: videosRes.data?.averageCompletionRate || 0,
        totalWatchTimeHours: videosRes.data?.totalWatchTimeHours || 0,
      };
    },
    enabled: isAdmin,
    retry: 1,
  });

  if (!isAdmin) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium">
        ⚠ You must be an ADMIN to see this section.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------------------- */}
      {/* PLATFORM OVERVIEW */}
      {/* ---------------------- */}
      {loadingStats ? (
        <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-md border border-indigo-200">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-indigo-200 rounded w-1/3"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-indigo-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : platformStats && (
        <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg shadow-md border border-indigo-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Platform Overview
            </h3>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
              Admin View
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border border-indigo-100">
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Teachers
              </p>
              <p className="text-2xl font-bold text-indigo-600">
                {platformStats.totalTeachers}
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-indigo-100">
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Students
              </p>
              <p className="text-2xl font-bold text-indigo-600">
                {platformStats.totalStudents}
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-indigo-100">
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Sessions
              </p>
              <p className="text-2xl font-bold text-indigo-600">
                {platformStats.totalSessions}
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-indigo-100">
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Video className="w-3 h-3" />
                Videos
              </p>
              <p className="text-2xl font-bold text-indigo-600">
                {platformStats.totalVideos}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/* VIDEO ANALYTICS */}
      {/* ---------------------- */}
      {loadingStats ? (
        <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-md border border-purple-200">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-purple-200 rounded w-1/3"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-purple-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : platformStats && (
        <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-md border border-purple-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Platform Video Analytics
            </h3>
            <Link
              to="/videos/analytics"
              className="text-sm text-purple-600 hover:underline font-medium"
            >
              View Details
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-lg border border-purple-100">
              <p className="text-xs text-gray-600 mb-1">Total Views</p>
              <p className="text-2xl font-bold text-purple-600">
                {platformStats.totalViews.toLocaleString()}
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-purple-100">
              <p className="text-xs text-gray-600 mb-1">Avg. Completion</p>
              <p className="text-2xl font-bold text-purple-600">
                {platformStats.averageCompletionRate.toFixed(0)}%
              </p>
            </div>

            <div className="bg-white p-3 rounded-lg border border-purple-100">
              <p className="text-xs text-gray-600 mb-1">Total Watch Time</p>
              <p className="text-2xl font-bold text-purple-600">
                {platformStats.totalWatchTimeHours.toFixed(0)}h
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/* TODAY'S LIVE SESSIONS */}
      {/* ---------------------- */}
      {loadingSessions ? (
        <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg shadow-md border border-blue-200">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-blue-200 rounded w-1/3"></div>
            <div className="h-16 bg-blue-100 rounded"></div>
          </div>
        </div>
      ) : todaySessions.length > 0 && (
        <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg shadow-md border border-blue-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Today's Sessions (All Teachers)
            </h3>
            <Link
              to="/live-sessions"
              className="text-sm text-blue-600 hover:underline font-medium"
            >
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
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {session.title}
                    </p>

                    {session.status === "LIVE" && (
                      <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span>
                        LIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="font-medium text-blue-600">
                      {session.teacherName}
                    </span>

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

                <Link
                  to={`/live-sessions/${session.id}`}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition text-xs font-medium flex-shrink-0 ml-2"
                >
                  {session.status === "LIVE" ? "Join" : "Manage"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------- */}
      {/* RECENT VIDEO UPLOADS */}
      {/* ---------------------- */}
      {loadingVideos ? (
        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md border border-green-200">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-green-200 rounded w-1/3"></div>
            <div className="h-16 bg-green-100 rounded"></div>
          </div>
        </div>
      ) : recentVideos.length > 0 && (
        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md border border-green-200 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-green-600" />
              Recent Video Uploads (All Teachers)
            </h3>
            <Link
              to="/videos"
              className="text-sm text-green-600 hover:underline font-medium"
            >
              View all
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
                  className="block p-3 bg-white rounded-lg border border-green-200 hover:border-green-400 transition"
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail placeholder */}
                    <div className="flex-shrink-0 w-16 h-12 bg-gradient-to-br from-green-100 to-emerald-100 rounded flex items-center justify-center">
                      <PlayCircle className="w-6 h-6 text-green-600" />
                    </div>

                    {/* Video info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 truncate text-sm">
                          {video.title || "Untitled Video"}
                        </p>

                        {/* Status badges */}
                        {video.status === "PUBLISHED" ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                            Published
                          </span>
                        ) : video.status === "PROCESSING" ? (
                          <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                            Processing...
                          </span>
                        ) : video.status === "PENDING" ? (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                            Pending
                          </span>
                        ) : video.status === "DRAFT" ? (
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                            Draft
                          </span>
                        ) : video.status === "FAILED" ? (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap">
                            Failed
                          </span>
                        ) : null}
                      </div>

                      {/* Meta information */}
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        {video.teacherName && (
                          <>
                            <span className="font-medium text-green-600 truncate">
                              {video.teacherName}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span className="truncate">{video.subjectName}</span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {viewCount.toLocaleString()} views
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(duration)}
                        </span>
                        <span>•</span>
                        <span>{dateDisplay}</span>
                      </div>
                    </div>
                  </div>
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
      {/* ADMIN QUICK ACTIONS */}
      {/* ---------------------- */}
      <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h3>

        {/* ✅ Process Missed Assessments Button */}
        <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Process Missed Assessments
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Automatically create zero-score submissions for students who missed gradebook assessment deadlines.
                This normally runs hourly, but you can trigger it manually here.
              </p>
              <button
                onClick={handleProcessMissedAssessments}
                disabled={processingMissed}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition text-sm font-semibold flex items-center gap-2"
              >
                {processingMissed ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Process Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link
            to="/users/admin"
            className="flex items-center gap-2 p-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition text-sm font-medium"
          >
            <Users className="w-4 h-4" />
            Manage Users
          </Link>

          <Link
            to="/live-sessions"
            className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
          >
            <Calendar className="w-4 h-4" />
            All Sessions
          </Link>

          <Link
            to="/videos"
            className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-sm font-medium"
          >
            <Video className="w-4 h-4" />
            All Videos
          </Link>

          <Link
            to="/admin/assessments/dashboard"
            className="flex items-center gap-2 p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-sm font-medium"
          >
            <TrendingUp className="w-4 h-4" />
            Analytics
          </Link>

          <Link
            to="/subjects/admin"
            className="flex items-center gap-2 p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition text-sm font-medium"
          >
            <BarChart3 className="w-4 h-4" />
            Subjects
          </Link>

          <Link
            to="/admin/announcements"
            className="flex items-center gap-2 p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            Announcements
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminWidget;