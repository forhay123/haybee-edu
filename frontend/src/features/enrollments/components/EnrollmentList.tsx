import React, { useState } from "react";
import EnrollmentCard from "./EnrollmentCard";
import { EnrollmentDto } from "../api/enrollmentsApi";

interface EnrollmentListProps {
  enrollments: EnrollmentDto[];
  onDeactivate?: (id: number) => void;
  onDelete?: (id: number) => void;
  deactivatingId?: number;
  deletingId?: number;
}

const EnrollmentList: React.FC<EnrollmentListProps> = ({
  enrollments = [],
  onDeactivate,
  onDelete,
  deactivatingId,
  deletingId,
}) => {
  const [viewId, setViewId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  if (!Array.isArray(enrollments) || enrollments.length === 0) {
    return <p className="text-center p-4 text-gray-600 dark:text-gray-400">No enrollments found.</p>;
  }

  // ✅ Filter enrollments
  const filteredEnrollments = enrollments.filter(e => {
    const typeMatch = filterType === "ALL" || e.studentType === filterType;
    const statusMatch = filterStatus === "ALL" || 
                       (filterStatus === "ACTIVE" && e.active) ||
                       (filterStatus === "INACTIVE" && !e.active);
    return typeMatch && statusMatch;
  });

  // ✅ Get counts for badges
  const counts = {
    total: enrollments.length,
    active: enrollments.filter(e => e.active).length,
    inactive: enrollments.filter(e => !e.active).length,
    school: enrollments.filter(e => e.studentType === "SCHOOL").length,
    home: enrollments.filter(e => e.studentType === "HOME").length,
    aspirant: enrollments.filter(e => e.studentType === "ASPIRANT").length,
  };

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case "SCHOOL": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200";
      case "HOME": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200";
      case "ASPIRANT": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      {/* ✅ Filters and Stats */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <div className="px-3 py-1 bg-white dark:bg-gray-700 rounded-full">
            Total: <strong>{counts.total}</strong>
          </div>
          <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full text-green-800 dark:text-green-200">
            Active: <strong>{counts.active}</strong>
          </div>
          <div className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded-full">
            Inactive: <strong>{counts.inactive}</strong>
          </div>
          <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-800 dark:text-blue-200">
            School: <strong>{counts.school}</strong>
          </div>
          <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full text-green-800 dark:text-green-200">
            Home: <strong>{counts.home}</strong>
          </div>
          <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-800 dark:text-purple-200">
            Aspirant: <strong>{counts.aspirant}</strong>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="ALL">All Types</option>
            <option value="SCHOOL">School</option>
            <option value="HOME">Home</option>
            <option value="ASPIRANT">Aspirant</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {(filterType !== "ALL" || filterStatus !== "ALL") && (
            <button
              onClick={() => {
                setFilterType("ALL");
                setFilterStatus("ALL");
              }}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ✅ Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse border border-gray-300 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="p-2 border">ID</th>
              <th className="p-2 border">Student</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Class</th>
              <th className="p-2 border">Session</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEnrollments.map((enrollment) => (
              <tr
                key={enrollment.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                <td className="p-2 border text-sm">{enrollment.id}</td>
                <td className="p-2 border text-sm font-medium">{enrollment.studentName}</td>
                <td className="p-2 border">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadge(enrollment.studentType)}`}>
                    {enrollment.studentType || "SCHOOL"}
                  </span>
                </td>
                <td className="p-2 border text-sm">{enrollment.className}</td>
                <td className="p-2 border text-sm">{enrollment.sessionName}</td>
                <td className="p-2 border">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    enrollment.active 
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200" 
                      : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }`}>
                    {enrollment.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-2 border space-x-2 flex flex-wrap gap-2">
                  {/* View toggle */}
                  <button
                    className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                    onClick={() =>
                      setViewId(viewId === enrollment.id ? null : enrollment.id)
                    }
                  >
                    {viewId === enrollment.id ? "Hide" : "View"}
                  </button>

                  {/* Deactivate */}
                  {onDeactivate && enrollment.active && (
                    <button
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 text-xs"
                      onClick={() => onDeactivate(enrollment.id)}
                      disabled={deactivatingId === enrollment.id}
                    >
                      {deactivatingId === enrollment.id ? "…" : "Deactivate"}
                    </button>
                  )}

                  {/* Delete */}
                  {onDelete && (
                    <button
                      className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50 text-xs"
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to delete enrollment #${enrollment.id}?`
                          )
                        ) {
                          onDelete(enrollment.id);
                        }
                      }}
                      disabled={deletingId === enrollment.id}
                    >
                      {deletingId === enrollment.id ? "…" : "Delete"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredEnrollments.length === 0 && (
        <p className="text-center text-gray-500 py-4">
          No enrollments match your filters.
        </p>
      )}

      {/* Expanded view card */}
      {viewId && (
        <div className="mt-4">
          {filteredEnrollments
            .filter((e) => e.id === viewId)
            .map((e) => (
              <EnrollmentCard
                key={e.id}
                enrollment={e}
                onDeactivate={onDeactivate}
                isDeactivating={deactivatingId === e.id}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default EnrollmentList;