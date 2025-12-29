import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { store } from "./store/store";

// 🌐 Pages
import HomePage from "./features/home/HomePage";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import DashboardPage from "./features/dashboard/DashboardPage";

// 🧩 Layouts & Routing
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

// 🏫 Departments
import AdminDepartmentsPage from "./features/departments/pages/AdminDepartmentsPage";
import TeacherDepartmentsPage from "./features/departments/pages/TeacherDepartmentsPage";
import StudentDepartmentsPage from "./features/departments/pages/StudentDepartmentsPage";
import ParentDepartmentsPage from "./features/departments/pages/ParentDepartmentsPage";

// 🎓 Classes
import AdminClassesPage from "./features/classes/pages/AdminClassesPage";
import TeacherClassesPage from "./features/classes/pages/TeacherClassesPage";
import StudentClassesPage from "./features/classes/pages/StudentClassesPage";
import ParentClassesPage from "./features/classes/pages/ParentClassesPage";

// 📘 Subjects
import AdminSubjectsPage from "./features/subjects/pages/AdminSubjectsPage";
import TeacherSubjectsPage from "./features/subjects/pages/TeacherSubjectsPage";
import StudentSubjectsPage from "./features/subjects/pages/StudentSubjectsPage";
import ParentSubjectsPage from "./features/subjects/pages/ParentSubjectsPage";

// 🗂️ Lesson Topics
import AdminLessonTopicsPage from "./features/lessons/pages/AdminLessonTopicsPage";
import TeacherLessonTopicsPage from "./features/lessons/pages/TeacherLessonTopicsPage";
import StudentLessonTopicsPage from "./features/lessons/pages/StudentLessonTopicsPage";
import LessonAIQuestionsPage from "./features/lessons/pages/LessonAIQuestionsPage";
import SubjectLessonsPage from "./features/lessons/pages/SubjectLessonsPage";
import LessonQuestionsPage from "./features/lessons/pages/LessonQuestionsPage";
import StudentLessonTopicDetailPage from "./features/lessons/pages/StudentLessonTopicDetailPage";

// 👥 Users
import AdminUsersPage from "./features/users/pages/AdminUsersPage";
import TeacherUsersPage from "./features/users/pages/TeacherUsersPage";
import StudentUserPage from "./features/users/pages/StudentUserPage";
import ParentUsersPage from "./features/users/pages/ParentUsersPage";

// 🧾 Enrollments
import AdminEnrollmentsPage from "./features/enrollments/pages/AdminEnrollmentsPage";
import TeacherEnrollmentsPage from "./features/enrollments/pages/TeacherEnrollmentsPage";
import StudentEnrollmentPage from "./features/enrollments/pages/StudentEnrollmentPage";
import ParentEnrollmentsPage from "./features/enrollments/pages/ParentEnrollmentsPage";

// 🧑‍🎓 Student Profiles
import AdminStudentProfilesPage from "./features/studentProfiles/pages/AdminStudentProfilesPage";
import TeacherStudentProfilesPage from "./features/studentProfiles/pages/TeacherStudentProfilesPage";
import StudentProfilePage from "./features/studentProfiles/pages/StudentProfilePage";
import ParentStudentProfilesPage from "./features/studentProfiles/pages/ParentStudentProfilesPage";

// 👨‍🏫 Teacher Profiles
import AdminTeacherProfilesPage from "./features/teacherProfiles/pages/AdminTeacherProfilesPage";
import TeacherProfileData from "./features/teacherProfiles/pages/TeacherProfileData";

// 🕒 Sessions
import AdminSessionsPage from "./features/session/pages/AdminSessionsPage";
import TeacherSessionsPage from "./features/session/pages/TeacherSessionsPage";

// 📅 Terms
import TermsAdminPage  from "./features/terms/pages/TermsAdminPage";
import TeacherTermsPage from "./features/terms/pages/TeacherTermsPage";

// 👨‍🏫 Teacher Features
import TeacherStudentsPage from "./features/teacher/pages/TeacherStudentsPage";

// 📊 Progress Features
import { DailyPlannerPage, ComprehensiveLessonsPage } from "./features/progress";

// 📋 Schedule Management - ✅ NEW IMPORTS
import { ScheduleManagementPage } from "./features/progress/pages/ScheduleManagementPage";
import { IncompleteLessonsPage } from "./features/progress/pages/IncompleteLessonsPage";


