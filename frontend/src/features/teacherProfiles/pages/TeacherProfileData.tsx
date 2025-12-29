import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import api from "../../../api/axios";
import { useGetTeacherClasses } from "../../classes/api/classesApi";
import { useGetSubjects } from "../../subjects/api/subjectsApi";

interface TeacherProfileData {
  id: number;
  userId: number;
  userEmail: string;
  userName: string;
  departmentId: number;
  departmentName: string;
  subjectIds: number[];
}

const TeacherProfilePage: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  // Fetch teacher profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["teacherProfile", user?.id],
    queryFn: async () => {
      const res = await api.get(`/teachers/user/${user?.id}`);
      return res.data as TeacherProfileData;
    },
    enabled: !!user?.id,
  });

  // Fetch teacher's classes
  const { data: classes, isLoading: isLoadingClasses } = useGetTeacherClasses();

  // Fetch all subjects to map subject IDs
  const { data: allSubjects } = useGetSubjects();

  const isLoading = isLoadingProfile || isLoadingClasses;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <p className="text-yellow-800 dark:text-yellow-300 font-medium">
            ⚠️ Teacher profile not found
          </p>
          <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-2">
            Please contact your administrator to set up your teacher profile.
          </p>
        </div>
      </div>
    );
  }

  // Get subjects taught by this teacher
  const teacherSubjects = allSubjects?.filter(subject => 
    profile.subjectIds?.includes(subject.id!)
  ) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          👨‍🏫 My Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View your teaching profile and assignments
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>👤</span>
            Personal Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
              <p className="text-gray-900 dark:text-white font-medium">{profile.userName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
              <p className="text-gray-900 dark:text-white">{profile.userEmail}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Department</label>
              <p className="text-gray-900 dark:text-white font-medium">{profile.departmentName}</p>
            </div>
          </div>
        </div>

        {/* Subjects */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span>📚</span>
            Subjects I Teach
          </h2>
          {teacherSubjects.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No subjects assigned</p>
          ) : (
            <div className="space-y-2">
              {teacherSubjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {subject.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Code: {subject.code}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Classes */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span>🏫</span>
          My Classes
        </h2>
        {!classes || classes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No classes assigned</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  {cls.name}
                </h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>Level: {cls.level}</p>
                  {cls.student_type && <p>Type: {cls.student_type}</p>}
                  {cls.department_name && (
                    <p className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded inline-block mt-2">
                      {cls.department_name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Classes</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {classes?.length || 0}
              </p>
            </div>
            <div className="text-4xl">🏫</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Subjects</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                {teacherSubjects.length}
              </p>
            </div>
            <div className="text-4xl">📚</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Department</p>
              <p className="text-sm font-bold text-purple-900 dark:text-purple-100 mt-2">
                {profile.departmentName}
              </p>
            </div>
            <div className="text-4xl">🏢</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfilePage;