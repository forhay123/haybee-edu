/**
 * CustomAssessmentBuilderPage.tsx - WITH FLEXIBLE QUESTION FILTERING
 * Can show all questions or filter by subject
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/api/axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useQuestionsBySubject, useMyQuestions } from '@/features/assessments/hooks/useTeacherQuestions';
import { 
  ChevronLeft, 
  Check, 
  Loader2, 
  AlertCircle, 
  ChevronRight,
  FileText,
  ListChecks,
  Plus,
  Filter
} from 'lucide-react';

// Types
interface CustomAssessmentRequest {
  studentProfileId: number;
  subjectId: number;
  periodNumber: number;
  title: string;
  description?: string;
  totalMarks: number;
  passingMarks?: number;
  durationMinutes?: number;
  previousSubmissionId?: number;
  questionIds?: number[];
}

interface SubmissionSummary {
  submissionId: number;
  studentName: string;
  assessmentTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  weakAreaCount: number;
  weakAreas: string[];
  needsCustomAssessment: boolean;
}

// API functions
const getSubmissionSummary = async (submissionId: number): Promise<SubmissionSummary> => {
  const response = await axios.get(`/individual/submission-analysis/${submissionId}/summary`);
  return response.data.data;
};

const createCustomAssessment = async (request: CustomAssessmentRequest): Promise<any> => {
  const response = await axios.post('/individual/custom-assessments/create', request);
  return response.data;
};

export const CustomAssessmentBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();  // ✅ ADD THIS

  // Get URL parameters
  const studentId = parseInt(searchParams.get('studentId') || '0');
  const subjectId = parseInt(searchParams.get('subjectId') || '0');
  const periodNumber = parseInt(searchParams.get('periodNumber') || '2');
  const previousSubmissionId = parseInt(searchParams.get('previousSubmissionId') || '0');

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Form state
  const [title, setTitle] = useState(`Period ${periodNumber} Custom Assessment`);
  const [description, setDescription] = useState('');
  const [totalMarks, setTotalMarks] = useState(100);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passPercentage, setPassPercentage] = useState(70);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set());
  
  // ✅ NEW: Toggle to show all questions or just this subject
  const [showAllSubjects, setShowAllSubjects] = useState(false);

  // Fetch previous submission summary
  const { data: submissionSummary, isLoading: isLoadingSummary, error: summaryError } = useQuery({
    queryKey: ['submissionSummary', previousSubmissionId],
    queryFn: () => getSubmissionSummary(previousSubmissionId),
    enabled: previousSubmissionId > 0,
    retry: 1,
  });

  // ✅ Fetch questions - either by subject or all
  const { data: subjectQuestions = [], isLoading: isLoadingSubjectQuestions } = useQuestionsBySubject(subjectId);
  const { data: allQuestions = [], isLoading: isLoadingAllQuestions } = useMyQuestions();
  
  const teacherQuestions = showAllSubjects ? allQuestions : subjectQuestions;
  const isLoadingQuestions = showAllSubjects ? isLoadingAllQuestions : isLoadingSubjectQuestions;

  // ✅ AUTO-ENABLE: If no questions for this subject but have questions in other subjects, auto-show all
  useEffect(() => {
    if (!isLoadingSubjectQuestions && !isLoadingAllQuestions) {
      if (subjectQuestions.length === 0 && allQuestions.length > 0 && !showAllSubjects) {
        console.log('Auto-enabling "Show All Subjects" - no questions for current subject but have questions in other subjects');
        setShowAllSubjects(true);
      }
    }
  }, [subjectQuestions.length, allQuestions.length, isLoadingSubjectQuestions, isLoadingAllQuestions, showAllSubjects]);

  // Auto-fill description based on weak areas
  useEffect(() => {
    if (submissionSummary && submissionSummary.weakAreas.length > 0) {
      const weakAreasText = submissionSummary.weakAreas.slice(0, 3).join(', ');
      setDescription(`Focus areas: ${weakAreasText}. Score from previous period: ${submissionSummary.score.toFixed(1)}%`);
    }
  }, [submissionSummary]);

  // Create assessment mutation
  const createMutation = useMutation({
    mutationFn: createCustomAssessment,
    onSuccess: (data) => {
      console.log('✅ Assessment created:', data);
      
      // ✅ Invalidate the multi-period overview cache
      queryClient.invalidateQueries({ queryKey: ['teacherMultiPeriodOverview'] });
      
      alert('Assessment created successfully!');
      navigate('/teacher/individual/multi-period-overview');
    },
    onError: (error: any) => {
      console.error('❌ Failed to create assessment:', error);
      alert(`Failed to create assessment: ${error.response?.data?.message || error.message}`);
    },
  });

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (totalMarks <= 0) {
      alert('Total marks must be greater than 0');
      return;
    }

    if (durationMinutes <= 0) {
      alert('Duration must be greater than 0');
      return;
    }

    if (selectedQuestionIds.size === 0) {
      alert('Please select at least one question');
      return;
    }

    const passingMarks = Math.ceil((totalMarks * passPercentage) / 100);

    const request: CustomAssessmentRequest = {
      studentProfileId: studentId,
      subjectId: subjectId,
      periodNumber: periodNumber,
      title: title.trim(),
      description: description.trim() || undefined,
      totalMarks: totalMarks,
      passingMarks: passingMarks,
      durationMinutes: durationMinutes,
      previousSubmissionId: previousSubmissionId > 0 ? previousSubmissionId : undefined,
      questionIds: Array.from(selectedQuestionIds),
    };

    console.log('📤 Creating assessment:', request);
    createMutation.mutate(request);
  };

  const toggleQuestion = (questionId: number) => {
    const newSelection = new Set(selectedQuestionIds);
    if (newSelection.has(questionId)) {
      newSelection.delete(questionId);
    } else {
      newSelection.add(questionId);
    }
    setSelectedQuestionIds(newSelection);
  };

  const selectAllQuestions = () => {
    setSelectedQuestionIds(new Set(teacherQuestions.map(q => q.id)));
  };

  const clearQuestions = () => {
    setSelectedQuestionIds(new Set());
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return true;
      case 2: return title.trim().length > 0 && totalMarks > 0 && durationMinutes > 0;
      case 3: return selectedQuestionIds.size > 0;
      default: return false;
    }
  };

  const isSubmitting = createMutation.isPending;
  const progress = (currentStep / totalSteps) * 100;

  const steps = [
    { number: 1, title: 'Review Previous Period', icon: FileText },
    { number: 2, title: 'Assessment Details', icon: AlertCircle },
    { number: 3, title: 'Select Questions', icon: ListChecks },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/teacher/individual/multi-period-overview')}
            className="mb-4"
            disabled={isSubmitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            Create Custom Assessment - Period {periodNumber}
          </h1>
          <p className="text-gray-600 mt-1">
            Student ID: {studentId} • Subject ID: {subjectId}
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div
                  className={`flex flex-col items-center cursor-pointer ${
                    currentStep === step.number
                      ? 'text-blue-600'
                      : currentStep > step.number
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}
                  onClick={() => setCurrentStep(step.number)}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                      currentStep === step.number
                        ? 'bg-blue-100 border-2 border-blue-600'
                        : currentStep > step.number
                        ? 'bg-green-100 border-2 border-green-600'
                        : 'bg-gray-100 border-2 border-gray-300'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs text-center font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-300 mx-2" />
                )}
              </React.Fragment>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </Card>

        {/* Step Content */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Step {currentStep}: {steps[currentStep - 1].title}
          </h2>

          {/* STEP 1: Previous Period Summary */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {previousSubmissionId > 0 ? (
                <>
                  {isLoadingSummary && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Loading previous period data...</span>
                    </div>
                  )}

                  {summaryError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Could not load previous period data. You can still create the assessment.
                      </AlertDescription>
                    </Alert>
                  )}

                  {submissionSummary && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600">Score</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {submissionSummary.score.toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg">
                          <div className="text-sm text-gray-600">Questions</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {submissionSummary.correctAnswers}/{submissionSummary.totalQuestions}
                          </div>
                        </div>
                      </div>

                      {submissionSummary.weakAreas.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Weak Areas ({submissionSummary.weakAreaCount})</h3>
                          <div className="flex flex-wrap gap-2">
                            {submissionSummary.weakAreas.map((area, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    No previous submission data available. You can still create a custom assessment.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* STEP 2: Assessment Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Assessment Title *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Period 2 - Custom Assessment"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description for this assessment"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Total Marks *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(parseInt(e.target.value) || 0)}
                    min={1}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                    min={1}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Pass Percentage *
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  value={passPercentage}
                  onChange={(e) => setPassPercentage(parseInt(e.target.value) || 70)}
                  min={0}
                  max={100}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-gray-600 mt-1">
                  Students need {passPercentage}% ({Math.ceil((totalMarks * passPercentage) / 100)} marks) to pass
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Question Selection */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Select Questions from Your Bank</h3>
                  <p className="text-sm text-gray-600">
                    {selectedQuestionIds.size} question{selectedQuestionIds.size !== 1 ? 's' : ''} selected
                    {showAllSubjects && ` • Showing all subjects`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* ✅ NEW: Filter toggle */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAllSubjects(!showAllSubjects);
                      setSelectedQuestionIds(new Set()); // Clear selection when toggling
                    }}
                    className={showAllSubjects ? 'bg-blue-50 border-blue-300' : ''}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {showAllSubjects ? 'All Subjects' : 'This Subject Only'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllQuestions}
                    disabled={isLoadingQuestions || teacherQuestions.length === 0}
                  >
                    Select All
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={clearQuestions}
                    disabled={selectedQuestionIds.size === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              {/* ✅ Info alert about filtering - only show when manually toggled back to single subject */}
              {!showAllSubjects && subjectQuestions.length === 0 && allQuestions.length > 0 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    <p className="text-blue-800">
                      Currently showing this subject only. {allQuestions.length} questions available in other subjects.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {isLoadingQuestions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : teacherQuestions.length === 0 ? (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="text-orange-800 font-medium">
                        No questions available in your question bank.
                      </p>
                      <p className="text-sm text-orange-700">
                        You need to create questions first before building this assessment.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-100"
                        onClick={() => {
                          window.sessionStorage.setItem('returnToCustomAssessment', window.location.href);
                          navigate('/assessments/question-bank');
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Go to Question Bank
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {teacherQuestions.map((question) => (
                    <div
                      key={question.id}
                      className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition ${
                        selectedQuestionIds.has(question.id) ? 'border-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => toggleQuestion(question.id)}
                    >
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.has(question.id)}
                          readOnly
                          className="mr-3 mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium">{question.questionText}</div>
                          <div className="text-sm text-gray-600 mt-1 flex gap-2 flex-wrap">
                            {/* ✅ Show subject name when viewing all subjects */}
                            {showAllSubjects && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                {question.subjectName}
                              </span>
                            )}
                            <span className="bg-gray-100 px-2 py-0.5 rounded">
                              {question.questionType.replace(/_/g, ' ')}
                            </span>
                            {question.difficultyLevel && (
                              <span className={`px-2 py-0.5 rounded ${
                                question.difficultyLevel === 'EASY'
                                  ? 'bg-green-100 text-green-700'
                                  : question.difficultyLevel === 'MEDIUM'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {question.difficultyLevel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/teacher/multi-period-dashboard')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {currentStep < totalSteps ? (
              <Button 
                onClick={() => setCurrentStep(currentStep + 1)} 
                disabled={!canProceed() || isSubmitting}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !canProceed()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create Assessment
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Error Display */}
        {createMutation.isError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {createMutation.error?.response?.data?.message || 'Failed to create assessment'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default CustomAssessmentBuilderPage;