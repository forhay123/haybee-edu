import React, { useState } from "react";
import { useCreateSubject } from "../api/subjectsApi";
import { useGetDepartments } from "../../departments/api/departmentsApi";
import { useGetClasses } from "../../classes/api/classesApi";

const SubjectForm: React.FC = () => {
  // ----------------------------
  // 🧠 State
  // ----------------------------
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [compulsory, setCompulsory] = useState(false);
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [classId, setClassId] = useState<number | "">("");

  // ----------------------------
  // ⚙️ React Query Hooks
  // ----------------------------
  const { data: departments, isLoading: loadingDepts } = useGetDepartments();
  const { data: classes, isLoading: loadingClasses } = useGetClasses();
  const { mutate: createSubject, isPending } = useCreateSubject();

  // Ensure safe lists
  const deptList = Array.isArray(departments) ? departments : [];
  const classList = Array.isArray(classes) ? classes : [];

  // ----------------------------
  // 🧾 Handle Submit
  // ----------------------------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !code || !departmentId || !classId) {
      alert("⚠️ Please fill in all required fields.");
      return;
    }

    // find selected class for level
    const selectedClass = classList.find((cls) => cls.id === Number(classId));
    const level = selectedClass?.level || "";
    const className = selectedClass?.name || "";

    // 👇 Prefix class name to subject name to avoid duplicates
    // NOTE: This logic seems business-specific. Keeping it, but a better name might be needed.
    const formattedName = `${name.trim()} ${className}`.trim();

    const newSubject = {
      name: formattedName,
      code: code.trim(),
      level,
      compulsory,
      departmentId: Number(departmentId),
      classId: Number(classId),
    };

    createSubject(newSubject, {
      onSuccess: () => {
        alert(`✅ Subject "${formattedName}" added successfully!`);
        // Reset form
        setName("");
        setCode("");
        setCompulsory(false);
        setDepartmentId("");
        setClassId("");
      },
      onError: (error: any) => {
        console.error("❌ Error creating subject:", error);
        alert("Failed to create subject. Please try again.");
      },
    });
  };

  // ----------------------------
  // 🧩 Render Form
  // ----------------------------
  // Applied focus-ring and transition to inputs/selects for better visual feedback.
  const inputClass =
    "w-full border border-input rounded-lg p-2.5 bg-background transition duration-150 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-foreground shadow-sm";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5" // Increased spacing
    >
      {/* Subject Name & Code Group */}
      <div className="grid grid-cols-2 gap-4">
        {/* Subject Name */}
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            Subject Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mathematics"
            required
            className={inputClass}
          />
        </div>

        {/* Subject Code */}
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            Subject Code <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. MTH101"
            required
            className={inputClass}
          />
        </div>
      </div>
      
      {/* Department & Class Group */}
      <div className="grid grid-cols-2 gap-4">
        {/* Department Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            Department <span className="text-destructive">*</span>
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(Number(e.target.value))}
            required
            className={inputClass + " appearance-none"} // Use appearance-none for better custom styling with an icon if needed
          >
            <option value="">
              {loadingDepts ? "Loading..." : "Select Department"}
            </option>
            {deptList.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Class Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            Class <span className="text-destructive">*</span>
          </label>
          <select
            value={classId}
            onChange={(e) => setClassId(Number(e.target.value))}
            required
            className={inputClass + " appearance-none"}
          >
            <option value="">
              {loadingClasses ? "Loading..." : "Select Class"}
            </option>
            {classList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} {cls.level ? `(${cls.level})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Compulsory Checkbox */}
      <div className="flex items-center space-x-2 pt-2">
        <input
          id="compulsory"
          type="checkbox"
          checked={compulsory}
          onChange={(e) => setCompulsory(e.target.checked)}
          // Use modern checkbox styling (e.g., accent color)
          className="h-5 w-5 text-primary border-border rounded focus:ring-primary focus:ring-2 cursor-pointer"
        />
        <label htmlFor="compulsory" className="text-base font-medium text-foreground cursor-pointer">
          Compulsory Subject
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg shadow-md hover:bg-primary/90 transition-all w-full text-base font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <span className="animate-spin mr-2">⏳</span> Creating...
          </>
        ) : (
          "➕ Create New Subject"
        )}
      </button>
    </form>
  );
};

export default SubjectForm;