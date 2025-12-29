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
    
    // Calculate status for each schedule
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your schedule...</p>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading weekly schedule...</p>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Weekly Schedule
            </h1>
            <p className="text-gray-600">
              Your personalized learning schedule for Week {selectedWeek}
            </p>
          </div>
          <WeeklyCompletionBadge 
            completionRate={weekStats.completionRate}
            totalAssessments={weekStats.total}
            completedCount={weekStats.completed}
          />
        </div>
      </div>

      {/* Learning Hours Info + Week Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Learning Hours Info - Left Column */}
        <div className="lg:col-span-1">
          <LearningHoursInfo />
        </div>

        {/* Week Navigation - Right Column */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handlePreviousWeek}
                  disabled={selectedWeek === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous Week
                </Button>

                <div className="text-center flex-1 mx-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-xl font-bold text-gray-900">
                      Week {selectedWeek}
                    </h2>
                    {weekInfo.isCurrentWeek && (
                      <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                        Current Week
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {weeklyGenerationService.formatScheduleDate(weekInfo.startDate)} -{' '}
                    {weeklyGenerationService.formatScheduleDate(weekInfo.endDate)}
                  </p>
                  {!weekInfo.isCurrentWeek && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleGoToCurrentWeek}
                      className="mt-2"
                    >
                      Go to Current Week
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={handleNextWeek}
                  disabled={selectedWeek >= maxWeeks}
                >
                  Next Week
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Week Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total</p>
                    <p className="text-xl font-bold text-gray-900">{weekStats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Done</p>
                    <p className="text-xl font-bold text-gray-900">{weekStats.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Available</p>
                    <p className="text-xl font-bold text-gray-900">{weekStats.available}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Upcoming</p>
                    <p className="text-xl font-bold text-gray-900">{weekStats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Missed</p>
                    <p className="text-xl font-bold text-gray-900">{weekStats.missed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Daily Schedule Cards */}
      <div className="space-y-6">
        {Object.entries(schedulesByDate).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Schedule Available
              </h3>
              <p className="text-gray-600">
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

      {/* Info Footer */}
      {weekInfo.isCurrentWeek && (
        <>
          {weekStats.available > 0 && (
            <Alert className="mt-6">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                You have {weekStats.available} assessment{weekStats.available !== 1 ? 's' : ''} available NOW.
                Complete them before the windows close!
              </AlertDescription>
            </Alert>
          )}
          
          {weekStats.missed > 0 && (
            <Alert className="mt-6 border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                You missed {weekStats.missed} assessment{weekStats.missed !== 1 ? 's' : ''} this week.
                Their submission windows have expired.
              </AlertDescription>
            </Alert>
          )}
          
          {weekStats.pending > 0 && weekStats.available === 0 && weekStats.missed === 0 && (
            <Alert className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
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