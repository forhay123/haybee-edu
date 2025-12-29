import React, { useMemo } from "react";
import SubjectCard from "../components/SubjectCard";
import AspirantSubjectSelector from "../components/AspirantSubjectSelector";
import { 
  useGetStudentSubjects, 
  useGetEnrolledSubjects,
  SubjectResponseDto 
} from "../api/subjectsApi";
import { useAuth } from "../../auth/useAuth";
import { useStudentProfiles } from "../../studentProfiles/hooks/useStudentProfiles";
import { useGetDepartments } from "../../departments/api/departmentsApi";

const getUserIdFromAuth = (user: any): number | undefined => {
  if (!user) return undefined;
  const id = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
  return isNaN(id) ? undefined : id;
};

const getDepartmentCategoryName = (departmentId: number | null, departments: any[]): string => {
  if (departmentId === null || departmentId === 4) return "General";
  const dept = departments?.find(d => d.id === departmentId);
  return dept?.name || `Department ${departmentId}`;
};

const StudentSubjectsPage: React.FC = () => {
  const { user } = useAuth();
  const userId = getUserIdFromAuth(user);
  const { studentProfilesQuery } = useStudentProfiles();
  
  const profile = useMemo(() => {
    if (!userId || !studentProfilesQuery.data) return undefined;
    return studentProfilesQuery.data.find(p => p.userId === userId);
  }, [studentProfilesQuery.data, userId]);

  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">You are not logged in.</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">Please log in to view your subjects.</p>
        </div>
      </div>
    );
  }

  if (studentProfilesQuery.isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (studentProfilesQuery.isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load student profile.</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">
            {studentProfilesQuery.error?.message || "Please try again or contact your administrator."}
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-amber-600 dark:text-amber-400 font-medium">No student profile found.</p>
          <p className="text-amber-500 dark:text-amber-500 text-sm mt-1">
            Please contact your administrator to create your student profile.
          </p>
        </div>
      </div>
    );
  }

  const CLASS_ID = profile.classId;
  const DEPARTMENT_ID = profile.departmentId ?? null;
  const STUDENT_TYPE = profile.studentType ?? "SCHOOL";

  if (!CLASS_ID) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-amber-600 dark:text-amber-400 font-medium">Profile incomplete.</p>
          <p className="text-amber-500 dark:text-amber-500 text-sm mt-1">
            Your profile is missing class information. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return <StudentSubjectsContent 
    classId={CLASS_ID} 
    departmentId={DEPARTMENT_ID} 
    studentType={STUDENT_TYPE}
    studentName={profile.fullName || user.fullName}
  />;
};

interface StudentSubjectsContentProps {
  classId: number;
  departmentId: number | null;
  studentType: "SCHOOL" | "HOME" | "ASPIRANT";
  studentName?: string;
}

