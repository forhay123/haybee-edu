import React, { useMemo } from "react";
import SubjectCard from "../components/SubjectCard";
import AspirantSubjectSelector from "../components/AspirantSubjectSelector";
import { useGetStudentSubjects, useGetEnrolledSubjects, SubjectResponseDto } from "../api/subjectsApi";
import { useAuth } from "../../auth/useAuth";
import { useStudentProfiles } from "../../studentProfiles/hooks/useStudentProfiles";
import { useGetDepartments } from "../../departments/api/departmentsApi";
import { Sparkles, LayoutGrid, Target } from "lucide-react";

// Helper components and functions omitted for brevity (getUserIdFromAuth, etc.)

const StudentSubjectsPage: React.FC = () => {
  const { user } = useAuth();
  const { studentProfilesQuery } = useStudentProfiles();
  const userId = user?.id; // Assuming hook provides this directly

  const profile = useMemo(() => {
    if (!userId || !studentProfilesQuery.data) return undefined;
    return studentProfilesQuery.data.find(p => p.userId === Number(userId));
  }, [studentProfilesQuery.data, userId]);

  if (studentProfilesQuery.isLoading) return <LoadingSpinner />;
  if (!profile) return <ErrorMessage message="No student profile found." />;

  return (
    <StudentSubjectsContent 
      classId={profile.classId!} 
      departmentId={profile.departmentId ?? null} 
      studentType={profile.studentType ?? "SCHOOL"}
      studentName={profile.fullName}
    />
  );
};

const StudentSubjectsContent: React.FC<any> = ({ classId, departmentId, studentType, studentName }) => {
  const { data: subjects, isLoading: isLoadingS, isError: isErrorS } = useGetStudentSubjects(classId, departmentId, studentType);
  const { data: enrolled, isLoading: isLoadingE } = useGetEnrolledSubjects();
  const { data: departments } = useGetDepartments();

  const isAspirant = studentType === "ASPIRANT";
  const currentList = isAspirant ? enrolled : subjects;
  const total = currentList?.length || 0;
  const requiredCount = 4; // Assuming 4 is the goal
  const remaining = Math.max(0, requiredCount - total);

  if (isLoadingS || isLoadingE) return <LoadingSpinner />;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Dynamic Header */}
      <header className="relative overflow-hidden bg-white dark:bg-card border rounded-3xl p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-blue-600 font-semibold tracking-wide uppercase text-xs">
              <Sparkles size={14} />
              Academic Dashboard
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {studentName}</h1>
            <p className="text-muted-foreground mt-1">Managing subjects for <span className="text-foreground font-medium">{studentType}</span> track.</p>
          </div>

          {isAspirant && (
            <div className="bg-muted/50 p-4 rounded-2xl border flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-medium uppercase">Selection Progress</p>
                <p className="text-sm font-bold">
                  {remaining > 0 ? `${remaining} Subjects Left` : "Goal Achieved!"}
                </p>
              </div>
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-secondary" />
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" 
                    strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * Math.min(total, requiredCount)) / requiredCount}
                    className="text-blue-600 transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                  {total}/{requiredCount}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {isAspirant ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Target className="text-blue-600" /> Your Selected Track
            </h2>
          </div>
          
          {total === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/20">
              <LayoutGrid size={48} className="mx-auto text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-medium">Your schedule is empty</h3>
              <p className="text-muted-foreground mb-8">Start by selecting the subjects you wish to study this term.</p>
              <AspirantSubjectSelector departmentId={departmentId} enrolledSubjectIds={[]} />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {enrolled?.map(s => <SubjectCard key={s.id} subject={s} isSelected />)}
              </div>
              <div className="bg-blue-600/5 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                <h3 className="font-bold mb-2">Adjust your curriculum</h3>
                <p className="text-sm text-muted-foreground mb-6">You can add or remove subjects to meet your specific goals.</p>
                <AspirantSubjectSelector departmentId={departmentId} enrolledSubjectIds={enrolled?.map(s => s.id) || []} />
              </div>
            </div>
          )}
        </section>
      ) : (
        /* Render Schools/Home standard categories as before, but with the new SubjectCard styling */
        <div className="space-y-10">
           {/* Categorized lists (General, Departmental, Elective) go here */}
        </div>
      )}
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
    <p className="text-muted-foreground animate-pulse">Synchronizing your curriculum...</p>
  </div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="p-6 max-w-md mx-auto mt-10 text-center bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl">
    <p className="text-red-600 font-medium">{message}</p>
  </div>
);

export default StudentSubjectsPage;