import React, { useState } from "react";
import DepartmentCard from "./DepartmentCard";
import { useGetDepartments, useDeleteDepartment } from "../api/departmentsApi";

interface DepartmentListProps {
  role?: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
}

const DepartmentList: React.FC<DepartmentListProps> = ({ role }) => {
  const { data: departments, isLoading, isError } = useGetDepartments();
  const { mutate: deleteDepartment, isPending: isDeleting } = useDeleteDepartment();
  const [searchTerm, setSearchTerm] = useState("");

  const handleDelete = (id: number) => {
    if (window.confirm("⚠️ Are you sure you want to delete this department? This action cannot be undone.")) {
      deleteDepartment(id, {
        onSuccess: () => {
          alert("✅ Department deleted successfully!");
        },
        onError: (error: any) => {
          alert(`❌ Failed to delete: ${error.response?.data?.message || error.message}`);
        }
      });
    }
  };

  // Filter departments by search term
  const filteredDepartments = departments?.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading departments...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400 font-medium">Failed to load departments</p>
        <p className="text-red-500 dark:text-red-500 text-sm mt-1">
          Please try again or contact your administrator.
        </p>
      </div>
    );
  }

  if (!departments || departments.length === 0) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center">
        <div className="text-6xl mb-4">📂</div>
        <p className="text-amber-600 dark:text-amber-400 font-medium">No departments found</p>
        {role === "ADMIN" && (
          <p className="text-amber-500 dark:text-amber-500 text-sm mt-1">
            Create your first department to get started.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar (for role with many departments) */}
      {departments.length > 3 && (
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Search departments by name, code, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Department Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing <strong>{filteredDepartments?.length || 0}</strong> of <strong>{departments.length}</strong> departments
        </p>
      </div>

      {/* Department Grid */}
      {filteredDepartments && filteredDepartments.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredDepartments.map((dept) => (
            <DepartmentCard
              key={dept.id}
              department={dept}
              onDelete={role === "ADMIN" ? handleDelete : undefined}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No departments match your search: <strong>"{searchTerm}"</strong>
          </p>
          <button
            onClick={() => setSearchTerm("")}
            className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
};

export default DepartmentList;