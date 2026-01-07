import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Calendar, Clock, BookOpen, CheckCircle2, Sun, XCircle, AlertCircle, Award, TrendingUp, HourglassIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { getDayLearningHours, formatLearningTime } from "./LearningHoursInfo";
import { 
  calculateScheduleStatus, 
  getStatusBadgeInfo,
  formatTimeRemaining,
  type CalculatedStatus 
} from "@/services/weeklyGenerationService";
import type { IndividualDailyScheduleDto } from "../../api/weeklyGenerationApi";
import { useQuery } from "@tanstack/react-query";
import axios from "@/api/axios";
import { NullifiedSubmissionNotice } from "./NullifiedSubmissionNotice";
import { PeriodStatusBadge } from "@/features/assessments/components/PeriodStatusBadge";
import { usePeriodDependency } from "@/features/assessments/hooks/usePeriodDependency";

interface DailyScheduleCardProps {
  date: string;
  schedules: IndividualDailyScheduleDto[];
  onScheduleClick?: (schedule: IndividualDailyScheduleDto) => void;
}

interface AssessmentResult {
  id: number;
  assessmentId: number;
  assessmentTitle: string;
  studentId: number;
  studentName: string;
  lessonTopicId: number;
  submittedAt: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  graded: boolean;
  gradedAt: string | null;
  submittedBeforeWindow: boolean | null;
  originalSubmissionTime: string | null;
  nullifiedAt: string | null;
  nullifiedReason: string | null;
  valid: boolean;
  nullified: boolean;
}

function useAssessmentResult(progressId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['assessment-result', progressId],
    queryFn: async () => {
      if (!progressId) return null;
      try {
        const progressResponse = await axios.get(`/progress/${progressId}`);
        const progress = progressResponse.data;
        
        if (!progress.submissionId) return null;
        
        const resultResponse = await axios.get(`/lesson-assessments/results/${progress.submissionId}`);
        const result = resultResponse.data as AssessmentResult;
        
        if (result.nullified) {
          console.log('⚠️ Submission is nullified - not showing score');
          return null;
        }
        
        return result;
      } catch (error) {
        console.error('Error fetching assessment result:', error);
        return null;
      }
    },
    enabled: enabled && !!progressId,
    staleTime: 30000,
  });
}

