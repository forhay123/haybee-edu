// Update the WeeklyScheduleDisplay component to use active term

import React from "react";
import { 
  Calendar, 
  Clock, 
  BookOpen, 
  CheckCircle, 
  Circle, 
  AlertCircle,
  TrendingUp,
  PlayCircle,
  Info,
  Target
} from "lucide-react";

// ✅ EXISTING HOOKS
import { 
  useWeeklySchedule, 
  useWeeklyScheduleStats,
  formatTimeDisplay,
  getDayDisplayName,
  isToday,
  getNextClass,
  WeeklyScheduleDay 
} from "../hooks/useIndividualSchedule";

// ✅ NEW: Enhanced hooks you already have
import { useMultiPeriodProgress } from "../hooks/student/useMultiPeriodProgress";
import { useMyCurrentIncompleteLessons } from "../hooks/student/useMyIncompleteLessons";
import { useMyStatsThisWeek } from "../hooks/student/useMyStats";

// ✅ NEW: Components you already have
import {MultiAssessmentProgressCard} from "./student/MultiAssessmentProgressCard";
import {IncompleteLessonDetail} from "./student/IncompleteLessonDetail";
import {AssessmentCountdownTimer} from "./student/AssessmentCountdownTimer";
import { WeeklyCompletionBadge } from "./student/WeeklyCompletionBadge";

// ✅ NEW: Import week calculator utils
import { 
  getCurrentWeekNumber, 
  formatWeekRange, 
  getTermProgress,
  calculateTotalWeeks
} from "../utils/weekCalculator";

// ✅ NEW: Import active term hook
import { useGetActiveTerm } from "../../terms/api/termsApi";

interface WeeklyScheduleDisplayProps {
  studentProfileId: number;
}

