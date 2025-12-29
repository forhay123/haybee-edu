import React from "react";
import { EnrollmentDto } from "../api/enrollmentsApi";

interface EnrollmentCardProps {
  enrollment: EnrollmentDto;
  onDeactivate?: (id: number) => void;
  isDeactivating?: boolean;
}

const EnrollmentCard: React.FC<EnrollmentCardProps> = ({
  enrollment,
  onDeactivate,
  isDeactivating,
}) => {
  const {
    id,
    studentName,
    studentProfileId,
    studentType,
    className,
    classEntityId,
    sessionName,
    sessionId,
    active,
    enrolledOn,
  } = enrollment;

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case "SCHOOL": 
        return { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200", icon: "🏫" };
      case "HOME": 
        return { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200", icon: "🏠" };
      case "ASPIRANT": 
        return { color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200", icon: "🎓" };
      default: 
        return { color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200", icon: "📚" };
    }
  };

  const typeBadge = getTypeBadge(studentType);

  return (
    <div className={`relative bg-white dark:bg-gray-800 border-2 rounded-xl p-6 shadow-sm hover:shadow-md transition ${
      active 
        ? "border-green-300 dark:border-green-700" 
        : "border-gray-200 dark:border-gray-700"
    }`}>
      {/* Status Badge - Top Right */}
      <div className="absolute top-4 right-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          active 
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200" 
            : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
        }`}>
          {active ? "✓ Active" : "Inactive"}
        </span>
      </div>

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {className || `Class #${classEntityId}`}
        </h3>
        {studentType && (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${typeBadge.color}`}>
              {typeBadge.icon} {studentType}
            </span>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {studentName && (
          <div className="flex items-start gap-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">👤</span>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Student</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{studentName}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <span className="text-gray-500 dark:text-gray-400 text-sm">📅</span>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Session</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {sessionName || `Session #${sessionId}`}
            </p>
          </div>
        </div>

        {enrolledOn && (
          <div className="flex items-start gap-2">
            <span className="text-gray-500 dark:text-gray-400 text-sm">📆</span>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Enrolled On</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {new Date(enrolledOn).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2">
          <span className="text-gray-500 dark:text-gray-400 text-sm">🆔</span>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Enrollment ID</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">#{id}</p>
          </div>
        </div>
      </div>

      {/* Admin Action Button */}
      {onDeactivate && active && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onDeactivate(id)}
            disabled={isDeactivating}
            className="w-full px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed transition font-medium"
          >
            {isDeactivating ? "Deactivating..." : "Deactivate Enrollment"}
          </button>
        </div>
      )}
    </div>
  );
};

export default EnrollmentCard;