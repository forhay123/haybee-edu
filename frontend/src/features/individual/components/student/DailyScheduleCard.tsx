
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

    const status = calculateScheduleStatus(schedule);
    
    const now = new Date();
    const assessmentStart = schedule.assessmentWindowStart ? new Date(schedule.assessmentWindowStart) : null;
    const assessmentEnd = schedule.assessmentWindowEnd ? new Date(schedule.assessmentWindowEnd) : null;
    
    console.log('═══════════════════════════════════════════════════');
    console.log('📍 NAVIGATION DEBUG INFO');
    console.log('═══════════════════════════════════════════════════');
    console.log('Subject:', schedule.subjectName);
    console.log('Progress ID:', progressId);
    console.log('Calculated Status:', status);
    console.log('Completed At:', schedule.completedAt);
    console.log('---------------------------------------------------');
    console.log('Current Time:', now.toISOString());
    console.log('Assessment Start:', assessmentStart?.toISOString() || 'N/A');
    console.log('Assessment End:', assessmentEnd?.toISOString() || 'N/A');
    console.log('═══════════════════════════════════════════════════');
    
    let manualStatus: string;
    if (schedule.completedAt) {
      manualStatus = 'COMPLETED';
    } else if (assessmentStart && assessmentEnd && now >= assessmentStart && now <= assessmentEnd) {
      manualStatus = 'AVAILABLE';
    } else if (assessmentEnd && now > assessmentEnd) {
      manualStatus = 'MISSED';
    } else {
      manualStatus = 'UPCOMING';
    }
    
    const finalStatus = manualStatus !== status ? manualStatus : status;
    
    if (finalStatus === 'COMPLETED') {
      navigate(`/student/individual/lesson/view/${progressId}`);
    } 
    else if (finalStatus === 'AVAILABLE') {
      navigate(`/student/individual/assessment/start/${progressId}`);
    } 
    else if (finalStatus === 'MISSED') {
      navigate(`/student/individual/lesson/view/${progressId}`);
    } 
    else {
      navigate(`/student/individual/lesson/view/${progressId}`);
    }
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

  // Handle Sunday (Rest Day)
  if (learningHours.isRestDay) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">
                  {format(scheduleDate, "EEEE, MMMM d")}
                </CardTitle>
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                  Rest Day
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-green-200">
            <div className="p-3 bg-green-100 rounded-full">
              <Sun className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900 mb-1">
                Rest Day 🌴
              </div>
              <div className="text-sm text-muted-foreground">
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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">
                {format(scheduleDate, "EEEE, MMMM d")}
              </CardTitle>
              {isToday && (
                <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-300">
                  Today
                </Badge>
              )}
              {hasOverflow && (
                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                  ⚠️ {schedules.length - maxSlotsForDay} overflow
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {sortedSchedules.length} lesson{sortedSchedules.length !== 1 ? 's' : ''}
                  {hasOverflow && (
                    <span className="text-amber-600 ml-1">
                      ({schedules.length} total)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                <Clock className="h-4 w-4" />
                <span>
                  {learningHours.start && learningHours.end
                    ? `${formatLearningTime(learningHours.start)} - ${formatLearningTime(learningHours.end)}`
                    : 'No learning hours'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-primary">
              {completionRate}%
            </div>
            <div className="text-xs text-muted-foreground">
              {completedCount}/{sortedSchedules.length} done
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {hasOverflow && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <strong>Note:</strong> You have {schedules.length} subjects scheduled, but only {maxSlotsForDay} time slot{maxSlotsForDay > 1 ? 's' : ''} available today ({learningHours.duration}). 
                Showing all {schedules.length} subjects.
              </div>
            </div>
          </div>
        )}
        
        {schedulesWithCalculatedStatus.map((schedule) => {
          const statusInfo = getStatusBadgeInfo(schedule.calculatedStatus);
          const hasNoTopic = !schedule.lessonTopicId;
          
          // ⭐ NEW: Check if this is a multi-period subject with custom assessment
          // ⭐ FIXED: Don't call usePeriodDependency for MISSED assessments
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

          // ✅ Override isWaitingForTeacher if status is MISSED
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
          } else if (finalIsWaitingForTeacher) {  // ← CHANGED
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
                ${isClickable ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-not-allowed opacity-60'}
              `}
            >
              <div className={`
                flex flex-col gap-2 rounded-lg border p-3
                ${isClickable ? 'hover:bg-accent hover:shadow-sm' : ''}
                transition-colors
                ${schedule.calculatedStatus === 'COMPLETED' ? 'border-green-200 bg-green-50' : ''}
                ${schedule.calculatedStatus === 'MISSED' ? 'border-red-200 bg-red-50' : ''}
                ${schedule.calculatedStatus === 'AVAILABLE' ? 'border-blue-200 bg-blue-50 ring-2 ring-blue-300' : ''}
                ${(schedule.calculatedStatus === 'PENDING' || schedule.calculatedStatus === 'UPCOMING') ? 'border-amber-200 bg-amber-50' : ''}
                ${finalIsWaitingForTeacher ? 'border-yellow-300 bg-yellow-50' : ''}  
              `}>
                
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {finalIsWaitingForTeacher ? (  
                      <HourglassIcon className="h-4 w-4 text-yellow-600 animate-pulse" />
                    ) : (
                      getStatusIcon(schedule.calculatedStatus)
                    )}
                  </div>

                  <div className="flex-shrink-0 min-w-[120px]">
                    <div className="text-sm font-semibold text-gray-900">
                      Period {schedule.periodNumber}
                    </div>
                    {schedule.startTime && schedule.endTime && (
                      <div className="text-xs text-muted-foreground">
                        {formatLearningTime(schedule.startTime)} - {formatLearningTime(schedule.endTime)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {schedule.subjectName}
                      </span>
                    </div>
                    {schedule.lessonTopicTitle ? (
                      <div className="text-xs text-muted-foreground truncate">
                        {schedule.lessonTopicTitle}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-orange-600 italic">
                        <AlertCircle className="h-3 w-3" />
                        Topic not assigned
                      </div>
                    )}
                  </div>

                  {/* ⭐ NEW: Show custom assessment status */}
                  {finalIsWaitingForTeacher ? (  
                    <Badge
                      variant="outline"
                      className="text-xs flex-shrink-0 bg-yellow-100 text-yellow-800 border-yellow-300"
                    >
                      <HourglassIcon className="mr-1 h-3 w-3" />
                      Waiting for Teacher
                    </Badge>
                  ) : requiresCustomAssessment && customAssessmentCreated ? (
                    <Badge
                      variant="outline"
                      className="text-xs flex-shrink-0 bg-purple-100 text-purple-800 border-purple-300"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Custom Assessment
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className={`text-xs flex-shrink-0 ${statusInfo.bgColor} ${statusInfo.color} border-current`}
                    >
                      <span className="mr-1">{statusInfo.icon}</span>
                      {statusInfo.label}
                    </Badge>
                  )}
                </div>
                
                {hasNullifiedSubmission && nullifiedSubmission && schedule.assessmentWindowStart && (
                  <NullifiedSubmissionNotice
                    originalSubmissionTime={nullifiedSubmission.originalSubmissionTime || nullifiedSubmission.submittedAt}
                    nullifiedReason={nullifiedSubmission.nullifiedReason || "Submitted before assessment window"}
                    assessmentWindowStart={schedule.assessmentWindowStart}
                    variant="inline"
                  />
                )}
                
                {schedule.calculatedStatus === 'COMPLETED' && assessmentResult && !assessmentResult.nullified && (
                  <div className="bg-white border border-green-200 rounded-lg p-3 ml-9">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-gray-700">Assessment Score:</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {assessmentResult.score.toFixed(1)} / {assessmentResult.totalMarks}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {assessmentResult.percentage.toFixed(1)}%
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            assessmentResult.passed
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-red-100 text-red-700 border-red-300'
                          }`}
                        >
                          {assessmentResult.passed ? '✓ Passed' : '✗ Failed'}
                        </Badge>
                      </div>
                    </div>
                    {!assessmentResult.graded && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="h-3 w-3" />
                        <span>Pending grading</span>
                      </div>
                    )}
                  </div>
                )}
                
                {clickMessage && (
                  <div className="text-xs font-medium text-gray-700 pl-9">
                    {clickMessage}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {schedules.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
            <Calendar className="h-4 w-4" />
            <span>No lessons scheduled for this day</span>
          </div>
        )}

        {schedules.length > 0 && (
          <div className="pt-3 mt-3 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>📚 Learning Window</span>
              <span className="font-medium">
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