// 🧠 Assessments (NEW FEATURE)
import {
  StudentSubmissionResultsPage, 
  StudentAssessmentPage,
  StudentLessonAssessmentResults,
  TeacherAssessmentsPage,
  TeacherAllAssessmentsPage,
  CreateAssessmentPage,
  QuestionBankPage,
  StudentLessonAssessmentPage,
  LessonAssessmentResultsPage,
  TeacherLessonAssessmentPage,
  PendingSubmissionsPage,
  TeacherGradingPage,
  StudentAssessmentResultsPage,
  TeacherAssessmentDetailPage, 
  EditAssessmentPage,
  StudentAssessmentListPage,
  AssessmentDetailsPage,
  AdminAssessmentCreationPage,
} from "./features/assessments";

// 🧪 Custom Assessment Builder (NEW)
import CustomAssessmentBuilderPage from "./features/assessments/pages/CustomAssessmentBuilderPage";
import StudentAssessmentTakePage  from "./features/assessments/pages/StudentAssessmentTakePage";



// 📈 Multi-Period Progress (NEW)
import TeacherMultiPeriodDashboardPage from "./features/individual/pages/teacher/TeacherMultiPeriodDashboardPage";
import StudentSubjectPeriodsTimelinePage from "./features/individual/pages/teacher/StudentSubjectPeriodsTimelinePage";
import TeacherPendingCustomAssessmentsPage from "./features/individual/pages/teacher/TeacherPendingCustomAssessmentsPage";
import StudentMyPeriodsPage from "./features/individual/pages/student/StudentMyPeriodsPage";
import AdminMultiPeriodSystemPage from "./features/individual/pages/admin/AdminMultiPeriodSystemPage";


import ScheduleGenerationPanel from "./features/progress/components/ScheduleGenerationPanel";

// 🧠 Admin Assessment & Analytics Pages (NEW)
import AdminPendingGradingPage from "./features/assessments/pages/AdminPendingGradingPage";
import AdminSubjectsOverviewPage from "./features/assessments/pages/AdminSubjectsOverviewPage";
import AdminStudentsOverviewPage from "./features/assessments/pages/AdminStudentsOverviewPage";
import AdminAssessmentDashboard from "./features/assessments/pages/AdminAssessmentDashboard";
import AdminStudentPerformancePage from "./features/assessments/pages/AdminStudentPerformancePage";
import AdminSubjectBreakdownPage from "./features/assessments/pages/AdminSubjectBreakdownPage";
import { AdminAssessmentAutomationPage } from '@/features/assessments/pages/AdminAssessmentAutomationPage';
import { AssessmentDiagnosticPage } from '@/features/assessments/pages/AssessmentDiagnosticPage';

import { NotificationPage } from "./features/notifications/pages/NotificationPage";
import { NotificationDetailPage } from "./features/notifications/pages/NotificationDetailPage";

import { ChatPage } from "./features/chat/components/ChatPage";

import { ChatTestComponent } from './features/chat/components/ChatTestComponent';


import { AdminAnnouncementsPage, AnnouncementsViewPage } from './features/announcements';
// 🎥 Videos (NEW)
import { VideoLibraryPage, VideoDetailsPage, UploadVideoPage, VideoAnalyticsPage, 
  TeacherAnalyticsOverviewPage, AdminAnalyticsDashboard, TeacherVideoDetailPage,
  VideoTranscriptPage, StudentVideoDetailPage, StudentVideoTranscriptPage } from './features/videos';


// 📺 Live Sessions (NEW)
import { LiveClassesPage, SessionDetailsPage, CreateSessionPage } from './features/live';
import { EditSessionPage } from '@/features/live/pages/EditSessionPage';

// 🎯 Individual Student Features
import { 
  IndividualDashboard, 
  IndividualUploadsPage,
  IndividualSchedulePage,
  IndividualLessonsPage, 
  WeeklySchedulePage, 
  ProgressHistoryPage,
  MultiAssessmentDetailPage,
  IncompleteAssessmentsPage,
  AssessmentStartPage,
  AssessmentResultsPage,
  LessonContentView,
  AdminIndividualTimetablesPage,
  AdminIndividualTimetableDetailPage,
  AdminStudentSchedulePage,
  AdminTeacherSchedulesPage,
  AdminStudentScheduleListPage,
  AdminViewTeacherSchedulePage,
  AdminPendingAssignmentsPage,
  AdminScheduleRegenerationPage,
  TeacherIndividualStudentsPage,
  TeacherIndividualTimetableViewPage,
  TeacherSchedulePage,
  TeacherPendingAssignmentsPage,
} from './features/individual';