const WeeklyScheduleDisplay: React.FC<WeeklyScheduleDisplayProps> = ({
  studentProfileId,
}) => {
  // ============================================================
  // ✅ NEW: Fetch active term from database
  // ============================================================
  const { data: activeTerm, isLoading: termLoading } = useGetActiveTerm();

  // ============================================================
  // ✅ EXISTING: Weekly schedule data
  // ============================================================
  const { 
    weeklySchedule, 
    timetable,
    extractedEntries,
    isLoading, 
    error 
  } = useWeeklySchedule(studentProfileId);

  const stats = useWeeklyScheduleStats(weeklySchedule);
  const nextClass = getNextClass(weeklySchedule);

  // ============================================================
  // ✅ NEW: Multi-assessment progress (PHASE 1)
  // ============================================================
  const { 
    multiPeriodLessons, 
    summary: multiSummary,
    isLoading: multiLoading 
  } = useMultiPeriodProgress();

  // ============================================================
  // ✅ NEW: Incomplete lessons (PHASE 3)
  // ============================================================
  const { 
    data: incompleteReport 
  } = useMyCurrentIncompleteLessons();

  // ============================================================
  // ✅ NEW: Enhanced stats (PHASE 1 - Stats Enhancement)
  // ============================================================
  const { 
    data: comprehensiveStats 
  } = useMyStatsThisWeek();

  // ============================================================
  // ✅ FIXED: Term week context using active term from database
  // ============================================================
  const termStartDate = activeTerm?.startDate || "2025-01-06"; // Fallback
  const termEndDate = activeTerm?.endDate || "2025-03-31"; // Fallback
  const currentWeekNumber = getCurrentWeekNumber(termStartDate);
  const totalWeeks = activeTerm?.weekCount || calculateTotalWeeks(termStartDate, termEndDate);
  const termProgress = getTermProgress(termStartDate, termEndDate);
  const weekRange = formatWeekRange(currentWeekNumber, termStartDate);
  const termName = activeTerm?.name || "Term 1";

  // ============================================================
  // ✅ EXISTING: Subject code map
  // ============================================================
  const subjectCodeMap = React.useMemo(() => {
    const map = new Map<number, string>();
    if (extractedEntries && Array.isArray(extractedEntries)) {
      extractedEntries.forEach((entry: any) => {
        if (entry.subjectId && entry.subjectCode) {
          map.set(entry.subjectId, entry.subjectCode);
        }
      });
    }
    return map;
  }, [extractedEntries]);

  // ============================================================
  // ✅ EXISTING: Loading state
  // ============================================================
  if (isLoading || multiLoading || termLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading schedule...</span>
      </div>
    );
  }

  // ============================================================
  // ✅ NEW: No active term warning
  // ============================================================
  if (!activeTerm) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <p className="text-sm font-semibold text-amber-900">No Active Term</p>
            <p className="text-xs text-amber-700 mt-1">
              Please contact your administrator to set an active term for accurate week calculations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ✅ EXISTING: Error state
  // ============================================================
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
          <div>
            <p className="text-sm font-semibold text-red-900">Failed to load schedule</p>
            <p className="text-xs text-red-700 mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ✅ EXISTING: No timetable state
  // ============================================================
  if (!timetable || timetable.processingStatus !== "COMPLETED") {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-900 font-medium mb-2">No Timetable Available</p>
        <p className="text-sm text-gray-600">
          Upload a timetable to generate your weekly schedule
        </p>
      </div>
    );
  }

  // ============================================================
  // ✅ EXISTING: No mapped subjects state
  // ============================================================
  if (weeklySchedule.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <p className="text-sm font-semibold text-amber-900">No Mapped Subjects</p>
            <p className="text-xs text-amber-700 mt-1">
              Your timetable has been processed, but no subjects have been mapped yet. 
              Please contact your administrator to complete the subject mapping.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* ✅ FIXED: Term Week Indicator with dynamic active term */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <div>
              <h4 className="font-semibold text-indigo-900">
                {termName} - Week {currentWeekNumber} of {totalWeeks}
              </h4>
              <p className="text-sm text-indigo-700">
                {weekRange}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">
                {termProgress}% complete
              </span>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-indigo-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(100, termProgress)}%` }}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* ✅ EXISTING: Learning Hours Info Banner */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <Info className="w-6 h-6 text-indigo-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-indigo-900 mb-2">Your Personalized Learning Schedule</h3>
            <p className="text-sm text-indigo-700 mb-3">
              This schedule distributes your subjects across your designated learning hours throughout the week.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <p className="text-xs text-gray-600 mb-1 font-medium">Monday - Friday</p>
            <p className="font-bold text-indigo-900 text-lg">4:00 PM - 6:00 PM</p>
            <p className="text-xs text-gray-500 mt-1">2 hours daily</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <p className="text-xs text-gray-600 mb-1 font-medium">Saturday</p>
            <p className="font-bold text-indigo-900 text-lg">12:00 PM - 3:00 PM</p>
            <p className="text-xs text-gray-500 mt-1">3 hours</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-600 mb-1 font-medium">Sunday</p>
            <p className="font-bold text-gray-600 text-lg">Rest Day</p>
            <p className="text-xs text-gray-500 mt-1">🌴 No classes</p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ✅ ENHANCED: Stats Cards with Topic Completion (PHASE 1) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Assessments */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-indigo-600 font-medium">Total Assessments</p>
              <p className="text-2xl font-bold text-indigo-900">
                {comprehensiveStats?.totalLessons || stats.totalPeriods}
              </p>
            </div>
          </div>
        </div>

        {/* Topics Completed */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-green-600 font-medium">Topics Completed</p>
              <p className="text-2xl font-bold text-green-900">
                {multiSummary?.fullyCompletedLessons || 0} / {multiSummary?.totalLessons || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Pending Assessments */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600 rounded-lg">
              <Circle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-amber-600 font-medium">Pending</p>
              <p className="text-2xl font-bold text-amber-900">
                {multiSummary?.scheduledLessons || stats.pendingPeriods}
              </p>
            </div>
          </div>
        </div>

        {/* Topic Completion Rate */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-purple-600 font-medium">Topic Completion</p>
              <p className="text-2xl font-bold text-purple-900">
                {(multiSummary?.overallCompletionRate || stats.completionRate).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ✅ EXISTING: Next Class Alert */}
      {/* ============================================================ */}
      {nextClass && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-5 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium opacity-90">Next Class</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xl font-bold">{nextClass.subjectName}</p>
                {subjectCodeMap.has(nextClass.subjectId) && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-white/20 border border-white/30">
                    {subjectCodeMap.get(nextClass.subjectId)}
                  </span>
                )}
              </div>
              <p className="text-sm opacity-80 mt-1">
                {getDayDisplayName(nextClass.day)} • {formatTimeDisplay(nextClass.startTime)} - {formatTimeDisplay(nextClass.endTime)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ✅ NEW: Multi-Assessment Progress Section (PHASE 1) */}
      {/* ============================================================ */}
      {multiPeriodLessons && multiPeriodLessons.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Lesson Topics Progress
              <span className="text-sm font-normal text-gray-500">
                ({multiSummary?.fullyCompletedLessons || 0} of {multiSummary?.totalLessons || 0} complete)
              </span>
            </h3>
            
            {multiSummary && (
              <WeeklyCompletionBadge
                completionRate={multiSummary.overallCompletionRate}
                totalAssessments={multiSummary.totalLessons}
                completedCount={multiSummary.fullyCompletedLessons}
                variant="detailed"
              />
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {multiPeriodLessons.map((lesson) => (
              <MultiAssessmentProgressCard 
                key={lesson.lessonTopicId}
                lesson={lesson}
              />
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ✅ NEW: Incomplete Assessments Section (PHASE 3) */}
      {/* ============================================================ */}
      {incompleteReport && incompleteReport.totalIncomplete > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Incomplete Assessments
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
              {incompleteReport.totalIncomplete}
            </span>
          </h3>
          
          <IncompleteLessonDetail report={incompleteReport} />
        </div>
      )}

      {/* ============================================================ */}
      {/* ✅ EXISTING: Weekly Schedule Grid */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Your Weekly Schedule
        </h3>

        {weeklySchedule.map((daySchedule) => (
          <DayScheduleCard 
            key={daySchedule.day} 
            daySchedule={daySchedule}
            subjectCodeMap={subjectCodeMap}
          />
        ))}
      </div>

      {/* ============================================================ */}
      {/* ✅ EXISTING: Subject Distribution */}
      {/* ============================================================ */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          Subject Distribution
        </h4>
        <div className="space-y-3">
          {Object.entries(stats.subjectDistribution)
            .sort(([, a], [, b]) => b - a)
            .map(([subject, count]) => (
              <div key={subject} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{subject}</span>
                    <span className="text-sm text-gray-600">
                      {count} {count === 1 ? 'period' : 'periods'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${(count / stats.totalPeriods) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ✅ ENHANCED: Day Schedule Card with Countdown Timers (PHASE 2)
// ============================================================
interface DayScheduleCardProps {
  daySchedule: WeeklyScheduleDay;
  subjectCodeMap: Map<number, string>;
}

const DayScheduleCard: React.FC<DayScheduleCardProps> = ({ daySchedule, subjectCodeMap }) => {
  const isTodayFlag = isToday(daySchedule.day);
  const completedCount = daySchedule.periods.filter(p => p.completed).length;

  return (
    <div 
      className={`border rounded-lg overflow-hidden transition-all ${
        isTodayFlag 
          ? 'border-indigo-300 shadow-lg ring-2 ring-indigo-100' 
          : 'border-gray-200 shadow-sm'
      }`}
    >
      {/* Day Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        isTodayFlag 
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600' 
          : 'bg-gradient-to-r from-gray-700 to-gray-800'
      }`}>
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-white" />
          <div>
            <h4 className="font-semibold text-white">
              {getDayDisplayName(daySchedule.day)}
            </h4>
            <p className="text-xs text-white/80">
              {formatTimeDisplay(daySchedule.timeWindow.startTime)} - {formatTimeDisplay(daySchedule.timeWindow.endTime)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTodayFlag && (
            <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-medium">
              Today
            </span>
          )}
          <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
            {completedCount}/{daySchedule.periods.length} done
          </span>
        </div>
      </div>

      {/* Periods */}
      <div className="divide-y divide-gray-100 bg-white">
        {daySchedule.periods.map((period) => (
          <div 
            key={period.periodNumber}
            className={`px-4 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors ${
              period.completed ? 'opacity-60' : ''
            }`}
          >
            {/* Period Number */}
            <div className="flex-shrink-0">
              <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center border-2 ${
                period.completed 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-indigo-50 border-indigo-300'
              }`}>
                <span className="text-xs text-gray-600 font-medium">Period</span>
                <span className={`text-xl font-bold ${
                  period.completed ? 'text-green-700' : 'text-indigo-600'
                }`}>
                  {period.periodNumber}
                </span>
              </div>
            </div>

            {/* Subject Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <BookOpen className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <h5 className={`font-semibold text-gray-900 ${
                  period.completed ? 'line-through' : ''
                }`}>
                  {period.subjectName}
                </h5>
                {subjectCodeMap.has(period.subjectId) && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                    {subjectCodeMap.get(period.subjectId)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {formatTimeDisplay(period.startTime)} - {formatTimeDisplay(period.endTime)}
                </span>
              </div>
              {period.lessonTopicTitle && (
                <p className="text-xs text-gray-500 mt-1 truncate">
                  Topic: {period.lessonTopicTitle}
                </p>
              )}
              
              {/* ✅ NEW: Countdown Timer (PHASE 2) */}
              {!period.completed && period.assessmentWindowStart && period.assessmentWindowEnd && (
                <div className="mt-2">
                  <AssessmentCountdownTimer
                    scheduleId={period.scheduleId}
                    windowStart={period.assessmentWindowStart}
                    windowEnd={period.assessmentWindowEnd}
                    gracePeriodEnd={period.gracePeriodEnd || period.assessmentWindowEnd}
                  />
                </div>
              )}
            </div>

            {/* Status Icon */}
            <div className="flex-shrink-0">
              {period.completed ? (
                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Done</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  <Circle className="w-4 h-4" />
                  <span className="text-xs font-medium">Pending</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyScheduleDisplay;