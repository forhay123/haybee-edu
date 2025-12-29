import React from "react";
import { useStudentProfiles } from "../hooks/useStudentProfiles";
import StudentProfileList from "../components/StudentProfileList";
import StudentProfileForm from "../components/StudentProfileForm";
import { StudentProfileDto } from "../api/studentProfilesApi";

const AdminStudentProfilesPage: React.FC = () => {
  const { studentProfilesQuery, createStudentProfile } = useStudentProfiles();

  const handleCreate = async (data: Partial<StudentProfileDto>) => {
    try {
      await createStudentProfile.mutateAsync(data as StudentProfileDto);
      alert("✅ Student profile created successfully!");
    } catch (error: any) {
      alert(`❌ Error: ${error.response?.data?.message || error.message}`);
    }
  };

  if (studentProfilesQuery.isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading student profiles...</p>
        </div>
      </div>
    );
  }

  if (studentProfilesQuery.isError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">Error loading student profiles.</p>
          <p className="text-red-500 text-sm mt-1">
            {studentProfilesQuery.error?.message || "Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Student Profiles</h1>
        <div className="text-sm text-gray-600">
          Total Students: {studentProfilesQuery.data?.length || 0}
        </div>
      </div>

      {/* Create New Profile */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Create New Student Profile</h2>
        <StudentProfileForm
          onSubmit={handleCreate}
          isSubmitting={createStudentProfile.isPending}
        />
      </div>

      {/* Existing Profiles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Existing Student Profiles</h2>
        <StudentProfileList profiles={studentProfilesQuery.data || []} />
      </div>
    </div>
  );
};

export default AdminStudentProfilesPage;