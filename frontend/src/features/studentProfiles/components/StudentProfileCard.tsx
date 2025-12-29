import React from "react";
import { StudentProfileDto } from "../api/studentProfilesApi";

interface Props {
  profile: StudentProfileDto;
}

const StudentProfileCard: React.FC<Props> = ({ profile }) => {
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "SCHOOL": return "bg-blue-500";
      case "HOME": return "bg-green-500";
      case "ASPIRANT": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="p-6 border rounded-lg shadow bg-white dark:bg-gray-800">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        {profile.fullName}
      </h2>
      
      <div className="space-y-3 text-sm">
        {/* Student Type */}
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600 dark:text-gray-400">Student Type:</span>
          <span className={`px-3 py-1 rounded text-white font-medium ${getTypeBadgeColor(profile.studentType)}`}>
            {profile.studentType}
          </span>
        </div>

        {/* Class - Required for SCHOOL/HOME, Optional for ASPIRANT */}
        <div className="flex justify-between">
          <span className="font-medium text-gray-600 dark:text-gray-400">Class:</span>
          <span className="text-gray-900 dark:text-white">
            {profile.className || profile.classId || "-"}
          </span>
        </div>

        {/* Department - Required for SCHOOL/HOME, Optional for ASPIRANT */}
        <div className="flex justify-between">
          <span className="font-medium text-gray-600 dark:text-gray-400">Department:</span>
          <span className="text-gray-900 dark:text-white">
            {profile.departmentName || profile.departmentId || "-"}
          </span>
        </div>

        {/* Chosen Language */}
        {profile.chosenLanguage && (
          <div className="flex justify-between">
            <span className="font-medium text-gray-600 dark:text-gray-400">Language:</span>
            <span className="text-gray-900 dark:text-white">{profile.chosenLanguage}</span>
          </div>
        )}

        {/* ✅ ASPIRANT: Show enrolled subjects */}
        {profile.studentType === "ASPIRANT" && (
          <div className="mt-4 pt-4 border-t">
            <div className="mb-2">
              <span className="font-medium text-gray-600 dark:text-gray-400 block">
                Enrolled Subjects:
              </span>
            </div>
            {profile.subjectNames && profile.subjectNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.subjectNames.map((subject, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full text-xs font-medium"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400 italic">
                No subjects enrolled yet. Please visit the Subjects page to select your subjects.
              </p>
            )}
          </div>
        )}

        {/* ✅ SCHOOL/HOME: Info about their subjects */}
        {(profile.studentType === "SCHOOL" || profile.studentType === "HOME") && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <strong>Note:</strong> Your subjects are automatically assigned based on your class and department.
              Visit the Subjects page to view them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfileCard;