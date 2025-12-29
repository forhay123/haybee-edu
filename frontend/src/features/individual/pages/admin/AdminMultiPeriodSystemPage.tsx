// =================================================================
// AdminMultiPeriodSystemPage.tsx - WITH NAVIGATION TO OVERVIEW
// Location: src/features/individual/pages/admin/AdminMultiPeriodSystemPage.tsx
// Route: /admin/individual/multi-period-system
// =================================================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from '@/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  Users, 
  TrendingUp, 
  AlertCircle,
  BookOpen,
  Lock,
  CheckCircle,
  Eye,
  BarChart3
} from 'lucide-react';

// ============================================================
// TYPES - MATCH BACKEND EXACTLY
// ============================================================

interface SystemMultiPeriodStats {
  totalStudents: number;
  totalSubjects: number;
  totalPeriods: number;
  completedPeriods: number;
  waitingForCustomAssessment: number;
  blockedByDependency: number;
  completionRate: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ============================================================
// API FUNCTION
// ============================================================

const getAdminSystemOverview = async (): Promise<SystemMultiPeriodStats> => {
  const response = await axios.get<ApiResponse<SystemMultiPeriodStats>>(
    '/individual/multi-period/admin/system-overview'
  );
  return response.data.data;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const AdminMultiPeriodSystemPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: systemOverview, isLoading, error } = useQuery({
    queryKey: ['adminSystemOverview'],
    queryFn: getAdminSystemOverview,
  });

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading system overview...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !systemOverview) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load system overview: {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => navigate('/admin/dashboard')} 
          className="mt-4"
          variant="outline"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header with Action Buttons */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Multi-Period System Overview
          </h1>
          <p className="text-gray-600">
            System-wide statistics for multi-period assessments
          </p>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/teacher/individual/multi-period-overview')}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Detailed Overview
          </Button>
        </div>
      </div>

      {/* Info Card - Navigate to Detailed View */}
      {systemOverview.totalPeriods > 0 && (
        <Card className="mb-6 border-indigo-200 bg-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-indigo-900 mb-1">
                  View Detailed Multi-Period Overview
                </h3>
                <p className="text-sm text-indigo-700 mb-3">
                  Access the comprehensive dashboard to see student-by-student progress, 
                  period details, assessment status, and performance analytics across all subjects.
                </p>
                <Button
                  onClick={() => navigate('/teacher/individual/multi-period-overview')}
                  variant="outline"
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Go to Detailed Overview
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Students */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">
                  {systemOverview.totalStudents}
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Total Subjects */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Subjects</p>
                <p className="text-3xl font-bold text-gray-900">
                  {systemOverview.totalSubjects}
                </p>
              </div>
              <BookOpen className="w-12 h-12 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {systemOverview.completionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {systemOverview.completedPeriods} of {systemOverview.totalPeriods} periods
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Assessments */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Assessments</p>
                <p className="text-3xl font-bold text-orange-600">
                  {systemOverview.waitingForCustomAssessment}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Awaiting teacher creation
                </p>
              </div>
              <AlertCircle className="w-12 h-12 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-gray-700">
              Total Periods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {systemOverview.totalPeriods}
              </span>
              <span className="text-sm text-gray-500">
                across all subjects
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-gray-700">
              <CheckCircle className="w-4 h-4 inline mr-2 text-green-600" />
              Completed Periods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-green-600">
                {systemOverview.completedPeriods}
              </span>
              <span className="text-sm text-gray-500">
                successfully finished
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-gray-700">
              <Lock className="w-4 h-4 inline mr-2 text-gray-600" />
              Blocked by Dependencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-600">
                {systemOverview.blockedByDependency}
              </span>
              <span className="text-sm text-gray-500">
                waiting for previous periods
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Period Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <div className="font-medium text-green-900">Completed</div>
                  <div className="text-sm text-green-700">
                    Students have finished these periods
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {systemOverview.completedPeriods}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <div>
                  <div className="font-medium text-orange-900">
                    Waiting for Custom Assessment
                  </div>
                  <div className="text-sm text-orange-700">
                    Teachers need to create assessments
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {systemOverview.waitingForCustomAssessment}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-900">
                    Blocked by Dependencies
                  </div>
                  <div className="text-sm text-gray-700">
                    Students must complete previous periods first
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-600">
                {systemOverview.blockedByDependency}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons at Bottom */}
      <div className="flex gap-4">
        <Button
          onClick={() => navigate('/teacher/individual/multi-period-overview')}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          size="lg"
        >
          <Eye className="w-4 h-4 mr-2" />
          View Detailed Overview Dashboard
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/admin/dashboard')}
          className="flex-1"
          size="lg"
        >
          Back to Admin Dashboard
        </Button>
      </div>
    </div>
  );
};

export default AdminMultiPeriodSystemPage;