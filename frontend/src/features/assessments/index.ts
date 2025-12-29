// src/features/assessments/index.ts

// ================================
// 🧩 Core Types
// ================================
export * from './types/assessmentTypes';
export * from './types/customAssessmentTypes';

// ================================
// ⚙️ API Services
// ================================
export { assessmentsApi } from './api/assessmentsApi';
export { lessonAssessmentsApi } from './api/lessonAssessmentsApi';
export { teacherQuestionsApi } from './api/teacherQuestionsApi';
export { gradingApi } from './api/gradingApi';
export { adminAssessmentsApi } from './api/adminAssessmentsApi';

// ⭐ NEW: Custom Period Assessment APIs
export * from './api/customAssessmentsApi';
export * from './api/multiPeriodApi';

// ================================
// 🔁 React Query Hooks
// ================================
// From useAssessments.ts
export {
  useAssessmentsBySubject,
  useAssessment,
  useCreateAssessment,
  useAssessmentSubmissions
} from './hooks/useAssessments';

// From useLessonAssessments.ts
export {
  useAssessmentByLesson,
  useCheckSubmission,
  useAssessmentResults,
  useStudentAssessments,
  useAssessmentStatistics,
  useSubmitLessonAssessment,
  useCurrentStudentProfileId
} from './hooks/useLessonAssessments';

// From useTeacherQuestions.ts
export {
  useMyQuestions,
  useQuestionsBySubject,
  useQuestionsByLesson,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion
} from './hooks/useTeacherQuestions';

// Grading Hooks
export {
  usePendingSubmissions,
  usePendingSubmissionsByAssessment,
  useSubmissionForGrading,
  useGradeAnswer,
  useGradeSubmission
} from './hooks/useGrading';

// Admin Assessment Hooks
export {
  // Core admin hooks
  useAdminOverviewStats,
  useAdminAllSubmissions,
  useAdminPendingGrading,
  useAdminAllAssessments,
  useAdminStudentPerformance,
  useAdminSubjectBreakdown,
  useAdminSystemOverview,
  useAdminDashboardSummary,
  
  // Additional performance hooks
  useAdminClassPerformance,
  useAdminTeacherAnalytics,
  
  // Grading statistics hooks
  useAdminGradingStats,
  usePendingGradingCount,
  useRecentGradingActivity,
  useGradingNotifications,
  
  // Combined dashboard hooks
  useAdminDashboardData,
  useAdminAssessmentOverview,
  
  // Manual refresh utilities
  useRefreshAdminData,
  
  // Legacy aliases (deprecated but kept for backwards compatibility)
  useAdminStudentsOverview,
  useAdminSubjectsOverview,
  
  // Query keys export (useful for manual cache manipulation)
  adminAssessmentKeys
} from './hooks/useAdminAssessments';

// ⭐ NEW: Custom Period Assessment Hooks
export { usePendingCustomAssessments } from './hooks/usePendingCustomAssessments';
export { useCustomAssessmentBuilder } from './hooks/useCustomAssessmentBuilder';
export { usePeriodDependency } from './hooks/usePeriodDependency';
export { useMultiPeriodProgress } from './hooks/useMultiPeriodProgress';
export { useSubmissionAnalysis } from './hooks/useSubmissionAnalysis';

// ================================
// 🧰 Utility Exports
// ================================
export * from './utils/exportUtils';

// ⭐ NEW: Custom Assessment Utility Functions
export {
  isCustomAssessment,
  canAccessCustomAssessment,
  filterAssessmentsForStudent,
  groupAssessmentsByPeriod,
  getCustomAssessmentsOnly,
  getRegularAssessmentsOnly
} from './api/assessmentsApi';

export {
  calculateUrgencyLevel,
  formatPendingAssessment,
  getUrgencyColor
} from './api/customAssessmentsApi';

export {
  getPeriodStatusDisplay,
  getDaysUntilScheduled,
  formatPeriodLabel,
  isPeriodActionable,
  getNextActionText,
  calculateOverallProgress,
  groupPeriodsByStatus,
  sortPeriodsBySequence
} from './api/multiPeriodApi';

