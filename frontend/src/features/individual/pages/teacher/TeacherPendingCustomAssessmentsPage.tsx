/**
 * TeacherPendingCustomAssessmentsPage.tsx
 * Location: src/features/individual/pages/teacher/TeacherPendingCustomAssessmentsPage.tsx
 * Route: /teacher/individual/pending-custom-assessments
 * 
 * Shows list of all periods needing custom assessments with filters and quick actions
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingCustomAssessments } from '@/features/assessments/hooks/usePendingCustomAssessments';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Plus, Filter, Download } from 'lucide-react';

export const TeacherPendingCustomAssessmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>();
  const [selectedUrgency, setSelectedUrgency] = useState<string | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState<number | undefined>();

  const {
    pendingAssessments,
    pendingCount,
    urgentAssessments,
    assessmentsByUrgency,
    assessmentsBySubject,
    statistics,
    filters,
    updateFilters,
    clearFilters,
    isLoading,
    error,
    refetch,
  } = usePendingCustomAssessments({
    enabled: true,
    refetchInterval: 60000, // Refetch every minute
  });

  // Handle create assessment navigation
  const handleCreateAssessment = (assessment: any) => {
    const params = new URLSearchParams({
      studentId: assessment.studentId.toString(),
      subjectId: assessment.subjectId.toString(),
      periodNumber: assessment.periodNumber.toString(),
      previousSubmissionId: assessment.previousSubmissionId?.toString() || '',
    });
    
    navigate(`/teacher/assessments/create-custom?${params.toString()}`);
  };

  // Get urgency badge color
  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Export to CSV
  const handleExport = () => {
    const csv = [
      ['Student', 'Subject', 'Period', 'Scheduled Date', 'Previous Score', 'Urgency'].join(','),
      ...pendingAssessments.map((a) =>
        [
          a.studentName,
          a.subjectName,
          a.periodNumber,
          a.scheduledDate,
          a.previousScore || 'N/A',
          a.urgencyLevel,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pending-assessments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load pending assessments. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Pending Custom Assessments
          </h1>
          <p className="text-gray-600 mt-1">
            Create assessments for students who have completed Period 1
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Pending</div>
          <div className="text-3xl font-bold text-blue-600">{statistics.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Critical</div>
          <div className="text-3xl font-bold text-red-600">{statistics.critical}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">High Priority</div>
          <div className="text-3xl font-bold text-orange-600">{statistics.high}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Ready to Create</div>
          <div className="text-3xl font-bold text-green-600">{statistics.ready}</div>
        </Card>
      </div>

      {/* Urgent Assessments Alert */}
      {urgentAssessments.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have <strong>{urgentAssessments.length}</strong> urgent assessment(s) 
            that need to be created within the next 3 days.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-700">Filters:</span>
          </div>

          <select
            className="px-3 py-2 border border-gray-300 rounded-md"
            value={filters.urgencyLevel || ''}
            onChange={(e) =>
              updateFilters({ urgencyLevel: e.target.value as any || undefined })
            }
          >
            <option value="">All Urgency Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            className="px-3 py-2 border border-gray-300 rounded-md"
            value={filters.periodNumber || ''}
            onChange={(e) =>
              updateFilters({ periodNumber: e.target.value ? parseInt(e.target.value) : undefined })
            }
          >
            <option value="">All Periods</option>
            <option value="2">Period 2</option>
            <option value="3">Period 3</option>
          </select>

          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Pending Assessments List */}
      <div className="space-y-4">
        {pendingAssessments.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <p className="text-lg font-medium">No pending custom assessments</p>
              <p className="text-sm mt-1">All students are up to date!</p>
            </div>
          </Card>
        ) : (
          pendingAssessments.map((assessment) => (
            <Card
              key={assessment.progressId}
              className="p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {assessment.studentName}
                    </h3>
                    <Badge className={getUrgencyColor(assessment.urgencyLevel)}>
                      {assessment.urgencyLevel}
                    </Badge>
                    <Badge variant="outline">
                      Period {assessment.periodNumber}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Subject:</span>
                      <div className="font-medium">{assessment.subjectName}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Topic:</span>
                      <div className="font-medium">{assessment.topicName || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Scheduled:</span>
                      <div className="font-medium">
                        {new Date(assessment.scheduledDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Previous Score:</span>
                      <div className="font-medium">
                        {assessment.previousScore !== undefined
                          ? `${assessment.previousScore}%`
                          : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {assessment.suggestedFocusAreas && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-md">
                      <span className="text-sm text-blue-800 font-medium">
                        Suggested Focus: {assessment.suggestedFocusAreas.topicName}
                      </span>
                      <span className="text-sm text-blue-600 ml-2">
                        ({assessment.suggestedFocusAreas.questionsWrong} questions wrong)
                      </span>
                    </div>
                  )}

                  {!assessment.canCreateNow && assessment.blockingReason && (
                    <div className="mt-2 text-sm text-orange-600">
                      ⚠️ {assessment.blockingReason}
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <Button
                    onClick={() => handleCreateAssessment(assessment)}
                    disabled={!assessment.canCreateNow}
                    className="whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Assessment
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Group by Subject Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Pending by Subject</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(assessmentsBySubject).map(([subject, assessments]) => (
            <div key={subject} className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900">{subject}</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {assessments.length}
              </div>
              <div className="text-sm text-gray-600">pending assessments</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default TeacherPendingCustomAssessmentsPage;
