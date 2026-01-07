import React, { useState, useMemo } from "react";
import { useAuth } from "../../auth/useAuth";
import { useStudentProfiles } from "../../studentProfiles/hooks/useStudentProfiles";
import { useGetStudentSubjects, useGetEnrolledSubjects } from "../api/subjectsApi";
import SubjectCard from "../components/SubjectCard";
import AspirantSubjectSelector from "../components/AspirantSubjectSelector";
import { BookOpen, CheckCircle, PlusCircle, Layout } from "lucide-react";

const StudentSubjectsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"mine" | "browse">("mine");
  const { user } = useAuth();
  const { studentProfilesQuery } = useStudentProfiles();

  // Profile Logic
  const profile = useMemo(() => {
    return studentProfilesQuery.data?.find(p => p.userId === Number(user?.id));
  }, [studentProfilesQuery.data, user]);

  const isAspirant = profile?.studentType === "ASPIRANT";
  const { data: enrolled = [] } = useGetEnrolledSubjects();
  const { data: allSubjects = [] } = useGetStudentSubjects(profile?.classId || 0, profile?.departmentId || null, profile?.studentType || "SCHOOL");

  const requiredCount = 4;
  const progress = Math.min((enrolled.length / requiredCount) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-24">
      {/* 1. Slim Header */}
      <div className="bg-white dark:bg-card border-b sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Curriculum</h1>
            <p className="text-xs text-muted-foreground">{profile?.fullName}</p>
          </div>
          
          {/* Circular Progress (Mobile Friendly) */}
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
            <span className="text-xs font-bold">{enrolled.length}/{requiredCount}</span>
            <div className="w-8 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* 2. Professional Tab Switcher */}
        {isAspirant && (
          <div className="flex max-w-4xl mx-auto px-4">
            <button 
              onClick={() => setActiveTab("mine")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "mine" ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground"}`}
            >
              My Subjects ({enrolled.length})
            </button>
            <button 
              onClick={() => setActiveTab("browse")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "browse" ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground"}`}
            >
              Browse All
            </button>
          </div>
        )}
      </div>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {activeTab === "mine" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {enrolled.length > 0 ? (
              enrolled.map(s => <SubjectCard key={s.id} subject={s} variant="compact" />)
            ) : (
              <div className="col-span-full py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Layout size={32} />
                </div>
                <p className="text-muted-foreground">Your curriculum is empty.</p>
                <button 
                  onClick={() => setActiveTab("browse")}
                  className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium"
                >
                  Start Adding Subjects
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-card rounded-2xl border p-2">
            {/* The Selector becomes the content of the second tab */}
            <AspirantSubjectSelector 
              departmentId={profile?.departmentId || null} 
              enrolledSubjectIds={enrolled.map(s => s.id)} 
            />
          </div>
        )}
      </main>

      {/* 3. Mobile Floating Status Bar */}
      {isAspirant && enrolled.length < requiredCount && (
        <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-80 z-30 animate-in slide-in-from-bottom-4">
          <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PlusCircle className="animate-pulse" />
              <div>
                <p className="text-sm font-bold">Complete your profile</p>
                <p className="text-[11px] opacity-90">Add {requiredCount - enrolled.length} more subjects</p>
              </div>
            </div>
            {activeTab === "mine" && (
              <button 
                onClick={() => setActiveTab("browse")}
                className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold"
              >
                Browse
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};