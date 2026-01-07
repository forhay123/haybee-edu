// frontend/src/features/individual/pages/student/WeeklySchedulePage.tsx

import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertCircle, XCircle, Info } from 'lucide-react';
import { useMyWeeklySchedule } from '../../hooks/student/useMyWeeklySchedule';
import { useMyProfile } from '../../../studentProfiles/hooks/useStudentProfiles';
import { useGetActiveTerm } from '../../../terms/api/termsApi';
import { 
  weeklyGenerationService, 
  calculateScheduleStatus,
  getWeekInfo,
  type CalculatedStatus
} from '@/services/weeklyGenerationService';
import { DailyScheduleCard } from '../../components/student/DailyScheduleCard';
import { WeeklyCompletionBadge } from '../../components/student/WeeklyCompletionBadge';
import { LearningHoursInfo } from '../../components/student/LearningHoursInfo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const WeeklySchedulePage: React.FC = () => {
  // ============================================================
  // PROFILE & TERM LOADING
  // ============================================================
  const { data: profile, isLoading: profileLoading, error: profileError } = useMyProfile();
  const { data: activeTerm, isLoading: termLoading } = useGetActiveTerm();
  
  // ============================================================
  // WEEK SELECTION STATE
  // ============================================================
  const [selectedWeek, setSelectedWeek] = useState(1);
  
  // ============================================================
  // GET TERM START DATE
  // ============================================================
  const termStartDate = activeTerm?.startDate || new Date().toISOString().split('T')[0];
  const maxWeeks = activeTerm?.weekCount || 12;
  
  // ============================================================
  // GET WEEK INFO
  // ============================================================
  const weekInfo = useMemo(() => {
    return getWeekInfo(selectedWeek, termStartDate);
  }, [selectedWeek, termStartDate]);

  // ============================================================
  // USE WEEKLY SCHEDULE HOOK
  // ============================================================
  const { useWeekSchedule } = useMyWeeklySchedule(profile?.id || 0);
  const { data: weeklySchedule, isLoading: scheduleLoading, error: scheduleError } = useWeekSchedule(
    termStartDate,
    !!profile?.id && profile?.studentType === 'INDIVIDUAL'
  );

  // ============================================================
  // GROUP SCHEDULES BY DATE
  // ============================================================
  const schedulesByDate = useMemo(() => {
    if (!weeklySchedule?.schedules) return {};
    return weeklyGenerationService.groupSchedulesByDate(weeklySchedule.schedules);
  }, [weeklySchedule]);

  // ============================================================
  // CALCULATE WEEKLY STATISTICS
  // ============================================================
  const weekStats = useMemo(() => {
    if (!weeklySchedule?.schedules) {
      return { 
        total: 0, 
        completed: 0, 
        available: 0,
        pending: 0, 
        missed: 0, 
        completionRate: 0 
      };
    }
    
    const schedulesWithStatus = weeklySchedule.schedules.map((schedule: any) => ({
      ...schedule,
      calculatedStatus: calculateScheduleStatus(schedule)
    }));

    const total = schedulesWithStatus.length;
    const completed = schedulesWithStatus.filter((s: any) => 
      s.calculatedStatus === 'COMPLETED'
    ).length;
    const available = schedulesWithStatus.filter((s: any) => 
      s.calculatedStatus === 'AVAILABLE'
    ).length;
    const pending = schedulesWithStatus.filter((s: any) => 
      s.calculatedStatus === 'PENDING' || s.calculatedStatus === 'UPCOMING'
    ).length;
    const missed = schedulesWithStatus.filter((s: any) => 
      s.calculatedStatus === 'MISSED'
    ).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return { total, completed, available, pending, missed, completionRate };
  }, [weeklySchedule]);

  // ============================================================
  // WEEK NAVIGATION HANDLERS
  // ============================================================
  const handlePreviousWeek = () => {
    if (selectedWeek > 1) {
      setSelectedWeek(selectedWeek - 1);
    }
  };

  const handleNextWeek = () => {
    if (selectedWeek < maxWeeks) {
      setSelectedWeek(selectedWeek + 1);
    }
  };

  const handleGoToCurrentWeek = () => {
    const currentWeek = weeklyGenerationService.calculateWeekNumber(
      new Date(),
      termStartDate
    );
    setSelectedWeek(currentWeek);
  };

  // ============================================================
  // LOADING STATES
  // ============================================================
  if (profileLoading || termLoading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-sm sm:text-base text-gray-600">Loading your schedule...</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR STATES
  // ============================================================
  if (profileError || !profile) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Failed to load profile: {profileError?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ============================================================
  // STUDENT TYPE CHECK
  // ============================================================
  if (profile.studentType !== 'INDIVIDUAL') {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm text-yellow-800">
            This feature is only available for INDIVIDUAL students.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ============================================================
  // NO ACTIVE TERM
  // ============================================================
  if (!activeTerm) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800">
            No active term found. Please contact your administrator to set an active term.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ============================================================
  // SCHEDULE LOADING
  // ============================================================
  if (scheduleLoading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-sm sm:text-base text-gray-600">Loading weekly schedule...</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // SCHEDULE ERROR
  // ============================================================
  if (scheduleError) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Failed to load weekly schedule: {scheduleError.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header - Mobile Optimized */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              Weekly Schedule
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Week {selectedWeek} schedule
            </p>
          </div>
          <div className="self-start sm:self-auto">
            <WeeklyCompletionBadge 
              completionRate={weekStats.completionRate}
              totalAssessments={weekStats.total}
              completedCount={weekStats.completed}
            />
          </div>
        </div>
      </div>

      {/* Week Navigation - Mobile First */}
      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousWeek}
              disabled={selectedWeek === 1}
              className="flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Previous</span>
            </Button>

            <div className="text-center flex-1 min-w-0">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
                <h2 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                  Week {selectedWeek}
                </h2>
                {weekInfo.isCurrentWeek && (
                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full flex-shrink-0">
                    Current
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-600 truncate px-2">
                {weeklyGenerationService.formatScheduleDate(weekInfo.startDate)} - {weeklyGenerationService.formatScheduleDate(weekInfo.endDate)}
              </p>
              {!weekInfo.isCurrentWeek && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleGoToCurrentWeek}
                  className="mt-1 text-xs sm:text-sm h-auto py-1"
                >
                  Go to Current Week
                </Button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextWeek}
              disabled={selectedWeek >= maxWeeks}
              className="flex-shrink-0"
            >
              <span className="hidden sm:inline mr-2">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics - Mobile Optimized Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-600 truncate">Total</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{weekStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-600 truncate">Done</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{weekStats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-600 truncate">Available</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{weekStats.available}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg flex-shrink-0">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-600 truncate">Upcoming</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{weekStats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg flex-shrink-0">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-600 truncate">Missed</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{weekStats.missed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Hours Info - Full Width on Mobile */}
      <div className="mb-4 sm:mb-6">
        <LearningHoursInfo />
      </div>

      {/* Daily Schedule Cards */}
      <div className="space-y-3 sm:space-y-6">
        {Object.entries(schedulesByDate).length === 0 ? (
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                No Schedule Available
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                {weekInfo.isPastWeek
                  ? 'This week has passed and schedules have been archived.'
                  : weekInfo.isFutureWeek
                  ? 'Schedules for this week will be generated soon.'
                  : 'No schedules have been generated for this week yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(schedulesByDate)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([date, schedules]) => (
              <DailyScheduleCard
                key={date}
                date={date}
                schedules={schedules}
              />
            ))
        )}
      </div>

      {/* Info Footer - Mobile Optimized */}
      {weekInfo.isCurrentWeek && (
        <>
          {weekStats.available > 0 && (
            <Alert className="mt-4 sm:mt-6">
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-sm">
                You have {weekStats.available} assessment{weekStats.available !== 1 ? 's' : ''} available NOW.
                Complete them before the windows close!
              </AlertDescription>
            </Alert>
          )}
          
          {weekStats.missed > 0 && (
            <Alert className="mt-4 sm:mt-6 border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-800">
                You missed {weekStats.missed} assessment{weekStats.missed !== 1 ? 's' : ''} this week.
                Their submission windows have expired.
              </AlertDescription>
            </Alert>
          )}
          
          {weekStats.pending > 0 && weekStats.available === 0 && weekStats.missed === 0 && (
            <Alert className="mt-4 sm:mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                You have {weekStats.pending} upcoming assessment{weekStats.pending !== 1 ? 's' : ''} this week.
                They will become available during their scheduled times.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
};

export default WeeklySchedulePage;