import React from "react";
import { DepartmentResponseDto } from "../api/departmentsApi";

interface DepartmentCardProps {
  department: DepartmentResponseDto;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
  onView?: (id: number) => void;
}

const DepartmentCard: React.FC<DepartmentCardProps> = ({
  department,
  onDelete,
  onView,
  isDeleting,
}) => {
  // Get department icon based on code or name
  const getDepartmentIcon = () => {
    const code = department.code?.toUpperCase();
    const name = department.name?.toLowerCase();
    
    if (code === 'SCI' || name?.includes('science')) return '🔬';
    if (code === 'COM' || name?.includes('commercial') || name?.includes('business')) return '💼';
    if (code === 'ART' || name?.includes('art') || name?.includes('humanities')) return '🎨';
    if (code === 'GEN' || name?.includes('general')) return '📚';
    return '🎓';
  };

  const getDepartmentColor = () => {
    const code = department.code?.toUpperCase();
    
    if (code === 'SCI') return 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800';
    if (code === 'COM') return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800';
    if (code === 'ART') return 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800';
    if (code === 'GEN') return 'from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-gray-200 dark:border-gray-700';
    return 'from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-200 dark:border-indigo-800';
  };

  return (
    <div className={`bg-gradient-to-br ${getDepartmentColor()} rounded-xl shadow-sm hover:shadow-md transition-all p-6 border relative`}>
      {/* Icon */}
      <div className="text-4xl mb-3">
        {getDepartmentIcon()}
      </div>

      {/* Department Name */}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
        {department.name}
      </h3>

      {/* Code Badge */}
      {department.code && (
        <div className="mb-3">
          <span className="inline-block px-3 py-1 bg-white/50 dark:bg-gray-800/50 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300">
            {department.code}
          </span>
        </div>
      )}

      {/* Description */}
      {department.description && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
          {department.description}
        </p>
      )}

      {/* Actions */}
      {(onView || onDelete) && (
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          {onView && (
            <button
              onClick={() => onView(department.id)}
              className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
            >
              View Details
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(department.id)}
              disabled={isDeleting}
              className={`px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition ${
                isDeleting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default DepartmentCard;