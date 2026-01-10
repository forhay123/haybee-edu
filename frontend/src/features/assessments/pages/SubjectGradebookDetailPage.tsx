// src/features/assessments/pages/SubjectGradebookDetailPage.tsx

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ComponentScoreRow } from '../components/ComponentScoreRow';
import { GradeLetterBadge } from '../components/GradeLetterBadge';
import { useSubjectGradebook } from '../hooks/useGradebookReport';
import { useStudentAssessments } from '../hooks/useAssessments';
import { useCurrentStudentProfileId } from '../../studentProfiles/hooks/useStudentProfiles';
import { AssessmentType } from '../types/assessmentTypes';
import { ArrowLeft, Printer, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getStatusBadgeColor } from '../utils/gradebookUtils';

/**
 * 📚 Subject Gradebook Detail Page
 * Detailed view of ONE subject's gradebook with assessment scores
 */
export const SubjectGradebookDetailPage: React.FC = () => {
  const { studentId, subjectId } = useParams<{ studentId: string; subjectId: string }>();
  const navigate = useNavigate();
  const { studentProfileId } = useCurrentStudentProfileId();

  const { data: subject, isLoading, error } = useSubjectGradebook(
    Number(subjectId),
    !!subjectId
  );

  // Fetch all student assessments to get scores
  const { data: allAssessments = [] } = useStudentAssessments(
    studentProfileId || Number(studentId) || 0
  );

  // Component order
  const componentOrder: AssessmentType[] = [
    AssessmentType.QUIZ,
    AssessmentType.CLASSWORK,
    AssessmentType.TEST1,
    AssessmentType.TEST2,
    AssessmentType.ASSIGNMENT,
    AssessmentType.EXAM,
  ];

  const handleBack = () => {
    navigate('/assessments/gradebook/report');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleViewAssessment = (assessmentId: number) => {
    // Find the assessment to check if it has a submission
    const assessment = allAssessments.find(a => a.id === assessmentId);
    
    if (assessment?.submissionId) {
      // If submitted, go to results page
      navigate(`/submissions/${assessment.submissionId}/results`);
    } else if (assessment) {
      // If not submitted but exists, go to take assessment page
      navigate(`/assessments/take/${assessmentId}`);
    } else {
      // Fallback - try to view the assessment details
      navigate(`/assessments/${assessmentId}`);
    }
  };

  // Get assessment details for a specific ID
  const getAssessmentDetails = (assessmentId: number) => {
    return allAssessments.find(a => a.id === assessmentId);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading subject details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p className="font-semibold">Error loading subject details</p>
              {error && <p className="text-sm mt-2">{error.message}</p>}
              <Button onClick={handleBack} className="mt-4">
                Back to Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{subject.subjectName}</h1>
              <Badge variant="outline">{subject.subjectCode}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Detailed gradebook breakdown
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                {subject.finalPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Final Grade</div>
            </div>
            <div className="text-center">
              <div className="mb-2">
                <GradeLetterBadge grade={subject.gradeLetter} size="large" />
              </div>
              <div className="text-sm text-muted-foreground">Letter Grade</div>
            </div>
            <div className="text-center">
              <Badge className={`${getStatusBadgeColor(subject.status)} text-lg px-4 py-2`}>
                {subject.status}
              </Badge>
              <div className="text-sm text-muted-foreground mt-2">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold mb-2">
                {subject.componentsSubmitted}/{subject.totalComponents}
              </div>
              <div className="text-sm text-muted-foreground">
                Components Completed
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {subject.totalWeightedScore.toFixed(1)}/
                {subject.totalWeightCovered} points
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  subject.finalPercentage >= 70
                    ? 'bg-green-500'
                    : subject.finalPercentage >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(subject.finalPercentage, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {componentOrder.map((type) => {
            const component = subject.components[type];
            if (!component) return null;
            return <ComponentScoreRow key={type} component={component} />;
          })}
        </CardContent>
      </Card>

      {/* Assessment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {componentOrder.map((type) => {
              const component = subject.components[type];
              if (!component || component.assessmentIds.length === 0) return null;

              return (
                <div key={type} className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-2">
                    {type.replace(/_/g, ' ')}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({component.weight}% weight)
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {component.assessmentIds.map((assessmentId, index) => {
                      const assessmentDetails = getAssessmentDetails(assessmentId);
                      
                      return (
                        <div
                          key={assessmentId}
                          className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm font-medium">
                                  {assessmentDetails?.title || `Assessment #${index + 1}`}
                                </p>
                                {assessmentDetails?.hasSubmitted && (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Submitted
                                  </Badge>
                                )}
                                {assessmentDetails && !assessmentDetails.hasSubmitted && (
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                                <div>
                                  <span className="font-medium">ID:</span> {assessmentId}
                                </div>
                                {assessmentDetails && (
                                  <>
                                    <div>
                                      <span className="font-medium">Total Marks:</span> {assessmentDetails.totalMarks}
                                    </div>
                                    {assessmentDetails.hasSubmitted && assessmentDetails.studentScore !== null && (
                                      <>
                                        <div className="flex items-center gap-1">
                                          <span className="font-medium">Score:</span>
                                          <span className={`font-bold ${
                                            assessmentDetails.studentPassed 
                                              ? 'text-green-600' 
                                              : 'text-red-600'
                                          }`}>
                                            {assessmentDetails.studentScore}/{assessmentDetails.totalMarks}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {assessmentDetails.studentPassed ? (
                                            <span className="text-green-600 font-semibold flex items-center gap-1">
                                              <CheckCircle className="h-3 w-3" />
                                              Passed
                                            </span>
                                          ) : (
                                            <span className="text-red-600 font-semibold flex items-center gap-1">
                                              <XCircle className="h-3 w-3" />
                                              Failed
                                            </span>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewAssessment(assessmentId)}
                              className="gap-2 flex-shrink-0"
                            >
                              {assessmentDetails?.hasSubmitted ? 'View Results' : 'View Details'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};