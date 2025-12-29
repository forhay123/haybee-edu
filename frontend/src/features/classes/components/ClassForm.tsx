import React, { useState, useEffect } from "react";
import { ClassResponseDto } from "../api/classesApi";
import { useGetDepartments } from "../../departments/api/departmentsApi";

interface ClassFormProps {
  onSubmit: (data: any) => void;
  initialData?: ClassResponseDto | null;
  isSubmitting?: boolean;
}

const ClassForm: React.FC<ClassFormProps> = ({
  onSubmit,
  initialData,
  isSubmitting,
}) => {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [studentType, setStudentType] = useState("SCHOOL");
  const [departmentId, setDepartmentId] = useState<number | "">("");

  const { data: departments, isLoading: loadingDepts } = useGetDepartments();
  const deptList = Array.isArray(departments) ? departments : [];

  // Pre-fill form for editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setLevel(initialData.level || "");
      setStudentType(initialData.studentType || "SCHOOL");
      setDepartmentId(initialData.department?.id || (deptList[0]?.id ?? ""));
    } else if (deptList.length > 0) {
      setDepartmentId(deptList[0].id);
    }
  }, [initialData, deptList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !level || !studentType || !departmentId) {
      alert("⚠️ Please fill in all required fields.");
      return;
    }

    const selectedDept = deptList.find((dept) => dept.id === Number(departmentId));

    let finalName = name.trim();

    // ✅ Append department name for SENIOR level classes
    if (level === "SENIOR" && selectedDept) {
      const deptSuffix = selectedDept.name.trim();
      if (!finalName.toLowerCase().includes(deptSuffix.toLowerCase())) {
        finalName = `${finalName} ${deptSuffix}`;
      }
    }

    // ✅ Append student type for INDIVIDUAL classes
    if (studentType === "INDIVIDUAL") {
      const typeSuffix = "Individual";
      if (!finalName.toLowerCase().includes(typeSuffix.toLowerCase())) {
        finalName = `${finalName} ${typeSuffix}`;
      }
    }

    const payload = {
      name: finalName,
      level,
      studentType,
      department: { id: Number(departmentId) },
    };

    onSubmit(payload);

    // Reset form if creating
    if (!initialData) {
      setName("");
      setLevel("");
      setStudentType("SCHOOL");
      setDepartmentId(deptList[0]?.id ?? "");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card rounded-2xl shadow p-6 flex flex-col gap-4"
    >
      <h2 className="text-lg font-semibold text-foreground">
        {initialData ? "Edit Class" : "Add New Class"}
      </h2>

      <div>
        <label className="block text-sm font-medium mb-1">Class Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. JSS1, SSS1, Custom Level 1"
          required
          className="w-full p-2 rounded border bg-background"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {studentType === "INDIVIDUAL" && "💡 'Individual' will be automatically appended to the name"}
          {level === "SENIOR" && studentType !== "INDIVIDUAL" && "💡 Department name will be automatically appended"}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Level</label>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          required
          className="w-full p-2 rounded border bg-background"
        >
          <option value="">Select Level</option>
          <option value="JUNIOR">JUNIOR</option>
          <option value="SENIOR">SENIOR</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Student Type</label>
        <select
          value={studentType}
          onChange={(e) => setStudentType(e.target.value)}
          required
          className="w-full p-2 rounded border bg-background"
        >
          <option value="">Select Type</option>
          <option value="SCHOOL">SCHOOL</option>
          <option value="HOME">HOME</option>
          <option value="ASPIRANT">ASPIRANT</option>
          <option value="INDIVIDUAL">INDIVIDUAL</option>
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {studentType === "SCHOOL" && "Regular school students"}
          {studentType === "HOME" && "Homeschool students (same curriculum, flexible schedule)"}
          {studentType === "ASPIRANT" && "Exam preparation students"}
          {studentType === "INDIVIDUAL" && "Individual learners with custom curriculum"}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Department</label>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(Number(e.target.value))}
          required
          className="w-full p-2 rounded border bg-background"
        >
          <option value="">
            {loadingDepts ? "Loading departments..." : "Select Department"}
          </option>
          {deptList.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`bg-primary text-white rounded p-2 mt-2 transition ${
          isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-primary/80"
        }`}
      >
        {isSubmitting ? "Saving..." : "Save Class"}
      </button>
    </form>
  );
};

export default ClassForm;