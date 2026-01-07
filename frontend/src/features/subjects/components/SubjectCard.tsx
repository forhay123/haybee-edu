import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { SubjectResponseDto } from "../api/subjectsApi";
import { useGetDepartments } from "../../departments/api/departmentsApi";
import { RootState } from "../../../store/store";
import { 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  GraduationCap, 
  Tag,
  Trash2
} from "lucide-react";

interface SubjectCardProps {
  subject: SubjectResponseDto;
  /** "default" for grids, "compact" for mobile-friendly lists */
  variant?: "default" | "compact";
  /** Shows a checkmark and blue border */
  isSelected?: boolean;
  /** If provided, shows a delete button */
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ 
  subject, 
  variant = "default", 
  isSelected, 
  onDelete, 
  isDeleting 
}) => {
  const navigate = useNavigate();
  const { data: departments } = useGetDepartments();
  const user = useSelector((state: RootState) => state.auth.user);

  const isStudentOrParent = user?.roles?.includes("STUDENT") || user?.roles?.includes("PARENT");

  const departmentName = subject.departmentId === null || subject.departmentId === 4
    ? "General"
    : departments?.find((d) => d.id === subject.departmentId)?.name || "Departmental";

  const handleNavigation = (e: React.MouseEvent) => {
    // Prevent navigation if clicking the delete button
    if ((e.target as HTMLElement).closest('button')?.title === "Delete") return;
    
    const path = isStudentOrParent ? "lesson-topics" : "lessons";
    navigate(`/subjects/${subject.id}/${path}`);
  };

  /** * COMPACT VARIANT
   * Best for mobile "My Subjects" lists and managing selections
   */
  if (variant === "compact") {
    return (
      <div 
        onClick={handleNavigation}
        className={`group flex items-center gap-4 bg-white dark:bg-card p-3 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer
          ${isSelected ? "border-blue-500 shadow-sm ring-1 ring-blue-500/20" : "border-slate-200 dark:border-slate-800"}`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors
          ${isSelected ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
          <BookOpen size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-foreground truncate">{subject.name}</h3>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
            <span>{subject.code}</span>
            <span>•</span>
            <span>Grade {subject.grade}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onDelete ? (
            <button
              title="Delete"
              onClick={(e) => { e.stopPropagation(); onDelete(subject.id); }}
              disabled={isDeleting}
              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          ) : (
            <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
          )}
        </div>
      </div>
    );
  }

  /** * DEFAULT VARIANT
   * Best for Browsing/Discovery Grids
   */
  return (
    <div 
      onClick={handleNavigation}
      className={`group relative flex flex-col bg-white dark:bg-card rounded-3xl border transition-all cursor-pointer overflow-hidden
        ${isSelected 
          ? "border-blue-500 shadow-md ring-1 ring-blue-500/20" 
          : "border-slate-200 dark:border-slate-800 hover:border-blue-300 hover:shadow-lg"}`}
    >
      {isSelected && (
        <div className="absolute top-4 right-4 text-blue-600 animate-in zoom-in">
          <CheckCircle2 size={22} fill="currentColor" className="text-white fill-blue-600" />
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase rounded-lg">
            <Tag size={10} />
            {subject.code}
          </span>
          {subject.compulsory && (
            <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase rounded-lg">
              Core
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold text-foreground leading-tight group-hover:text-blue-600 transition-colors mb-4">
          {subject.name}
        </h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GraduationCap size={16} className="text-slate-400" />
            <span>Grade {subject.grade} • {subject.level}</span>
          </div>
          <div className="text-xs font-medium text-slate-400 uppercase tracking-tight">
            {departmentName}
          </div>
        </div>
      </div>

      <div className="mt-auto p-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">View Content</span>
        <div className="w-8 h-8 rounded-full bg-white dark:bg-card border flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
          <ChevronRight size={16} />
        </div>
      </div>

      {onDelete && (
        <button
          title="Delete"
          onClick={(e) => { e.stopPropagation(); onDelete(subject.id); }}
          disabled={isDeleting}
          className="absolute top-2 right-2 p-2 bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-full text-red-500 shadow-sm hover:bg-red-50 transition-colors"
        >
          {isDeleting ? "..." : <Trash2 size={16} />}
        </button>
      )}
    </div>
  );
};

export default SubjectCard;