// ================================
// 📄 Page Exports
// ================================
export { default as StudentLessonAssessmentPage } from './pages/StudentLessonAssessmentPage';
export { default as LessonAssessmentResultsPage } from './pages/LessonAssessmentResultsPage';
export { default as TeacherLessonAssessmentPage } from './pages/TeacherLessonAssessmentPage';
export { StudentAssessmentPage } from './pages/StudentAssessmentPage';
export { StudentAssessmentListPage } from './pages/StudentAssessmentListPage';
export { default as StudentSubmissionResultsPage } from './pages/StudentSubmissionResultsPage';
export { default as StudentLessonAssessmentResults } from './pages/StudentLessonAssessmentResults';
export { TeacherAssessmentsPage } from './pages/TeacherAssessmentsPage';
export { TeacherAllAssessmentsPage } from './pages/TeacherAllAssessmentsPage';
export { CreateAssessmentPage } from './pages/CreateAssessmentPage';
export { QuestionBankPage } from './pages/QuestionBankPage';
export { default as PendingSubmissionsPage } from './pages/PendingSubmissionsPage';
export { default as TeacherGradingPage } from './pages/TeacherGradingPage';
export { default as StudentAssessmentResultsPage } from './pages/StudentAssessmentResultsPage';
export { TeacherAssessmentDetailPage } from './pages/TeacherAssessmentDetailPage';
export { EditAssessmentPage } from './pages/EditAssessmentPage';
export { AssessmentResultsPage } from './pages/AssessmentResultsPage';
export { AssessmentDetailsPage } from './pages/AssessmentDetailsPage';

// Admin Pages
export { default as AdminAssessmentDashboard } from './pages/AdminAssessmentDashboard';
export { default as AdminPendingGradingPage } from './pages/AdminPendingGradingPage';
export { default as AdminSubjectsOverviewPage } from './pages/AdminSubjectsOverviewPage';
export { default as AdminStudentsOverviewPage } from './pages/AdminStudentsOverviewPage';
export { default as AdminStudentPerformancePage } from './pages/AdminStudentPerformancePage';
export { default as AdminAssessmentCreationPage } from './pages/AdminAssessmentCreationPage';
export { AdminAssessmentAutomationPage } from './pages/AdminAssessmentAutomationPage';

// ⭐ TODO: Add these pages when created
// export { TeacherPendingCustomAssessmentsPage } from './pages/TeacherPendingCustomAssessmentsPage';
// export { TeacherCustomAssessmentBuilderPage } from './pages/TeacherCustomAssessmentBuilderPage';
// export { TeacherMultiPeriodOverviewPage } from './pages/TeacherMultiPeriodOverviewPage';
// export { StudentMultiPeriodProgressPage } from './pages/StudentMultiPeriodProgressPage';
// export { AdminCustomAssessmentDashboard } from './pages/AdminCustomAssessmentDashboard';

// ================================
// 🧱 Reusable Components
// ================================
export { AssessmentCard } from './components/AssessmentCard';
export { AssessmentList } from './components/AssessmentList';
export { QuestionCard } from './components/QuestionCard';
export { QuestionForm } from './components/QuestionForm';
export { SubmissionResults } from './components/SubmissionResults';
export { TeacherQuestionBank } from './components/TeacherQuestionBank';
export { default as CreateLessonAssessmentForm } from './components/CreateLessonAssessmentForm';

// ⭐ TODO: Add these components when created
// export { PendingAssessmentCard } from './components/PendingAssessmentCard';
// export { CustomAssessmentBuilder } from './components/CustomAssessmentBuilder';
// export { PeriodProgressCard } from './components/PeriodProgressCard';
// export { SubmissionAnalysisView } from './components/SubmissionAnalysisView';
// export { MultiPeriodTimeline } from './components/MultiPeriodTimeline';
// export { PeriodDependencyDisplay } from './components/PeriodDependencyDisplay';

// Assessment Automation
export { adminAssessmentAutomationApi } from './api/adminAssessmentAutomationApi';
export { useAssessmentAutomation } from './hooks/useAssessmentAutomation';
export { AssessmentAutomationWidget } from './components/AssessmentAutomationWidget';

export type {
  MissingAssessmentTopic,
  MissingAssessmentsStats,
  CreatedAssessmentDetail,
  CreateAssessmentResponse,
  CreateAllMissingResponse,
} from './api/adminAssessmentAutomationApi';
