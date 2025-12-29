import React from "react";
import { useNavigate } from "react-router-dom";
import { useMyProfile } from "../hooks/useStudentProfiles";
import StudentProfileCard from "../components/StudentProfileCard";

const StudentProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading, isError, error } = useMyProfile();

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Error loading profile.</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">
            {error?.message || "Please contact your administrator."}
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-amber-600 dark:text-amber-400 font-medium">No student profile found.</p>
          <p className="text-amber-500 dark:text-amber-500 text-sm mt-1">
            Please contact your administrator to create your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">My Profile</h1>
      
      {/* Profile Card */}
      <StudentProfileCard profile={profile} />
      
      {/* Student Type Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          About Your Student Type
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          {profile.studentType === "SCHOOL" && 
            "You are enrolled as a regular school student with a fixed class schedule and curriculum."}
          {profile.studentType === "HOME" && 
            "You are enrolled as a homeschool student. You have the same subjects as school students but with flexible scheduling."}
          {profile.studentType === "ASPIRANT" && 
            "You are preparing for SSS3 exams. You can select which subjects you want to study."}
        </p>
      </div>

      {/* ✅ Quick Actions */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border shadow">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <button
            onClick={() => navigate("/subjects/student")}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left flex items-center gap-2"
          >
            <span>📚</span>
            <span>
              {profile.studentType === "ASPIRANT" 
                ? "Select Your Subjects" 
                : "View My Subjects"}
            </span>
          </button>
          
          {profile.studentType === "ASPIRANT" && (!profile.subjectIds || profile.subjectIds.length === 0) && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                ⚠️ <strong>Action Required:</strong> You haven't selected your subjects yet. 
                Please click the button above to choose your SSS3 subjects.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;