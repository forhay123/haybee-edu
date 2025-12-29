import React, { useState, useMemo } from "react";
import SubjectCard from "./SubjectCard";
import { useGetSubjects, useDeleteSubject } from "../api/subjectsApi";
import { useGetDepartments } from "../../departments/api/departmentsApi";
import { useGetClasses } from "../../classes/api/classesApi";

interface SubjectListProps {
  role?: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
}

const SubjectList: React.FC<SubjectListProps> = ({ role }) => {
  const { data: subjectsData, isLoading, isError } = useGetSubjects();
  const { data: departments } = useGetDepartments();
  const { data: classes } = useGetClasses();
  const { mutate: deleteSubject, isPending: isDeleting } = useDeleteSubject();

  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const subjects = Array.isArray(subjectsData) ? subjectsData : [];
  const deptList = Array.isArray(departments) ? departments : [];
  const classList = Array.isArray(classes) ? classes : [];

  const filteredSubjects = useMemo(() => {
    return subjects
      .filter((subj) => {
        const matchDept = selectedDept ? subj.departmentId === Number(selectedDept) : true;
        const matchClass = selectedClass ? subj.classId === Number(selectedClass) : true;
        const matchSearch =
          subj.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subj.code.toLowerCase().includes(searchTerm.toLowerCase());
        return matchDept && matchClass && matchSearch;
      })
      .sort((a, b) => (a.classId === b.classId ? a.name.localeCompare(b.name) : a.classId - b.classId));
  }, [subjects, selectedDept, selectedClass, searchTerm]);

  const handleDelete = (id: number) => {
    if (window.confirm("🗑️ Are you sure you want to delete this subject? This action cannot be undone.")) {
      deleteSubject(id, {
        onSuccess: () => alert("✅ Subject deleted successfully!"),
        onError: () => alert("❌ Failed to delete subject. Please try again."),
      });
    }
  };

  const inputClass = "border border-input rounded-lg p-2.5 bg-background text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary transition";

  if (isLoading) return <p className="text-center text-lg text-primary">Loading subjects... <span className="animate-spin">🌀</span></p>;
  if (isError) return <p className="text-center text-lg text-destructive">Failed to load subjects. Please check the API.</p>;

  return (
    <div className="space-y-6">
      {/* Filters Container */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-border"> {/* Simplified card look */}
        {/* Department Filter */}
        <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} className={inputClass}>
          <option value="">All Departments</option>
          {deptList.map((dept) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
        </select>

        {/* Class Filter */}
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className={inputClass}>
          <option value="">All Classes</option>
          {classList.map((cls) => <option key={cls.id} value={cls.id}>{cls.name} {cls.level ? `(${cls.level})` : ""}</option>)}
        </select>

        {/* Search Input */}
        <input
          type="text"
          placeholder="🔍 Search name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={inputClass + " flex-1 min-w-[200px]"}
        />

        {/* Reset Button */}
        {(selectedDept || selectedClass || searchTerm) && (
          <button
            onClick={() => { setSelectedDept(""); setSelectedClass(""); setSearchTerm(""); }}
            className="bg-muted text-foreground px-4 py-2.5 rounded-lg hover:bg-muted-foreground/10 transition-colors text-sm font-medium"
          >
            Reset Filters
          </button>
        )}
      </div>
      
      {/* Subject Count */}
      <p className="text-sm font-medium text-muted-foreground">
        Showing **{filteredSubjects.length}** of **{subjects.length}** subjects
      </p>

      {/* Subjects Grid */}
      {filteredSubjects.length === 0 && subjects.length > 0 ? (
        <p className="text-lg text-center text-muted-foreground py-8">
          🚫 No subjects match your current filters.
        </p>
      ) : subjects.length === 0 ? (
        <p className="text-lg text-center text-muted-foreground py-8">
          No subjects have been created yet. Start by using the form to your left!
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"> {/* Increased grid gap */}
          {filteredSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onDelete={role === "ADMIN" || role === "TEACHER" ? handleDelete : undefined}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SubjectList;