// =================================================================
// StudentSubjectPeriodsTimelinePage.tsx - FIXED
// ✅ Now shows "Create Assessment" button on periods waiting for assessment
// =================================================================

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from '@/api/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PeriodProgressCard } from '@/features/assessments/components/PeriodProgressCard';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

interface PeriodProgressDto {
  progressId: number;
  periodNumber: number;
  status: 'COMPLETED' | 'AVAILABLE' | 'WAITING_ASSESSMENT' | 'LOCKED';
  scheduledDate: string;
  completedAt?: string;
  score?: number;
  assessmentId?: number;
  assessmentTitle?: string;
  submissionId?: number;
  canAccess: boolean;
  blockingReason?: string;
  requiresCustomAssessment: boolean;
  assessmentCreated: boolean;
  totalQuestions?: number;
  correctAnswers?: number;
  incorrectAnswers?: number;
  pendingGrading?: number;
  percentage?: number;
  passed?: boolean;
  submittedAt?: string;
  graded?: boolean;
  weakTopics?: string[];
  topicPerformance?: Record<string, any>;
}

interface StudentSubjectPeriodsDto {
  studentId: number;
  studentName: string;
  subjectId: number;
  subjectName: string;
  totalPeriods: number;
  completedPeriods: number;
  pendingAssessments: number;
  periods: PeriodProgressDto[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const getStudentSubjectPeriods = async (
  studentId: number,
  subjectId: number
): Promise<StudentSubjectPeriodsDto> => {
  const response = await axios.get<ApiResponse<StudentSubjectPeriodsDto>>(
    `/individual/multi-period/teacher/students/${studentId}/subjects/${subjectId}/periods`
  );
  return response.data.data;
};

export const StudentSubjectPeriodsTimelinePage: React.FC = () => {
  const { studentId, subjectId } = useParams<{ studentId: string; subjectId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['studentSubjectPeriods', studentId, subjectId],
    queryFn: () => getStudentSubjectPeriods(Number(studentId), Number(subjectId)),
    enabled: !!studentId && !!subjectId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load period timeline: {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/teacher/individual/multi-period-overview')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Overview
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Period Timeline</h1>
        <div className="text-gray-600">
          <span className="font-semibold">{data.studentName}</span>
          {' • '}
          <span>{data.subjectName}</span>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{data.totalPeriods}</div>
              <div className="text-sm text-gray-600">Total Periods</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{data.completedPeriods}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{data.pendingAssessments}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.periods.map((period, index) => {
          // ✅ Find actual previous period for this period
          const previousPeriod = index > 0 ? data.periods[index - 1] : undefined;
          
          // ✅ Show create button if:
          // 1. Waiting for assessment
          // 2. Requires custom assessment
          // 3. Assessment not created yet
          // 4. Previous period is completed (or this is period 1)
          const showCreateButton = 
            period.status === 'WAITING_ASSESSMENT' &&
            period.requiresCustomAssessment &&
            !period.assessmentCreated &&
            (!previousPeriod || previousPeriod.status === 'COMPLETED');
          
          return (
            <PeriodProgressCard
              key={period.progressId}
              period={period}
              studentId={Number(studentId)}
              subjectId={Number(subjectId)}
              previousPeriodSubmissionId={previousPeriod?.submissionId}
              isLastCompleted={showCreateButton}
            />
          );
        })}
      </div>
    </div>
  );
};

export default StudentSubjectPeriodsTimelinePage;