import { StudentListPage } from '@/features/students/pages/StudentListPage';


// OAuth Callback
import OAuthCallbackPage from './pages/OAuthCallbackPage';



// ✅ Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    },
    mutations: {
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {/* ✅ Toaster for Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#363636",
                color: "#fff",
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />

          <Routes>
            {/* 🌍 Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />


            <Route
              path="/notifications"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <NotificationPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/notifications/:id"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <NotificationDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🧭 Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <DashboardPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🏫 Departments */}
            <Route
              path="/departments/admin"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminDepartmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments/teacher"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherDepartmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments/student"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentDepartmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/departments/parent"
              element={
                <ProtectedRoute roles={["PARENT"]}>
                  <AppLayout>
                    <ParentDepartmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🎓 Classes */}
            <Route
              path="/classes/admin"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminClassesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/classes/teacher"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherClassesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/classes/student"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentClassesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/classes/:id/students"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherStudentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/classes/parent"
              element={
                <ProtectedRoute roles={["PARENT"]}>
                  <AppLayout>
                    <ParentClassesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 📘 Subjects */}
            <Route
              path="/subjects/admin"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminSubjectsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects/teacher"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherSubjectsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects/student"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentSubjectsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects/parent"
              element={
                <ProtectedRoute roles={["PARENT"]}>
                  <AppLayout>
                    <ParentSubjectsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 📚 Subject Lessons */}
            <Route
              path="/subjects/:subjectId/lessons"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <SubjectLessonsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/subjects/:subjectId/lesson-topics"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <StudentLessonTopicsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ❓ Lesson Questions */}
            <Route
              path="/subjects/:subjectId/lessons/:lessonId/questions"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <LessonQuestionsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🗂️ Lesson AI Topics */}
            <Route
              path="/lesson-topics/admin"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminLessonTopicsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lesson-topics/teacher"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherLessonTopicsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lesson-topics/student"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentLessonTopicsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/subjects/:subjectId/lesson-topics/:lessonTopicId"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentLessonTopicDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🧠 Student Lesson Assessment - NEW */}
            <Route
              path="/subjects/:subjectId/lessons/:lessonTopicId/assessment"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentLessonAssessmentPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🤖 AI Questions for Lessons */}
            <Route
              path="/ai-questions"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT"]}>
                  <AppLayout>
                    <LessonAIQuestionsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 👥 Users */}
            <Route
              path="/users/admin"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminUsersPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/teacher"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherUsersPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/student"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentUserPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/parent"
              element={
                <ProtectedRoute roles={["PARENT"]}>
                  <AppLayout>
                    <ParentUsersPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🧾 Enrollments */}
            <Route
              path="/enrollments/admin"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminEnrollmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollments/teacher"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherEnrollmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollments/student"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentEnrollmentPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollments/parent"
              element={
                <ProtectedRoute roles={["PARENT"]}>
                  <AppLayout>
                    <ParentEnrollmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🧑‍🎓 Student Profiles */}
            <Route
              path="/student-profiles/admin"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminStudentProfilesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-profiles/teacher"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherStudentProfilesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-profiles/student"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentProfilePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student-profiles/parent"
              element={
                <ProtectedRoute roles={["PARENT"]}>
                  <AppLayout>
                    <ParentStudentProfilesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 👨‍🏫 Teacher Profiles */}
            <Route
              path="/teacher-profiles/admin"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminTeacherProfilesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/profile"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherProfileData />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 👨‍🏫 Teacher Students */}
            <Route
              path="/teacher/students"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherStudentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🕒 Sessions */}
            <Route
              path="/sessions/admin"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminSessionsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions/teacher"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherSessionsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 📅 Terms */}
            <Route
              path="/terms/admin"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <TermsAdminPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/terms/teacher"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherTermsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />



            {/* 📋 SCHEDULE MANAGEMENT */}
            <Route
              path="/schedules/admin"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <ScheduleManagementPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedules/teacher"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <ScheduleManagementPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            // 📊 PROGRESS TRACKING
            <Route
              path="/progress/daily"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <DailyPlannerPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/progress/history"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <ProgressHistoryPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            {/* ✅ NEW: Comprehensive Lessons Page - Student View */}
            <Route
              path="/progress/comprehensive"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <ComprehensiveLessonsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            {/* ⚠️ INCOMPLETE LESSONS - Student View */}
            <Route
              path="/progress/incomplete"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <IncompleteLessonsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            {/* ⚠️ INCOMPLETE LESSONS - Admin/Teacher Views */}
            <Route
              path="/admin/incomplete-lessons"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <IncompleteLessonsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ✅ NEW: COMPREHENSIVE LESSONS - Teacher View */}
            <Route
              path="/admin/comprehensive-lessons"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <ComprehensiveLessonsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ✅ NEW: COMPREHENSIVE LESSONS - Teacher View */}
            <Route
              path="/teacher/comprehensive-lessons"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <ComprehensiveLessonsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/teacher/incomplete-lessons"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <IncompleteLessonsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            

            {/* 👨‍🎓 COMPREHENSIVE LESSONS - Student-specific view by ID (for teachers/admins) */}
            <Route
              path="/students/:studentId/comprehensive-lessons"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER"]}>
                  <AppLayout>
                    <ComprehensiveLessonsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 👨‍🎓 INCOMPLETE LESSONS - Student-specific view by ID (for teachers/admins) */}
            <Route
              path="/students/:studentId/incomplete-lessons"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER"]}>
                  <AppLayout>
                    <IncompleteLessonsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🧠 Assessments */}
            <Route
              path="/assessments/student"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentAssessmentListPage />  {/* NEW COMPONENT */}
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            // ✅ CORRECTED ROUTES STRUCTURE

            // 1. List all assessments available to student
            <Route
              path="/assessments/student"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentAssessmentListPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            // 2. Take a specific assessment
            <Route
              path="/assessments/student/:assessmentId"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentAssessmentPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            // 3. View all student's assessment results (summary page)
            <Route
              path="/assessments/results"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentAssessmentResultsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            // 4. View specific submission result (detailed view)
            <Route
              path="/submissions/:submissionId/results"
              element={
                <ProtectedRoute roles={["STUDENT", "TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <StudentSubmissionResultsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            {/* 5. ✅ NEW: View Assessment Details (read-only view for students) */}
            <Route
              path="/assessments/:assessmentId/details"
              element={
                <ProtectedRoute roles={["STUDENT", "TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <AssessmentDetailsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/assessments/onit"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherAssessmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            <Route
              path="/teacher/assessments/:id"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER"]}>
                  <AppLayout>
                    <TeacherAssessmentDetailPage />  {/* NEW COMPONENT */}
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/assessments/edit/:id"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <EditAssessmentPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/teacher/subjects/:subjectId/assessments"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER"]}>
                  <AppLayout>
                    <TeacherAssessmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            <Route
              path="/assessments/teacher"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherAllAssessmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessments/create"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <CreateAssessmentPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/assessments/question-bank"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER"]}>
                  <AppLayout>
                    <QuestionBankPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />




            <Route
              path="/lesson-assessments/:submissionId/results"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <LessonAssessmentResultsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/submissions/:submissionId/results"
              element={
                <ProtectedRoute roles={["STUDENT", "TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <StudentLessonAssessmentResults />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🧠 Student Lesson Assessment Routes */}

            {/* ✅ Direct route (from dashboard widget) */}
            <Route
              path="/lesson-topics/:lessonTopicId/assessment"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentLessonAssessmentPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ✅ Route with subject (from subject page) */}
            <Route
              path="/subjects/:subjectId/lessons/:lessonTopicId/assessment"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentLessonAssessmentPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            
            <Route
              path="/admin/schedule-generation"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <ScheduleGenerationPanel />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🧠 Teacher - Create Lesson Assessment */}
            <Route
              path="/teacher/lessons/:lessonTopicId/create-assessment"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherLessonAssessmentPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🧠 Teacher - Manage Lesson Assessments */}
            <Route
              path="/teacher/assessments/lesson/:lessonTopicId"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherLessonAssessmentPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            {/* 🧠 Teacher Grading Routes - ✅ NEW */}
            <Route
              path="/teacher/pending-grading"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <PendingSubmissionsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/grade-submission/:submissionId"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherGradingPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/assessments/:assessmentId/pending-grading"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <PendingSubmissionsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            {/* 📊 Student Assessment Results List - ✅ NEW */}
            <Route
              path="/student/assessment-results"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentAssessmentResultsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ⭐ Admin Assessment Dashboard */}
            <Route
              path="/admin/assessments/dashboard"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminAssessmentDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ⭐ Admin Students Overview */}
            <Route
              path="/admin/assessments/students-overview"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminStudentsOverviewPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ⭐ Admin Subjects Overview */}
            <Route
              path="/admin/assessments/subjects-overview"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminSubjectsOverviewPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ⭐ Admin Student Performance Page */}
            <Route
              path="/admin/assessments/student/:studentId/performance"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminStudentPerformancePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ⭐ Admin Subject Breakdown Page */}
            <Route
              path="/admin/assessments/subject/:subjectId/breakdown"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminSubjectBreakdownPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ⭐ Admin Pending Grading */}
            <Route
              path="/admin/pending-grading"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminPendingGradingPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 💬 Chat */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <ChatPage /> {/* ← Remove the currentUserId prop */}
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 🧪 Chat Test Component - For Testing Only */}
            <Route
              path="/chat-test"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <ChatTestComponent />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            <Route
              path="/admin/announcements"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminAnnouncementsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            <Route
              path="/announcements"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <AnnouncementsViewPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            {/* 🎥 VIDEO LESSONS */}
            <Route
              path="/videos"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <VideoLibraryPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ✅ Teacher Analytics Overview */}
            <Route
              path="/videos/analytics"
              element={
                <ProtectedRoute roles={["TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <TeacherAnalyticsOverviewPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ✅ Upload Video Page */}
            <Route
              path="/videos/upload"
              element={
                <ProtectedRoute roles={["TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <UploadVideoPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ============================================
                SPECIFIC ROUTES MUST COME BEFORE DYNAMIC :id ROUTES
                ============================================ */}

            {/* ✅ Individual Video Analytics - Teacher/Admin only */}
            <Route
              path="/videos/:videoId/analytics"
              element={
                <ProtectedRoute roles={["TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <VideoAnalyticsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ✅ Student Video Transcript Page */}
            <Route
              path="/videos/:id/transcript"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <StudentVideoTranscriptPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ============================================
                TEACHER ROUTES - Separate namespace
                ============================================ */}

            {/* ✅ Teacher Video Management Detail Page */}
            <Route
              path="/teacher/videos/:id"
              element={
                <ProtectedRoute roles={["TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <TeacherVideoDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ✅ Teacher Video Transcript Page */}
            <Route
              path="/teacher/videos/:id/transcript"
              element={
                <ProtectedRoute roles={["TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <VideoTranscriptPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ============================================
                MAIN VIDEO DETAIL ROUTE - Must come LAST
                ============================================ */}

            {/* ✅ FIXED: Student Video Detail Page - Primary video viewing experience */}
            <Route
              path="/videos/:id"
              element={
                <ProtectedRoute roles={["STUDENT", "PARENT"]}>
                  <AppLayout>
                    <StudentVideoDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ✅ REMOVED: Old /videos/:id/details route - no longer needed */}
            {/* ✅ REMOVED: Duplicate VideoDetailsPage - consolidated into StudentVideoDetailPage */}

            {/* ============================================
                ADMIN ROUTES
                ============================================ */}

            {/* ✅ Admin Analytics Dashboard */}
            <Route
              path="/admin/video-analytics"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminAnalyticsDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* 📺 LIVE SESSIONS */}
            <Route
              path="/live-sessions"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <LiveClassesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/live-sessions/:id"
              element={
                <ProtectedRoute roles={["ADMIN", "TEACHER", "STUDENT", "PARENT"]}>
                  <AppLayout>
                    <SessionDetailsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/live-sessions/create"
              element={
                <ProtectedRoute roles={["TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <CreateSessionPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route 
              path="/live-sessions/:id/edit" 
              element={
                <ProtectedRoute roles={["TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <EditSessionPage />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />


            {/* 🎯 INDIVIDUAL STUDENT ROUTES */}
            <Route
              path="/individual/dashboard"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <IndividualDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/individual/uploads"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <IndividualUploadsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/individual/schedule"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <IndividualSchedulePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/individual/lessons"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <IndividualLessonsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes - Individual Timetables Management */}
            <Route
              path="/admin/individual/timetables"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminIndividualTimetablesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            <Route
              path="/admin/individual/teacher-schedules"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminTeacherSchedulesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/individual/teacher-schedule"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminViewTeacherSchedulePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


            <Route
              path="/admin/individual/timetables/:id"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminIndividualTimetableDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes - Individual Schedules */}
            <Route
              path="/admin/individual/schedules"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminStudentScheduleListPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/individual/schedules/:studentId"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminStudentSchedulePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/individual/pending/assignments"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminPendingAssignmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Teacher Routes - View Assigned Students' Timetables */}
            <Route
              path="/teacher/schedule"
              element={
                <ProtectedRoute roles={["TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <TeacherSchedulePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/individual/students"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherIndividualStudentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/individual/students/:studentId"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherIndividualTimetableViewPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/individual/students/:studentId/timetable/:timetableId"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherIndividualTimetableViewPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/students"
              element={
                <ProtectedRoute roles={["TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <StudentListPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/progress/incomplete-lessons/:studentId"
              element={
                <ProtectedRoute roles={["TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <IncompleteLessonsPage  />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/progress/comprehensive/:studentId"
              element={
                <ProtectedRoute roles={["TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <ComprehensiveLessonsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />





            

            <Route
              path="/individual/week-schedule"
              element={
                <ProtectedRoute roles={["STUDENT", "ADMIN"]}>
                  <AppLayout>
                    <WeeklySchedulePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            

            <Route
              path="/individual/progress-history"
              element={
                <ProtectedRoute roles={["STUDENT", "ADMIN"]}>
                  <AppLayout>
                    <ProgressHistoryPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            

            <Route
              path="/individual/multi-assess"
              element={
                <ProtectedRoute roles={["STUDENT", "ADMIN"]}>
                  <AppLayout>
                    <MultiAssessmentDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            

            <Route
              path="/individual/incomplete-assessment"
              element={
                <ProtectedRoute roles={["STUDENT", "ADMIN"]}>
                  <AppLayout>
                    <IncompleteAssessmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            
            <Route
              path="/admin/individual/schedules/regenerate"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminScheduleRegenerationPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            
            <Route
              path="/teacher/individual/pending/assignments"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherPendingAssignmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

                        

            // 1. Assessment Start/Preparation Page (Individual Students)
            <Route
              path="/student/individual/assessment/start/:progressId"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <AssessmentStartPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            // 2. Assessment Results Page (Individual Students)
            <Route
              path="/student/individual/assessment/results/:progressId"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <AssessmentResultsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            // 3. Take Individual Assessment (connects to existing assessment taking page)

            // ✅ NEW - Change the parameter name to lessonTopicId
            <Route
              path="/student/assessments/individual/take/:lessonTopicId"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentLessonAssessmentPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            // 4. View Individual Assessment (connects to existing assessment taking page)
            <Route
              path="/student/individual/lesson/view/:progressId"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <LessonContentView />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            // FOR ASSESSMENT CREATION
            <Route
              path="/admin/assessments/auto-create"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <AdminAssessmentCreationPage  />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            // FOR ASSESSMENT AUTOMATION
            <Route
              path="/admin/assessments/automation"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminAssessmentAutomationPage  />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

                        
            // FOR ASSESSMENT DIAGNOSTIC
            <Route
              path="/admin/assessments/diagnostic"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AssessmentDiagnosticPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* =====================================================
                STUDENT – MULTI-PERIOD
              ===================================================== */}

            <Route
              path="/student/individual/my-periods/:subjectId"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentMyPeriodsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />


                        // NEW: Take assessment by assessment ID (for custom assessments)
            <Route
              path="/student/assessments/:assessmentId/take"
              element={
                <ProtectedRoute roles={["STUDENT"]}>
                  <AppLayout>
                    <StudentAssessmentTakePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* =====================================================
                TEACHER – MULTI-PERIOD
              ===================================================== */}

            <Route
              path="/teacher/individual/multi-period-overview"
              element={
                <ProtectedRoute roles={["TEACHER", "ADMIN"]}>
                  <AppLayout>
                    <TeacherMultiPeriodDashboardPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/individual/students/:studentId/subjects/:subjectId/periods"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <StudentSubjectPeriodsTimelinePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/individual/pending-custom-assessments"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <TeacherPendingCustomAssessmentsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/teacher/assessments/create-custom"
              element={
                <ProtectedRoute roles={["TEACHER"]}>
                  <AppLayout>
                    <CustomAssessmentBuilderPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* =====================================================
                ADMIN – MULTI-PERIOD
              ===================================================== */}

            <Route
              path="/admin/individual/multi-period-system"
              element={
                <ProtectedRoute roles={["ADMIN"]}>
                  <AppLayout>
                    <AdminMultiPeriodSystemPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />



            {/* 🚫 Unauthorized */}
            <Route
              path="/unauthorized"
              element={
                <div className="min-h-screen flex items-center justify-center bg-background">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                      Unauthorized
                    </h1>
                    <p className="text-muted-foreground">
                      You don't have permission to access this page.
                    </p>
                  </div>
                </div>
              }
            />

            {/* ⚠️ Fallback */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
};

export default App;