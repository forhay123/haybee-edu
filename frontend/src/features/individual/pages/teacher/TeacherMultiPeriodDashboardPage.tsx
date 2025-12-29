// =================================================================
// FINAL FIX: TeacherMultiPeriodDashboardPage.tsx
// ✅ Fixed isLastCompleted to include AVAILABLE status
// =================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PeriodProgressCard from '@/features/assessments/components/PeriodProgressCard';
import { 
  Loader2, 
  Users, 
  AlertCircle,
  TrendingUp,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Eye
} from 'lucide-react';

// Safe date formatter
const ensureValidDate = (dateValue: any): string => {
  if (!dateValue) return new Date().toISOString();
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

// Types
interface TopicPerformance {
  topicName: string;
  totalQuestions: number;
  correctAnswers: number;
  successRate: number;
}

interface PeriodData {
  periodNumber: number;
  status: 'COMPLETED' | 'AVAILABLE' | 'WAITING_ASSESSMENT' | 'LOCKED';
  score?: number;
  scheduledDate: string;
  completedAt?: string;
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
  progressId: number;
  weakTopics?: string[];
  topicPerformance?: Record<string, TopicPerformance>;
}

interface StudentPeriodSummary {
  studentId: number;
  studentName: string;
  totalPeriods: number;
  completedPeriods: number;
  pendingAssessments: number;
  completionRate: number;
  periods: PeriodData[];
}

interface SubjectOverview {
  subjectId: number;
  subjectName: string;
  totalStudents: number;
  averageCompletion: number;
  pendingAssessments: number;
  students: StudentPeriodSummary[];
}

interface TeacherMultiPeriodOverview {
  totalStudents: number;
  totalPeriods: number;
  completedPeriods: number;
  pendingAssessments: number;
  subjectOverviews: SubjectOverview[];
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// API
const getTeacherMultiPeriodOverview = async (): Promise<TeacherMultiPeriodOverview> => {
  const response = await axios.get<ApiResponse<TeacherMultiPeriodOverview>>(
    '/individual/multi-period/teacher/overview'
  );
  return response.data.data;
};

// Simple status color function
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'COMPLETED': return 'bg-green-500';
    case 'AVAILABLE': return 'bg-blue-500';
    case 'WAITING_ASSESSMENT': return 'bg-yellow-400';
    case 'LOCKED': return 'bg-gray-300';
    default: return 'bg-gray-300';
  }
};