const StudentSubjectsContent: React.FC<StudentSubjectsContentProps> = ({
  classId,
  departmentId,
  studentType,
  studentName
}) => {
  // ✅ Hooks for SCHOOL and HOME students
  const { data: subjects, isLoading: isLoadingSubjects, isError: isErrorSubjects, error: errorSubjects } = useGetStudentSubjects(
    classId, 
    departmentId, 
    studentType
  );
  
  // ✅ Hooks for ASPIRANT students
  const { data: enrolledSubjects, isLoading: isLoadingEnrolled } = useGetEnrolledSubjects();
  const { data: departments } = useGetDepartments();

  const categorizedSubjects = useMemo(() => {
    const subjectList = studentType === "ASPIRANT" ? enrolledSubjects : subjects;
    
    if (!subjectList) {
      return { general: [], departmental: [], elective: [] };
    }

    const general: SubjectResponseDto[] = [];
    const departmental: SubjectResponseDto[] = [];
    const elective: SubjectResponseDto[] = [];

    subjectList.forEach((subj) => {
      if (subj.departmentId === null || subj.departmentId === 4) {
        general.push(subj);
      } else if (subj.departmentId === departmentId) {
        departmental.push(subj);
      } else {
        elective.push(subj);
      }
    });

    general.sort((a, b) => a.name.localeCompare(b.name));
    departmental.sort((a, b) => a.name.localeCompare(b.name));
    elective.sort((a, b) => a.name.localeCompare(b.name));

    return { general, departmental, elective };
  }, [subjects, enrolledSubjects, departmentId, studentType]);

  const currentSubjects = studentType === "ASPIRANT" ? enrolledSubjects : subjects;
  const totalSubjects = currentSubjects?.length || 0;
  const compulsoryCount = currentSubjects?.filter(s => s.compulsory).length || 0;

  // Loading state
  const isLoading = studentType === "ASPIRANT" ? isLoadingEnrolled : isLoadingSubjects;
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading subjects...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state (only for SCHOOL/HOME)
  if (studentType !== "ASPIRANT" && isErrorSubjects) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load subjects.</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">
            {errorSubjects instanceof Error ? errorSubjects.message : "Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <h1 className="text-2xl font-bold text-foreground">My Subjects</h1>
        {studentName && (
          <p className="text-sm text-muted-foreground mt-1">
            <strong>Student:</strong> {studentName}
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          <strong>Type:</strong> {studentType}
          {departmentId && <> | <strong>Department ID:</strong> {departmentId}</>}
        </p>
        <p className="text-muted-foreground mt-2">
          📚 {studentType === "ASPIRANT" && totalSubjects === 0 ? (
            "No subjects enrolled yet"
          ) : (
            <>Viewing <strong>{totalSubjects}</strong> subject{totalSubjects !== 1 ? 's' : ''}</>
          )}
        </p>
      </div>

      {/* ASPIRANT: Show subject selector if no enrolled subjects */}
      {studentType === "ASPIRANT" && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            {totalSubjects > 0 ? "My Enrolled Subjects" : "Choose Your Subjects"}
          </h2>
          
          {totalSubjects === 0 ? (
            <AspirantSubjectSelector 
              departmentId={departmentId} 
              enrolledSubjectIds={[]}
            />
          ) : (
            <div className="space-y-6">
              {/* Show enrolled subjects */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {enrolledSubjects?.map((subj) => (
                  <SubjectCard key={subj.id} subject={subj} />
                ))}
              </div>
              
              {/* Option to change subjects */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                  Want to change your subject selection?
                </p>
                <AspirantSubjectSelector 
                  departmentId={departmentId} 
                  enrolledSubjectIds={enrolledSubjects?.map(s => s.id) || []}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* SCHOOL/HOME: Show all subjects */}
      {studentType !== "ASPIRANT" && (
        <>
          {totalSubjects === 0 ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-blue-600 dark:text-blue-400 font-medium">No subjects available.</p>
              <p className="text-blue-500 dark:text-blue-500 text-sm mt-1">
                There are no subjects assigned to your class yet.
              </p>
            </div>
          ) : (
            <>
              {/* General Subjects */}
              {categorizedSubjects.general.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-3 text-foreground flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                      📚 General (All Students)
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      ({categorizedSubjects.general.length})
                    </span>
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categorizedSubjects.general.map((subj) => (
                      <SubjectCard key={subj.id} subject={subj} />
                    ))}
                  </div>
                </div>
              )}

              {/* Departmental Subjects */}
              {categorizedSubjects.departmental.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-3 text-foreground flex items-center gap-2">
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                      🎓 {getDepartmentCategoryName(departmentId, departments || [])}
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      ({categorizedSubjects.departmental.length})
                    </span>
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categorizedSubjects.departmental.map((subj) => (
                      <SubjectCard key={subj.id} subject={subj} />
                    ))}
                  </div>
                </div>
              )}

              {/* Elective Subjects */}
              {categorizedSubjects.elective.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-3 text-foreground flex items-center gap-2">
                    <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-medium">
                      ⭐ Elective / Additional
                    </span>
                    <span className="text-sm font-normal text-muted-foreground">
                      ({categorizedSubjects.elective.length})
                    </span>
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categorizedSubjects.elective.map((subj) => (
                      <SubjectCard key={subj.id} subject={subj} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default StudentSubjectsPage;