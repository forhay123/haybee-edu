import React, { useEffect, useState } from "react";
import { StudentProfileDto } from "../api/studentProfilesApi";
import { useDropdowns, useClassesByType } from "../hooks/useDropdowns";

interface Props {
  initialData?: StudentProfileDto;
  onSubmit: (data: Partial<StudentProfileDto>) => void;
  isSubmitting?: boolean;
}

const StudentProfileForm: React.FC<Props> = ({
  initialData,
  onSubmit,
  isSubmitting,
}) => {
  const { studentsQuery, departmentsQuery, classesQuery } = useDropdowns();

  const [selectedStudentId, setSelectedStudentId] = useState<number | "">(
    initialData?.userId || ""
  );

  const [formData, setFormData] = useState<Partial<StudentProfileDto>>({
    studentType: "SCHOOL",
    ...initialData,
  });

  // ✅ For INDIVIDUAL students, fetch ALL classes; otherwise filter by type
  const filteredClassesQuery = useClassesByType(
    formData.studentType !== "INDIVIDUAL" ? formData.studentType : undefined
  );

  // ✅ Determine which classes to show
  const availableClasses = formData.studentType === "INDIVIDUAL" 
    ? classesQuery.data || []  // Show ALL classes for INDIVIDUAL
    : filteredClassesQuery.data || [];  // Show filtered classes for others

  const isLoadingClasses = formData.studentType === "INDIVIDUAL"
    ? classesQuery.isLoading
    : filteredClassesQuery.isLoading;

  // Preselect first student if none is selected
  useEffect(() => {
    if (!selectedStudentId && studentsQuery.data?.length) {
      setSelectedStudentId(studentsQuery.data[0].id);
    }
  }, [studentsQuery.data, selectedStudentId]);

  // Reset class and department when student type changes (only for new profiles)
  useEffect(() => {
    if (!initialData) {
      setFormData(prev => ({
        ...prev,
        classId: undefined,
        departmentId: undefined,
      }));
    }
  }, [formData.studentType, initialData]);

  const handleChange = (key: keyof StudentProfileDto, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    // Validation based on student type
    const requiresClass = formData.studentType !== "ASPIRANT" && formData.studentType !== "INDIVIDUAL";
    if (requiresClass && !formData.classId) {
      alert("Please select a class for SCHOOL/HOME students");
      return;
    }

    onSubmit({ ...formData, userId: selectedStudentId });
  };

  if (studentsQuery.isLoading) return <p>Loading students…</p>;
  if (studentsQuery.isError) return <p>Error loading students.</p>;

  // Determine field requirements based on student type
  const requiresDepartment = formData.studentType === "SCHOOL" || formData.studentType === "HOME";
  const requiresClass = formData.studentType !== "ASPIRANT" && formData.studentType !== "INDIVIDUAL";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-6 border rounded-lg bg-white dark:bg-gray-800 shadow"
    >
      {/* Student Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Student <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(Number(e.target.value))}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          required
          disabled={!!initialData}
        >
          <option value="">Select student</option>
          {studentsQuery.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName} ({s.email})
            </option>
          ))}
        </select>
      </div>

      {/* Student Type */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Student Type <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.studentType || "SCHOOL"}
          onChange={(e) => handleChange("studentType", e.target.value)}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          required
        >
          <option value="SCHOOL">School Student</option>
          <option value="HOME">Home Student</option>
          <option value="ASPIRANT">Aspirant</option>
          <option value="INDIVIDUAL">Individual</option>
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formData.studentType === "SCHOOL" && "Regular school student (requires class & department)"}
          {formData.studentType === "HOME" && "Homeschool student (requires class & department)"}
          {formData.studentType === "ASPIRANT" && "Exam preparation student (flexible class assignment)"}
          {formData.studentType === "INDIVIDUAL" && "Individual learner with custom curriculum (can choose any class)"}
        </p>
      </div>

      {/* Class */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Class {requiresClass && <span className="text-red-500">*</span>}
          {!requiresClass && <span className="text-gray-500 text-xs ml-1">(Optional)</span>}
        </label>
        <select
          value={formData.classId || ""}
          onChange={(e) => handleChange("classId", Number(e.target.value) || null)}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          required={requiresClass}
          disabled={isLoadingClasses}
        >
          <option value="">
            {isLoadingClasses 
              ? "Loading classes..." 
              : (formData.studentType === "ASPIRANT" || formData.studentType === "INDIVIDUAL")
                ? "Optional - Select if applicable"
                : "Select class"}
          </option>
          {availableClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.level && `(${c.level})`}
            </option>
          ))}
        </select>
        {/* Show info for INDIVIDUAL students */}
        {formData.studentType === "INDIVIDUAL" && availableClasses.length > 0 && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            💡 You can choose from any available class across all student types
          </p>
        )}
        {/* Show error if no classes found for required types */}
        {!isLoadingClasses && availableClasses.length === 0 && formData.studentType && requiresClass && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            ⚠️ No classes available for {formData.studentType} students. 
            {formData.studentType === "HOME" && " Note: HOME students use SCHOOL classes (same curriculum, different schedule)."}
          </p>
        )}
      </div>

      {/* Department */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Department {requiresDepartment && <span className="text-red-500">*</span>}
          {!requiresDepartment && <span className="text-gray-500 text-xs ml-1">(Optional)</span>}
        </label>
        <select
          value={formData.departmentId || ""}
          onChange={(e) => handleChange("departmentId", Number(e.target.value) || null)}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          required={requiresDepartment}
          disabled={departmentsQuery.isLoading}
        >
          <option value="">
            {departmentsQuery.isLoading 
              ? "Loading departments..." 
              : (formData.studentType === "ASPIRANT" || formData.studentType === "INDIVIDUAL")
                ? "Optional - Select if applicable"
                : "Select department"}
          </option>
          {departmentsQuery.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </select>
      </div>

      {/* Chosen Language */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Preferred Language
        </label>
        <select
          value={formData.chosenLanguage || ""}
          onChange={(e) => handleChange("chosenLanguage", e.target.value)}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="">Select language (optional)</option>
          <option value="English">English</option>
          <option value="French">French</option>
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Select your preferred language for instruction and materials.
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
      >
        {isSubmitting ? "Saving..." : initialData ? "Update Profile" : "Create Profile"}
      </button>
    </form>
  );
};

export default StudentProfileForm;