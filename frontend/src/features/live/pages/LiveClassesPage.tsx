// src/features/live/pages/LiveClassesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom'; // ✅ ADD THIS
import { RootState } from '@/store/store';

import {
  useTeacherSubjects,
  useGetEnrolledSubjects,
  useGetStudentSubjects,
  useGetSubjects
} from '@/features/subjects/hooks/useSubjects';

import { useMyProfile } from '@/features/studentProfiles/hooks/useStudentProfiles';
import { SessionList } from '../components/SessionList';
// ❌ REMOVE THIS: import { CreateSessionModal } from '../components/CreateSessionModal';

export const LiveClassesPage: React.FC = () => {
  const navigate = useNavigate(); // ✅ ADD THIS
  const user = useSelector((state: RootState) => state.auth?.user);
  const userRoles = user?.roles || [];

  const primaryRole =
    userRoles.includes("TEACHER") ? "TEACHER" :
    userRoles.includes("ADMIN") ? "ADMIN" :
    userRoles.includes("STUDENT") ? "STUDENT" :
    userRoles.includes("PARENT") ? "PARENT" :
    undefined;

  // ❌ REMOVE THIS: const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem("sessionFilters");
    return saved ? JSON.parse(saved) : { status: "upcoming", subjectId: undefined };
  });

  // STUDENT PROFILE
  const { data: studentProfile } = useMyProfile({
    enabled: primaryRole === "STUDENT",
  });

  const classId = studentProfile?.classId ?? null;
  const departmentId = studentProfile?.departmentId ?? null;
  const studentType = studentProfile?.studentType ?? null;

  // TEACHER SUBJECTS
  const { data: teacherSubjects, isLoading: isLoadingTeacher } = useTeacherSubjects({
    enabled: primaryRole === "TEACHER",
  });

  // ADMIN SUBJECTS
  const { data: allSubjects, isLoading: isLoadingAll } = useGetSubjects({
    enabled: primaryRole === "ADMIN",
  });

  // ASPIRANT enrolled subjects
  const { data: enrolledSubjects, isLoading: isLoadingEnrolled } =
    useGetEnrolledSubjects({
      enabled: primaryRole === "STUDENT" && studentType === "ASPIRANT",
    });

  // SCHOOL/HOME STUDENT subjects
  const { data: studentSubjects, isLoading: isLoadingStudent } =
    useGetStudentSubjects(
      classId,
      departmentId,
      studentType,
      {
        enabled:
          primaryRole === "STUDENT" &&
          studentType !== "ASPIRANT" &&
          !!classId,
      }
    );

  // FINAL SUBJECT LIST
  const subjects = useMemo(() => {
    if (primaryRole === "TEACHER") return teacherSubjects || [];
    if (primaryRole === "ADMIN") return allSubjects || [];
    if (primaryRole === "STUDENT") {
      if (studentType === "ASPIRANT") return enrolledSubjects || [];
      return studentSubjects || [];
    }
    return [];
  }, [
    primaryRole,
    studentType,
    teacherSubjects,
    allSubjects,
    enrolledSubjects,
    studentSubjects
  ]);

  const isLoadingSubjects =
    isLoadingTeacher || isLoadingAll || isLoadingStudent || isLoadingEnrolled;

  useEffect(() => {
    localStorage.setItem("sessionFilters", JSON.stringify(filters));
  }, [filters]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            🎥 Live Classes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {primaryRole === "TEACHER"
              ? "Create and manage your live sessions"
              : "Join scheduled live classes"}
          </p>
        </div>

        {(primaryRole === "TEACHER" || primaryRole === "ADMIN") && (
          <button
            onClick={() => navigate('/live-sessions/create')} // ✅ CHANGED: Navigate to create page
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            + Create Session
          </button>
        )}
      </div>

      {/* Page Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar Filters */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">

            <h3 className="font-bold">Filters</h3>

            <div>
              <label className="block text-sm mb-2">Subject</label>

              {isLoadingSubjects ? (
                <div className="text-sm">Loading subjects…</div>
              ) : subjects.length === 0 ? (
                <div className="text-sm">No subjects available</div>
              ) : (
                <select
                  value={filters.subjectId || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      subjectId: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">All Subjects</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {filters.subjectId && (
              <button
                onClick={() =>
                  setFilters({ status: "upcoming", subjectId: undefined })
                }
                className="text-blue-500 text-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Sessions List */}
        <div className="lg:col-span-3">
          <SessionList filters={filters} userRole={primaryRole} />
        </div>

      </div>

      {/* ❌ REMOVE THIS: <CreateSessionModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} /> */}
    </div>
  );
};