// frontend/src/features/individual/pages/IndividualSchedulePage.tsx

import React from "react";
import { AlertCircle } from "lucide-react";

import { useMyProfile } from "../../../studentProfiles/hooks/useStudentProfiles";
import WeeklyScheduleDisplay from "../../components/WeeklyScheduleDisplay";

const IndividualSchedulePage: React.FC = () => {
  const { data: profile, isLoading: profileLoading, error: profileError } = useMyProfile();

  // 🔄 Loading profile
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // ❌ Profile error
  if (profileError || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2 text-center">
            Error Loading Profile
          </h2>
          <p className="text-red-700 text-center">
            {profileError?.message || "Unable to load your student profile"}
          </p>
        </div>
      </div>
    );
  }

  // ❌ Feature restriction
  if (profile.studentType !== "INDIVIDUAL") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-yellow-900 mb-2 text-center">
            Access Restricted
          </h2>
          <p className="text-yellow-700 text-center">
            This feature is only available for INDIVIDUAL students.
          </p>
        </div>
      </div>
    );
  }

  // ✅ SUCCESS → Show full weekly schedule
  return (
    <div className="max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Weekly Learning Schedule</h1>
        <p className="text-gray-600">
          This schedule is automatically generated based on your timetable and mapped subjects.
        </p>
      </div>

      {/* Weekly Schedule Component */}
      <WeeklyScheduleDisplay studentProfileId={profile.id!} />
    </div>
  );
};

export default IndividualSchedulePage;
