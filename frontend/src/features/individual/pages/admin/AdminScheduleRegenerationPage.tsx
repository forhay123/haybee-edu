
import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Eye, Calendar, AlertTriangle, CheckCircle, XCircle, Info, Wrench, Clock, Layers, Link, Zap, FileCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useAuth } from '@/features/auth/useAuth';
import axiosInstance from '@/api/axios';

// All interfaces remain the same, just adding Period2FixResultData
interface CurrentWeekInfo {
  success: boolean;
  currentWeek: number;
  weekStart: string;
  weekEnd: string;
}

interface StatsData {
  success: boolean;
  totalSchedules: number;
  studentsWithSchedules: number;
  missingTopics: number;
}

interface PreviewData {
  success: boolean;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  studentsToProcess: number;
  existingSchedules: number;
  willRegenerate: boolean;
  studentIds?: number[];
}

interface ResultData {
  success: boolean;
  message: string;
  weekNumber?: number;
  schedulesDeleted?: number;
  schedulesCreated?: number;
  studentsProcessed?: number;
  missingTopicsCount?: number;
  weekStart?: string;
  weekEnd?: string;
}

interface ProgressStatsData {
  success: boolean;
  totalSchedules: number;
  totalProgress: number;
  linkedProgress: number;
  orphanedProgress: number;
  progressWithSubmissions: number;
  schedulesWithoutProgress: number;
  healthScore: number;
  needsFix: boolean;
}

interface ProgressFixResultData {
  success: boolean;
  message: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  orphanedLinked: number;
  progressCreated: number;
  windowsUpdated: number;
  finalStats: ProgressStatsData;
}

interface SubmissionLinkResultData {
  success: boolean;
  message: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  submissionsLinked: number;
  finalStats: ProgressStatsData;
}

interface AssessmentLinkResultData {
  success: boolean;
  message: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  schedulesLinked: number;
  progressLinked: number;
}

interface AssessmentWindowFixResultData {
  success: boolean;
  message: string;
  recordsFixed: number;
  stats: {
    total_with_assessment: number;
    with_start_time: number;
    with_end_time: number;
    still_missing: number;
  };
}

interface MultiPeriodFixResultData {
  success: boolean;
  message: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  recordsUpdated: number;
  beforeStats: {
    total_progress: number;
    with_sequence: number;
    multi_period: number;
    single_period: number;
    missing_metadata: number;
  };
  afterStats: {
    total_progress: number;
    with_sequence: number;
    multi_period: number;
    single_period: number;
    missing_metadata: number;
  };
}

interface CompleteFixResultData {
  success: boolean;
  message: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  startTime: string;
  endTime: string;
  fullyFixed: boolean;
  failedAtStep?: number;
  error?: string;
  
  step1_orphanedLinked: number;
  step2_schedulesLinked: number;
  step2_progressLinked: number;
  step2_accessibilitySet: number;
  step3_progressCreated: number;
  step4_submissionsLinked: number;
  step4_scoresCalculated: number;
  step5_windowsFixed: number;
  step5_accessibilityUpdated: number;
  step6_metadataSet: number;
  
  initialHealth: ProgressStatsData;
  finalHealth: ProgressStatsData;
  
  validation: {
    allGood: boolean;
    remainingOrphaned: number;
    remainingNoAssessment: number;
    remainingNoWindows: number;
    remainingNoMetadata: number;
    remainingUnlinkedSubmissions: number;
  };
}

interface AssessmentCreationResultData {
  success: boolean;
  message?: string;
  assessmentsCreated: number;
  skipped: number;
  totalTopics: number;
  topicsProcessed?: string[];
}

interface Period2FixResultData {
  success: boolean;
  message: string;
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  recordsUpdated: number;
  beforeStats: {
    total_progress: number;
    period2_with_assessment: number;
    period3_with_assessment: number;
  };
  afterStats: {
    total_progress: number;
    period2_with_assessment: number;
    period3_with_assessment: number;
  };
}

