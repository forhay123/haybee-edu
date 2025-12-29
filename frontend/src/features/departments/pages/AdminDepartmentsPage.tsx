import React from "react";
import DepartmentList from "../components/DepartmentList";
import DepartmentForm from "../components/DepartmentForm";

const AdminDepartmentsPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🏛️ Manage Departments
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create, update, and organize academic departments
        </p>
      </div>

      {/* Create Department Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Create New Department</h2>
        <DepartmentForm />
      </div>

      {/* Department List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">All Departments</h2>
        <DepartmentList role="ADMIN" />
      </div>
    </div>
  );
};

export default AdminDepartmentsPage;