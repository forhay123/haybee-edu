// frontend/src/features/individual/pages/student/AssessmentStartPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, BookOpen, AlertCircle, CheckCircle2, FileText, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { formatLearningTime } from '../../components/student/LearningHoursInfo';
import api from '@/api/axios';

// ============================================================
// ✅ TIMEZONE UTILITY
// ============================================================
/**
 * Converts UTC timestamp string from database to proper Date object
 * Backend stores times in UTC without 'Z' suffix.
 * JavaScript's Date constructor treats strings without timezone info as LOCAL time.
 * This function ensures they're interpreted as UTC.
 */
const parseUTCTimestamp = (timestamp: string | null | undefined): Date | null => {
  if (!timestamp) {
    return null;
  }
  
  try {
    // If already has timezone indicator, use as-is
    if (timestamp.endsWith('Z') || timestamp.includes('+') || timestamp.includes('-', 10)) {
      return new Date(timestamp);
    }
    
    // Replace space with 'T' (ISO format) and add 'Z' to indicate UTC
    return new Date(timestamp.replace(' ', 'T') + 'Z');
  } catch (error) {
    console.error('Failed to parse timestamp:', timestamp, error);
    return null;
  }
};

/**
 * Format UTC timestamp for display in Lagos timezone
 */
const formatTimeInLagos = (utcTimestamp: string | null | undefined): string => {
  const date = parseUTCTimestamp(utcTimestamp);
  if (!date) return 'N/A';
  
  return date.toLocaleTimeString('en-NG', { 
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

interface LessonProgressDto {
  id: number;
  studentProfileId: number;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  lessonId: number;
  lessonTitle: string;
  topicName: string;
  scheduledDate: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  assessmentId: number | null;
  assessmentTitle: string | null;
  assessmentAccessible: boolean;
  assessmentWindowStart: string | null;
  assessmentWindowEnd: string | null;
  gracePeriodEnd: string | null;
  completed: boolean;
  assessmentInstanceId: number | null;
  scheduleId: number;
}

type WindowStatus = 'NO_ASSESSMENT' | 'NOT_YET_OPEN' | 'OPEN' | 'CLOSED';

const AssessmentStartPage: React.FC = () => {
  const { progressId } = useParams<{ progressId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<LessonProgressDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowStatus, setWindowStatus] = useState<WindowStatus>('NOT_YET_OPEN');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [timeUntilOpen, setTimeUntilOpen] = useState<number>(0);

  // ✅ FIX: Calculate window status with proper null handling
  const calculateWindowStatus = (data: LessonProgressDto): WindowStatus => {
    // Check if assessment exists
    if (!data.assessmentId || !data.assessmentWindowStart || !data.assessmentWindowEnd) {
      return 'NO_ASSESSMENT';
    }

    const now = Date.now();
    const windowStartDate = parseUTCTimestamp(data.assessmentWindowStart);
    const windowEndDate = parseUTCTimestamp(data.assessmentWindowEnd);

    if (!windowStartDate || !windowEndDate) {
      return 'NO_ASSESSMENT';
    }

    const windowStart = windowStartDate.getTime();
    const windowEnd = windowEndDate.getTime();
    
    if (now < windowStart) {
      return 'NOT_YET_OPEN';
    } else if (now >= windowStart && now <= windowEnd) {
      return 'OPEN';
    } else {
      return 'CLOSED';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!progressId) {
        setError('No progress ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log(`🔍 Fetching lesson progress for progressId: ${progressId}`);
        
        const response = await api.get<LessonProgressDto>(
          `/progress/${progressId}`
        );
        
        const data = response.data;
        console.log('✅ Progress data fetched:', data);
        
        // ✅ Check if assessment is assigned
        if (!data.assessmentId) {
          console.warn('⚠️ No assessment assigned to this progress record');
          setProgressData(data);
          setWindowStatus('NO_ASSESSMENT');
          setLoading(false);
          return;
        }

        if (!data.assessmentWindowStart || !data.assessmentWindowEnd) {
          console.warn('⚠️ Assessment exists but window times are null');
          setProgressData(data);
          setWindowStatus('NO_ASSESSMENT');
          setLoading(false);
          return;
        }
        
        console.log('📅 Assessment window (UTC):', data.assessmentWindowStart, 'to', data.assessmentWindowEnd);
        
        // ✅ Parse as UTC timestamps and display in Lagos time
        const windowStartDate = parseUTCTimestamp(data.assessmentWindowStart);
        const windowEndDate = parseUTCTimestamp(data.assessmentWindowEnd);
        
        if (windowStartDate && windowEndDate) {
          console.log('📅 Assessment window (Lagos):', 
            windowStartDate.toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }), 
            'to', 
            windowEndDate.toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
          );
        }
        
        console.log('🕐 Current time (Lagos):', 
          new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
        );
        
        setProgressData(data);
        
        // Calculate initial status
        const status = calculateWindowStatus(data);
        setWindowStatus(status);
        
        if (status === 'NO_ASSESSMENT') {
          setLoading(false);
          return;
        }

        const now = Date.now();
        const windowStart = windowStartDate!.getTime();
        const windowEnd = windowEndDate!.getTime();
        
        if (status === 'NOT_YET_OPEN') {
          const untilOpen = Math.max(0, Math.floor((windowStart - now) / 1000));
          setTimeUntilOpen(untilOpen);
          console.log(`⏰ Assessment opens in ${untilOpen} seconds (${Math.floor(untilOpen / 60)} minutes)`);
        } else if (status === 'OPEN') {
          const remaining = Math.max(0, Math.floor((windowEnd - now) / 1000));
          setTimeRemaining(remaining);
          console.log(`✅ Assessment window is OPEN. ${remaining} seconds remaining`);
        } else {
          console.log(`❌ Assessment window has CLOSED`);
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error('❌ Error fetching progress:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load assessment');
        setLoading(false);
      }
    };

    fetchData();
  }, [progressId]);

  // ✅ FIX: Countdown timer with proper null handling
  useEffect(() => {
    if (!progressData || windowStatus === 'NO_ASSESSMENT') return;

    const timer = setInterval(() => {
      const status = calculateWindowStatus(progressData);
      setWindowStatus(status);
      
      if (status === 'NO_ASSESSMENT') {
        clearInterval(timer);
        return;
      }

      const windowStartDate = parseUTCTimestamp(progressData.assessmentWindowStart);
      const windowEndDate = parseUTCTimestamp(progressData.assessmentWindowEnd);

      if (!windowStartDate || !windowEndDate) {
        clearInterval(timer);
        return;
      }
      
      const now = Date.now();
      const windowStart = windowStartDate.getTime();
      const windowEnd = windowEndDate.getTime();

      if (status === 'NOT_YET_OPEN') {
        const untilOpen = Math.max(0, Math.floor((windowStart - now) / 1000));
        setTimeUntilOpen(untilOpen);
        setTimeRemaining(0);
      } else if (status === 'OPEN') {
        const remaining = Math.max(0, Math.floor((windowEnd - now) / 1000));
        setTimeRemaining(remaining);
        setTimeUntilOpen(0);
      } else {
        setTimeRemaining(0);
        setTimeUntilOpen(0);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [progressData, windowStatus]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleStartAssessment = async () => {
    if (!progressData) return;
    
    // ✅ Check if assessment exists
    if (windowStatus === 'NO_ASSESSMENT') {
      alert('No assessment is available for this lesson yet. Please contact your teacher.');
      return;
    }
    
    // ✅ Check current window status
    if (windowStatus === 'NOT_YET_OPEN' && progressData.assessmentWindowStart) {
      alert(`The assessment window opens at ${formatTimeInLagos(progressData.assessmentWindowStart)}. Please wait ${formatTime(timeUntilOpen)}.`);
      return;
    }

    if (windowStatus === 'CLOSED') {
      alert('The assessment window has closed.');
      return;
    }
    
    // ✅ FIXED: Navigate using assessmentId instead of lessonTopicId
    if (progressData.assessmentId) {
      console.log('🚀 Starting assessment:', progressData.assessmentId);
      navigate(`/student/assessments/${progressData.assessmentId}/take`);
    } else {
      alert('No assessment ID found. Please contact your teacher.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !progressData) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Assessment not found'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  // ✅ FIX: Calculate progress with null handling
  const totalSeconds = progressData.assessmentWindowStart && progressData.assessmentWindowEnd
    ? parseUTCTimestamp(progressData.assessmentWindowEnd)!.getTime() - 
      parseUTCTimestamp(progressData.assessmentWindowStart)!.getTime()
    : 0;
  const progressPercent = windowStatus === 'OPEN' && totalSeconds > 0
    ? Math.max(0, Math.min(100, ((totalSeconds - timeRemaining * 1000) / totalSeconds) * 100))
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/individual/week-schedule')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Schedule
        </Button>

        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <BookOpen className="w-8 h-8 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {progressData.lessonTitle}
            </h1>
            <p className="text-gray-600">
              {progressData.subjectName}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Period {progressData.periodNumber}
              {progressData.startTime && progressData.endTime && (
                <> • {formatLearningTime(progressData.startTime)} - {formatLearningTime(progressData.endTime)}</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ✅ CASE 0: No Assessment Available */}
      {windowStatus === 'NO_ASSESSMENT' && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Assessment Not Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-orange-300 bg-orange-100">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <div className="space-y-2">
                  <p><strong>No assessment has been assigned for this lesson yet.</strong></p>
                  <p className="text-sm">
                    This could mean:
                  </p>
                  <ul className="text-sm list-disc list-inside ml-2 space-y-1">
                    <li>The teacher hasn't created the assessment yet</li>
                    <li>The assessment is still being prepared</li>
                    <li>There was an issue during schedule generation</li>
                  </ul>
                  <p className="text-sm mt-3">
                    <strong>What to do:</strong> Contact your teacher or administrator for assistance.
                    You can still view the lesson content below.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* ✅ CASE 1: Window NOT YET OPEN */}
      {windowStatus === 'NOT_YET_OPEN' && progressData.assessmentWindowStart && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Assessment Not Yet Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <div className="text-4xl font-bold mb-2 text-amber-600">
                {formatTime(timeUntilOpen)}
              </div>
              <p className="text-sm text-gray-600">
                Opens at: {formatTimeInLagos(progressData.assessmentWindowStart)}
              </p>
            </div>
            <Alert className="border-amber-300 bg-amber-100">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                This assessment will be available starting at{' '}
                {formatTimeInLagos(progressData.assessmentWindowStart)}.
                The page will automatically update when the window opens.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* ✅ CASE 2: Window is OPEN */}
      {windowStatus === 'OPEN' && progressData.assessmentWindowEnd && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Time Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <div className={`text-4xl font-bold mb-2 ${timeRemaining < 300 ? 'text-red-600' : 'text-blue-600'}`}>
                {formatTime(timeRemaining)}
              </div>
              <p className="text-sm text-gray-600">
                Deadline: {formatTimeInLagos(progressData.assessmentWindowEnd)}
              </p>
            </div>
            <Progress value={progressPercent} className="h-2" />
            {timeRemaining < 300 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Less than 5 minutes remaining! Start your assessment now.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* ✅ CASE 3: Window CLOSED */}
      {windowStatus === 'CLOSED' && progressData.assessmentWindowEnd && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Assessment Window Closed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The assessment window closed at {formatTimeInLagos(progressData.assessmentWindowEnd)}.
                Contact your teacher for assistance.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Assessment Info - Only show if assessment exists */}
      {windowStatus !== 'NO_ASSESSMENT' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Assessment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressData.assessmentWindowStart && progressData.assessmentWindowEnd && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Assessment Window</p>
                    <p className="text-sm text-gray-600">
                      {formatTimeInLagos(progressData.assessmentWindowStart)} -{' '}
                      {formatTimeInLagos(progressData.assessmentWindowEnd)}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Assessment Format</p>
                  <p className="text-sm text-gray-600">Multiple choice and short answer questions</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Estimated Duration</p>
                  <p className="text-sm text-gray-600">30-45 minutes</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Submission</p>
                  <p className="text-sm text-gray-600">Must be completed before the deadline</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions - Only show if assessment exists */}
      {windowStatus !== 'NO_ASSESSMENT' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Important Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Ensure you have a stable internet connection before starting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Read each question carefully before answering</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>You can navigate between questions, but changes must be saved</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Submit your assessment before the deadline - late submissions are not accepted</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">•</span>
                <span>Once submitted, you cannot make changes</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => navigate('/individual/week-schedule')}
          className="flex-1"
        >
          Back to Schedule
        </Button>
        <Button
          onClick={handleStartAssessment}
          className="flex-1"
          disabled={windowStatus !== 'OPEN'}
        >
          {windowStatus === 'NO_ASSESSMENT'
            ? 'Assessment Not Available'
            : windowStatus === 'NOT_YET_OPEN' 
            ? `Opens in ${formatTime(timeUntilOpen)}`
            : windowStatus === 'CLOSED'
            ? 'Window Closed' 
            : 'Start Assessment'}
        </Button>
      </div>
    </div>
  );
};

export default AssessmentStartPage;