import React from "react";
import { useEnrollments } from "../hooks/useEnrollments";
import EnrollmentCard from "../components/EnrollmentCard";

const StudentEnrollmentPage: React.FC = () => {
  const { myEnrollmentsQuery, isStudent } = useEnrollments();

  // ✅ Check if user is authorized
  if (!isStudent) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Access Denied</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">
            You must be a student to view this page.
          </p>
        </div>
      </div>
    );
  }

  if (myEnrollmentsQuery.isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your enrollment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (myEnrollmentsQuery.isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Error loading your enrollment</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">
            {myEnrollmentsQuery.error?.message || "Please try again or contact your administrator."}
          </p>
        </div>
      </div>
    );
  }

  const enrollments = myEnrollmentsQuery.data || [];
  const activeEnrollment = enrollments.find(e => e.active);
  const inactiveEnrollments = enrollments.filter(e => !e.active);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📚 My Enrollment
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View your current and past class enrollments
        </p>
      </div>

      {/* No enrollments */}
      {enrollments.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-2">
            No Enrollment Found
          </h3>
          <p className="text-amber-700 dark:text-amber-300">
            You are not currently enrolled in any class. Please contact your administrator.
          </p>
        </div>
      )}

      {/* Active Enrollment */}
      {activeEnrollment && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-1 bg-green-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Current Enrollment
            </h2>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
              Active
            </span>
          </div>
          <EnrollmentCard enrollment={activeEnrollment} />
        </div>
      )}

      {/* Inactive Enrollments (History) */}
      {inactiveEnrollments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-1 bg-gray-400 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Enrollment History
            </h2>
            <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-full">
              {inactiveEnrollments.length} past enrollment{inactiveEnrollments.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-3">
            {inactiveEnrollments.map(enrollment => (
              <div key={enrollment.id} className="opacity-60">
                <EnrollmentCard enrollment={enrollment} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      {activeEnrollment && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            ℹ️ About Your Enrollment
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Your enrollment determines which class materials and lessons you can access</li>
            <li>• Only one enrollment can be active at a time</li>
            <li>• If you need to change your enrollment, contact your administrator</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default StudentEnrollmentPage;