export function DailyScheduleCard({
  date,
  schedules,
  onScheduleClick,
}: DailyScheduleCardProps) {
  const navigate = useNavigate();
  const scheduleDate = parseISO(date);
  const isToday = format(new Date(), "yyyy-MM-dd") === date;
  const dayName = format(scheduleDate, "EEEE");
  
  const learningHours = getDayLearningHours(dayName);
  
  const sortedSchedules = [...schedules]
    .sort((a, b) => a.periodNumber - b.periodNumber);
  
  const schedulesWithCalculatedStatus = sortedSchedules.map(schedule => ({
    ...schedule,
    calculatedStatus: calculateScheduleStatus(schedule)
  }));

  const completedCount = schedulesWithCalculatedStatus.filter(
    s => s.calculatedStatus === 'COMPLETED'
  ).length;
  const completionRate = sortedSchedules.length > 0 
    ? Math.round((completedCount / sortedSchedules.length) * 100) 
    : 0;

  const handleScheduleClick = (schedule: IndividualDailyScheduleDto) => {
    console.log('🔍 Schedule clicked:', schedule);
    
    if (onScheduleClick) {
      onScheduleClick(schedule);
    }

    if (!schedule.lessonTopicId) {
      alert("This lesson doesn't have a topic assigned yet. Your teacher will assign one soon.");
      return;
    }

    const progressId = schedule.progressId;
    
    if (!progressId) {
      console.error('❌ No progress ID found for schedule:', schedule);
      alert("This lesson hasn't been initialized yet. Please contact your teacher or try refreshing the page.");
      return;
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('📍 NAVIGATION - Always going to lesson view first');
    console.log('═══════════════════════════════════════════════════');
    console.log('Subject:', schedule.subjectName);
    console.log('Progress ID:', progressId);
    console.log('Status:', schedule.status);
    console.log('═══════════════════════════════════════════════════');
    
    // ALWAYS route to lesson view page
    // The lesson view page will handle showing the "Start Assessment" button when appropriate
    navigate(`/student/individual/lesson/view/${progressId}`);
  };

  const getStatusIcon = (calculatedStatus: CalculatedStatus) => {
    switch (calculatedStatus) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'AVAILABLE':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'MISSED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PENDING':
      case 'UPCOMING':
        return <AlertCircle className="h-4 w-4 text-amber-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  // Handle Sunday (Rest Day) - Mobile Optimized
  if (learningHours.isRestDay) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <CardTitle className="text-base sm:text-lg">
                  <span className="hidden sm:inline">{format(scheduleDate, "EEEE, MMMM d")}</span>
                  <span className="sm:hidden">{format(scheduleDate, "EEE, MMM d")}</span>
                </CardTitle>
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-xs">
                  Rest Day
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white rounded-lg border border-green-200">
            <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0">
              <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm sm:text-base text-gray-900 mb-0.5 sm:mb-1">
                Rest Day 🌴
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                No lessons scheduled. Take time to relax and recharge!
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxSlotsForDay = dayName === 'Saturday' ? 3 : 2;
  const hasOverflow = schedules.length > maxSlotsForDay;
  
  return (
    <Card className={isToday ? "border-indigo-300 shadow-md" : ""}>
      <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <CardTitle className="text-base sm:text-lg">
                <span className="hidden sm:inline">{format(scheduleDate, "EEEE, MMMM d")}</span>
                <span className="sm:hidden">{format(scheduleDate, "EEEE, MMMM d")}</span>
              </CardTitle>
              {isToday && (
                <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300 text-xs flex-shrink-0">
                  Today
                </Badge>
              )}
              {hasOverflow && (
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs flex-shrink-0">
                  <span className="hidden sm:inline">⚠️ {schedules.length - maxSlotsForDay} overflow</span>
                  <span className="sm:hidden">⚠️ +{schedules.length - maxSlotsForDay}</span>
                </Badge>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>
                  {sortedSchedules.length} lesson{sortedSchedules.length !== 1 ? 's' : ''}
                  {hasOverflow && (
                    <span className="text-amber-600 ml-1">
                      ({schedules.length})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 text-indigo-600 font-medium">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm">
                  {learningHours.start && learningHours.end
                    ? `${formatLearningTime(learningHours.start)} - ${formatLearningTime(learningHours.end)}`
                    : 'No learning hours'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-lg sm:text-xl font-bold text-primary">
              {completionRate}%
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {completedCount}/{sortedSchedules.length}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 px-3 sm:px-6 pb-3 sm:pb-6">
        {hasOverflow && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 sm:p-3 mb-2">
            <div className="flex items-start gap-1.5 sm:gap-2">
              <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <strong>Note:</strong> {schedules.length} subjects scheduled, only {maxSlotsForDay} slot{maxSlotsForDay > 1 ? 's' : ''} available ({learningHours.duration}).
              </div>
            </div>
          </div>
        )}
        
        {schedulesWithCalculatedStatus.map((schedule) => {
          const statusInfo = getStatusBadgeInfo(schedule.calculatedStatus);
          const hasNoTopic = !schedule.lessonTopicId;
          
          const { 
            canAccess, 
            isWaitingForTeacher, 
            requiresCustomAssessment,
            customAssessmentCreated,
            statusMessage 
          } = usePeriodDependency({ 
            progressId: schedule.progressId,
            enabled: !!schedule.progressId && schedule.status !== 'MISSED' && schedule.incompleteReason !== 'MISSED_GRACE_PERIOD'
          });

          const finalIsWaitingForTeacher = 
            schedule.status === 'MISSED' || schedule.incompleteReason === 'MISSED_GRACE_PERIOD' 
              ? false 
              : isWaitingForTeacher;

          const isClickable = !hasNoTopic && (!requiresCustomAssessment || customAssessmentCreated);

          const { data: assessmentResult } = useAssessmentResult(
            schedule.progressId,
            schedule.calculatedStatus === 'COMPLETED'
          );

          const { data: nullifiedSubmission } = useAssessmentResult(
            schedule.progressId,
            schedule.calculatedStatus === 'AVAILABLE' || schedule.calculatedStatus === 'MISSED'
          );

          const hasNullifiedSubmission = nullifiedSubmission?.nullified === true;

          let clickMessage = '';
          if (!schedule.lessonTopicId) {
            clickMessage = ''; 
          } else if (finalIsWaitingForTeacher) {
            clickMessage = '⏳ Teacher is preparing your custom assessment';
          } else if (schedule.calculatedStatus === 'COMPLETED') {
            clickMessage = '✅ Click to view lesson & results';
          } else if (schedule.calculatedStatus === 'AVAILABLE') {
            if (hasNullifiedSubmission) {
              clickMessage = '🔄 Previous submission invalidated • Click to resubmit';
            } else if (requiresCustomAssessment && customAssessmentCreated) {
              clickMessage = '🎯 Custom assessment ready • Click to start!';
            } else {
              clickMessage = `🚀 Assessment READY • Click to start now!`;
            }
          } else if (schedule.calculatedStatus === 'MISSED') {
            clickMessage = '📖 Assessment closed • Click to view lesson content';
          } else if (schedule.calculatedStatus === 'PENDING' || schedule.calculatedStatus === 'UPCOMING') {
            const startTime = schedule.startTime ? formatLearningTime(schedule.startTime) : '';
            clickMessage = `📖 Click to view lesson • Assessment opens at ${startTime}`;
          }

          return (
            <button
              key={schedule.id}
              onClick={() => handleScheduleClick(schedule)}
              disabled={!isClickable}
              className={`
                w-full text-left transition-all
                ${isClickable ? 'hover:scale-[1.01] active:scale-[0.99] cursor-pointer' : 'cursor-not-allowed opacity-60'}
              `}
            >
              <div className={`
                flex flex-col gap-2 rounded-lg border p-2.5 sm:p-3
                ${isClickable ? 'hover:bg-accent hover:shadow-sm active:shadow-md' : ''}
                transition-colors
                ${schedule.calculatedStatus === 'COMPLETED' ? 'border-green-200 bg-green-50' : ''}
                ${schedule.calculatedStatus === 'MISSED' ? 'border-red-200 bg-red-50' : ''}
                ${schedule.calculatedStatus === 'AVAILABLE' ? 'border-blue-200 bg-blue-50 ring-2 ring-blue-300' : ''}
                ${(schedule.calculatedStatus === 'PENDING' || schedule.calculatedStatus === 'UPCOMING') ? 'border-amber-200 bg-amber-50' : ''}
                ${finalIsWaitingForTeacher ? 'border-yellow-300 bg-yellow-50' : ''}  
              `}>
                
                {/* MOBILE: Vertical Stack Layout */}
                <div className="flex flex-col gap-2">
                  {/* Row 1: Status Icon + Period + Time + Badge */}
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0">
                      {finalIsWaitingForTeacher ? (
                        <HourglassIcon className="h-4 w-4 text-yellow-600 animate-pulse" />
                      ) : (
                        getStatusIcon(schedule.calculatedStatus)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            Period {schedule.periodNumber}
                          </div>
                          {schedule.startTime && schedule.endTime && (
                            <div className="text-xs text-muted-foreground">
                              {formatLearningTime(schedule.startTime)} - {formatLearningTime(schedule.endTime)}
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="flex-shrink-0">
                          {finalIsWaitingForTeacher ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-yellow-100 text-yellow-800 border-yellow-300"
                            >
                              <HourglassIcon className="mr-1 h-2.5 w-2.5" />
                              <span className="hidden sm:inline">Waiting</span>
                              <span className="sm:hidden">Wait</span>
                            </Badge>
                          ) : requiresCustomAssessment && customAssessmentCreated ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-purple-100 text-purple-800 border-purple-300"
                            >
                              <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                              Custom
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${statusInfo.bgColor} ${statusInfo.color} border-current`}
                            >
                              <span className="mr-1">{statusInfo.icon}</span>
                              {statusInfo.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Subject Name & Topic (Full Width) */}
                  <div className="pl-6">
                    <div className="flex items-start gap-1.5 mb-1">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 break-words">
                          {schedule.subjectName}
                        </div>
                        {schedule.lessonTopicTitle ? (
                          <div className="text-xs text-muted-foreground mt-0.5 break-words">
                            {schedule.lessonTopicTitle}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-orange-600 italic mt-0.5">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            Topic not assigned
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Nullified Submission Notice */}
                {hasNullifiedSubmission && nullifiedSubmission && schedule.assessmentWindowStart && (
                  <div className="pl-6">
                    <NullifiedSubmissionNotice
                      originalSubmissionTime={nullifiedSubmission.originalSubmissionTime || nullifiedSubmission.submittedAt}
                      nullifiedReason={nullifiedSubmission.nullifiedReason || "Submitted before assessment window"}
                      assessmentWindowStart={schedule.assessmentWindowStart}
                      variant="inline"
                    />
                  </div>
                )}
                
                {/* Assessment Results - Mobile Optimized */}
                {schedule.calculatedStatus === 'COMPLETED' && assessmentResult && !assessmentResult.nullified && (
                  <div className="bg-white border border-green-200 rounded-lg p-2 sm:p-3 ml-0 sm:ml-6">
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                        <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                          Score:
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-xs sm:text-sm font-bold text-gray-900">
                            {assessmentResult.score.toFixed(1)} / {assessmentResult.totalMarks}
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">
                            {assessmentResult.percentage.toFixed(1)}%
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] sm:text-xs ${
                            assessmentResult.passed
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-red-100 text-red-700 border-red-300'
                          }`}
                        >
                          {assessmentResult.passed ? '✓ Pass' : '✗ Fail'}
                        </Badge>
                      </div>
                    </div>
                    {!assessmentResult.graded && (
                      <div className="mt-1.5 sm:mt-2 flex items-center gap-1 text-[10px] sm:text-xs text-amber-600">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span>Pending grading</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Click Message */}
                {clickMessage && (
                  <div className="text-[10px] sm:text-xs font-medium text-gray-700 pl-6 leading-relaxed">
                    {clickMessage}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {/* Empty State */}
        {schedules.length === 0 && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground py-4 justify-center">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>No lessons scheduled</span>
          </div>
        )}

        {/* Learning Window Footer */}
        {schedules.length > 0 && (
          <div className="pt-2 sm:pt-3 mt-2 sm:mt-3 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-[10px] sm:text-xs text-muted-foreground">
              <span className="font-medium">📚 Learning Window</span>
              <span className="font-medium text-gray-700">
                {learningHours.duration} ({formatLearningTime(learningHours.start!)} - {formatLearningTime(learningHours.end!)})
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DailyScheduleCard;