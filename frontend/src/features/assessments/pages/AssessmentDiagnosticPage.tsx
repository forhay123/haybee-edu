// frontend/src/features/assessments/pages/AssessmentDiagnosticPage.tsx

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Wrench, Search, Database, AlertTriangle, Loader2, Link, BarChart } from 'lucide-react';
import axios from '@/api/axios';
import { useQuery } from '@tanstack/react-query';
import { studentProfilesApi } from '@/features/studentProfiles/api/studentProfilesApi';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface DiagnosticResult {
  topicExists: boolean;
  hasMissingAssessment: boolean;
  assessment: any;
  progress: any;
  schedule: any;
  checks: {
    topicHasQuestions: boolean;
    assessmentExists: boolean;
    assessmentHasQuestions: boolean;
    progressExists: boolean;
    progressLinked: boolean;
    assessmentAccessible: boolean;
    scheduleExists: boolean;
    scheduleLinkedToProgress: boolean;
  };
}

interface SubmissionStats {
  totalSubmissions: number;
  linkedSubmissions: number;
  unlinkedSubmissions: number;
  linkageRate: number;
}

const CheckResult: React.FC<{
  label: string;
  passed: boolean;
  details?: string;
}> = ({ label, passed, details }) => (
  <div className="flex items-start gap-3 py-2">
    {passed ? (
      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
    )}
    <div className="flex-1">
      <div className="font-medium">{label}</div>
      {details && <div className="text-sm text-gray-600 dark:text-gray-400">{details}</div>}
    </div>
  </div>
);

