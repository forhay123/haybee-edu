// frontend/src/features/individual/index.ts

/**
 * Central export file for Individual Student features
 */

// API
export * from "./api/individualApi";

// Components
export { default as TimetableUpload } from "./components/TimetableUpload";
export { default as SchemeUpload } from "./components/SchemeUpload";
export { default as IndividualSchedule } from "./components/IndividualSchedule";
export { default as IndividualLessonList } from "./components/IndividualLessonList";
export { ProcessingStatusIndicator } from "./components/ProcessingStatusIndicator";
export { default as ProcessingDetailsModal } from "./components/ProcessingDetailsModal";


// ============================================================
// ADMIN COMPONENTS
// ============================================================
export { default as TimetableListTable } from "./components/admin/TimetableListTable";
export { default as BulkActionsToolbar } from "./components/admin/BulkActionsToolbar";
export { default as SystemStatsCards } from "./components/admin/SystemStatsCards";
export { default as SubjectMappingEditor } from "./components/admin/SubjectMappingEditor";
export { default as TimetableDetailView } from "./components/admin/TimetableDetailView";
export { BulkAssignTopicModal } from "./components/admin/BulkAssignTopicModal";



export { default as StudentTimetableCard } from "./components/teacher/StudentTimetableCard";
export { default as TimetableReadOnlyView } from "./components/teacher/TimetableReadOnlyView";

// Hooks
export * from "./hooks/useFileUpload";
export * from "./hooks/useIndividualSchedule";
export * from "./hooks/useIndividualLessons";

// Types
export * from "./types/individualTypes";



// ============================================================
// ADMIN HOOKS
// ============================================================
export * from "./hooks/admin/useAdminTimetables";
export * from "./hooks/admin/useSubjectMapping";

// ============================================================
// TEACHER HOOKS
// ============================================================
export * from "./hooks/teacher/useTeacherStudents";

// Pages
export { default as IndividualDashboard } from "./pages/student/IndividualDashboard";
export { default as IndividualUploadsPage } from "./pages/student/IndividualUploadsPage";
export { default as IndividualSchedulePage } from "./pages/student/IndividualSchedulePage";
export { default as IndividualLessonsPage } from "./pages/student/IndividualLessonsPage";
export { default as WeeklySchedulePage } from "./pages/student/WeeklySchedulePage";
export { default as ProgressHistoryPage } from "./pages/student/ProgressHistoryPage";
export { default as MultiAssessmentDetailPage } from "./pages/student/MultiAssessmentDetailPage";
export { default as IncompleteAssessmentsPage } from "./pages/student/IncompleteAssessmentsPage";
export { default as AssessmentStartPage } from "./pages/student/AssessmentStartPage";
export { default as AssessmentResultsPage } from "./pages/student/AssessmentResultsPage";
export { default as LessonContentView  } from "./pages/student/LessonContentView";


// ============================================================
// ADMIN PAGES (to be implemented)
// ============================================================
export { default as AdminIndividualTimetablesPage } from "./pages/admin/AdminIndividualTimetablesPage";
export { default as AdminIndividualTimetableDetailPage } from "./pages/admin/AdminIndividualTimetableDetailPage";
export { default as AdminStudentSchedulePage } from "./pages/admin/AdminStudentSchedulePage";
export { default as AdminStudentScheduleListPage } from "./pages/admin/AdminStudentScheduleListPage";
export { default as AdminTeacherSchedulesPage } from "./pages/admin/AdminTeacherSchedulesPage";
export { default as AdminViewTeacherSchedulePage } from "./pages/admin/AdminViewTeacherSchedulePage";
export { default as AdminPendingAssignmentsPage } from "./pages/admin/AdminPendingAssignmentsPage";
export { default as AdminScheduleRegenerationPage } from "./pages/admin/AdminScheduleRegenerationPage";

// ============================================================
// TEACHER PAGES (to be implemented)
// ============================================================
export { default as TeacherIndividualStudentsPage } from "./pages/teacher/TeacherIndividualStudentsPage";
export { default as TeacherSchedulePage } from "./pages/teacher/TeacherSchedulePage";
export { default as TeacherIndividualTimetableViewPage } from "./pages/teacher/TeacherIndividualTimetableViewPage";
export { default as TeacherPendingAssignmentsPage } from "./pages/teacher/TeacherPendingAssignmentsPage";