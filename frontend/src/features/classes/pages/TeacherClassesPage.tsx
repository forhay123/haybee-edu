import React from "react";
import { useGetTeacherClasses } from "../api/classesApi";
import { useNavigate } from "react-router-dom";

const TeacherClassesPage: React.FC = () => {
  const { data: classes, isLoading, isError } = useGetTeacherClasses();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your classes...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load classes</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🏫 My Classes
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View students in the classes you teach. Click on a class to see enrolled students.
        </p>
      </div>

      {/* Classes Grid */}
      {!classes || classes.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            No classes assigned
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Contact your administrator to have classes assigned to you.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            You are assigned to <strong>{classes.length}</strong> class{classes.length !== 1 ? "es" : ""}
          </p>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/classes/${cls.id}/students`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {cls.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Level: {cls.level}
                    </p>
                    {cls.student_type && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Type: {cls.student_type}
                      </p>
                    )}
                  </div>
                  {cls.department_name && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded font-medium">
                      {cls.department_name}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/classes/${cls.id}/students`);
                  }}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  👥 View Students
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherClassesPage;