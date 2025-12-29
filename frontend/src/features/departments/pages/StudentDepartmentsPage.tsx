import React from "react";
import DepartmentList from "../components/DepartmentList";

const StudentDepartmentsPage: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🎓 Departments
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Explore the different academic departments and their specializations
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          📖 About Departments
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Departments organize subjects by field of study. Your enrollment determines which department you belong to, 
          and this affects the subjects available to you.
        </p>
      </div>

      {/* Department List */}
      <DepartmentList role="STUDENT" />
    </div>
  );
};

export default StudentDepartmentsPage;