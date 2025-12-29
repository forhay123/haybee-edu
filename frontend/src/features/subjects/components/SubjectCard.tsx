import React from "react";
import { useNavigate } from "react-router-dom";
import { SubjectResponseDto } from "../api/subjectsApi";
import { useGetDepartments } from "../../departments/api/departmentsApi";
import { useGetClasses } from "../../classes/api/classesApi";
import { useAuth } from "../../auth/useAuth"; // ✅ same hook style as LessonTopicCard
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";

interface Props {
  subject: SubjectResponseDto;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

const SubjectCard: React.FC<Props> = ({ subject, onDelete, isDeleting }) => {
  const { data: departments } = useGetDepartments();
  const { data: classes } = useGetClasses();
  const navigate = useNavigate();
  const { accessToken } = useAuth(); // included for consistency
  const user = useSelector((state: RootState) => state.auth.user);

  const departmentName =
    subject.departmentId === null
      ? "General"
      : departments?.find((d) => d.id === subject.departmentId)?.name || "—";

  const className =
    subject.classId === null
      ? "—"
      : classes?.find((c) => c.id === subject.classId)?.name || subject.grade || "—";

  // ✅ Determine if user is student/parent
  const isStudentOrParent =
    user?.roles?.includes("STUDENT") || user?.roles?.includes("PARENT");

  // ✅ Navigate to correct page based on user role
  const handleViewLessons = () => {
    if (!user) {
      alert("Please log in to view lessons.");
      return;
    }

    if (isStudentOrParent) {
      navigate(`/subjects/${subject.id}/lesson-topics`);
    } else {
      navigate(`/subjects/${subject.id}/lessons`);
    }
  };

  return (
    <div className="bg-card rounded-2xl shadow p-4 hover:shadow-md transition-shadow relative">
      <h3 className="text-lg font-semibold text-foreground">{subject.name}</h3>

      <p className="text-sm text-muted-foreground mt-1">
        <strong>Code:</strong> {subject.code}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        <strong>Grade:</strong> {subject.grade}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        <strong>Level:</strong> {subject.level}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        <strong>Compulsory:</strong> {subject.compulsory ? "Yes" : "No"}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        <strong>Department:</strong> {departmentName}
      </p>

      {/* ✅ View Lessons Button */}
      <button
        onClick={handleViewLessons}
        className="mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        📚 View Lessons
      </button>

      {onDelete && (
        <button
          onClick={() => onDelete(subject.id)}
          disabled={isDeleting}
          className={`absolute top-3 right-3 text-destructive hover:opacity-80 transition ${
            isDeleting ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {isDeleting ? "…" : "✖"}
        </button>
      )}
    </div>
  );
};

export default SubjectCard;
