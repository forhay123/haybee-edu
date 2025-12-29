import React, { useState, useEffect, useMemo } from "react";
import { EnrollmentDto } from "../api/enrollmentsApi";
import { useDropdowns } from "../hooks/useDropdowns";

interface EnrollmentFormProps {
  onSubmit: (data: Partial<EnrollmentDto>) => void;
  isSubmitting?: boolean;
}

const EnrollmentForm: React.FC<EnrollmentFormProps> = ({ onSubmit, isSubmitting }) => {
  const { studentsQuery, classesQuery, sessionsQuery } = useDropdowns();

  const [studentProfileId, setStudentProfileId] = useState<number | "">("");
  const [classEntityId, setClassEntityId] = useState<number | "">("");
  const [sessionId, setSessionId] = useState<number | "">("");
  const [active, setActive] = useState<boolean>(true);

  const isLoading =
    studentsQuery.isLoading || classesQuery.isLoading || sessionsQuery.isLoading;
  const isError =
    studentsQuery.isError || classesQuery.isError || sessionsQuery.isError;

  // ✅ Get selected student's type
  const selectedStudent = useMemo(() => {
    if (!studentProfileId || !studentsQuery.data) return null;
    return studentsQuery.data.find(s => s.id === Number(studentProfileId));
  }, [studentProfileId, studentsQuery.data]);

  // ✅ Filter classes based on student type
  const availableClasses = useMemo(() => {
    if (!classesQuery.data) return [];
    
    // If no student selected yet, show all classes
    if (!selectedStudent) return classesQuery.data;
    
    // INDIVIDUAL students can enroll in any class type (flexible learning)
    if (selectedStudent.studentType === "INDIVIDUAL") {
      return classesQuery.data;
    }
    
    // Filter classes matching the student's type
    return classesQuery.data.filter(c => 
      c.studentType === selectedStudent.studentType
    );
  }, [classesQuery.data, selectedStudent]);

  // ✅ Check if enrollment is optional (INDIVIDUAL students don't require class enrollment)
  const isEnrollmentOptional = selectedStudent?.studentType === "INDIVIDUAL";

  // ✅ Preselect first dropdown options when data loads
  useEffect(() => {
    if (!studentProfileId && studentsQuery.data?.length) {
      setStudentProfileId(studentsQuery.data[0].id);
    }
    if (!sessionId && sessionsQuery.data?.length) {
      setSessionId(sessionsQuery.data[0].id);
    }
  }, [studentsQuery.data, sessionsQuery.data, studentProfileId, sessionId]);

  // ✅ Reset class when student changes
  useEffect(() => {
    if (studentProfileId && availableClasses.length > 0) {
      // Auto-select first available class for new student type
      setClassEntityId(availableClasses[0].id);
    } else {
      setClassEntityId("");
    }
  }, [studentProfileId, availableClasses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: For INDIVIDUAL students, class enrollment is optional
    if (!studentProfileId || !sessionId) return;
    if (!isEnrollmentOptional && !classEntityId) {
      alert("Please select a class for this student type");
      return;
    }

    onSubmit({
      studentProfileId: Number(studentProfileId),
      classEntityId: classEntityId ? Number(classEntityId) : undefined,
      sessionId: Number(sessionId),
      active,
    });
  };

  if (isLoading) return <p>Loading dropdown data…</p>;
  if (isError) return <p>Error loading dropdown data.</p>;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-900 shadow"
    >
      {/* 🧍 Student */}
      <div>
        <label className="block text-sm font-semibold mb-1">
          Student <span className="text-red-500">*</span>
        </label>
        <select
          value={studentProfileId}
          onChange={(e) => setStudentProfileId(Number(e.target.value))}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select student</option>
          {studentsQuery.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName} ({s.studentType || "SCHOOL"})
              {s.className && ` - ${s.className}`}
            </option>
          ))}
        </select>
        {selectedStudent && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Type: <strong>{selectedStudent.studentType || "SCHOOL"}</strong>
            {selectedStudent.departmentName && ` | Department: ${selectedStudent.departmentName}`}
            {selectedStudent.studentType === "INDIVIDUAL" && (
              <span className="text-blue-600 dark:text-blue-400 ml-2">
                (Class enrollment optional)
              </span>
            )}
          </p>
        )}
      </div>

      {/* 🏫 Class */}
      <div>
        <label className="block text-sm font-semibold mb-1">
          Class {!isEnrollmentOptional && <span className="text-red-500">*</span>}
          {isEnrollmentOptional && <span className="text-gray-500 text-xs ml-1">(Optional)</span>}
        </label>
        <select
          value={classEntityId}
          onChange={(e) => setClassEntityId(Number(e.target.value))}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          required={!isEnrollmentOptional}
          disabled={!selectedStudent || availableClasses.length === 0}
        >
          <option value="">
            {!selectedStudent 
              ? "Select student first" 
              : availableClasses.length === 0 
                ? "No classes available"
                : isEnrollmentOptional
                  ? "None (custom curriculum)"
                  : "Select class"}
          </option>
          {availableClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.level && `(${c.level})`}
            </option>
          ))}
        </select>
        {selectedStudent && availableClasses.length === 0 && !isEnrollmentOptional && (
          <p className="text-xs text-amber-600 mt-1">
            ⚠️ No {selectedStudent.studentType} classes found. Please create classes for this student type first.
          </p>
        )}
        {isEnrollmentOptional && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            💡 INDIVIDUAL students can learn without class enrollment or choose any available class.
          </p>
        )}
      </div>

      {/* 📆 Session */}
      <div>
        <label className="block text-sm font-semibold mb-1">
          Session <span className="text-red-500">*</span>
        </label>
        <select
          value={sessionId}
          onChange={(e) => setSessionId(Number(e.target.value))}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select session</option>
          {sessionsQuery.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* ✅ Active Checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="active" className="text-sm">
          Active Enrollment
        </label>
      </div>

      {/* 💾 Submit */}
      <button
        type="submit"
        disabled={isSubmitting || !studentProfileId || (!isEnrollmentOptional && !classEntityId) || !sessionId}
        className={`w-full px-4 py-2 rounded text-white font-medium transition ${
          isSubmitting || !studentProfileId || (!isEnrollmentOptional && !classEntityId) || !sessionId
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-green-600 hover:bg-green-700"
        }`}
      >
        {isSubmitting ? "Saving…" : "Create Enrollment"}
      </button>
    </form>
  );
};

export default EnrollmentForm;