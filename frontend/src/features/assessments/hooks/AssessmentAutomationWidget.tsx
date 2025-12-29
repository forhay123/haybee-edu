// frontend/src/features/assessments/components/AssessmentAutomationWidget.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { adminAssessmentAutomationApi } from '../api/adminAssessmentAutomationApi';

export const AssessmentAutomationWidget: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['missing-assessments-stats'],
    queryFn: adminAssessmentAutomationApi.getMissingAssessmentsStats,
    staleTime: 60000, // 1 minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Assessment Automation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const missingCount = stats?.missingCount ?? 0;
  const totalQuestions = stats?.topics.reduce((sum, t) => sum + t.questionCount, 0) ?? 0;
  const totalMarks = stats?.topics.reduce((sum, t) => sum + t.totalMarks, 0) ?? 0;

  return (
    <Card className={missingCount > 0 ? 'border-orange-200 bg-orange-50/30' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Assessment Automation
          </CardTitle>
          {missingCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {missingCount}
            </Badge>
          )}
        </div>
        <CardDescription>
          {missingCount === 0
            ? 'All assessments are up to date'
            : `${missingCount} topic${missingCount !== 1 ? 's' : ''} need${missingCount === 1 ? 's' : ''} assessments`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {missingCount > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Questions Ready</p>
                <p className="text-2xl font-bold text-blue-600">{totalQuestions}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Total Marks</p>
                <p className="text-2xl font-bold text-green-600">{totalMarks}</p>
              </div>
            </div>
            <Button asChild className="w-full">
              <Link to="/admin/assessments/automation">
                Create Assessments
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-2">
              <Sparkles className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">All topics have assessments</p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link to="/admin/assessments/automation">
                View Details
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};