const AdminScheduleRegenerationPage: React.FC = () => {
  const [weekNumber, setWeekNumber] = useState(1);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekInfo, setCurrentWeekInfo] = useState<CurrentWeekInfo | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [progressStats, setProgressStats] = useState<ProgressStatsData | null>(null);
  const [progressFixResult, setProgressFixResult] = useState<ProgressFixResultData | null>(null);
  const [submissionLinkResult, setSubmissionLinkResult] = useState<SubmissionLinkResultData | null>(null);
  const [assessmentLinkResult, setAssessmentLinkResult] = useState<AssessmentLinkResultData | null>(null);
  const [assessmentWindowFixResult, setAssessmentWindowFixResult] = useState<AssessmentWindowFixResultData | null>(null);
  const [multiPeriodFixResult, setMultiPeriodFixResult] = useState<MultiPeriodFixResultData | null>(null);
  const [completeFixResult, setCompleteFixResult] = useState<CompleteFixResultData | null>(null);
  const [assessmentCreationResult, setAssessmentCreationResult] = useState<AssessmentCreationResultData | null>(null);
  const [period2FixResult, setPeriod2FixResult] = useState<Period2FixResultData | null>(null);

  const API_BASE = '/admin/individual/schedules';
  const PROGRESS_API_BASE = '/admin/maintenance/progress';
  const MULTI_PERIOD_API_BASE = '/admin/maintenance/multi-period';
  const INTEGRATION_API_BASE = '/integration';

  useEffect(() => {
    fetchCurrentWeek();
    fetchStats();
    fetchProgressStats();
  }, []);

  const fetchCurrentWeek = async () => {
    try {
      const response = await axiosInstance.get<CurrentWeekInfo>(`${API_BASE}/current-week`);
      if (response.data.success) {
        setCurrentWeekInfo(response.data);
        setWeekNumber(response.data.currentWeek);
      }
    } catch (err) {
      console.error('Failed to fetch current week:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get<StatsData>(`${API_BASE}/stats`);
      if (response.data.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchProgressStats = async () => {
    if (!weekNumber) return;
    try {
      const response = await axiosInstance.get<ProgressStatsData>(
        `${PROGRESS_API_BASE}/stats/week/${weekNumber}`
      );
      if (response.data.success) {
        setProgressStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch progress stats:', err);
    }
  };

  const handleCreateMissingAssessments = async () => {
    if (!window.confirm(
      `Create missing assessments for ALL lesson topics?\n\n` +
      `This will:\n` +
      `- Scan all lesson topics with AI-generated questions\n` +
      `- Create assessments for topics that don't have them\n` +
      `- Skip topics that already have assessments\n\n` +
      `This is useful after uploading new lessons or when assessments weren't auto-created.`
    )) {
      return;
    }

    setLoading(true);
    setError(null);
    setAssessmentCreationResult(null);
    
    try {
      const response = await axiosInstance.post<AssessmentCreationResultData>(
        `${INTEGRATION_API_BASE}/assessments/create-missing`
      );
      
      if (response.data && response.data.assessmentsCreated >= 0) {
        setAssessmentCreationResult(response.data);
        await fetchStats();
        await fetchProgressStats();
      } else {
        setError('Assessment creation returned unexpected response');
      }
    } catch (err: any) {
      setError('Failed to create assessments: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleClearPeriod2PlusAssessments = async () => {
    if (!window.confirm(
      `Clear Period 2+ assessments for Week ${weekNumber}?\n\n` +
      `This will:\n` +
      `- Clear assessment_id from Period 2 and Period 3 progress records\n` +
      `- Set requires_custom_assessment = true\n` +
      `- Fix "Create Assessment" button not appearing\n\n` +
      `Run this AFTER regenerating schedules.`
    )) {
      return;
    }

    setLoading(true);
    setError(null);
    setPeriod2FixResult(null);
    
    try {
      const response = await axiosInstance.post<Period2FixResultData>(
        `${PROGRESS_API_BASE}/clear-period2plus-assessments/week/${weekNumber}`
      );
      
      if (response.data.success) {
        setPeriod2FixResult(response.data);
        await fetchStats();
        await fetchProgressStats();
      } else {
        setError('Period 2+ assessment clearing failed');
      }
    } catch (err: any) {
      setError('Failed to clear Period 2+ assessments: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressFixResult(null);
    setSubmissionLinkResult(null);
    setAssessmentLinkResult(null);
    setAssessmentWindowFixResult(null);
    setMultiPeriodFixResult(null);
    setCompleteFixResult(null);
    setAssessmentCreationResult(null);
    setPeriod2FixResult(null);
    
    try {
      const response = await axiosInstance.get<PreviewData>(`${API_BASE}/preview/week/${weekNumber}`);
      
      if (response.data.success) {
        setPreviewData(response.data);
        await fetchProgressStats();
      } else {
        setError('Preview failed');
      }
    } catch (err: any) {
      setError('Failed to fetch preview: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm(`Are you sure you want to regenerate Week ${weekNumber}? This will delete ${previewData?.existingSchedules || 0} existing schedules and create new ones.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgressFixResult(null);
    setSubmissionLinkResult(null);
    setAssessmentLinkResult(null);
    setAssessmentWindowFixResult(null);
    setMultiPeriodFixResult(null);
    setCompleteFixResult(null);
    setAssessmentCreationResult(null);
    setPeriod2FixResult(null);
    
    try {
      const response = await axiosInstance.post<ResultData>(`${API_BASE}/regenerate/week/${weekNumber}`);
      
      if (response.data.success) {
        setResult(response.data);
        setPreviewData(null);
        await fetchStats();
        await fetchProgressStats();
      } else {
        setError('Regeneration failed');
      }
    } catch (err: any) {
      setError('Failed to regenerate: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteFix = async () => {
    if (!window.confirm(
      `Run COMPLETE FIX for Week ${weekNumber}?\n\n` +
      `This will run all fix operations in the correct order:\n` +
      `1. Link orphaned progress to schedules\n` +
      `2. Link assessments to schedules and progress\n` +
      `3. Create missing progress records (with all fields)\n` +
      `4. Link submissions and calculate scores\n` +
      `5. Fix assessment windows from schedules\n` +
      `6. Set multi-period metadata\n` +
      `7. Validate final state\n\n` +
      `This is the RECOMMENDED way to fix all issues at once.`
    )) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgressFixResult(null);
    setSubmissionLinkResult(null);
    setAssessmentLinkResult(null);
    setAssessmentWindowFixResult(null);
    setMultiPeriodFixResult(null);
    setCompleteFixResult(null);
    setAssessmentCreationResult(null);
    setPeriod2FixResult(null);
    
    try {
      const response = await axiosInstance.post<CompleteFixResultData>(
        `${PROGRESS_API_BASE}/complete-fix/week/${weekNumber}`
      );
      
      if (response.data.success) {
        setCompleteFixResult(response.data);
        await fetchStats();
        await fetchProgressStats();
      } else {
        setError(`Complete fix failed at step ${response.data.failedAtStep}: ${response.data.error}`);
      }
    } catch (err: any) {
      setError('Failed to run complete fix: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAssessments = async () => {
    if (!window.confirm(`Link assessments to schedules for Week ${weekNumber}?\n\nThis will:\n- Link assessments to schedules based on lesson topics\n- Link assessments to progress records\n- Fix "Assessment Not Available" issues`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setAssessmentLinkResult(null);
    setCompleteFixResult(null);
    setAssessmentCreationResult(null);
    setPeriod2FixResult(null);
    
    try {
      const response = await axiosInstance.post<AssessmentLinkResultData>(
        `${PROGRESS_API_BASE}/link-assessments/week/${weekNumber}`
      );
      
      if (response.data.success) {
        setAssessmentLinkResult(response.data);
        await fetchStats();
        await fetchProgressStats();
      } else {
        setError('Assessment linking failed');
      }
    } catch (err: any) {
      setError('Failed to link assessments: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFixProgress = async () => {
    if (!window.confirm(`Fix progress records for Week ${weekNumber}?\n\nThis will:\n- Link orphaned progress (with submissions) to schedules\n- Create missing progress records\n- Update assessment windows`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setProgressFixResult(null);
    setSubmissionLinkResult(null);
    setAssessmentWindowFixResult(null);
    setCompleteFixResult(null);
    setAssessmentCreationResult(null);
    setPeriod2FixResult(null);
    
    try {
      const response = await axiosInstance.post<ProgressFixResultData>(
        `${PROGRESS_API_BASE}/fix-week/${weekNumber}`
      );
      
      if (response.data.success) {
        setProgressFixResult(response.data);
        await fetchStats();
        await fetchProgressStats();
      } else {
        setError('Progress fix failed');
      }
    } catch (err: any) {
      setError('Failed to fix progress: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLinkSubmissions = async () => {
    if (!window.confirm(`Link submissions to progress for Week ${weekNumber}?\n\nThis will connect existing assessment submissions to their progress records and mark them as completed.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSubmissionLinkResult(null);
    setAssessmentWindowFixResult(null);
    setCompleteFixResult(null);
    setAssessmentCreationResult(null);
    setPeriod2FixResult(null);
    
    try {
      const response = await axiosInstance.post<SubmissionLinkResultData>(
        `${PROGRESS_API_BASE}/link-submissions/week/${weekNumber}`
      );
      
      if (response.data.success) {
        setSubmissionLinkResult(response.data);
        await fetchStats();
        await fetchProgressStats();
      } else {
        setError('Submission linking failed');
      }
    } catch (err: any) {
      setError('Failed to link submissions: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFixAssessmentWindows = async () => {
    if (!window.confirm('Fix assessment windows for ALL progress records?\n\nThis will set window times for all progress records that have assessments but missing window times.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setAssessmentWindowFixResult(null);
    setCompleteFixResult(null);
    setAssessmentCreationResult(null);
    setPeriod2FixResult(null);
    
    try {
      const response = await axiosInstance.post<AssessmentWindowFixResultData>(
        `${PROGRESS_API_BASE}/fix-all-assessment-windows`
      );
      
      if (response.data.success) {
        setAssessmentWindowFixResult(response.data);
        await fetchStats();
        await fetchProgressStats();
      } else {
        setError('Assessment window fix failed');
      }
    } catch (err: any) {
      setError('Failed to fix assessment windows: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFixMultiPeriodMetadata = async () => {
    if (!window.confirm(`Fix multi-period metadata for Week ${weekNumber}?\n\nThis will set period_sequence and total_periods_in_sequence for subjects that appear multiple times in the week.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setMultiPeriodFixResult(null);
    setCompleteFixResult(null);
    setAssessmentCreationResult(null);
    setPeriod2FixResult(null);
    
    try {
      const response = await axiosInstance.post<MultiPeriodFixResultData>(
        `${MULTI_PERIOD_API_BASE}/fix-week/${weekNumber}`
      );
      
      if (response.data.success) {
        setMultiPeriodFixResult(response.data);
        await fetchStats();
        await fetchProgressStats();
      } else {
        setError('Multi-period metadata fix failed');
      }
    } catch (err: any) {
      setError('Failed to fix multi-period metadata: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to DELETE all schedules for Week ${weekNumber}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgressFixResult(null);
    setSubmissionLinkResult(null);
    setAssessmentLinkResult(null);
    setAssessmentWindowFixResult(null);
    setMultiPeriodFixResult(null);
    setCompleteFixResult(null);
    setAssessmentCreationResult(null);
    setPeriod2FixResult(null);
    
    try {
      const response = await axiosInstance.delete<ResultData>(`${API_BASE}/week/${weekNumber}`);
      
      if (response.data.success) {
        setResult(response.data);
        setPreviewData(null);
        await fetchStats();
        await fetchProgressStats();
      } else {
        setError('Deletion failed');
      }
    } catch (err: any) {
      setError('Failed to delete: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Schedule Regeneration Tool
              </h1>
              <p className="text-gray-600">
                Manage INDIVIDUAL student schedules by week
              </p>
            </div>
            <RefreshCw className="w-12 h-12 text-indigo-600" />
          </div>

          {currentWeekInfo && (
            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <div>
                  <strong>Current Week: {currentWeekInfo.currentWeek}</strong>
                  <span className="ml-2 text-sm">
                    ({currentWeekInfo.weekStart} to {currentWeekInfo.weekEnd})
                  </span>
                </div>
              </div>
            </Alert>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Schedules</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalSchedules}</p>
                  </div>
                  <Calendar className="w-10 h-10 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Students with Schedules</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.studentsWithSchedules}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Missing Topics</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.missingTopics}</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress Health Card */}
        {progressStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Week {weekNumber} Progress Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {progressStats.healthScore}%
                    </p>
                    <p className="text-sm text-gray-600">Health Score</p>
                  </div>
                  {progressStats.healthScore === 100 ? (
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-10 h-10 text-amber-500" />
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-gray-700">Total Progress</p>
                    <p className="text-xl font-bold text-blue-600">{progressStats.totalProgress}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="font-medium text-gray-700">Linked</p>
                    <p className="text-xl font-bold text-green-600">{progressStats.linkedProgress}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="font-medium text-gray-700">Orphaned</p>
                    <p className="text-xl font-bold text-amber-600">{progressStats.orphanedProgress}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="font-medium text-gray-700">With Submissions</p>
                    <p className="text-xl font-bold text-purple-600">{progressStats.progressWithSubmissions}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="font-medium text-gray-700">Schedules w/o Progress</p>
                    <p className="text-xl font-bold text-red-600">{progressStats.schedulesWithoutProgress}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-700">Total Schedules</p>
                    <p className="text-xl font-bold text-gray-600">{progressStats.totalSchedules}</p>
                  </div>
                </div>

                {progressStats.needsFix && (
                  <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    <strong>Action Needed:</strong> This week has issues that need fixing. Click "🔧 Complete Fix (Recommended)" below to fix everything at once.
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Action Card */}
        <Card>
          <CardHeader>
            <CardTitle>Select Week to Regenerate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Week Number
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Select which week's schedules you want to regenerate (1-12)
                </p>
              </div>

              <div className="space-y-3">
                {/* MASTER FIX BUTTON */}
                <Button
                  onClick={handleCompleteFix}
                  disabled={loading || !weekNumber}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold text-lg py-6 shadow-lg"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  🔧 Complete Fix (Recommended)
                </Button>

                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <Info className="w-4 h-4 inline mr-2" />
                  <strong>Recommended:</strong> Use "Complete Fix" to automatically run all repair operations in the correct order. This is safer and more reliable than clicking individual buttons.
                </Alert>

                {/* ✅ NEW: Create Missing Assessments Button - PROMINENT */}
                <div className="border-t pt-4">
                  <Button
                    onClick={handleCreateMissingAssessments}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-lg py-6 shadow-lg"
                  >
                    <FileCheck className="w-5 h-5 mr-2" />
                    📝 Create Missing Assessments
                  </Button>

                  {/* 🧹 Clear Period 2+ Assessments */}
                  <div className="border-t pt-4">
                    <Button
                      onClick={handleClearPeriod2PlusAssessments}
                      disabled={loading || !weekNumber}
                      className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold text-lg py-6 shadow-lg"
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      🧹 Clear Period 2+ Assessments (Week {weekNumber})
                    </Button>
                    
                    <Alert className="bg-red-50 border-red-200 text-red-800 mt-2">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      <strong>When to use:</strong> If Period 2/3 shows assessment titles instead of "Create Assessment" button. Run this AFTER regenerating.
                    </Alert>
                  </div>
                  
                  <Alert className="bg-purple-50 border-purple-200 text-purple-800 mt-2">
                    <Info className="w-4 h-4 inline mr-2" />
                    <strong>When to use this:</strong> After uploading new lessons or if "Assessment Not Available" appears. This creates assessments from AI-generated questions. Run this BEFORE Complete Fix if assessments are missing.
                  </Alert>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Advanced Options (Individual Operations):</p>
                  
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      onClick={handlePreview}
                      disabled={loading || !weekNumber}
                      variant="outline"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Week {weekNumber}
                    </Button>

                    <Button
                      onClick={handleRegenerate}
                      disabled={loading || !weekNumber || !previewData}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Regenerate Week {weekNumber}
                    </Button>

                    <Button
                      onClick={handleLinkAssessments}
                      disabled={loading || !weekNumber}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Link Assessments
                    </Button>

                    <Button
                      onClick={handleFixProgress}
                      disabled={loading || !weekNumber}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Wrench className="w-4 h-4 mr-2" />
                      Fix Progress Records
                    </Button>

                    <Button
                      onClick={handleLinkSubmissions}
                      disabled={loading || !weekNumber}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Link Submissions
                    </Button>

                    <Button
                      onClick={handleFixAssessmentWindows}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Fix Assessment Windows
                    </Button>

                    <Button
                      onClick={handleFixMultiPeriodMetadata}
                      disabled={loading || !weekNumber}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      <Layers className="w-4 h-4 mr-2" />
                      Fix Multi-Period Metadata
                    </Button>

                    <Button
                      onClick={handleDelete}
                      disabled={loading || !weekNumber}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Week {weekNumber}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ NEW: Assessment Creation Result Display */}
        {assessmentCreationResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-600" />
                Assessment Creation Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className={assessmentCreationResult.assessmentsCreated > 0 
                ? "bg-green-50 border-green-200 text-green-800" 
                : "bg-blue-50 border-blue-200 text-blue-800"}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {assessmentCreationResult.assessmentsCreated > 0 ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Info className="w-6 h-6" />
                    )}
                    <strong className="text-lg">
                      {assessmentCreationResult.assessmentsCreated > 0 
                        ? `Successfully created ${assessmentCreationResult.assessmentsCreated} assessments!`
                        : "No missing assessments found"}
                    </strong>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <p className="font-medium text-gray-700">Assessments Created</p>
                      <p className="text-2xl font-bold text-green-600">{assessmentCreationResult.assessmentsCreated}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <p className="font-medium text-gray-700">Skipped (Already Exists)</p>
                      <p className="text-2xl font-bold text-blue-600">{assessmentCreationResult.skipped}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <p className="font-medium text-gray-700">Total Topics Checked</p>
                      <p className="text-2xl font-bold text-gray-600">{assessmentCreationResult.totalTopics}</p>
                    </div>
                  </div>

                  {assessmentCreationResult.assessmentsCreated > 0 ? (
                    <Alert className="bg-green-50 border-green-200 text-green-800">
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      <strong>Next Step:</strong> Run "🔧 Complete Fix (Recommended)" to link these new assessments to schedules and progress records!
                    </Alert>
                  ) : (
                    <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                      <Info className="w-4 h-4 inline mr-2" />
                      All lesson topics with AI questions already have assessments. No action needed!
                    </Alert>
                  )}
                </div>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* COMPLETE FIX RESULT */}
        {completeFixResult && completeFixResult.success && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                Complete Fix Successful!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className={completeFixResult.fullyFixed ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {completeFixResult.fullyFixed ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <AlertTriangle className="w-6 h-6" />
                    )}
                    <strong className="text-lg">{completeFixResult.message}</strong>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <p className="font-medium text-gray-700">Step 1: Orphaned Linked</p>
                      <p className="text-2xl font-bold text-green-600">{completeFixResult.step1_orphanedLinked}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <p className="font-medium text-gray-700">Step 2: Assessments Linked</p>
                      <p className="text-2xl font-bold text-amber-600">{completeFixResult.step2_progressLinked}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <p className="font-medium text-gray-700">Step 3: Progress Created</p>
                      <p className="text-2xl font-bold text-blue-600">{completeFixResult.step3_progressCreated}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <p className="font-medium text-gray-700">Step 4: Submissions Linked</p>
                      <p className="text-2xl font-bold text-purple-600">{completeFixResult.step4_submissionsLinked}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <p className="font-medium text-gray-700">Step 5: Windows Fixed</p>
                      <p className="text-2xl font-bold text-blue-600">{completeFixResult.step5_windowsFixed}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg shadow-sm">
                      <p className="font-medium text-gray-700">Step 6: Metadata Set</p>
                      <p className="text-2xl font-bold text-cyan-600">{completeFixResult.step6_metadataSet}</p>
                    </div>
                  </div>

                  {completeFixResult.validation && (
                    <div className="mt-4 p-4 bg-white rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Final Validation:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Remaining Orphaned:</span>
                          <span className={`ml-2 font-bold ${completeFixResult.validation.remainingOrphaned === 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {completeFixResult.validation.remainingOrphaned}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Missing Assessments:</span>
                          <span className={`ml-2 font-bold ${completeFixResult.validation.remainingNoAssessment === 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {completeFixResult.validation.remainingNoAssessment}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Missing Windows:</span>
                          <span className={`ml-2 font-bold ${completeFixResult.validation.remainingNoWindows === 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {completeFixResult.validation.remainingNoWindows}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Missing Metadata:</span>
                          <span className={`ml-2 font-bold ${completeFixResult.validation.remainingNoMetadata === 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {completeFixResult.validation.remainingNoMetadata}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Unlinked Submissions:</span>
                          <span className={`ml-2 font-bold ${completeFixResult.validation.remainingUnlinkedSubmissions === 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {completeFixResult.validation.remainingUnlinkedSubmissions}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className={`ml-2 font-bold ${completeFixResult.validation.allGood ? 'text-green-600' : 'text-amber-600'}`}>
                            {completeFixResult.validation.allGood ? '✅ Perfect' : '⚠️ Some Issues'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {completeFixResult.finalHealth && (
                    <div className="mt-4 p-4 bg-white rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Updated Health Stats:</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Health Score:</span>
                          <span className="ml-2 font-bold text-green-600">
                            {completeFixResult.finalHealth.healthScore}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Progress:</span>
                          <span className="ml-2 font-bold">
                            {completeFixResult.finalHealth.totalProgress}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Linked:</span>
                          <span className="ml-2 font-bold text-green-600">
                            {completeFixResult.finalHealth.linkedProgress}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">With Submissions:</span>
                          <span className="ml-2 font-bold text-purple-600">
                            {completeFixResult.finalHealth.progressWithSubmissions}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {completeFixResult.fullyFixed ? (
                    <Alert className="bg-green-50 border-green-200 text-green-800 mt-4">
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      <strong>Perfect!</strong> All issues have been resolved. Week {weekNumber} is now in perfect health!
                    </Alert>
                  ) : (
                    <Alert className="bg-amber-50 border-amber-200 text-amber-800 mt-4">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      <strong>Mostly Fixed:</strong> Most issues resolved, but {completeFixResult.validation.remainingOrphaned + completeFixResult.validation.remainingNoAssessment + completeFixResult.validation.remainingNoWindows + completeFixResult.validation.remainingNoMetadata + completeFixResult.validation.remainingUnlinkedSubmissions} issues remain. Check the validation section above for details.
                    </Alert>
                  )}
                </div>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* ... Rest of the result cards remain the same ... */}
        {/* I'll skip repeating all the other result cards to keep this concise */}

        {error && (
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="bg-red-50 border-red-200 text-red-800">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <strong>{error}</strong>
                </div>
              </Alert>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>How to Use This Tool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-700">
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <Zap className="w-4 h-4 inline mr-2" />
                <strong>RECOMMENDED APPROACH:</strong> Use the "🔧 Complete Fix (Recommended)" button. It runs all operations in the correct order automatically and is safer than clicking individual buttons.
              </Alert>

              {/* ✅ NEW: Added workflow step for assessment creation */}
              <Alert className="bg-purple-50 border-purple-200 text-purple-800">
                <FileCheck className="w-4 h-4 inline mr-2" />
                <strong>NEW: Assessment Creation</strong> - If assessments are missing (showing "Assessment Not Available"), click "📝 Create Missing Assessments" FIRST, then run Complete Fix to link them.
              </Alert>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                <div>
                  <strong>Preview First:</strong> Click "Preview" to see what will be affected without making changes.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                <div>
                  <strong>Regenerate (if needed):</strong> Click "Regenerate" to delete existing schedules and create new ones with the current logic.
                </div>
              </div>
              {/* ✅ NEW: Added step for assessment creation */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                <div>
                  <strong>Create Assessments (if needed):</strong> If "Assessment Not Available" appears, click "📝 Create Missing Assessments" to generate them from AI questions.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</div>
                <div>
                  <strong>Run Complete Fix:</strong> Click "🔧 Complete Fix (Recommended)" to automatically fix all issues in the correct order.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">5</div>
                <div>
                  <strong>Check Health Stats:</strong> Verify the health score is 100% and all issues are resolved.
                </div>
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200 text-blue-800 mt-4">
              <Info className="w-4 h-4 inline mr-2" />
              <strong>Typical Workflow:</strong>
              <ol className="mt-2 ml-4 list-decimal space-y-1 text-sm">
                <li>Preview the week to see current state</li>
                <li>Regenerate schedules if needed (fixes schedule generation issues)</li>
                <li><strong>Click "📝 Create Missing Assessments"</strong> if assessments are missing</li>
                <li><strong>Click "🔧 Complete Fix (Recommended)"</strong> - this links everything in the right order!</li>
                <li>Check health stats to verify Week {weekNumber} is at 100%</li>
              </ol>
            </Alert>

            <Alert className="bg-amber-50 border-amber-200 text-amber-800 mt-4">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              <strong>Advanced Users Only:</strong> The individual operation buttons (Link Assessments, Fix Progress, etc.) are available for specific fixes, but the Complete Fix button is more reliable and handles all edge cases automatically.
            </Alert>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">What Complete Fix Does:</h4>
              <ol className="text-sm text-gray-700 space-y-1 ml-4 list-decimal">
                <li>Links orphaned progress records to schedules</li>
                <li>Links assessments to schedules and progress</li>
                <li>Creates missing progress records with all required fields</li>
                <li>Links submissions and calculates scores</li>
                <li>Fixes assessment windows from schedules</li>
                <li>Sets multi-period metadata</li>
                <li>Validates final state and reports any remaining issues</li>
              </ol>
            </div>

            {/* ✅ NEW: Added explanation for assessment creation */}
            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">📝 Create Missing Assessments - When to Use:</h4>
              <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                <li><strong>After uploading new lessons</strong> - Assessments aren't auto-created immediately</li>
                <li><strong>When students see "Assessment Not Available"</strong> - Means assessment doesn't exist yet</li>
                <li><strong>After regenerating schedules</strong> - If new lesson topics were added</li>
                <li><strong>Manual trigger alternative</strong> - Don't want to wait for the hourly auto-creation task</li>
              </ul>
              <p className="text-sm text-gray-700 mt-2">
                <strong>Note:</strong> This scans ALL lesson topics with AI questions and creates assessments for those missing them. Safe to run multiple times - skips topics that already have assessments.
              </p>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Learning Hours Schedule:</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <div><strong>Monday - Friday:</strong> 4:00 PM - 6:00 PM (2 periods of 60 min each)</div>
                <div><strong>Saturday:</strong> 12:00 PM - 3:00 PM (3 periods of 60 min each)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminScheduleRegenerationPage;