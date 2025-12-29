import React from "react";
import { ClassResponseDto } from "../api/classesApi";

interface ClassListProps {
  classes: ClassResponseDto[];
  onView?: (classItem: ClassResponseDto) => void;
  onEdit?: (classItem: ClassResponseDto) => void;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

const ClassList: React.FC<ClassListProps> = ({
  classes,
  onView,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  if (!classes.length) {
    return (
      <p className="text-muted-foreground text-center py-4">
        No classes found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Class Name</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Level</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Type</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Department</th>
            <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-200">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {classes.map((cls) => {
            // Auto-append department name for SENIOR classes if not already included
            let displayName = cls.name;
            if (cls.level === "SENIOR" && cls.department_name) {
              if (!displayName.toLowerCase().includes(cls.department_name.toLowerCase())) {
                displayName = `${displayName} ${cls.department_name}`;
              }
            }

            return (
              <tr key={cls.id}>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{displayName}</td>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{cls.level}</td>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{cls.student_type || "-"}</td>
                <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{cls.department_name || "-"}</td>
                <td className="px-4 py-2 text-sm text-center flex justify-center gap-2">
                  {onView && (
                    <button
                      onClick={() => onView(cls)}
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    >
                      View
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(cls)}
                      className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(cls.id)}
                      disabled={isDeleting}
                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs disabled:opacity-60"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ClassList;
