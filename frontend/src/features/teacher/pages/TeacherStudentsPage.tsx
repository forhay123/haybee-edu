import React, { useState, useMemo } from "react";
import { useTeacherStudents } from "../../users/api/usersApi";
import { useGetTeacherClasses } from "../../classes/api/classesApi";

const TeacherStudentsPage: React.FC = () => {
  const { data: students, isLoading: loadingStudents, isError } = useTeacherStudents();
  const { data: classes, isLoading: loadingClasses } = useGetTeacherClasses();
  
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!selectedClassId) return students;
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  const isLoading = loadingStudents || loadingClasses;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading students...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 font-medium">Failed to load students</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">My Students</h1>
        <p className="text-muted-foreground">
          View and manage students in your classes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Students</p>
          <p className="text-2xl font-bold">{students?.length || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400">Classes</p>
          <p className="text-2xl font-bold">{classes?.length || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <p className="text-sm text-gray-600 dark:text-gray-400">Filtered</p>
          <p className="text-2xl font-bold">{filteredStudents.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium">Filter by Class:</label>
          <select
            value={selectedClassId || ""}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
            className="border rounded-lg p-2 min-w-[200px] dark:bg-gray-700"
          >
            <option value="">All Classes ({students?.length || 0})</option>
            {classes?.map((cls) => {
              const count = students?.filter(s => s.classId === cls.id).length || 0;
              return (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({count})
                </option>
              );
            })}
          </select>
          {selectedClassId && (
            <button
              onClick={() => setSelectedClassId(null)}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg font-medium">No students found</p>
            <p className="text-sm mt-1">
              {selectedClassId
                ? "No students in this class"
                : "You don't have any students assigned yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Department</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Subjects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 font-medium">{student.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                    <td className="px-4 py-3 text-sm">{student.className || "-"}</td>
                    <td className="px-4 py-3 text-sm">{student.departmentName || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        student.studentType === "SCHOOL" ? "bg-blue-100 text-blue-800" :
                        student.studentType === "HOME" ? "bg-green-100 text-green-800" :
                        "bg-purple-100 text-purple-800"
                      }`}>
                        {student.studentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.subjectIds?.length || 0} subjects
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherStudentsPage;