import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMyDailyProgress, useMyHistory } from "../../progress/hooks/useDailyPlanner";
import { useMyProfile } from "../../studentProfiles/hooks/useStudentProfiles";
import { useWatchHistory } from "../../videos/hooks/useVideoLessons";
import { useUpcomingSessions } from "../../live/hooks/useLiveSessions";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "../../../api/axios";
import { BookOpen, Clock, CheckCircle, Video, TrendingUp, Calendar, PlayCircle, Eye, Users, AlertCircle, Award, CheckCircle2, XCircle } from "lucide-react";
import { format, isValid, parseISO, startOfWeek, endOfWeek } from "date-fns";
import ProfilePendingScreen from "../../individual/components/student/ProfilePendingScreen";
import { useAuth } from "../../auth/useAuth";

// ----------------------
// INTERFACES
// ----------------------
interface LiveSession {
  id: number;
  title: string;
  description?: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
  scheduledStartTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  scheduledDurationMinutes: number;
  subjectId: number;
  subjectName: string;
  teacherId: number;
  teacherName: string;
  classId: number;
  className: string;
  joinUrl?: string;
  maxParticipants: number;
  attendanceCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface RecommendedVideo {
  id: number;
  title: string;
  description?: string;
  subjectName: string;
  teacherName: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  totalViews: number;
  status: string;
}

// ----------------------
// HELPER FUNCTIONS
// ----------------------
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

const formatDurationShort = (seconds: number | undefined | null): string => {
  if (!seconds || isNaN(seconds) || seconds === 0) {
    return "0m";
  }
  
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
};

// ----------------------
// COMPONENT
// ----------------------
const StudentWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: dailyProgress, isLoading: loadingProgress, isError } = useMyDailyProgress();
  const { data: profile, isLoading: loadingProfile } = useMyProfile({ enabled: true });
  
  const profileLoaded = !!profile?.id;
  const isIndividualStudent = profile?.studentType === "INDIVIDUAL";
  
  const { data: upcomingSessions = [], isLoading: loadingSessions } = useUpcomingSessions();

  const { data: watchHistory = [], isLoading: loadingHistory } = useWatchHistory({
    subjectId: undefined,
    page: 0,
    pageSize: 10
  });

  // ✅ Get active term
  const { data: activeTerm } = useQuery({
    queryKey: ['active-term'],
    queryFn: async () => {
      const res = await axiosInstance.get('/terms/active');
      return res.data;
    },
    enabled: profileLoaded,
  });

  // ✅ NEW: Fetch weekly schedule for individual students
  const { data: weeklySchedule, isLoading: loadingWeeklySchedule } = useQuery({
    queryKey: ['my-weekly-schedule', profile?.id],
    queryFn: async () => {
      const today = new Date();
      const termStart = activeTerm?.startDate || format(today, 'yyyy-MM-dd');
      
      // Calculate week number
      const termStartDate = new Date(termStart);
      const daysSinceStart = Math.floor(
        (today.getTime() - termStartDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      const weekNumber = Math.floor(daysSinceStart / 7) + 1;
      
      // Get week date range
      const weekStart = new Date(termStart);
      weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const res = await axiosInstance.get(
        `/daily-schedules/individual/student/${profile!.id}/range`,
        {
          params: {
            startDate: format(weekStart, 'yyyy-MM-dd'),
            endDate: format(weekEnd, 'yyyy-MM-dd')
          }
        }
      );
      return res.data;
    },
    enabled: profileLoaded && isIndividualStudent && !!activeTerm,
    retry: 1,
  });

  // ✅ Calculate weekly stats for individual students
  const weeklyStats = useMemo(() => {
    if (!weeklySchedule || !Array.isArray(weeklySchedule)) {
      return { total: 0, completed: 0, available: 0, pending: 0, missed: 0, completionRate: 0 };
    }

    const total = weeklySchedule.length;
    const completed = weeklySchedule.filter((s: any) => s.status === 'COMPLETED').length;
    const available = weeklySchedule.filter((s: any) => s.status === 'AVAILABLE').length;
    const pending = weeklySchedule.filter((s: any) => 
      s.status === 'PENDING' || s.status === 'UPCOMING'
    ).length;
    const missed = weeklySchedule.filter((s: any) => s.status === 'MISSED').length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, available, pending, missed, completionRate };
  }, [weeklySchedule]);

  // ✅ Fetch ASSESSMENT SUBMISSIONS for CLASS students
  const fromDate = format(startOfWeek(new Date()), 'yyyy-MM-dd');
  const toDate = format(endOfWeek(new Date()), 'yyyy-MM-dd');

  // Fetch all assessment submissions
  const { data: allSubmissions = [], isLoading: loadingHistoryStats } = useQuery({
    queryKey: ['student-submissions', profile?.id],
    queryFn: async () => {
      if (!profile?.id) {
        throw new Error('Student profile ID is required');
      }
      const res = await axiosInstance.get(`/assessments/student/${profile.id}/submissions`);
      return res.data;
    },
    enabled: profileLoaded && !isIndividualStudent,
  });

  // Filter submissions for this week
  const weekStart = new Date(fromDate);
  const weekEnd = new Date(toDate);
  weekEnd.setHours(23, 59, 59, 999); // Include end of day
  
  const weekSubmissions = allSubmissions.filter((s: any) => {
    const submittedDate = new Date(s.submittedAt);
    return submittedDate >= weekStart && submittedDate <= weekEnd;
  });

  // ✅ Calculate summary statistics from ASSESSMENT SUBMISSIONS
  const totalLessons = weekSubmissions.length;
  const completedLessons = weekSubmissions.filter((s: any) => s.passed).length;
  const completionRate = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Calculate average score as weighted rate
  const scores = weekSubmissions
    .filter((s: any) => s.percentage != null)
    .map((s: any) => s.percentage);
  const weightedRate = scores.length > 0
    ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
    : 0;

  // Calculate excellent performance rate (above 80%) as "critical"
  const criticalLessons = weekSubmissions.filter((s: any) => s.percentage != null);
  const completedCritical = criticalLessons.filter((s: any) => s.percentage >= 80).length;
  const criticalRate = criticalLessons.length > 0 
    ? (completedCritical / criticalLessons.length) * 100 
    : 0;

  // ✅ Fetch TODAY'S progress for displaying today's lessons with accurate completion status
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const { data: todayProgress } = useQuery({
    queryKey: ['my-daily-progress', todayDate],
    queryFn: async () => {
      const res = await axiosInstance.get('/progress/daily/me', {
        params: {
          date: todayDate
        }
      });
      return res.data;
    },
    enabled: profileLoaded && !isIndividualStudent,
  });

  const dailySchedules = todayProgress?.lessons || [];

  const incompleteVideos = watchHistory.filter((item: any) => {
    if (!item) return false;
    const completionPercentage = item.completionPercentage || 0;
    return !item.completed && completionPercentage > 10 && completionPercentage < 95;
  }).slice(0, 3);

  const { data: allVideos = [], isLoading: loadingVideos } = useQuery<RecommendedVideo[]>({
    queryKey: ['student-available-videos'],
    queryFn: async () => {
      const res = await axiosInstance.get('/videos', {
        params: {
          limit: 20,
          sortBy: 'uploadDate',
          order: 'DESC'
        }
      });
      return res.data;
    },
    enabled: profileLoaded,
    retry: 1,
  });

  const watchedVideoIds = new Set(
    watchHistory
      .filter((item: any) => item?.videoLessonId)
      .map((item: any) => item.videoLessonId)
  );
  
  const recommendedVideos = allVideos
    .filter((video) => {
      if (!video) return false;
      if (watchedVideoIds.has(video.id)) return false;
      if (video.status !== 'PUBLISHED') return false;
      return true;
    })
    .slice(0, 4);

  // ✅ Get today's lessons from daily progress
  const dailyLessons = useMemo(() => {
    if (!todayProgress?.lessons || !Array.isArray(todayProgress.lessons)) return [];
    return todayProgress.lessons;
  }, [todayProgress]);

  const completedCount = dailyLessons.filter(l => l?.completed).length;

  const displaySessions = upcomingSessions
    .filter(session => session.status === 'LIVE' || session.status === 'SCHEDULED')
    .slice(0, 3);

  if (loadingProfile || loadingProgress) {
    return (
      <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-200 h-40 flex items-center justify-center">
        <div className="animate-pulse text-gray-500 text-sm">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (!profile) {
    // Show the pending screen if profile is not found
    return <ProfilePendingScreen userEmail={user?.email} />;
  }

  if (isIndividualStudent) {
    return (
      <div className="space-y-6 w-full">
        {/* INDIVIDUAL STUDENT BANNER */}
        <div className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-1">
                🎯 Individual Learning Portal Active
              </h3>
              <p className="text-blue-700 mb-4">
                You have access to a personalized learning experience. Go to your Individual Learning Dashboard to manage your timetable, schedule, and lessons.
              </p>
              <button
                onClick={() => navigate("/individual/dashboard")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Individual Dashboard
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* ✅ WEEKLY SCHEDULE STATS FOR INDIVIDUAL STUDENTS */}
        {loadingWeeklySchedule ? (
          <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-200">
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-indigo-200 rounded w-1/3"></div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="h-24 bg-indigo-100 rounded"></div>
                <div className="h-24 bg-indigo-100 rounded"></div>
                <div className="h-24 bg-indigo-100 rounded"></div>
                <div className="h-24 bg-indigo-100 rounded"></div>
                <div className="h-24 bg-indigo-100 rounded"></div>
              </div>
            </div>
          </div>
        ) : weeklySchedule ? (
          <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                This Week's Schedule
              </h3>
              <Link to="/individual/schedule" className="text-sm text-indigo-600 hover:underline font-semibold">
                View full schedule →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white/80 border border-indigo-200/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={18} className="text-gray-600" />
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="text-3xl font-bold text-gray-800">{weeklyStats.total}</div>
              </div>
              
              <div className="bg-white/80 border border-indigo-200/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-green-600" />
                  <div className="text-sm text-gray-600">Done</div>
                </div>
                <div className="text-3xl font-bold text-green-600">{weeklyStats.completed}</div>
                <div className="text-xs text-gray-500 mt-1">{weeklyStats.completionRate.toFixed(0)}%</div>
              </div>
              
              <div className="bg-white/80 border border-indigo-200/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={18} className="text-blue-600" />
                  <div className="text-sm text-gray-600">Available</div>
                </div>
                <div className="text-3xl font-bold text-blue-600">{weeklyStats.available}</div>
              </div>
              
              <div className="bg-white/80 border border-indigo-200/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={18} className="text-yellow-600" />
                  <div className="text-sm text-gray-600">Upcoming</div>
                </div>
                <div className="text-3xl font-bold text-yellow-600">{weeklyStats.pending}</div>
              </div>
              
              <div className="bg-white/80 border border-indigo-200/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle size={18} className="text-red-600" />
                  <div className="text-sm text-gray-600">Missed</div>
                </div>
                <div className="text-3xl font-bold text-red-600">{weeklyStats.missed}</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* CONTINUE WATCHING */}
        {loadingHistory ? (
          <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200">
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-blue-200 rounded w-1/2"></div>
              <div className="h-24 bg-blue-100 rounded"></div>
            </div>
          </div>
        ) : incompleteVideos.length > 0 ? (
          <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600" />
                Continue Watching
              </h3>
              <Link to="/videos" className="text-sm text-blue-600 hover:underline font-semibold">
                View all
              </Link>
            </div>

            <div className="space-y-4">
              {incompleteVideos.map((item: any) => {
                const completionPercentage = item.completionPercentage || 0;
                return (
                  <Link
                    key={item.id}
                    to={`/videos/${item.videoLessonId}`}
                    className="block p-4 bg-white/60 rounded-xl border border-blue-200/50 hover:border-blue-400 transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-32 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center border border-blue-200/50 group-hover:scale-105 transition-transform">
                        <PlayCircle className="w-10 h-10 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 mb-2 truncate">
                          Video Lesson #{item.videoLessonId}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${completionPercentage}%` }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-blue-600">
                            {Math.round(completionPercentage)}% complete
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDurationShort(item.durationSeconds)} total
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* RECOMMENDED VIDEOS */}
        {loadingVideos ? (
          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-green-200 rounded w-1/2"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="h-32 bg-green-100 rounded-xl"></div>
                <div className="h-32 bg-green-100 rounded-xl"></div>
              </div>
            </div>
          </div>
        ) : recommendedVideos.length > 0 ? (
          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-shadow">
            
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Recommended For You
              </h3>
              <Link to="/videos" className="text-sm text-green-600 hover:underline font-semibold">
                Explore more
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"> 
              {recommendedVideos.map(video => {
                const durationDisplay = formatDurationShort(video.durationSeconds);

                return (
                  <Link
                    key={video.id}
                    to={`/videos/${video.id}`}
                    className="block bg-white rounded-xl border border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className="relative w-full h-36 bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                      <PlayCircle className="w-12 h-12 text-green-600 absolute z-10 opacity-80" />
                    </div>

                    <div className="p-4 flex flex-col h-full">
                      <h4 className="font-semibold text-gray-900 line-clamp-2 text-base leading-snug mb-2 flex-shrink-0">
                        {video.title}
                      </h4>

                      <div className="space-y-1.5 text-sm text-gray-600 flex-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-green-600" />
                          <span className="truncate">{video.subjectName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-green-600" />
                          <span className="truncate">{video.teacherName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200 flex-shrink-0">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-green-600" />
                          {durationDisplay}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-green-600" />
                          {video.totalViews} views
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* QUICK ACTIONS */}
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              to="/individual/dashboard"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition font-semibold border border-blue-200"
            >
              <BookOpen className="w-6 h-6" />
              <span className="text-sm">My Dashboard</span>
            </Link>

            <Link
              to="/videos"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition font-semibold border border-green-200"
            >
              <Video className="w-6 h-6" />
              <span className="text-sm">Video Library</span>
            </Link>

            <Link
              to="/live-sessions"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition font-semibold border border-purple-200"
            >
              <Users className="w-6 h-6" />
              <span className="text-sm">Live Classes</span>
            </Link>

            <Link
              to="/assessments/student"
              className="flex flex-col items-center justify-center gap-2 p-4 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition font-semibold border border-orange-200"
            >
              <CheckCircle className="w-6 h-6" />
              <span className="text-sm">Assessments</span>
            </Link>
          </div>
        </div>

      </div>
    );
  }

  // ✅ CLASS STUDENTS - ORIGINAL DASHBOARD
  if (isError) {
    return (
      <div className="p-8 bg-white rounded-xl shadow-sm border border-red-200 h-40 flex items-center justify-center">
        <div className="text-red-600 text-sm">❌ Failed to load dashboard.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">

      {/* ✅ WEEKLY ASSESSMENT PROGRESS SUMMARY - CLASS STUDENTS */}
      {loadingHistoryStats ? (
        <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-200">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-indigo-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="h-24 bg-indigo-100 rounded"></div>
              <div className="h-24 bg-indigo-100 rounded"></div>
              <div className="h-24 bg-indigo-100 rounded"></div>
              <div className="h-24 bg-indigo-100 rounded"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              This Week's Progress
            </h3>
            <Link to="/assessments/student" className="text-sm text-indigo-600 hover:underline font-semibold">
              View all results →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/80 border border-indigo-200/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-gray-600" />
                <div className="text-sm text-gray-600">Assessments Taken</div>
              </div>
              <div className="text-3xl font-bold text-gray-800">{totalLessons}</div>
            </div>
            
            <div className="bg-white/80 border border-indigo-200/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={18} className="text-green-600" />
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="text-3xl font-bold text-green-600">{completedLessons}</div>
              <div className="text-xs text-gray-500 mt-1">{completionRate.toFixed(1)}%</div>
            </div>
            
            <div className="bg-white/80 border border-indigo-200/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award size={18} className="text-blue-600" />
                <div className="text-sm text-gray-600">Average Score</div>
              </div>
              <div className="text-3xl font-bold text-blue-600">{weightedRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500 mt-1">
                Across all assessments
              </div>
            </div>
            
            <div className="bg-white/80 border border-indigo-200/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-purple-600" />
                <div className="text-sm text-gray-600">Excellence Rate</div>
              </div>
              <div className="text-3xl font-bold text-purple-600">{criticalRate.toFixed(0)}%</div>
              <div className="text-xs text-gray-500 mt-1">
                Scored 80% or above
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TODAY'S SCHEDULE */}
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Today's Schedule
          </h3>
          {dailyLessons.length > 0 && (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg font-semibold text-sm">
              {completedCount}/{dailyLessons.length}
            </span>
          )}
        </div>

        {dailyLessons.length > 0 ? (
          <div className="space-y-3">
            {dailyLessons.slice(0, 3).map((lesson) => {
              // Determine status
              const isCompleted = lesson.completed;
              const isIncomplete = lesson.incomplete;
              const isMissed = lesson.incompleteReason === 'MISSED_GRACE_PERIOD';
              const now = new Date();
              const windowStart = lesson.assessmentWindowStart ? new Date(lesson.assessmentWindowStart) : null;
              const windowEnd = lesson.assessmentWindowEnd ? new Date(lesson.assessmentWindowEnd) : null;
              const gracePeriodEnd = lesson.gracePeriodEnd ? new Date(lesson.gracePeriodEnd) : windowEnd;
              
              // Check if assessment is truly accessible (not missed and within window)
              const isAccessible = lesson.assessmentAccessible && 
                                   !isIncomplete && 
                                   !isMissed && 
                                   windowStart && 
                                   windowEnd && 
                                   now >= windowStart && 
                                   now <= (gracePeriodEnd || windowEnd);
              
              // Determine status text and styling
              let statusBadge = null;
              let actionButton = null;
              let bgClass = 'bg-gray-50 border-gray-200';
              
              if (isCompleted) {
                bgClass = 'bg-green-50 border-green-200';
                statusBadge = (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                    Completed
                  </span>
                );
                actionButton = (
                  <Link
                    to={`/subjects/${lesson.subjectId}/lesson-topics/${lesson.lessonId}`}
                    className="text-sm text-blue-600 font-semibold hover:underline flex-shrink-0"
                  >
                    Review
                  </Link>
                );
              } else if (isAccessible) {
                bgClass = 'bg-blue-50 border-blue-200 hover:border-blue-300';
                statusBadge = (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded animate-pulse">
                    Available Now
                  </span>
                );
                actionButton = (
                  <Link
                    to={`/lesson-topics/${lesson.lessonId}/assessment`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex-shrink-0"
                  >
                    Start Assessment
                  </Link>
                );
              } else if (windowStart && now < windowStart) {
                bgClass = 'bg-yellow-50 border-yellow-200';
                statusBadge = (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
                    Upcoming
                  </span>
                );
                actionButton = (
                  <span className="text-sm text-gray-500 flex-shrink-0">
                    Available at {format(windowStart, 'h:mm a')}
                  </span>
                );
              } else if (windowEnd && now > windowEnd) {
                bgClass = 'bg-red-50 border-red-200';
                statusBadge = (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                    Missed
                  </span>
                );
                actionButton = (
                  <span className="text-sm text-red-600 font-semibold flex-shrink-0">
                    Window Closed
                  </span>
                );
              } else if (isMissed || isIncomplete) {
                // Explicitly handle missed/incomplete assessments
                bgClass = 'bg-red-50 border-red-200';
                statusBadge = (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                    Missed
                  </span>
                );
                actionButton = (
                  <span className="text-sm text-red-600 font-semibold flex-shrink-0">
                    Window Closed
                  </span>
                );
              } else {
                // Default state
                statusBadge = (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded">
                    Scheduled
                  </span>
                );
                actionButton = (
                  <span className="text-sm text-gray-500 flex-shrink-0">
                    Not yet available
                  </span>
                );
              }

              return (
                <div
                  key={lesson.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${bgClass}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : isAccessible ? (
                      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 animate-pulse" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 truncate">
                          {lesson.subjectName}
                        </p>
                        {statusBadge}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {lesson.lessonTitle || 'Lesson'}
                      </p>
                      {lesson.assessmentWindowStart && (
                        <p className="text-xs text-gray-500 mt-1">
                          Window: {format(new Date(lesson.assessmentWindowStart), 'h:mm a')} - {format(new Date(lesson.assessmentWindowEnd), 'h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="ml-3 flex-shrink-0">
                    {actionButton}
                  </div>
                </div>
              );
            })}

            {dailyLessons.length > 3 && (
              <Link
                to="/progress/daily"
                className="block text-center text-sm text-blue-600 hover:underline font-semibold mt-4"
              >
                View all {dailyLessons.length} lessons →
              </Link>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📚</div>
            <p className="text-gray-600 mb-3">No lessons scheduled for today</p>
            <Link
              to="/subjects"
              className="text-blue-600 hover:underline text-sm font-semibold"
            >
              Browse Available Subjects
            </Link>
          </div>
        )}
      </div>

      {/* UPCOMING LIVE SESSIONS */}
      {loadingSessions ? (
        <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm border border-purple-200">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-purple-200 rounded w-1/2"></div>
            <div className="h-20 bg-purple-100 rounded"></div>
          </div>
        </div>
      ) : displaySessions.length > 0 ? (
        <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm border border-purple-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Upcoming Live Sessions
            </h3>
            <Link to="/live-sessions" className="text-sm text-purple-600 hover:underline font-semibold">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {displaySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-white/60 rounded-xl border border-purple-200/50"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <p className="font-semibold text-gray-900">
                      {session.title}
                    </p>
                    {session.status === 'LIVE' && (
                      <span className="flex items-center gap-1.5 bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
                        <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                    <span className="font-medium">{session.subjectName}</span>
                    <span>•</span>
                    <span>{safeFormatDate(session.scheduledStartTime, "MMM d, h:mm a")}</span>
                    <span>•</span>
                    <span>{session.scheduledDurationMinutes}min</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    by {session.teacherName}
                  </p>
                </div>
                
                {session.status === 'LIVE' ? (
                  session.joinUrl ? (
                    <a
                      href={session.joinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-semibold flex-shrink-0 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Join Now
                    </a>
                  ) : (
                    <Link
                      to={`/live-sessions/${session.id}`}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-semibold flex-shrink-0 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      Join Now
                    </Link>
                  )
                ) : (
                  <Link
                    to={`/live-sessions/${session.id}`}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-semibold flex-shrink-0"
                  >
                    View Details
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* CONTINUE WATCHING */}
      {loadingHistory ? (
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-blue-200 rounded w-1/2"></div>
            <div className="h-24 bg-blue-100 rounded"></div>
          </div>
        </div>
      ) : incompleteVideos.length > 0 ? (
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-600" />
              Continue Watching
            </h3>
            <Link to="/videos" className="text-sm text-blue-600 hover:underline font-semibold">
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {incompleteVideos.map((item: any) => {
              const completionPercentage = item.completionPercentage || 0;
              return (
                <Link
                  key={item.id}
                  to={`/videos/${item.videoLessonId}`}
                  className="block p-4 bg-white/60 rounded-xl border border-blue-200/50 hover:border-blue-400 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-32 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center border border-blue-200/50 group-hover:scale-105 transition-transform">
                      <PlayCircle className="w-10 h-10 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 mb-2 truncate">
                        Video Lesson #{item.videoLessonId}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-blue-600">
                          {Math.round(completionPercentage)}% complete
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDurationShort(item.durationSeconds)} total
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* RECOMMENDED VIDEOS */}
      {loadingVideos ? (
        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-green-200 rounded w-1/2"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-32 bg-green-100 rounded-xl"></div>
              <div className="h-32 bg-green-100 rounded-xl"></div>
            </div>
          </div>
        </div>
      ) : recommendedVideos.length > 0 ? (
        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 hover:shadow-md transition-shadow">
          
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Recommended For You
            </h3>
            <Link to="/videos" className="text-sm text-green-600 hover:underline font-semibold">
              Explore more
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"> 
            {recommendedVideos.map(video => {
              const durationDisplay = formatDurationShort(video.durationSeconds);

              return (
                <Link
                  key={video.id}
                  to={`/videos/${video.id}`}
                  className="block bg-white rounded-xl border border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="relative w-full h-36 bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                    <PlayCircle className="w-12 h-12 text-green-600 absolute z-10 opacity-80" />
                  </div>

                  <div className="p-4 flex flex-col h-full">
                    <h4 className="font-semibold text-gray-900 line-clamp-2 text-base leading-snug mb-2 flex-shrink-0">
                      {video.title}
                    </h4>

                    <div className="space-y-1.5 text-sm text-gray-600 flex-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-green-600" />
                        <span className="truncate">{video.subjectName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-600" />
                        <span className="truncate">{video.teacherName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-2 border-t border-gray-200 flex-shrink-0">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-green-600" />
                        {durationDisplay}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-green-600" />
                        {video.totalViews} views
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* QUICK ACTIONS */}
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            to="/subjects"
            className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition font-semibold border border-blue-200"
          >
            <BookOpen className="w-6 h-6" />
            <span className="text-sm">My Subjects</span>
          </Link>

          <Link
            to="/videos"
            className="flex flex-col items-center justify-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition font-semibold border border-green-200"
          >
            <Video className="w-6 h-6" />
            <span className="text-sm">Video Library</span>
          </Link>

          <Link
            to="/live-sessions"
            className="flex flex-col items-center justify-center gap-2 p-4 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition font-semibold border border-purple-200"
          >
            <Users className="w-6 h-6" />
            <span className="text-sm">Live Classes</span>
          </Link>

          <Link
            to="/assessments/student"
            className="flex flex-col items-center justify-center gap-2 p-4 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition font-semibold border border-orange-200"
          >
            <CheckCircle className="w-6 h-6" />
            <span className="text-sm">Assessments</span>
          </Link>
        </div>
      </div>

    </div>
  );
};

export default StudentWidget;