export const AssessmentDiagnosticPage: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixResults, setFixResults] = useState<any>(null);
  
  // NEW: Submission linking states
  const [submissionStats, setSubmissionStats] = useState<SubmissionStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLinkingSubmissions, setIsLinkingSubmissions] = useState(false);
  const [submissionLinkResults, setSubmissionLinkResults] = useState<any>(null);

  // Fetch all students
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['all-students'],
    queryFn: studentProfilesApi.getAll,
  });

  const selectedStudent = students?.find(s => s.id === selectedStudentId);

  // Fetch schedules for the selected student (current week)
  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: schedules, isLoading: schedulesLoading, refetch: refetchSchedules } = useQuery({
    queryKey: ['student-schedules', selectedStudentId, weekStart, weekEnd],
    queryFn: async () => {
      if (!selectedStudentId) return [];
      const response = await axios.get(
        `/daily-schedules/individual/student/${selectedStudentId}/range`,
        { params: { startDate: weekStart, endDate: weekEnd } }
      );
      return response.data;
    },
    enabled: !!selectedStudentId && selectedStudent?.studentType === 'INDIVIDUAL',
  });

  const selectedSchedule = schedules?.find((s: any) => s.id === selectedScheduleId);
  const selectedTopic = selectedSchedule 
    ? {
        id: selectedSchedule.lessonTopicId,
        topicTitle: selectedSchedule.lessonTopicTitle,
        subjectName: selectedSchedule.subjectName,
      }
    : null;

  // NEW: Fetch submission statistics
  const fetchSubmissionStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await axios.get('/admin/maintenance/submissions/statistics');
      setSubmissionStats(response.data);
    } catch (err: any) {
      console.error('Failed to fetch submission stats:', err);
      setError(err.message || 'Failed to fetch submission statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // NEW: Link all submissions to progress
  const linkAllSubmissions = async () => {
    if (!confirm('This will link ALL assessment submissions to their progress records system-wide. Continue?')) {
      return;
    }

    setIsLinkingSubmissions(true);
    setError(null);
    setSubmissionLinkResults(null);

    try {
      const response = await axios.post('/admin/maintenance/submissions/link-all');
      setSubmissionLinkResults(response.data);
      
      // Force a fresh fetch of stats after a short delay to ensure DB updates are complete
      setTimeout(async () => {
        await fetchSubmissionStats();
      }, 1000);

      alert(`✅ Submission Linking Complete!

Summary:
- Linked: ${response.data.linkedCount}
- Already Linked: ${response.data.alreadyLinkedCount}
- No Progress Found: ${response.data.noProgressFoundCount}
- Errors: ${response.data.errorCount}

${response.data.message}

Stats will refresh automatically in 1 second.`);
    } catch (err: any) {
      console.error('Failed to link submissions:', err);
      setError(err.response?.data?.message || err.message || 'Failed to link submissions');
      
      alert(`❌ Submission Linking Failed

Error: ${err.response?.data?.message || err.message || 'Unknown error'}`);
    } finally {
      setIsLinkingSubmissions(false);
    }
  };

  // NEW: Link submissions for specific student
  const linkStudentSubmissions = async (studentId: number) => {
    if (!confirm(`Link all submissions for this student (ID: ${studentId})?`)) {
      return;
    }

    setIsLinkingSubmissions(true);
    setError(null);

    try {
      const response = await axios.post(`/admin/maintenance/submissions/link-student/${studentId}`);
      
      alert(`✅ Student Submission Linking Complete!

Student ID: ${studentId}
- Linked: ${response.data.linkedCount}
- Already Linked: ${response.data.alreadyLinkedCount}
- No Progress Found: ${response.data.noProgressFoundCount}
- Errors: ${response.data.errorCount}

${response.data.message}`);

      // Refresh diagnostic if it was run for this student
      if (selectedStudentId === studentId && diagnostic) {
        await runDiagnostic();
      }
    } catch (err: any) {
      console.error('Failed to link student submissions:', err);
      setError(err.response?.data?.message || err.message || 'Failed to link student submissions');
    } finally {
      setIsLinkingSubmissions(false);
    }
  };

  const runDiagnostic = async () => {
    if (!selectedStudentId || !selectedScheduleId) {
      setError('Please select both a student and a schedule');
      return;
    }

    if (!selectedSchedule?.lessonTopicId) {
      setError('Selected schedule does not have a lesson topic assigned');
      return;
    }

    setIsRunning(true);
    setError(null);
    setDiagnostic(null);
    setFixResults(null);

    try {
      const lessonTopicId = selectedSchedule.lessonTopicId;

      console.log('🔍 Running diagnostic for:', {
        studentId: selectedStudentId,
        scheduleId: selectedScheduleId,
        lessonTopicId,
      });

      // Check 1: Missing assessments stats
      const topicCheck = await axios.get('/admin/assessments/missing-assessments-stats');

      // Check 2: Assessment exists
      let assessmentCheck = null;
      try {
        const response = await axios.get(`/lesson-assessments/by-lesson/${lessonTopicId}`);
        assessmentCheck = response.data;
      } catch (err) {
        console.log('Assessment check failed:', err);
      }

      // Check 3: Progress record
      let progressCheck = null;
      try {
        const response = await axios.get(
          `/progress/student/${selectedStudentId}/lesson-topic/${lessonTopicId}`
        );
        progressCheck = response.data;
      } catch (err) {
        console.log('Progress check failed:', err);
      }

      setDiagnostic({
        topicExists: true,
        hasMissingAssessment: topicCheck.data.topics.some(
          (t: any) => t.lessonTopicId === lessonTopicId
        ),
        assessment: assessmentCheck,
        progress: progressCheck,
        schedule: selectedSchedule,
        checks: {
          topicHasQuestions: !topicCheck.data.topics.some(
            (t: any) => t.lessonTopicId === lessonTopicId
          ),
          assessmentExists: !!assessmentCheck,
          assessmentHasQuestions: (assessmentCheck?.questions?.length || 0) > 0,
          progressExists: !!progressCheck,
          progressLinked: !!progressCheck?.assessmentId,
          assessmentAccessible: progressCheck?.assessmentAccessible === true,
          scheduleExists: !!selectedSchedule,
          scheduleLinkedToProgress: !!selectedSchedule?.progressId,
        },
      });

      console.log('✅ Diagnostic complete:', {
        progressId: progressCheck?.id,
        scheduleProgressId: selectedSchedule?.progressId,
        assessmentId: assessmentCheck?.id,
        progressAssessmentId: progressCheck?.assessmentId,
      });
    } catch (err: any) {
      console.error('❌ Diagnostic failed:', err);
      setError(err.message || 'Failed to run diagnostic');
    } finally {
      setIsRunning(false);
    }
  };

  const fixAssessmentLinks = async () => {
    if (!selectedStudentId || !selectedSchedule?.lessonTopicId) {
      return;
    }

    setIsFixing(true);
    setError(null);
    setFixResults(null);

    try {
      const lessonTopicId = selectedSchedule.lessonTopicId;

      console.log('🔧 Starting fix process...');
      console.log('🎯 Schedule ID:', selectedScheduleId);
      console.log('🎯 Progress ID from diagnostic:', diagnostic?.progress?.id);

      // ✅ STEP 1: Run the complete system-wide fix - THIS IS THE KEY!
      console.log('🔧 Step 1: Running /admin/schedules/complete-fix endpoint...');
      const completeFixResponse = await axios.post('/admin/schedules/complete-fix');
      console.log('✅ Complete fix result:', completeFixResponse.data);

      setFixResults(completeFixResponse.data);

      // ✅ STEP 2: Create assessment for this specific lesson if still missing
      if (diagnostic?.hasMissingAssessment || !diagnostic?.checks.assessmentExists) {
        console.log('🎯 Step 2: Creating assessment for lesson topic', lessonTopicId);
        try {
          await axios.post(`/admin/assessments/create-for-lesson/${lessonTopicId}`);
          console.log('✅ Assessment created');
        } catch (err) {
          console.log('⚠️ Assessment creation failed (may already exist):', err);
        }
      }

      // ✅ STEP 3: Fix assessment access for this student specifically
      console.log('🔧 Step 3: Fixing access for student', selectedStudentId);
      try {
        await axios.post(`/admin/assessments/fix-assessment-access/student/${selectedStudentId}`);
        console.log('✅ Access fixed');
      } catch (err) {
        console.log('⚠️ Access fix failed:', err);
      }

      // ✅ STEP 4: Wait for changes to propagate
      console.log('⏳ Step 4: Waiting for changes to propagate...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ✅ STEP 5: Refetch schedules to get updated data
      console.log('🔄 Step 5: Refetching schedules...');
      await refetchSchedules();

      // ✅ STEP 6: Re-run diagnostic
      console.log('🔍 Step 6: Re-running diagnostic...');
      await runDiagnostic();

      console.log('✅ Fix process complete!');
      
      alert(`✅ Fix Applied Successfully!

Summary:
- Assessments created: ${completeFixResponse.data.assessmentsCreated || 0}
- Progress records linked: ${completeFixResponse.data.progressLinked || 0}
- 🎯 Schedules linked: ${completeFixResponse.data.schedulesLinked || 0}
- Access enabled: ${completeFixResponse.data.accessEnabled || 0}

The student should now be able to access the assessment.
Please refresh the student portal to see the changes.`);
    } catch (err: any) {
      console.error('❌ Fix failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to apply fix');
      
      alert(`❌ Fix Failed

Error: ${err.response?.data?.message || err.message || 'Unknown error'}

Please check the console for more details.`);
    } finally {
      setIsFixing(false);
    }
  };

  const isLoading = studentsLoading;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Wrench className="h-8 w-8 text-blue-600" />
          Assessment Diagnostic & Fix Tool
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Diagnose and fix assessment access issues, plus system-wide submission linking
        </p>
      </div>

      {/* NEW: System-Wide Submission Linking Section */}
      <Card className="border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-300">
            <Link className="h-6 w-6" />
            System-Wide Submission Linking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-purple-800 dark:text-purple-200">
            Link assessment submissions to their progress records. This fixes the issue where students submit assessments but progress.completed stays false.
          </p>

          <div className="flex gap-3">
            <Button
              onClick={fetchSubmissionStats}
              disabled={isLoadingStats}
              variant="outline"
              className="flex-1"
            >
              {isLoadingStats ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <BarChart className="h-4 w-4 mr-2" />
                  Get Statistics
                </>
              )}
            </Button>

            <Button
              onClick={linkAllSubmissions}
              disabled={isLinkingSubmissions}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isLinkingSubmissions ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Link All Submissions
                </>
              )}
            </Button>
          </div>

          {submissionStats && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
              <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Submission Statistics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Submissions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{submissionStats.totalSubmissions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Linkage Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {submissionStats.linkageRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Linked</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                    {submissionStats.linkedSubmissions}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Unlinked</p>
                  <p className="text-xl font-semibold text-orange-600 dark:text-orange-400">
                    {submissionStats.unlinkedSubmissions}
                  </p>
                </div>
              </div>
              {submissionStats.unlinkedSubmissions > 0 && (
                <Alert className="mt-4 border-orange-300 bg-orange-50 dark:bg-orange-900/20">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200">
                    {submissionStats.unlinkedSubmissions} submission{submissionStats.unlinkedSubmissions !== 1 ? 's' : ''} need{submissionStats.unlinkedSubmissions === 1 ? 's' : ''} linking. Click "Link All Submissions" to fix.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {submissionLinkResults && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">✅ Linking Results</h4>
              <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <p>• Linked: <strong>{submissionLinkResults.linkedCount}</strong></p>
                <p>• Already Linked: <strong>{submissionLinkResults.alreadyLinkedCount}</strong></p>
                <p>• No Progress Found: <strong>{submissionLinkResults.noProgressFoundCount}</strong></p>
                <p>• Errors: <strong>{submissionLinkResults.errorCount}</strong></p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-6 w-6 text-blue-600" />
            Individual Student Diagnostic
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-3">Loading data...</span>
            </div>
          ) : (
            <>
              {/* Student Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Student
                </label>
                <select
                  value={selectedStudentId || ''}
                  onChange={(e) => {
                    const newStudentId = Number(e.target.value) || null;
                    setSelectedStudentId(newStudentId);
                    setSelectedScheduleId(null);
                    setDiagnostic(null);
                    setError(null);
                    setFixResults(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">-- Select a student --</option>
                  {students?.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} (ID: {student.id}) - {student.studentType}
                      {student.className && ` - ${student.className}`}
                    </option>
                  ))}
                </select>
                {selectedStudent && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Selected: <strong>{selectedStudent.fullName}</strong>
                    {selectedStudent.className && ` • Class: ${selectedStudent.className}`}
                    {selectedStudent.studentType && ` • Type: ${selectedStudent.studentType}`}
                  </p>
                )}
                {selectedStudent && (
                  <Button
                    onClick={() => linkStudentSubmissions(selectedStudentId!)}
                    disabled={isLinkingSubmissions}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    {isLinkingSubmissions ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Linking...
                      </>
                    ) : (
                      <>
                        <Link className="h-3 w-3 mr-2" />
                        Link This Student's Submissions
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Schedule Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Schedule (This Week)
                </label>
                {schedulesLoading ? (
                  <div className="flex items-center justify-center py-4 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Loading schedules...</span>
                  </div>
                ) : !selectedStudentId ? (
                  <div className="py-4 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Please select a student first
                    </p>
                  </div>
                ) : selectedStudent?.studentType !== 'INDIVIDUAL' ? (
                  <div className="py-4 border border-orange-300 dark:border-orange-600 rounded-md bg-orange-50 dark:bg-orange-900/20 text-center">
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      This tool only works for INDIVIDUAL students
                    </p>
                  </div>
                ) : !schedules || schedules.length === 0 ? (
                  <div className="py-4 border border-orange-300 dark:border-orange-600 rounded-md bg-orange-50 dark:bg-orange-900/20 text-center">
                    <p className="text-sm text-orange-600 dark:text-orange-400">
                      No schedules found for this student this week
                    </p>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedScheduleId || ''}
                      onChange={(e) => {
                        setSelectedScheduleId(Number(e.target.value) || null);
                        setDiagnostic(null);
                        setError(null);
                        setFixResults(null);
                      }}
                      disabled={!selectedStudentId}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Select a schedule --</option>
                      {schedules?.map((schedule: any) => (
                        <option key={schedule.id} value={schedule.id}>
                          {format(new Date(schedule.scheduledDate), 'EEE, MMM d')} - {schedule.subjectName}
                          {schedule.lessonTopicTitle && ` - ${schedule.lessonTopicTitle}`}
                          {!schedule.lessonTopicId && ' (⚠️ No topic assigned)'}
                        </option>
                      ))}
                    </select>
                    {schedules && schedules.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {schedules.length} schedule{schedules.length !== 1 ? 's' : ''} this week • 
                        Showing {weekStart} to {weekEnd}
                      </p>
                    )}
                  </>
                )}
                {selectedSchedule && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Selected: <strong>{selectedSchedule.subjectName}</strong>
                    {selectedSchedule.lessonTopicTitle && ` • ${selectedSchedule.lessonTopicTitle}`}
                    {selectedSchedule.scheduledDate && ` • ${format(new Date(selectedSchedule.scheduledDate), 'EEEE, MMM d')}`}
                  </p>
                )}
              </div>

              <Button
                onClick={runDiagnostic}
                disabled={isRunning || !selectedStudentId || !selectedScheduleId || !selectedSchedule?.lessonTopicId}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Diagnostic...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Run Diagnostic
                  </>
                )}
              </Button>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {diagnostic && (
        <>
          {/* Summary Card */}
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <CardHeader>
              <CardTitle className="text-lg">Diagnostic Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Student</p>
                  <p className="font-semibold">{selectedStudent?.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Lesson Topic</p>
                  <p className="font-semibold">{selectedTopic?.topicTitle || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Subject</p>
                  <p className="font-semibold">{selectedTopic?.subjectName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Schedule Date</p>
                  <p className="font-semibold">
                    {selectedSchedule?.scheduledDate 
                      ? format(new Date(selectedSchedule.scheduledDate), 'EEEE, MMM d, yyyy')
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Diagnostic Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <CheckResult
                label="Lesson Topic Has AI Questions"
                passed={diagnostic.checks.topicHasQuestions}
                details={
                  diagnostic.hasMissingAssessment
                    ? 'Topic has questions but no assessment'
                    : 'Topic has questions and assessment exists'
                }
              />
              <CheckResult
                label="Assessment Exists"
                passed={diagnostic.checks.assessmentExists}
                details={
                  diagnostic.assessment
                    ? `Assessment ID: ${diagnostic.assessment.id} - "${diagnostic.assessment.title}"`
                    : 'No assessment found'
                }
              />
              <CheckResult
                label="Assessment Has Questions"
                passed={diagnostic.checks.assessmentHasQuestions}
                details={
                  diagnostic.assessment
                    ? `${diagnostic.assessment.questions?.length || 0} questions`
                    : 'N/A'
                }
              />
              <CheckResult
                label="Progress Record Exists"
                passed={diagnostic.checks.progressExists}
                details={
                  diagnostic.progress
                    ? `Progress ID: ${diagnostic.progress.id}`
                    : 'No progress record found'
                }
              />
              <CheckResult
                label="Progress Linked to Assessment"
                passed={diagnostic.checks.progressLinked}
                details={
                  diagnostic.progress?.assessmentId
                    ? `Linked to Assessment ${diagnostic.progress.assessmentId}`
                    : 'Not linked'
                }
              />
              <CheckResult
                label="Assessment Access Enabled"
                passed={diagnostic.checks.assessmentAccessible}
                details={
                  diagnostic.progress?.assessmentAccessible
                    ? 'Access enabled ✓'
                    : '⚠️ Access disabled'
                }
              />
              <CheckResult
                label="Daily Schedule Exists"
                passed={diagnostic.checks.scheduleExists}
                details={
                  diagnostic.schedule
                    ? `Schedule ID: ${diagnostic.schedule.id}`
                    : 'No schedule found'
                }
              />
              <CheckResult
                label="⭐ Schedule Linked to Progress (CRITICAL)"
                passed={diagnostic.checks.scheduleLinkedToProgress}
                details={
                  diagnostic.schedule?.progressId
                    ? `✅ Linked to Progress ${diagnostic.schedule.progressId}`
                    : '❌ NOT LINKED - This is the root cause!'
                }
              />
            </CardContent>
          </Card>

          {(!diagnostic.checks.assessmentExists ||
            !diagnostic.checks.progressLinked ||
            !diagnostic.checks.assessmentAccessible ||
            !diagnostic.checks.scheduleLinkedToProgress ||
            diagnostic.hasMissingAssessment) && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900 dark:text-orange-300">
                  <AlertTriangle className="h-5 w-5" />
                  Issues Detected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-orange-800 dark:text-orange-200 space-y-2">
                  {diagnostic.hasMissingAssessment && (
                    <p>• Assessment needs to be created for this topic</p>
                  )}
                  {!diagnostic.checks.progressLinked && (
                    <p>• Progress record is not linked to assessment</p>
                  )}
                  {!diagnostic.checks.assessmentAccessible && (
                    <p>• Assessment access is disabled in progress record</p>
                  )}
                  {!diagnostic.checks.scheduleLinkedToProgress && (
                    <p className="font-bold text-red-600 dark:text-red-400">
                      • ⚠️ Schedule is NOT linked to progress record (ROOT CAUSE!)
                    </p>
                  )}
                </div>

                <Button
                  onClick={fixAssessmentLinks}
                  disabled={isFixing}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {isFixing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying Fixes...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4 mr-2" />
                      Apply Automatic Fix
                    </>
                  )}
                </Button>

                <div className="text-xs text-orange-700 dark:text-orange-300 space-y-2 bg-orange-100 dark:bg-orange-900/40 p-4 rounded">
                  <p className="font-semibold text-base">This will:</p>
                  <p>1. Create any missing assessments</p>
                  <p>2. Link progress records to their assessments</p>
                  <p className="font-bold text-red-600 dark:text-red-400">
                    3. 🎯 Link schedules to their progress records (THIS FIXES YOUR PROBLEM!)
                  </p>
                  <p>4. Enable assessment access for all students</p>
                  <p className="mt-3 text-xs italic">
                    This is a system-wide fix. After running, refresh the student portal.
                  </p>
                </div>

                {fixResults && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4">
                    <p className="font-semibold text-green-900 dark:text-green-300 mb-2">✅ Fix Results:</p>
                    <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                      <p>• Assessments created: <strong>{fixResults.assessmentsCreated || 0}</strong></p>
                      <p>• Progress records linked: <strong>{fixResults.progressLinked || 0}</strong></p>
                      <p className="font-bold text-green-700 dark:text-green-300">
                        • 🎯 Schedules linked: <strong className="text-lg">{fixResults.schedulesLinked || 0}</strong>
                      </p>
                      <p>• Access enabled: <strong>{fixResults.accessEnabled || 0}</strong></p>
                    </div>
                    <p className="mt-3 text-xs text-green-700 dark:text-green-400 italic">
                      Please refresh the student portal to see the changes.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {diagnostic.checks.assessmentExists &&
            diagnostic.checks.progressLinked &&
            diagnostic.checks.assessmentAccessible &&
            diagnostic.checks.scheduleLinkedToProgress && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-300">
                        Everything looks good!
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-400">
                        All checks passed. The assessment should be accessible.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Raw Data (for debugging)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-auto max-h-96 border border-gray-200 dark:border-gray-700 font-mono">
                {JSON.stringify({
                  diagnostic,
                  selectedSchedule: {
                    id: selectedSchedule?.id,
                    progressId: selectedSchedule?.progressId,
                    lessonTopicId: selectedSchedule?.lessonTopicId,
                    scheduledDate: selectedSchedule?.scheduledDate,
                  },
                  fixResults,
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="text-sm space-y-2 text-blue-900 dark:text-blue-300">
            <p className="font-semibold">Common Issues & Solutions:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-400">
              <li>
                <strong>Missing Assessment:</strong> Topic has AI questions but no assessment created
              </li>
              <li>
                <strong>Access Disabled:</strong> assessmentAccessible = false in progress
              </li>
              <li>
                <strong>Progress Not Linked:</strong> Progress doesn't have assessment_id
              </li>
              <li className="font-bold text-red-600 dark:text-red-400">
                <strong>Schedule Not Linked (MOST COMMON!):</strong> Schedule doesn't have progress_id set
                <br />
                <span className="text-xs ml-6">→ This causes "lesson not initialized" error</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};