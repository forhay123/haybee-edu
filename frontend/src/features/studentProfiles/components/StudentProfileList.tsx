import React, { useState } from "react";
import { StudentProfileDto } from "../api/studentProfilesApi";
import StudentProfileCard from "./StudentProfileCard";
import StudentProfileForm from "./StudentProfileForm";
import { useStudentProfiles } from "../hooks/useStudentProfiles";

interface Props {
  profiles: StudentProfileDto[];
}

const StudentProfileList: React.FC<Props> = ({ profiles }) => {
  const { deleteStudentProfile, updateStudentProfile } = useStudentProfiles();

  const [selectedProfile, setSelectedProfile] = useState<StudentProfileDto | null>(null);
  const [editMode, setEditMode] = useState(false);

  // ✅ Filter function for student types
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const filteredProfiles = profiles.filter(p => 
    typeFilter === "ALL" || p.studentType === typeFilter
  );

  if (!profiles || profiles.length === 0)
    return <p className="p-4 text-center text-gray-600 dark:text-gray-400">No student profiles found.</p>;

  const handleView = (profile: StudentProfileDto) => {
    setSelectedProfile(profile);
    setEditMode(false);
  };

  const handleEdit = (profile: StudentProfileDto) => {
    setSelectedProfile(profile);
    setEditMode(true);
  };

  const handleDelete = (id?: number) => {
    if (!id) return;
    if (confirm("Are you sure you want to delete this student profile?")) {
      deleteStudentProfile.mutate(id);
    }
  };

  const handleUpdate = (data: Partial<StudentProfileDto>) => {
    if (selectedProfile?.id) {
      updateStudentProfile.mutate({ id: selectedProfile.id, data });
      setSelectedProfile(null);
      setEditMode(false);
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "SCHOOL": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200";
      case "HOME": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200";
      case "ASPIRANT": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* ✅ Filter Bar */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <label className="text-sm font-medium">Filter by Type:</label>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="ALL">All Students ({profiles.length})</option>
          <option value="SCHOOL">School ({profiles.filter(p => p.studentType === "SCHOOL").length})</option>
          <option value="HOME">Home ({profiles.filter(p => p.studentType === "HOME").length})</option>
          <option value="ASPIRANT">Aspirant ({profiles.filter(p => p.studentType === "ASPIRANT").length})</option>
        </select>
      </div>

      {/* 🔹 Table List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse border border-gray-300 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Full Name</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Class</th>
              <th className="p-2 border">Department</th>
              <th className="p-2 border">Language</th>
              <th className="p-2 border text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="p-2 border">{p.id}</td>
                <td className="p-2 border font-medium">{p.fullName}</td>
                <td className="p-2 border">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadgeColor(p.studentType)}`}>
                    {p.studentType}
                  </span>
                </td>
                <td className="p-2 border">{p.className || p.classId || "-"}</td>
                <td className="p-2 border">{p.departmentName || p.departmentId || "-"}</td>
                <td className="p-2 border">
                  {p.chosenLanguage ? (
                    <span className="inline-flex items-center gap-1">
                      {p.chosenLanguage === "English" && "🇬🇧"}
                      {p.chosenLanguage === "French" && "🇫🇷"}
                      {p.chosenLanguage}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="p-2 border text-center space-x-2">
                  <button
                    onClick={() => handleView(p)}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(p)}
                    className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProfiles.length === 0 && (
        <p className="text-center text-gray-500 py-4">
          No {typeFilter !== "ALL" ? typeFilter : ""} students found.
        </p>
      )}

      {/* 🔹 Modal (View/Edit) */}
      {selectedProfile && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                {editMode ? "Edit Student Profile" : "Student Details"}
              </h2>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 text-2xl"
              >
                ✕
              </button>
            </div>

            {editMode ? (
              <StudentProfileForm
                initialData={selectedProfile}
                onSubmit={handleUpdate}
                isSubmitting={updateStudentProfile.isPending}
              />
            ) : (
              <StudentProfileCard profile={selectedProfile} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfileList;