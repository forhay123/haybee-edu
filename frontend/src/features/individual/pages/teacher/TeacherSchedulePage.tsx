// frontend/src/features/individual/pages/teacher/TeacherSchedulePage.tsx

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../../auth/useAuth";
import { isTeacher as checkIsTeacher, isAdmin as checkIsAdmin } from "../../../auth/authHelpers";
import { teacherTimetableApi } from "../../api/individualApi";
import axios from "../../../../api/axios";
import {
  INDIVIDUAL_TIME_WINDOWS,
} from "../../types/individualTypes";

interface TeacherScheduleEntry {
  studentId: number;
  studentName: string;
  studentProfileId: number;
  subjectId: number;
  subjectName: string;
  day: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  completed: boolean;
  timetableId: number;
}

const TeacherSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isTeacherUser = checkIsTeacher(user);
  const isAdminUser = checkIsAdmin(user);
  
  // Get teacherId from URL params (for admin viewing specific teacher)
  const viewingTeacherId = searchParams.get("teacherId");
  const isAdminViewing = isAdminUser && viewingTeacherId;

  const [selectedDay, setSelectedDay] = useState<string>("ALL");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(["MONDAY"]));

  // ✅ Fetch teacher info if admin is viewing specific teacher
  const { data: viewingTeacherInfo } = useQuery({
    queryKey: ["teacher-profile", viewingTeacherId],
    queryFn: async () => {
      if (!viewingTeacherId) return null;
      // Fetch all teachers and find the one we need
      const response = await axios.get("/teachers");
      const teachers = response.data;
      return teachers.find((t: any) => t.id === parseInt(viewingTeacherId));
    },
    enabled: Boolean(isAdminViewing && viewingTeacherId),
  });

  // ✅ Get teacher's subjects from API
  const { data: teacherSubjectsData = [] } = useQuery({
    queryKey: ["teacher-subjects", viewingTeacherId || "me"],
    queryFn: async () => {
      try {
        if (isAdminViewing && viewingTeacherId) {
          // Admin viewing specific teacher - get their subjects
          const teachersResponse = await axios.get("/teachers");
          const teachers = teachersResponse.data;
          const teacher = teachers.find((t: any) => t.id === parseInt(viewingTeacherId));
          
          if (!teacher) return [];
          
          // Fetch all subjects and filter by teacher's subjectIds
          const subjectsResponse = await axios.get("/subjects");
          const allSubjects = subjectsResponse.data;
          
          return (teacher.subjectIds || [])
            .map((id: number) => allSubjects.find((s: any) => s.id === id))
            .filter(Boolean);
        } else {
          // Teacher viewing their own schedule
          const response = await axios.get("/subjects/teacher/my-subjects");
          return response.data || [];
        }
      } catch (err) {
        console.error("Failed to fetch teacher subjects:", err);
        return [];
      }
    },
    enabled: Boolean(isTeacherUser || isAdminViewing),
    staleTime: 30 * 60 * 1000,
  });

  // ✅ Extract subject IDs
  const teacherSubjects = useMemo(() => {
    if (!Array.isArray(teacherSubjectsData)) {
      return new Set<number>();
    }
    return new Set(
      teacherSubjectsData
        .map((subj: any) => subj?.id)
        .filter((id: any) => Number.isFinite(id))
    );
  }, [teacherSubjectsData]);

  // Fetch and generate teacher's schedule
  const { data: scheduleData = [], isLoading, error } = useQuery({
    queryKey: ["teacher-schedule", Array.from(teacherSubjects), viewingTeacherId],
    queryFn: async () => {
      // Get all students' timetables
      const timetables = await teacherTimetableApi.getMyStudentsTimetables();

      const allSchedules: TeacherScheduleEntry[] = [];

      // For each student, generate their weekly schedule
      for (const timetable of timetables) {
        if (timetable.processingStatus !== "COMPLETED") continue;

        try {
          const entriesResponse = await axios.get(
            `/individual/timetable/${timetable.id}/entries`
          );
          const entries = entriesResponse.data || [];

          const mappedEntries = entries.filter(
            (entry: any) => Number.isFinite(entry.subjectId) && entry.subjectName
          );

          if (mappedEntries.length === 0) continue;

          const weeklySchedule = generateWeeklyScheduleForStudent(mappedEntries);

          weeklySchedule.forEach((daySchedule) => {
            daySchedule.periods.forEach((period) => {
              if (teacherSubjects.size === 0 || teacherSubjects.has(period.subjectId)) {
                allSchedules.push({
                  studentId: timetable.studentProfileId,
                  studentName: timetable.studentName || `Student ${timetable.studentProfileId}`,
                  studentProfileId: timetable.studentProfileId,
                  subjectId: period.subjectId,
                  subjectName: period.subjectName,
                  day: daySchedule.day,
                  periodNumber: period.periodNumber,
                  startTime: period.startTime,
                  endTime: period.endTime,
                  completed: period.completed,
                  timetableId: timetable.id,
                });
              }
            });
          });
        } catch (err) {
          console.error(`Failed to fetch entries for timetable ${timetable.id}`, err);
        }
      }

      return allSchedules;
    },
    enabled: Boolean((isTeacherUser || isAdminViewing) && teacherSubjects.size > 0),
    staleTime: 5 * 60 * 1000,
  });

  const subjects = useMemo(() => {
    const uniqueSubjects = new Set(scheduleData.map((s) => s.subjectName));
    return Array.from(uniqueSubjects).sort();
  }, [scheduleData]);

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

  const filteredSchedule = useMemo(() => {
    return scheduleData.filter((entry) => {
      if (selectedDay !== "ALL" && entry.day !== selectedDay) return false;
      if (selectedSubject !== "ALL" && entry.subjectName !== selectedSubject) return false;
      return true;
    });
  }, [scheduleData, selectedDay, selectedSubject]);

  const scheduleByDay = useMemo(() => {
    const grouped: Record<string, TeacherScheduleEntry[]> = {};

    filteredSchedule.forEach((entry) => {
      if (!grouped[entry.day]) {
        grouped[entry.day] = [];
      }
      grouped[entry.day].push(entry);
    });

    Object.keys(grouped).forEach((day) => {
      grouped[day].sort((a, b) => {
        const timeCompare = a.startTime.localeCompare(b.startTime);
        if (timeCompare !== 0) return timeCompare;
        return a.studentName.localeCompare(b.studentName);
      });
    });

    return grouped;
  }, [filteredSchedule]);

  const stats = useMemo(() => {
    const totalClasses = scheduleData.length;
    const uniqueStudents = new Set(scheduleData.map((s) => s.studentId)).size;
    const uniqueSubjects = new Set(scheduleData.map((s) => s.subjectName)).size;

    const classesPerDay: Record<string, number> = {};
    scheduleData.forEach((entry) => {
      classesPerDay[entry.day] = (classesPerDay[entry.day] || 0) + 1;
    });

    return {
      totalClasses,
      uniqueStudents,
      uniqueSubjects,
      classesPerDay,
    };
  }, [scheduleData]);

  const toggleDay = (day: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(day)) {
      newExpanded.delete(day);
    } else {
      newExpanded.add(day);
    }
    setExpandedDays(newExpanded);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  // Access control
  if (!isTeacherUser && !isAdminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isAdminViewing 
              ? `Loading ${viewingTeacherInfo?.userName || "teacher"}'s schedule...`
              : "Loading your teaching schedule..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Schedule</h1>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
        </div>
      </div>
    );
  }

  if (teacherSubjects.size === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-yellow-900 mb-2">No Subjects Assigned</h2>
          <p className="text-yellow-700">
            {isAdminViewing
              ? `${viewingTeacherInfo?.userName || "This teacher"} doesn't have any subjects assigned yet.`
              : "You don't have any subjects assigned yet. Contact your administrator to assign subjects."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {isAdminViewing && (
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
              <ShieldCheck className="w-4 h-4" />
              <span>Admin View • Viewing {viewingTeacherInfo?.userName || "Teacher"}'s Schedule</span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isAdminViewing 
              ? `${viewingTeacherInfo?.userName || "Teacher"}'s Teaching Schedule`
              : "My Teaching Schedule"}
          </h1>
          <p className="text-gray-600">
            {isAdminViewing
              ? `View teaching schedule for ${viewingTeacherInfo?.userName || "this teacher"}'s assigned subjects`
              : "View your weekly teaching schedule for your assigned subjects"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClasses}</p>
              </div>
              <Calendar className="w-10 h-10 text-indigo-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Students</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.uniqueStudents}</p>
              </div>
              <Users className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {isAdminViewing ? "Assigned Subjects" : "My Subjects"}
                </p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.uniqueSubjects}</p>
              </div>
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Busiest Day</p>
                <p className="text-xl font-bold text-purple-600 mt-2">
                  {Object.entries(stats.classesPerDay).sort(([, a], [, b]) => b - a)[0]?.[0]
                    ?.charAt(0) +
                    Object.entries(stats.classesPerDay)
                      .sort(([, a], [, b]) => b - a)[0]?.[0]
                      ?.slice(1)
                      .toLowerCase() || "N/A"}
                </p>
                <p className="text-sm text-gray-500">
                  {Object.entries(stats.classesPerDay).sort(([, a], [, b]) => b - a)[0]?.[1] || 0} classes
                </p>
              </div>
              <Clock className="w-10 h-10 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="ALL">All Days</option>
                {days.map((day) => (
                  <option key={day} value={day}>
                    {day.charAt(0) + day.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="ALL">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(selectedDay !== "ALL" || selectedSubject !== "ALL") && (
            <button
              onClick={() => {
                setSelectedDay("ALL");
                setSelectedSubject("ALL");
              }}
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Schedule by Day */}
        <div className="space-y-4">
          {days.map((day) => {
            const daySchedule = scheduleByDay[day] || [];
            if (daySchedule.length === 0) return null;

            const isExpanded = expandedDays.has(day);

            return (
              <div key={day} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleDay(day)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5" />
                    <div className="text-left">
                      <h3 className="font-semibold text-lg">
                        {day.charAt(0) + day.slice(1).toLowerCase()}
                      </h3>
                      <p className="text-sm text-indigo-100">
                        {daySchedule.length} class{daySchedule.length !== 1 ? "es" : ""}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>

                {isExpanded && (
                  <div className="divide-y divide-gray-100">
                    {daySchedule.map((entry, idx) => (
                      <div
                        key={`${entry.studentId}-${entry.subjectId}-${entry.periodNumber}-${idx}`}
                        className="px-6 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-40">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                              <Clock className="w-4 h-4 text-indigo-600" />
                              {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Period {entry.periodNumber}</p>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <h4 className="font-semibold text-gray-900 truncate">{entry.subjectName}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                              <p className="text-sm text-gray-600">{entry.studentName}</p>
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            {entry.completed ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Scheduled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredSchedule.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Found</h3>
            <p className="text-gray-600">
              {selectedDay !== "ALL" || selectedSubject !== "ALL"
                ? "Try adjusting your filters to see more classes"
                : `${isAdminViewing ? "This teacher doesn't have" : "You don't have"} any scheduled classes for ${isAdminViewing ? "their" : "your"} subjects yet`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

function generateWeeklyScheduleForStudent(extractedEntries: any[]) {
  const schedule: Array<{
    day: string;
    periods: Array<{
      periodNumber: number;
      subjectId: number;
      subjectName: string;
      startTime: string;
      endTime: string;
      completed: boolean;
    }>;
  }> = [];

  const mappedSubjects = extractedEntries
    .filter((entry) => Number.isFinite(entry.subjectId))
    .map((entry) => ({
      id: entry.subjectId,
      name: entry.subjectName,
    }));

  const uniqueSubjects = Array.from(
    new Map(mappedSubjects.map((s) => [s.id, s])).values()
  );

  if (uniqueSubjects.length === 0) {
    return [];
  }

  let periodIndex = 0;

  const weekDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

  weekDays.forEach((day) => {
    const timeWindow = INDIVIDUAL_TIME_WINDOWS.find((w) => w.dayOfWeek === day);
    if (!timeWindow) return;

    const daySchedule: {
      day: string;
      periods: Array<{
        periodNumber: number;
        subjectId: number;
        subjectName: string;
        startTime: string;
        endTime: string;
        completed: boolean;
      }>;
    } = {
      day,
      periods: [],
    };

    const startHour = parseInt(timeWindow.startTime.split(":")[0]);
    const endHour = parseInt(timeWindow.endTime.split(":")[0]);
    const maxPeriods = endHour - startHour;

    let currentHour = startHour;
    let periodsAddedToday = 0;

    while (currentHour < endHour && periodsAddedToday < maxPeriods) {
      if (periodIndex >= uniqueSubjects.length) {
        periodIndex = 0;
      }

      const subject = uniqueSubjects[periodIndex];

      if (!subject) break;

      const startTime = `${String(currentHour).padStart(2, "0")}:00`;
      const endTime = `${String(currentHour + 1).padStart(2, "0")}:00`;

      daySchedule.periods.push({
        periodNumber: periodsAddedToday + 1,
        subjectId: subject.id,
        subjectName: subject.name,
        startTime,
        endTime,
        completed: false,
      });

      currentHour++;
      periodsAddedToday++;
      periodIndex++;
    }

    if (daySchedule.periods.length > 0) {
      schedule.push(daySchedule);
    }
  });

  return schedule;
}

export default TeacherSchedulePage;