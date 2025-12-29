import React, { useState, useEffect } from "react";
import { useTeacherProfiles } from "../hooks/useTeacherProfiles";
import { useUsers } from "../../users/hooks/useUsers";
import { useDepartments } from "../../departments/hooks/useDepartments";
import { useGetSubjects } from "../../subjects/api/subjectsApi";
import TeacherProfileList from "../components/TeacherProfileList";
import TeacherProfileForm from "../components/TeacherProfileForm";
import { TeacherProfile } from "../api/teacherProfilesApi";

const AdminTeacherProfilesPage: React.FC = () => {
  const {
    teachers,
    isLoading,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    isCreating,
    isUpdating,
  } = useTeacherProfiles();

  // ✅ FIX: Match the structure used in AdminUsersPage
  const { usersQuery } = useUsers();
  
  // ✅ FIX: Use the corrected useDepartments hook
  const { departments, isLoading: isDepartmentsLoading } = useDepartments();

  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherProfile | null>(null);

  // ✅ Extract users from the query object
  const users = usersQuery?.data || [];
  const isUsersLoading = usersQuery?.isLoading || false;

  // Filter for teacher users with robust role checking
  const teacherUsers = Array.isArray(users)
    ? users.filter((user: any) => {
        if (!user || !user.roles) return false;
        
        // Handle roles as array or string
        const userRoles = Array.isArray(user.roles)
          ? user.roles
          : [user.roles];
        
        // Check if any role matches "TEACHER" (case-insensitive)
        return userRoles.some((role: string) => 
          String(role).toUpperCase().trim() === "TEACHER"
        );
      })
    : [];

  // Debug logging
  useEffect(() => {
    console.log("👥 Users loaded:", users.length);
    console.log("👨‍🏫 Teacher users filtered:", teacherUsers.length);
    console.log("🏢 Departments loaded:", departments.length);
    if (users.length > 0) {
      console.log("Sample user:", users[0]);
    }
    if (teacherUsers.length > 0) {
      console.log("Sample teacher user:", teacherUsers[0]);
    }
  }, [users, teacherUsers, departments]);

  const handleCreate = async (data: any) => {
    try {
      await createTeacher(data);
      setShowForm(false);
      alert("✅ Teacher profile created successfully!");
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "❌ Failed to create teacher profile");
    }
  };

  const handleEdit = (teacher: TeacherProfile) => {
    setEditingTeacher(teacher);
    setShowForm(true);
  };

  const handleUpdate = async (data: any) => {
    if (!editingTeacher) return;
    try {
      await updateTeacher({ teacherId: editingTeacher.id, data });
      setShowForm(false);
      setEditingTeacher(null);
      alert("✅ Teacher profile updated successfully!");
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "❌ Failed to update teacher profile");
    }
  };

  const handleDelete = async (teacherId: number) => {
    if (!confirm("Are you sure you want to delete this teacher profile?")) return;
    try {
      await deleteTeacher(teacherId);
      alert("🗑️ Teacher profile deleted successfully!");
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "❌ Failed to delete teacher profile");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTeacher(null);
  };

  const loading =
    isLoading || isUsersLoading || isDepartmentsLoading || isCreating || isUpdating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Teacher Profiles</h1>
          <p className="text-muted-foreground mt-1">
            Manage teacher profiles and their departments
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            + Create Teacher Profile
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-card-foreground mb-4">
            {editingTeacher ? "Edit Teacher Profile" : "Create Teacher Profile"}
          </h2>
          
          {/* Show loading state while data is fetching */}
          {(isUsersLoading || isDepartmentsLoading) ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading users and departments...</span>
            </div>
          ) : teacherUsers.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
              <p className="text-yellow-800">
                ⚠️ No users with TEACHER role found. Please create users with the TEACHER role first.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                Total users loaded: {users.length} | Teacher users: {teacherUsers.length} | Departments: {departments.length}
              </p>
            </div>
          ) : departments.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
              <p className="text-yellow-800">
                ⚠️ No departments found. Please create departments first.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                Departments loaded: {departments.length}
              </p>
            </div>
          ) : (
            <TeacherProfileForm
              onSubmit={editingTeacher ? handleUpdate : handleCreate}
              onCancel={handleCancel}
              initialData={editingTeacher}
              users={teacherUsers}
              departments={departments}
              isLoading={loading}
            />
          )}
        </div>
      )}

      {/* Teacher List */}
      <TeacherProfileList
        teachers={teachers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
    </div>
  );
};

export default AdminTeacherProfilesPage;