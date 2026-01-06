// ✅ FIXED: IndividualDashboard.tsx
// Proper flow: Setup Choice → Class Selection (if needed) → Upload/Manual Selection

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Calendar,
  BookOpen,
  Clock,
  AlertCircle,
  Eye,
  X,
  PlayCircle,
  CalendarDays,
  Zap,
  ArrowRight,
  Bell,
  Video,
  ExternalLink,
} from "lucide-react";

import { useMyProfile } from "../../../studentProfiles/hooks/useStudentProfiles";
import TimetableUpload from "../../components/TimetableUpload";
import SchemeUpload from "../../components/SchemeUpload";
import TimetableEntriesDisplay from "../../components/TimetableEntriesDisplay";
import { useStudentProcessingStatus } from "../../hooks/useProcessingStatus";
import { LiveProcessingIndicator } from "../../components/ProcessingStatusIndicator";
import { useAuth } from "../../../auth/useAuth";
import { isAdmin as checkIsAdmin } from "../../../auth/authHelpers";
import axios from "../../../../api/axios";

import { formatTimeDisplay } from "../../hooks/useIndividualSchedule";

import { useRecentNotifications } from "../../../notifications/hooks/useNotifications";
import { formatRelativeTime } from "../../../notifications/utils/notificationUtils";
import { NotificationIcon } from "../../../notifications/components/NotificationIcon";

import { useLiveSessions } from "../../../live/hooks/useLiveSessions";
import { useGetStudentSubjects } from "../../../subjects/hooks/useSubjects";
import ProfilePendingScreen from "../../components/student/ProfilePendingScreen";

import TimetableSetupChoice from "../../components/TimetableSetupChoice";
import SubjectSelectionModal from "../../components/SubjectSelectionModal";
import ClassSelectionModal from "../../components/ClassSelectionModal";

type Tab = "schedule" | "liveSessions" | "uploads";
type SetupMode = "choice" | "upload" | "manual" | "needsClassForUpload" | "needsClassForManual";

const getDayDisplayName = (day: string): string => {
  const days: Record<string, string> = {
    MONDAY: "Monday",
    TUESDAY: "Tuesday",
    WEDNESDAY: "Wednesday",
    THURSDAY: "Thursday",
    FRIDAY: "Friday",
    SATURDAY: "Saturday",
    SUNDAY: "Sunday",
  };
  return days[day] || day;
};

const IndividualDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("schedule");
  const [showEntriesModal, setShowEntriesModal] = useState(false);
  const [showWeeklyScheduleModal, setShowWeeklyScheduleModal] = useState(false);
  const uploadsTabRef = React.useRef<HTMLDivElement>(null);

  // ✅ NEW: Enhanced setup mode tracking
  const [setupMode, setSetupMode] = useState<SetupMode>("choice");
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  const { data: profile, isLoading: loadingProfile, error: profileError, refetch: refetchProfile } =
    useMyProfile({ enabled: true });

  const { user } = useAuth();
  const isAdmin = checkIsAdmin(user);

  const handleUploadClick = () => {
    setActiveTab("uploads");
    setTimeout(() => {
      uploadsTabRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const {
    overview,
    isLoading: overviewLoading,
    hasProcessingItems,
    totalProcessing,
    processingTimetables,
    processingSchemes,
    refetch: refetchOverview,
  } = useStudentProcessingStatus(profile?.id || null);

  const latestTimetable = overview?.timetables.find(
    (t) => t.processingStatus === "COMPLETED"
  );

  const hasTimetable = overview?.timetables && overview.timetables.length > 0;
  const hasCompletedTimetable = !!latestTimetable;
  const isNewStudent = !hasProcessingItems && !overviewLoading && overview && !hasTimetable;
  const hasClassAssigned = !!profile?.classId;

  // ✅ Fetch schedules (only if completed timetable exists)
  const { data: weekSchedules = [], refetch: refetchWeek } = useQuery({
    queryKey: ['week-generated-schedule', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const now = new Date();
      const dayOfWeek = now.getDay();
      const sunday = new Date(now);
      sunday.setDate(now.getDate() - dayOfWeek);
      sunday.setHours(0, 0, 0, 0);
      
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      saturday.setHours(23, 59, 59, 999);
      
      const startDate = sunday.toISOString().split('T')[0];
      const endDate = saturday.toISOString().split('T')[0];
      
      const res = await axios.get(
        `/daily-schedules/individual/student/${profile.id}/range`,
        { params: { startDate, endDate } }
      );
      return res.data;
    },
    enabled: !!profile?.id && hasCompletedTimetable,
    refetchInterval: 30000,
  });

  const { data: todayGeneratedSchedule = [], refetch: refetchToday } = useQuery({
    queryKey: ['today-generated-schedule', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const res = await axios.get(
        `/daily-schedules/individual/student/${profile.id}/range`,
        { params: { startDate: todayStr, endDate: todayStr } }
      );
      return res.data;
    },
    enabled: !!profile?.id && hasCompletedTimetable,
    refetchInterval: 30000,
  });

  const { data: tomorrowGeneratedSchedule = [] } = useQuery({
    queryKey: ['tomorrow-generated-schedule', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const res = await axios.get(
        `/daily-schedules/individual/student/${profile.id}/range`,
        { params: { startDate: tomorrowStr, endDate: tomorrowStr } }
      );
      return res.data;
    },
    enabled: !!profile?.id && hasCompletedTimetable,
    refetchInterval: 30000,
  });

  // Calculate stats (unchanged)
  const weeklyStats = useMemo(() => {
    const subjectDistribution: Record<string, number> = {};
    weekSchedules.forEach((schedule: any) => {
      const subject = schedule.subjectName;
      subjectDistribution[subject] = (subjectDistribution[subject] || 0) + 1;
    });
    return { subjectDistribution };
  }, [weekSchedules]);

  const nextClass = useMemo(() => {
    const now = new Date();
    const futurePeriods = weekSchedules.filter((schedule: any) => {
      const scheduleDate = new Date(schedule.scheduledDate);
      const [hours, minutes] = schedule.startTime.split(':');
      scheduleDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      return scheduleDate > now;
    });

    if (futurePeriods.length === 0) return null;

    const sorted = futurePeriods.sort((a: any, b: any) => {
      const dateA = new Date(a.scheduledDate + 'T' + a.startTime);
      const dateB = new Date(b.scheduledDate + 'T' + b.startTime);
      return dateA.getTime() - dateB.getTime();
    });

    const next = sorted[0];
    return {
      subjectName: next.subjectName,
      day: next.dayOfWeek,
      startTime: next.startTime,
      endTime: next.endTime,
      scheduledDate: next.scheduledDate,
    };
  }, [weekSchedules]);

  const todaySchedule = useMemo(() => {
    if (!todayGeneratedSchedule || todayGeneratedSchedule.length === 0) return null;
    const sortedPeriods = [...todayGeneratedSchedule].sort((a, b) => a.periodNumber - b.periodNumber);
    return {
      day: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
      periods: sortedPeriods.map((schedule: any) => ({
        periodNumber: schedule.periodNumber,
        subjectName: schedule.subjectName,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        lessonTopicTitle: schedule.lessonTopicTitle,
        completed: schedule.completed || schedule.status === 'COMPLETED',
        progressId: schedule.progressId,
      }))
    };
  }, [todayGeneratedSchedule]);

  const tomorrowSchedule = useMemo(() => {
    if (!tomorrowGeneratedSchedule || tomorrowGeneratedSchedule.length === 0) return null;
    const sortedPeriods = [...tomorrowGeneratedSchedule].sort((a, b) => a.periodNumber - b.periodNumber);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      day: tomorrow.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
      periods: sortedPeriods.map((schedule: any) => ({
        periodNumber: schedule.periodNumber,
        subjectName: schedule.subjectName,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        lessonTopicTitle: schedule.lessonTopicTitle,
        completed: schedule.completed || schedule.status === 'COMPLETED',
        progressId: schedule.progressId,
      }))
    };
  }, [tomorrowGeneratedSchedule]);

  const weeklyScheduleDisplay = useMemo(() => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days.map(dayName => {
      const daySchedules = weekSchedules.filter((s: any) => s.dayOfWeek === dayName);
      const sortedPeriods = daySchedules.sort((a: any, b: any) => a.periodNumber - b.periodNumber);
      return {
        day: dayName,
        periods: sortedPeriods.map((schedule: any) => ({
          periodNumber: schedule.periodNumber,
          subjectName: schedule.subjectName,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          lessonTopicTitle: schedule.lessonTopicTitle,
          completed: schedule.completed || schedule.status === 'COMPLETED',
          progressId: schedule.progressId,
        }))
      };
    });
  }, [weekSchedules]);

  const todayStats = useMemo(() => {
    if (!todaySchedule) {
      return { totalPeriods: 0, completedPeriods: 0, completionRate: 0 };
    }
    const totalPeriods = todaySchedule.periods.length;
    const completedPeriods = todaySchedule.periods.filter(p => p.completed).length;
    return {
      totalPeriods,
      completedPeriods,
      completionRate: totalPeriods > 0 ? (completedPeriods / totalPeriods) * 100 : 0,
    };
  }, [todaySchedule]);

  const classId = profile?.classId ?? null;
  const departmentId = profile?.departmentId ?? null;
  const studentType = profile?.studentType ?? null;

  const { data: studentSubjects = [] } = useGetStudentSubjects(
    classId,
    departmentId,
    studentType,
    {
      enabled: !!classId && studentType !== "ASPIRANT",
    }
  );

  const subjectIds = studentSubjects.map(s => s.id);

  const { data: upcomingLiveSessions = [] } = useLiveSessions({
    status: ['SCHEDULED', 'LIVE'],
  });

  const studentLiveSessions = useMemo(() => {
    return upcomingLiveSessions.filter(session => 
      subjectIds.includes(session.subjectId)
    ).slice(0, 5);
  }, [upcomingLiveSessions, subjectIds]);

  const { data: recentNotifications = [] } = useRecentNotifications(true);
  const topNotifications = recentNotifications.slice(0, 5);

  // ✅ NEW: Enhanced handlers with class selection logic
  const handleClassSelected = async () => {
    await refetchProfile();
    
    // After class is selected, proceed to the next step based on what they chose
    if (setupMode === "needsClassForUpload") {
      setSetupMode("upload");
    } else if (setupMode === "needsClassForManual") {
      setShowSubjectModal(true);
      setSetupMode("manual"); // Update mode so we know we're in manual flow
    }
  };

  const handleChooseUpload = () => {
    if (!hasClassAssigned) {
      // Need to select class first
      setSetupMode("needsClassForUpload");
    } else {
      // Already has class, go straight to upload
      setSetupMode("upload");
    }
  };

  const handleChooseManual = () => {
    if (!hasClassAssigned) {
      // Need to select class first
      setSetupMode("needsClassForManual");
    } else {
      // Already has class, go straight to subject selection
      setShowSubjectModal(true);
      setSetupMode("manual");
    }
  };

  const handleManualSuccess = () => {
    refetchOverview();
    refetchWeek();
    refetchToday();
    setShowSubjectModal(false);
    setSetupMode("choice");
  };

  const handleBackToChoice = () => {
    setSetupMode("choice");
    setShowSubjectModal(false);
  };

  // ============================================
  // CONDITIONAL RENDERING
  // ============================================

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (profileError || !profile) {
    const isProfileNotFound =
      profileError?.message?.toLowerCase().includes('not found') ||
      profileError?.message?.toLowerCase().includes('no profile') ||
      profileError?.response?.status === 404 ||
      !profile;

    if (isProfileNotFound) {
      return <ProfilePendingScreen userEmail={user?.email} />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Unable to load profile</h2>
          <p className="text-red-700">{profileError?.message || "Please try again."}</p>
        </div>
      </div>
    );
  }

  // ✅ NEW STUDENT SETUP FLOW
  if (isNewStudent) {
    // Show class selection modal if needed (for either upload or manual)
    if (setupMode === "needsClassForUpload" || setupMode === "needsClassForManual") {
      return (
        <>
          <ClassSelectionModal
            studentProfileId={profile.id!}
            onClose={() => {
              // Allow going back to choice screen
              setSetupMode("choice");
            }}
            onSuccess={handleClassSelected}
          />
        </>
      );
    }

    // Show setup choice screen
    if (setupMode === "choice") {
      return (
        <>
          <TimetableSetupChoice
            onChooseUpload={handleChooseUpload}
            onChooseManual={handleChooseManual}
          />

          {/* Subject Selection Modal (shown after class selection for manual path) */}
          {showSubjectModal && hasClassAssigned && (
            <SubjectSelectionModal
              studentProfileId={profile.id!}
              onClose={() => {
                setShowSubjectModal(false);
                setSetupMode("choice");
              }}
              onSuccess={handleManualSuccess}
            />
          )}
        </>
      );
    }

    // Show upload section (after class selection for upload path)
    if (setupMode === "upload" && hasClassAssigned) {
      return (
        <div className="space-y-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={handleBackToChoice}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>Back to setup options</span>
          </button>

          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-xl shadow-lg p-8 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full -ml-20 -mb-20"></div>

            <div className="relative z-10">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-white/20 p-4 rounded-lg backdrop-blur-sm flex-shrink-0">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl md:text-4xl font-bold mb-2">Upload Your Timetable 📄</h2>
                  <p className="text-white/90 text-xl">AI will extract everything automatically</p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-6 border border-white/20">
                <p className="text-white text-lg mb-4 font-semibold">Here's what happens next:</p>
                <ul className="space-y-3 text-white/95">
                  <li className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                    <span className="text-base">Our AI automatically extracts all your subjects and class times</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                    <span className="text-base">Your personalized weekly schedule is generated instantly</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                    <span className="text-base">Track your progress and manage your study time from one place</span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-2 text-white/90 text-sm mb-6 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>Processing takes just a few minutes. You'll be notified when your schedule is ready!</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <div className="flex items-center gap-3">
                <Upload className="w-6 h-6" />
                <div>
                  <h3 className="text-xl font-semibold">Upload Your Timetable</h3>
                  <p className="text-indigo-100 text-sm mt-1">Get started by uploading your school timetable</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <TimetableUpload 
                studentProfileId={profile.id!} 
                isAdmin={isAdmin}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Getting Started Tips</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>📅 <strong>Accepted formats:</strong> PDF, Excel, Word, or Image files</li>
                  <li>📝 <strong>File size limit:</strong> Up to 10MB</li>
                  <li>🤖 <strong>AI Processing:</strong> Automatic extraction of subjects, times, and days</li>
                  <li>⏰ <strong>Processing time:</strong> Usually 2-5 minutes</li>
                  <li>🔔 <strong>Notifications:</strong> You'll be notified when processing is complete</li>
                  <li>📚 <strong>Next step:</strong> Upload scheme of work for each subject to see lesson topics</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show manual selection (after class selection - this is now handled by the modal above)
    // If we're here in manual mode but modal isn't showing, go back to choice
    if (setupMode === "manual" && !showSubjectModal) {
      setSetupMode("choice");
    }
  }

  // ✅ 5. EXISTING STUDENT VIEW: Show full dashboard
  const completedTimetables =
    overview?.timetables.filter((t) => t.processingStatus === "COMPLETED").length || 0;
  const completedSchemes =
    overview?.schemes.filter((s) => s.processingStatus === "COMPLETED").length || 0;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Individual Learning Portal</h1>
            <p className="text-indigo-100">Your personalized daily schedule & study materials</p>
          </div>

          <div className="flex items-center gap-4">
            {hasProcessingItems && (
              <div className="flex items-center gap-3">
                <LiveProcessingIndicator count={totalProcessing} />
                <div className="text-sm text-white/90">
                  Processing {totalProcessing} file{totalProcessing > 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TODAY'S STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-indigo-200 text-sm mb-1">Today's Periods</div>
            <div className="text-2xl font-bold">{todayStats.totalPeriods}</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-indigo-200 text-sm mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-400">{todayStats.completedPeriods}</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-indigo-200 text-sm mb-1">Total Subjects</div>
            <div className="text-2xl font-bold">{Object.keys(weeklyStats.subjectDistribution).length}</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-indigo-200 text-sm mb-1">Today's Progress</div>
            <div className="text-2xl font-bold">
              {todayStats.completionRate.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Learning Hours Summary */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">Your Learning Hours</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-indigo-200 mb-1">Monday - Friday</p>
              <p className="font-semibold">8:00 AM - 10:00 PM</p>
            </div>

            <div>
              <p className="text-indigo-200 mb-1">Saturday</p>
              <p className="font-semibold">12:00 PM - 9:00 PM</p>
            </div>

            <div>
              <p className="text-indigo-200 mb-1">Sunday</p>
              <p className="font-semibold">Rest Day 🌴</p>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Alert */}
      {hasProcessingItems && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="animate-spin text-blue-600 text-xl">🔄</div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Processing Your Files...</h3>
              <p className="text-sm text-blue-700 mb-2">
                {processingTimetables.length > 0 && (
                  <span>{processingTimetables.length} timetable{processingTimetables.length > 1 ? "s" : ""} </span>
                )}
                {processingSchemes.length > 0 && (
                  <span>{processingSchemes.length} scheme{processingSchemes.length > 1 ? "s" : ""} </span>
                )}
                being processed by AI. This usually takes a few minutes.
              </p>
              <div className="text-xs text-blue-600">
                💡 You can continue using the platform while processing happens.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN: Today's Schedule + Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Today's Schedule card */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Today's Schedule</h3>
              <p className="text-sm text-gray-500 mt-1">
                {todaySchedule ? `${getDayDisplayName(todaySchedule.day)} • ${todayStats.totalPeriods} periods` : "No classes today"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  refetchToday();
                  refetchWeek();
                }}
                className="px-3 py-1 bg-gray-50 border rounded text-sm hover:bg-gray-100"
                title="Refresh schedule"
              >
                Refresh
              </button>

              <button
                onClick={() => setShowWeeklyScheduleModal(true)}
                className="flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                disabled={!hasCompletedTimetable}
                title="View your personalized weekly schedule"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm">View Weekly Schedule</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {!hasCompletedTimetable ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timetable Available</h3>
                <p className="text-gray-600 mb-4">Upload your timetable to generate your daily schedule</p>
                <button
                  onClick={() => setActiveTab("uploads")}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Upload Timetable
                </button>
              </div>
            ) : !todaySchedule || todaySchedule.periods.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Today</h3>
                <p className="text-gray-600">Enjoy your day off! 🌴</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {todaySchedule.periods.map((period, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        period.completed
                          ? "bg-green-50 border-green-200"
                          : "bg-white border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg ${
                          period.completed ? "bg-green-100" : "bg-indigo-50"
                        }`}>
                          <div className={`text-xs font-semibold ${
                            period.completed ? "text-green-700" : "text-indigo-600"
                          }`}>
                            Period {period.periodNumber}
                          </div>
                        </div>

                        <div>
                          <div className="font-semibold text-gray-900">{period.subjectName}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {formatTimeDisplay(period.startTime)} - {formatTimeDisplay(period.endTime)}
                          </div>
                          {period.lessonTopicTitle && (
                            <div className="text-xs text-gray-500 mt-1">
                              📚 {period.lessonTopicTitle}
                            </div>
                          )}
                        </div>
                      </div>

                      {period.completed && (
                        <div className="flex items-center gap-2 text-green-600">
                          <span className="text-sm font-semibold">Completed</span>
                          <span className="text-xl">✓</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Next Class & Subject Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-200">
                  {/* Next Class */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-indigo-600" /> Next Class
                    </h4>

                    {nextClass ? (
                      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-100">
                        <div className="font-semibold text-gray-900">{nextClass.subjectName}</div>
                        <div className="text-sm text-gray-600">
                          {getDayDisplayName(nextClass.day)} • {formatTimeDisplay(nextClass.startTime)} - {formatTimeDisplay(nextClass.endTime)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">No upcoming classes found</div>
                    )}
                  </div>

                  {/* Subject Distribution */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Subject Distribution</h4>
                    {Object.entries(weeklyStats.subjectDistribution).length === 0 ? (
                      <div className="text-sm text-gray-600">No subjects assigned yet</div>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(weeklyStats.subjectDistribution)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 6)
                          .map(([subject, count]) => (
                            <div key={subject} className="flex items-center justify-between">
                              <div className="text-sm text-gray-700 truncate pr-4">{subject}</div>
                              <div className="text-sm font-semibold text-indigo-600">{count}</div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Quick Insights */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Recent Notifications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" />
                Recent Notifications
              </h4>
              <button
                onClick={() => navigate('/notifications')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View All
              </button>
            </div>

            {topNotifications.length === 0 ? (
              <div className="text-sm text-gray-600 py-3">No new notifications</div>
            ) : (
              <div className="space-y-2">
                {topNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => navigate(`/notifications/${notification.id}`)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-indigo-300 ${
                      notification.isRead || notification.read
                        ? 'bg-white border-gray-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <NotificationIcon type={notification.type} size={16} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">
                          {notification.title}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {formatRelativeTime(notification.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Quick Actions</h4>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setActiveTab("uploads")}
                className="w-full px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Upload Files
              </button>
              <button
                onClick={() => navigate('/notifications')}
                className="w-full px-3 py-2 border border-gray-200 rounded hover:bg-gray-50 flex items-center gap-2 justify-center"
              >
                <Bell className="w-4 h-4" />
                View Notifications
              </button>
              <button
                onClick={() => navigate('/live-sessions')}
                className="w-full px-3 py-2 border border-gray-200 rounded hover:bg-gray-50 flex items-center gap-2 justify-center"
              >
                <Video className="w-4 h-4" />
                View Live Sessions
              </button>
              <button
                onClick={() => setShowEntriesModal(true)}
                className="w-full px-3 py-2 border border-gray-200 rounded hover:bg-gray-50 flex items-center gap-2 justify-center"
              >
                <Eye className="w-4 h-4" />
                View Timetable Details
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Schedule / Live Sessions / Uploads */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" ref={uploadsTabRef}>
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex-1 px-6 py-4 font-semibold text-center transition-all ${
              activeTab === "schedule"
                ? "bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="hidden sm:inline">Tomorrow's Schedule</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("liveSessions")}
            className={`flex-1 px-6 py-4 font-semibold text-center transition-all ${
              activeTab === "liveSessions"
                ? "bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Video className="w-5 h-5" />
              <span className="hidden sm:inline">Live Sessions</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("uploads")}
            className={`flex-1 px-6 py-4 font-semibold text-center transition-all relative ${
              activeTab === "uploads"
                ? "bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-5 h-5" />
              <span className="hidden sm:inline">Upload Files</span>
              {hasProcessingItems && (
                <span className="absolute top-2 right-2 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="p-6">
          {activeTab === "schedule" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Tomorrow's Schedule</h3>
                {tomorrowSchedule && (
                  <span className="text-sm text-gray-600">
                    {getDayDisplayName(tomorrowSchedule.day)} • {tomorrowSchedule.periods.length} periods
                  </span>
                )}
              </div>

              {!hasCompletedTimetable ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Timetable Available</h3>
                  <p className="text-gray-600 mb-4">Upload your timetable to generate your schedule</p>
                  <button
                    onClick={() => setActiveTab("uploads")}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Upload Timetable
                  </button>
                </div>
              ) : !tomorrowSchedule || tomorrowSchedule.periods.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Tomorrow</h3>
                  <p className="text-gray-600">Enjoy your day off! 🌴</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tomorrowSchedule.periods.map((period, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 rounded-lg border-2 bg-white border-gray-200 hover:border-indigo-300 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-indigo-50">
                          <div className="text-xs font-semibold text-indigo-600">
                            Period {period.periodNumber}
                          </div>
                        </div>

                        <div>
                          <div className="font-semibold text-gray-900">{period.subjectName}</div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {formatTimeDisplay(period.startTime)} - {formatTimeDisplay(period.endTime)}
                          </div>
                          {period.lessonTopicTitle && (
                            <div className="text-xs text-gray-500 mt-1">
                              📚 {period.lessonTopicTitle}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "liveSessions" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Live Sessions</h3>
                <button
                  onClick={() => navigate('/live-sessions')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  View All
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              {studentLiveSessions.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Upcoming Sessions</h3>
                  <p className="text-gray-600 mb-4">
                    {subjectIds.length === 0 
                      ? "Upload your timetable to see live sessions for your subjects"
                      : "No live sessions scheduled yet"}
                  </p>
                  {subjectIds.length === 0 && (
                    <button
                      onClick={() => setActiveTab("uploads")}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Upload Timetable
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {studentLiveSessions.map((session) => {
                    const sessionDate = new Date(session.scheduledStartTime);
                    const isLive = session.status === 'LIVE';
                    
                    return (
                      <div
                        key={session.id}
                        onClick={() => navigate(`/live-sessions/${session.id}`)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isLive
                            ? 'bg-red-50 border-red-200 hover:border-red-300'
                            : 'bg-white border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg ${
                              isLive ? 'bg-red-100' : 'bg-indigo-50'
                            }`}>
                              <Video className={`w-6 h-6 ${isLive ? 'text-red-600' : 'text-indigo-600'}`} />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900">{session.title}</h4>
                                {isLive && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold animate-pulse">
                                    🔴 LIVE
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-sm text-gray-600 mb-2">{session.subjectName}</div>
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {sessionDate.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {sessionDate.toLocaleTimeString('en-US', { 
                                    hour: 'numeric', 
                                    minute: '2-digit',
                                    hour12: true 
                                  })}
                                </div>
                              </div>

                              {session.description && (
                                <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                                  {session.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className="text-xs text-gray-500">
                              {session.scheduledDurationMinutes} min
                            </span>
                            {isLive && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/live-sessions/${session.id}`);
                                }}
                                className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
                              >
                                Join Now
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "uploads" && (
            <div className="space-y-8">
              <TimetableUpload 
                studentProfileId={profile.id!} 
                isAdmin={isAdmin}
              />
              <div className="border-t border-gray-200 pt-8">
                <SchemeUpload studentProfileId={profile.id!} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Schedule Modal */}
      {showWeeklyScheduleModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowWeeklyScheduleModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
              <h3 className="text-xl font-semibold text-gray-900">Your Weekly Schedule</h3>
              <button
                onClick={() => setShowWeeklyScheduleModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {weeklyScheduleDisplay.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No schedule data available</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {weeklyScheduleDisplay.map((day) => (
                    <div key={day.day} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-indigo-50 px-4 py-3 border-b border-gray-200">
                        <h4 className="font-semibold text-gray-900">{getDayDisplayName(day.day)}</h4>
                        <p className="text-sm text-gray-600">{day.periods.length} periods</p>
                      </div>
                      
                      <div className="p-4 space-y-3">
                        {day.periods.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            No classes scheduled
                          </div>
                        ) : (
                          day.periods.map((period, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                period.completed
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg ${
                                  period.completed ? 'bg-green-100' : 'bg-indigo-50'
                                }`}>
                                  <span className={`text-xs font-semibold ${
                                    period.completed ? 'text-green-700' : 'text-indigo-600'
                                  }`}>
                                    P{period.periodNumber}
                                  </span>
                                </div>
                                
                                <div>
                                  <div className="font-semibold text-gray-900">{period.subjectName}</div>
                                  <div className="text-sm text-gray-600 flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    {formatTimeDisplay(period.startTime)} - {formatTimeDisplay(period.endTime)}
                                  </div>
                                  {period.lessonTopicTitle && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      📚 {period.lessonTopicTitle}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {period.completed && (
                                <div className="flex items-center gap-2 text-green-600">
                                  <span className="text-sm font-semibold">✓</span>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Entries Modal */}
      {showEntriesModal && latestTimetable && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEntriesModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
              <h3 className="text-xl font-semibold text-gray-900">Complete Timetable Details</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEntriesModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <TimetableEntriesDisplay timetableId={latestTimetable.id} />
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Getting Started</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>📅 <strong>Upload your school timetable</strong> to generate your personalized schedule</li>
              <li>📚 <strong>Upload schemes of work</strong> for each subject to see lesson topics</li>
              <li>🎥 <strong>Join live sessions</strong> scheduled by your teachers</li>
              <li>🔔 <strong>Stay updated</strong> with real-time notifications</li>
              <li>🤖 <strong>AI will process your uploads</strong> and map them to our platform automatically</li>
              <li>⏰ <strong>Study during your designated hours</strong> for the best learning experience</li>
              <li>🔄 <strong>Processing is automatic</strong> — you'll see status updates in real-time</li>
              {!isAdmin && hasTimetable && (
                <li className="text-yellow-700">⚠️ <strong>Timetable restrictions:</strong> You can only have one active timetable. Contact an admin to upload a new one.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualDashboard;