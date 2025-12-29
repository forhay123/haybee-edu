import React, { useState } from "react";
import { useStudentProfiles } from "../hooks/useStudentProfiles";
import StudentProfileList from "../components/StudentProfileList";
import { StudentProfileDto } from "../api/studentProfilesApi";

const TeacherStudentProfilesPage: React.FC = () => {
  const { studentProfilesQuery } = useStudentProfiles();
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");

  if (studentProfilesQuery.isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading students...</p>
        </div>
      </div>
    );
  }

  if (studentProfilesQuery.isError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">Error loading students.</p>
          <p className="text-red-500 text-sm mt-1">
            {studentProfilesQuery.error?.message || "Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  const allStudents = studentProfilesQuery.data || [];

  // ✅ Get unique classes for filter
  const uniqueClasses = Array.from(
    new Set(allStudents.map(s => s.className || s.classId?.toString()).filter(Boolean))
  );

  // ✅ Filter students
  const filteredStudents = allStudents.filter(s => {
    const typeMatch = selectedType === "ALL" || s.studentType === selectedType;
    const classMatch = selectedClass === "ALL" || 
                       s.className === selectedClass || 
                       s.classId?.toString() === selectedClass;
    return typeMatch && classMatch;
  });

  // ✅ Group students by type for statistics
  const stats = {
    total: allStudents.length,
    school: allStudents.filter(s => s.studentType === "SCHOOL").length,
    home: allStudents.filter(s => s.studentType === "HOME").length,
    aspirant: allStudents.filter(s => s.studentType === "ASPIRANT").length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with Stats */}
      <div>
        <h1 className="text-3xl font-bold mb-4">My Students</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg shadow">
            <p className="text-sm text-blue-600 dark:text-blue-400">School</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.school}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg shadow">
            <p className="text-sm text-green-600 dark:text-green-400">Home</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.home}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg shadow">
            <p className="text-sm text-purple-600 dark:text-purple-400">Aspirant</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.aspirant}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Student Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700"
            >
              <option value="ALL">All Types</option>
              <option value="SCHOOL">School Students</option>
              <option value="HOME">Home Students</option>
              <option value="ASPIRANT">Aspirants</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700"
            >
              <option value="ALL">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          {(selectedType !== "ALL" || selectedClass !== "ALL") && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedType("ALL");
                  setSelectedClass("ALL");
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Student List {filteredStudents.length !== allStudents.length && 
            `(${filteredStudents.length} of ${allStudents.length})`}
        </h2>
        <StudentProfileList profiles={filteredStudents} />
      </div>
    </div>
  );
};

export default TeacherStudentProfilesPage;