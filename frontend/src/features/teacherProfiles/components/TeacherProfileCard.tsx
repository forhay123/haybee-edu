import React from "react";
import { TeacherProfile } from "../api/teacherProfilesApi";

interface TeacherProfileCardProps {
  teacher: TeacherProfile;
  onEdit?: (teacher: TeacherProfile) => void;
  onDelete?: (teacherId: number) => void;
  onAssignClasses?: (teacher: TeacherProfile) => void;
}

const TeacherProfileCard: React.FC<TeacherProfileCardProps> = ({
  teacher,
  onEdit,
  onDelete,
  onAssignClasses,
}) => {
  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">
            {teacher.userName}
          </h3>
          <p className="text-sm text-muted-foreground">{teacher.userEmail}</p>
        </div>
        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
          Teacher
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm">
          <span className="text-muted-foreground mr-2">🏢 Department:</span>
          <span className="font-medium text-card-foreground">
            {teacher.departmentName}
          </span>
        </div>

        {teacher.specialization && (
          <div className="flex items-center text-sm">
            <span className="text-muted-foreground mr-2">📚 Specialization:</span>
            <span className="font-medium text-card-foreground">
              {teacher.specialization}
            </span>
          </div>
        )}

        {teacher.assignedClassIds && teacher.assignedClassIds.length > 0 && (
          <div className="flex items-center text-sm">
            <span className="text-muted-foreground mr-2">🏫 Classes:</span>
            <span className="font-medium text-card-foreground">
              {teacher.assignedClassIds.length} assigned
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {onEdit && (
          <button
            onClick={() => onEdit(teacher)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
          >
            Edit
          </button>
        )}
        {onAssignClasses && (
          <button
            onClick={() => onAssignClasses(teacher)}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/90 transition-colors"
          >
            Assign Classes
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(teacher.id)}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm hover:bg-destructive/90 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default TeacherProfileCard;

