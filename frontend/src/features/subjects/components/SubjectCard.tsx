import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { SubjectResponseDto } from "../api/subjectsApi";
import { useGetDepartments } from "../../departments/api/departmentsApi";
import { useGetClasses } from "../../classes/api/classesApi";
import { RootState } from "../../../store/store";
import { BookOpen, CheckCircle2, Info } from "lucide-react";

interface Props {
  subject: SubjectResponseDto;
  isSelected?: boolean;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

const SubjectCard: React.FC<Props> = ({ subject, isSelected, onDelete, isDeleting }) => {
  const { data: departments } = useGetDepartments();
  const { data: classes } = useGetClasses();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const isStudentOrParent = user?.roles?.includes("STUDENT") || user?.roles?.includes("PARENT");

  const departmentName = subject.departmentId === null || subject.departmentId === 4
    ? "General"
    : departments?.find((d) => d.id === subject.departmentId)?.name || "—";

  const handleViewLessons = () => {
    if (!user) return alert("Please log in to view lessons.");
    const path = isStudentOrParent ? "lesson-topics" : "lessons";
    navigate(`/subjects/${subject.id}/${path}`);
  };

  return (
    <div className={`group relative flex flex-col bg-card rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-md
      ${isSelected ? "border-blue-500 bg-blue-50/30 dark:bg-blue-900/10" : "border-transparent"}`}>
      
      {isSelected && (
        <div className="absolute top-3 right-3 text-blue-600 animate-in zoom-in">
          <CheckCircle2 size={20} />
        </div>
      )}

      <div className="p-5 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wider rounded">
            {subject.code}
          </span>
          {subject.compulsory && (
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase rounded">
              Required
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-foreground group-hover:text-blue-600 transition-colors leading-tight">
          {subject.name}
        </h3>

        <div className="mt-4 grid grid-cols-2 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Info size={14} className="opacity-70" />
            <span>Grade {subject.grade}</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground/80">
            <span>{subject.level}</span>
          </div>
          <div className="col-span-2 opacity-80 italic">
            {departmentName}
          </div>
        </div>
      </div>

      <div className="p-4 pt-0">
        <button
          onClick={handleViewLessons}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all font-medium text-sm shadow-sm"
        >
          <BookOpen size={16} />
          View Lessons
        </button>
      </div>

      {onDelete && (
        <button
          onClick={() => onDelete(subject.id)}
          disabled={isDeleting}
          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-[10px] shadow hover:scale-110 transition-transform"
        >
          {isDeleting ? "..." : "✕"}
        </button>
      )}
    </div>
  );
};

export default SubjectCard;