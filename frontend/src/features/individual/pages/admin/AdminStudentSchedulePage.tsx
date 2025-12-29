// frontend/src/features/individual/pages/admin/AdminStudentSchedulePage.tsx

import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomBadge as Badge } from "@/components/ui/custom-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  TrendingUp,
  Eye,
  Upload,
  FileText,
  BookOpen,
} from "lucide-react";
import {
  useWeeklySchedule,
  useWeeklyScheduleStats,
  formatTimeDisplay,
  getNextClass,
  isToday,
  getDayDisplayName,
} from "../../hooks/useIndividualSchedule";
import axios from "../../../../api/axios";
import { adminTimetableApi } from "../../api/individualApi";
import { format } from "date-fns";

interface StudentProfile {
  id: number;
  userId: number;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  studentType: string;
  classId: number;
  className: string;
  departmentId: number;
  departmentName: string;
  subjectIds: number[];
  subjectNames: string[];
}

interface Timetable {
  id: number;
  studentProfileId: number;
  processingStatus: string;
  uploadedAt: string;
  originalFilename: string;
  processedAt?: string;
  totalPeriodsExtracted?: number;
}

const AdminStudentSchedulePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [selectedWeekView, setSelectedWeekView] = useState(false);

  const studentProfileId = parseInt(studentId || "0");

  // Fetch student profile
  const { 
    data: student, 
    isLoading: studentLoading, 
    error: studentError,
    refetch: refetchStudent 
  } = useQuery<StudentProfile>({
    queryKey: ["student-profile", studentId],
    queryFn: async () => {
      const res = await axios.get(`/student-profiles/${studentId}`);
      return res.data;
    },
    enabled: !!studentId,
  });

  // Fetch all timetables for this student
  const { 
    data: timetables = [], 
    isLoading: timetablesLoading,
    refetch: refetchTimetables 
  } = useQuery<Timetable[]>({
    queryKey: ["admin-timetables", "student", studentProfileId],
    queryFn: async () => {
      const allTimetables = await adminTimetableApi.getAllTimetables();
      return allTimetables.filter(tt => tt.studentProfileId === studentProfileId);
    },
    enabled: !!studentProfileId,
  });

  // Get latest completed timetable
  const latestTimetable = useMemo(() => {
    const completed = timetables
      .filter(tt => tt.processingStatus === "COMPLETED")
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    return completed[0] || null;
  }, [timetables]);

  // Fetch weekly schedule
  const {
    weeklySchedule,
    timetable,
    isLoading: scheduleLoading,
    error: scheduleError,
    refetch: refetchSchedule,
  } = useWeeklySchedule(studentProfileId);

  const weeklyStats = useWeeklyScheduleStats(weeklySchedule);

  // Get today's schedule
  const todaySchedule = useMemo(() => {
    return weeklySchedule.find(day => isToday(day.day));
  }, [weeklySchedule]);

  const todayStats = useMemo(() => {
    if (!todaySchedule) {
      return { totalPeriods: 0, completedPeriods: 0, completionRate: 0 };
    }
    const totalPeriods = todaySchedule.periods.length;
    const completedPeriods = todaySchedule.periods.filter(p => p.completed).length;
    return {
      totalPeriods,
      completedPeriods,
      completionRate: totalPeriods > 0 ? (completedPeriods / totalPeriods) * 100 : 0,
    };
  }, [todaySchedule]);

  const nextClass = getNextClass(weeklySchedule);

  // Helper to get initials
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
    }
    return parts[0]?.charAt(0) ?? "?";
  };

  const isLoading = studentLoading || scheduleLoading || timetablesLoading;

  const handleRefreshAll = () => {
    refetchStudent();
    refetchTimetables();
    refetchSchedule();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading student schedule...</p>
        </div>
      </div>
    );
  }

  if (studentError || !student) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Student not found. Please check the student ID.
        </AlertDescription>
      </Alert>
    );
  }

  const hasTimetable = timetables.length > 0;
  const hasCompletedTimetable = !!latestTimetable;
  const hasScheduleData = weeklySchedule.length > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/individual/schedules")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Students
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <span className="text-lg font-semibold text-primary">
                  {getInitials(student.fullName).toUpperCase()}
                </span>
              </div>
              {student.fullName}'s Schedule
            </h1>
            <p className="text-muted-foreground ml-15">
              View and manage individual student schedule
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {latestTimetable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/admin/individual/timetables/${latestTimetable.id}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Timetable Details
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Student Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Student Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Full Name</p>
              <p className="text-lg font-semibold">{student.fullName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Class</p>
              <p className="text-lg">{student.className}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Department</p>
              <p className="text-lg">{student.departmentName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Student Type</p>
              <Badge variant={student.studentType === "INDIVIDUAL" ? "default" : "secondary"}>
                {student.studentType}
              </Badge>
            </div>
          </div>
          {student.email && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base">{student.email}</p>
            </div>
          )}
          {student.subjectNames && student.subjectNames.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Enrolled Subjects ({student.subjectNames.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {student.subjectNames.map((subject, idx) => (
                  <Badge key={idx} variant="outline">
                    {subject}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timetable Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Timetable Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasTimetable ? (
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                No timetable has been uploaded for this student yet. Upload a timetable to view their schedule.
              </AlertDescription>
            </Alert>
          ) : !hasCompletedTimetable ? (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Timetable is being processed. Please check back in a few moments.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Status
                  </p>
                  <Badge variant="default" className="bg-green-600">
                    COMPLETED
                  </Badge>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Total Timetables
                  </p>
                  <p className="text-2xl font-bold">{timetables.length}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Latest Upload
                  </p>
                  <p className="text-lg font-semibold">
                    {format(new Date(latestTimetable.uploadedAt), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Periods Extracted
                  </p>
                  <p className="text-2xl font-bold">
                    {latestTimetable.totalPeriodsExtracted || 0}
                  </p>
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Current Timetable:</strong> {latestTimetable.originalFilename}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Overview */}
      {hasCompletedTimetable && hasScheduleData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Today's Periods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold">{todayStats.totalPeriods}</p>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed Today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-green-600">
                  {todayStats.completedPeriods}
                </p>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold">
                  {Object.keys(weeklyStats.subjectDistribution).length}
                </p>
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Today's Progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold">
                  {todayStats.completionRate.toFixed(0)}%
                </p>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Next Class Card */}
      {hasCompletedTimetable && hasScheduleData && nextClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Next Upcoming Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-primary/10 rounded-lg p-4 border-2 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xl">{nextClass.subjectName}</div>
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {getDayDisplayName(nextClass.day)} • Period {nextClass.periodNumber}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4" />
                    {formatTimeDisplay(nextClass.startTime)} - {formatTimeDisplay(nextClass.endTime)}
                  </div>
                </div>
                <Badge variant="default" className="text-lg px-4 py-2">
                  Period {nextClass.periodNumber}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      {hasCompletedTimetable && hasScheduleData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>
                  {todaySchedule
                    ? `${getDayDisplayName(todaySchedule.day)} • ${todayStats.totalPeriods} periods scheduled`
                    : "No classes scheduled for today"}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedWeekView(!selectedWeekView)}
              >
                {selectedWeekView ? "Show Today" : "Show Full Week"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {scheduleError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load schedule. Please try again.
                </AlertDescription>
              </Alert>
            ) : !selectedWeekView ? (
              // Today's View
              !todaySchedule || todaySchedule.periods.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Classes Today</h3>
                  <p className="text-muted-foreground">
                    This student has no scheduled classes for today.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaySchedule.periods.map((period, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        period.completed
                          ? "bg-green-50 border-green-200"
                          : "bg-background border-border hover:border-primary"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg ${
                            period.completed ? "bg-green-100" : "bg-primary/10"
                          }`}
                        >
                          <div
                            className={`text-xs font-semibold ${
                              period.completed ? "text-green-700" : "text-primary"
                            }`}
                          >
                            Period
                          </div>
                          <div
                            className={`text-2xl font-bold ${
                              period.completed ? "text-green-700" : "text-primary"
                            }`}
                          >
                            {period.periodNumber}
                          </div>
                        </div>

                        <div>
                          <div className="font-semibold text-lg">
                            {period.subjectName}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {formatTimeDisplay(period.startTime)} - {formatTimeDisplay(period.endTime)}
                          </div>
                          {period.lessonTopicTitle && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {period.lessonTopicTitle}
                            </div>
                          )}
                        </div>
                      </div>

                      {period.completed ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <span className="text-sm font-semibold">Completed</span>
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Full Week View
              <div className="space-y-6">
                {weeklySchedule.map((daySchedule, dayIdx) => (
                  <div key={dayIdx} className="space-y-3">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      {getDayDisplayName(daySchedule.day)}
                      <Badge variant="outline" className="ml-2">
                        {daySchedule.periods.length} periods
                      </Badge>
                    </h3>
                    {daySchedule.periods.length === 0 ? (
                      <p className="text-sm text-muted-foreground ml-7">No classes scheduled</p>
                    ) : (
                      <div className="space-y-2 ml-7">
                        {daySchedule.periods.map((period, periodIdx) => (
                          <div
                            key={periodIdx}
                            className="flex items-center justify-between p-3 rounded-lg border bg-background"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">P{period.periodNumber}</Badge>
                              <div>
                                <div className="font-medium">{period.subjectName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatTimeDisplay(period.startTime)} - {formatTimeDisplay(period.endTime)}
                                </div>
                              </div>
                            </div>
                            {period.completed && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subject Distribution */}
      {hasCompletedTimetable && hasScheduleData && (
        <Card>
          <CardHeader>
            <CardTitle>Subject Distribution</CardTitle>
            <CardDescription>
              Weekly breakdown of subjects across all periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.entries(weeklyStats.subjectDistribution).length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No subjects assigned yet.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {Object.entries(weeklyStats.subjectDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([subject, count]) => (
                    <div
                      key={subject}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted"
                    >
                      <div className="font-medium">{subject}</div>
                      <Badge variant="secondary">{count} periods/week</Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timetable History */}
      {timetables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Timetable History</CardTitle>
            <CardDescription>
              All timetables uploaded for this student ({timetables.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timetables
                .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
                .map((tt) => (
                  <div
                    key={tt.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:border-primary cursor-pointer transition-all"
                    onClick={() => navigate(`/admin/individual/timetables/${tt.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-semibold">{tt.originalFilename}</div>
                        <div className="text-sm text-muted-foreground">
                          Uploaded: {format(new Date(tt.uploadedAt), 'MMM dd, yyyy • HH:mm')}
                        </div>
                        {tt.totalPeriodsExtracted && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {tt.totalPeriodsExtracted} periods extracted
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          tt.processingStatus === "COMPLETED"
                            ? "default"
                            : tt.processingStatus === "FAILED"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {tt.processingStatus}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminStudentSchedulePage;