import React from "react";
import { TeacherProfile } from "../api/teacherProfilesApi";
import TeacherProfileCard from "./TeacherProfileCard";

interface TeacherProfileListProps {
  teachers: TeacherProfile[];
  onEdit?: (teacher: TeacherProfile) => void;
  onDelete?: (teacherId: number) => void;
  onAssignClasses?: (teacher: TeacherProfile) => void;
  isLoading?: boolean;
}

const TeacherProfileList: React.FC<TeacherProfileListProps> = ({
  teachers,
  onEdit,
  onDelete,
  onAssignClasses,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border border-border">
        <p className="text-muted-foreground text-lg">No teacher profiles found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Create a new teacher profile to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {teachers.map((teacher) => (
        <TeacherProfileCard
          key={teacher.id}
          teacher={teacher}
          onEdit={onEdit}
          onDelete={onDelete}
          onAssignClasses={onAssignClasses}
        />
      ))}
    </div>
  );
};

export default TeacherProfileList;