// Main Component
export const TeacherMultiPeriodDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const { data: overview, isLoading, error } = useQuery({
    queryKey: ['teacherMultiPeriodOverview'],
    queryFn: getTeacherMultiPeriodOverview,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const handleToggle = useCallback((subjectId: number, studentId: number) => {
    const key = `${subjectId}-${studentId}`;
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // ✅ Memoize ALL student periods at top level
  const allStudentsSafePeriods = useMemo(() => {
    if (!overview?.subjectOverviews) return new Map();
    
    const periodsMap = new Map<string, PeriodData[]>();
    
    overview.subjectOverviews.forEach(subject => {
      subject.students?.forEach(student => {
        const key = `${subject.subjectId}-${student.studentId}`;
        const safePeriods = student.periods.map(p => ({
          ...p,
          scheduledDate: ensureValidDate(p.scheduledDate),
          completedAt: p.completedAt ? ensureValidDate(p.completedAt) : undefined,
          submittedAt: p.submittedAt ? ensureValidDate(p.submittedAt) : undefined,
        }));
        periodsMap.set(key, safePeriods);
      });
    });
    
    return periodsMap;
  }, [overview]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading multi-period overview...</p>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load multi-period overview: {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!overview.subjectOverviews || overview.subjectOverviews.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card className="p-12">
          <div className="text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Multi-Period Subjects
            </h3>
            <p className="text-gray-600 mb-6">
              You don't have any subjects with multi-period assessments yet.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const averageCompletion = overview.totalPeriods > 0
    ? (overview.completedPeriods / overview.totalPeriods) * 100
    : 0;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Multi-Period Assessment Overview
        </h1>
        <p className="text-gray-600">
          Track student progress across all multi-period subjects
        </p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">
                  {overview.totalStudents}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Average Completion</p>
                <p className="text-3xl font-bold text-green-600">
                  {averageCompletion.toFixed(0)}%
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Assessments</p>
                <p className="text-3xl font-bold text-orange-600">
                  {overview.pendingAssessments}
                </p>
              </div>
              <AlertCircle className="w-12 h-12 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Cards */}
      <div className="space-y-6">
        {overview.subjectOverviews.map((subject) => (
          <Card key={subject.subjectId} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{subject.subjectName}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {subject.totalStudents} student{subject.totalStudents !== 1 ? 's' : ''} • 
                    {' '}{subject.pendingAssessments} pending assessment{subject.pendingAssessments !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600">
                    {subject.averageCompletion.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600">Avg. Completion</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {subject.totalStudents}
                  </div>
                  <div className="text-sm text-gray-600">Students</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {subject.averageCompletion.toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Complete</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {subject.pendingAssessments}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>

              {/* Student List */}
              {subject.students && subject.students.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-3">Students</h3>
                  
                  {subject.students.map((student) => {
                    const key = `${subject.subjectId}-${student.studentId}`;
                    const isExpanded = expandedKeys.has(key);
                    const safePeriods = allStudentsSafePeriods.get(key) || [];
                    
                    const lastCompletedPeriod = safePeriods
                      .filter(p => p.status === 'COMPLETED')
                      .sort((a, b) => b.periodNumber - a.periodNumber)[0];
                    
                    // ✅ FIX: Find waiting assessment period - now includes AVAILABLE status
                    const needsAssessmentPeriod = safePeriods.find(
                      p => (p.status === 'WAITING_ASSESSMENT' || p.status === 'AVAILABLE') &&
                           p.requiresCustomAssessment && 
                           !p.assessmentCreated
                    );
                    
                    return (
                      <div key={key} className="border rounded-lg overflow-hidden">
                        {/* Student Summary */}
                        <div className="p-4 bg-white hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div 
                              onClick={() => handleToggle(subject.subjectId, student.studentId)}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-900">
                                  {student.studentName}
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {student.completedPeriods} of {student.totalPeriods} periods • 
                                {' '}{student.completionRate.toFixed(0)}% complete
                              </div>
                            </div>
                            
                            {/* ✅ FIX: Simplified button with direct navigation */}
                            <div className="flex items-center gap-2">
                              {student.pendingAssessments > 0 && (
                                <>
                                  <Badge 
                                    variant="outline" 
                                    className="bg-orange-50 text-orange-700 border-orange-200"
                                  >
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {student.pendingAssessments} pending
                                  </Badge>
                                  {needsAssessmentPeriod && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const prevPeriod = safePeriods.find(
                                          p => p.periodNumber === needsAssessmentPeriod.periodNumber - 1
                                        );
                                        const url = `/teacher/assessments/create-custom?studentId=${student.studentId}&subjectId=${subject.subjectId}&periodNumber=${needsAssessmentPeriod.periodNumber}${prevPeriod?.submissionId ? `&previousSubmissionId=${prevPeriod.submissionId}` : ''}`;
                                        navigate(url);
                                      }}
                                    >
                                      Create Now →
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Compact Progress Bar (Collapsed View) */}
                          {!isExpanded && safePeriods && safePeriods.length > 0 && (
                            <div className="flex items-center gap-2">
                              {safePeriods.map((period) => (
                                <div
                                  key={`compact-${period.progressId}`}
                                  className={`
                                    flex-1 h-8 rounded flex items-center justify-center
                                    ${getStatusColor(period.status)}
                                    text-white text-xs font-medium
                                  `}
                                  title={`Period ${period.periodNumber}: ${period.status}${
                                    period.percentage ? ` (${period.percentage.toFixed(0)}%)` : ''
                                  }`}
                                >
                                  P{period.periodNumber}
                                  {period.percentage && (
                                    <span className="ml-1">{period.percentage.toFixed(0)}%</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Expanded View with Period Cards */}
                        {isExpanded && (
                          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {student.studentName}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {student.completedPeriods} of {student.totalPeriods} periods completed
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    navigate(
                                      `/teacher/individual/students/${student.studentId}/subjects/${subject.subjectId}/periods`
                                    )
                                  }
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Full Timeline
                                </Button>
                                {student.pendingAssessments > 0 && needsAssessmentPeriod && (
                                  <Button
                                    size="sm"
                                    className="bg-purple-600 hover:bg-purple-700"
                                    onClick={() => {
                                      const prevPeriod = safePeriods.find(
                                        p => p.periodNumber === needsAssessmentPeriod.periodNumber - 1
                                      );
                                      const url = `/teacher/assessments/create-custom?studentId=${student.studentId}&subjectId=${subject.subjectId}&periodNumber=${needsAssessmentPeriod.periodNumber}${prevPeriod?.submissionId ? `&previousSubmissionId=${prevPeriod.submissionId}` : ''}`;
                                      navigate(url);
                                    }}
                                  >
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Create Assessment
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Period Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {safePeriods.map((safePeriod, index) => {
                                const previousPeriod = index > 0 ? safePeriods[index - 1] : undefined;
                                
                                return (
                                  <PeriodProgressCard
                                    key={safePeriod.progressId}
                                    period={safePeriod}
                                    studentId={student.studentId}
                                    subjectId={subject.subjectId}
                                    previousPeriodSubmissionId={previousPeriod?.submissionId}
                                    isLastCompleted={
                                      (safePeriod.status === 'WAITING_ASSESSMENT' || safePeriod.status === 'AVAILABLE') &&
                                      safePeriod.requiresCustomAssessment &&
                                      !safePeriod.assessmentCreated &&
                                      (!previousPeriod || previousPeriod.status === 'COMPLETED')
                                    }  // ✅ FIXED: Now includes AVAILABLE status!
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No students enrolled in this subject yet.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        <Button
          onClick={() => navigate('/teacher/individual/pending-custom-assessments')}
          className="flex-1"
        >
          <AlertCircle className="w-4 h-4 mr-2" />
          View Pending Assessments ({overview.pendingAssessments})
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/teacher/dashboard')}
          className="flex-1"
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default TeacherMultiPeriodDashboardPage;