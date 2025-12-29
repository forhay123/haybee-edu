import React from "react";
import { ClassResponseDto } from "../api/classesApi";

interface ClassCardProps {
  classItem: ClassResponseDto;
  onView?: (classItem: ClassResponseDto) => void;
  onEdit?: (classItem: ClassResponseDto) => void;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

const ClassCard: React.FC<ClassCardProps> = ({
  classItem,
  onView,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  return (
    <div className="border rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800 flex flex-col justify-between">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{classItem.name}</h3>
        <p className="text-sm text-muted-foreground">
          Level: {classItem.level} | Type: {classItem.student_type ?? "-"}
        </p>
        <p className="text-sm text-muted-foreground">
          Department: {classItem.department_name ?? "N/A"}
        </p>
      </div>

      <div className="flex gap-2">
        {onView && (
          <button
            onClick={() => onView(classItem)}
            className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(classItem)}
            className="flex-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(classItem.id)}
            disabled={isDeleting}
            className="flex-1 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default ClassCard;
