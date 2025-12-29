import React, { useState, useEffect } from "react";
import { CreateTeacherProfileRequest, TeacherProfile } from "../api/teacherProfilesApi";
import { useGetSubjects } from "../../subjects/api/subjectsApi";

interface TeacherProfileFormProps {
  onSubmit: (data: CreateTeacherProfileRequest) => Promise<void>;
  onCancel: () => void;
  initialData?: TeacherProfile | null;
  users: Array<{ id: number; email: string; fullName: string }>;
  departments: Array<{ id: number; name: string }>;
  isLoading?: boolean;
}

const TeacherProfileForm: React.FC<TeacherProfileFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  users,
  departments,
  isLoading,
}) => {
  const [formData, setFormData] = useState<CreateTeacherProfileRequest>({
    userId: initialData?.userId || 0,
    departmentId: initialData?.departmentId || 0,
    subjectIds: initialData?.subjectIds || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch all subjects
  const { data: allSubjects, isLoading: isSubjectsLoading } = useGetSubjects();
  const subjects = Array.isArray(allSubjects) ? allSubjects : [];

  // Filter subjects by selected department
  const filteredSubjects = formData.departmentId
    ? subjects.filter((subject) => subject.departmentId === formData.departmentId)
    : subjects;

  useEffect(() => {
    if (initialData) {
      setFormData({
        userId: initialData.userId,
        departmentId: initialData.departmentId,
        subjectIds: initialData.subjectIds || [],
      });
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.userId) newErrors.userId = "Please select a user";
    if (!formData.departmentId) newErrors.departmentId = "Please select a department";
    if (!formData.subjectIds || formData.subjectIds.length === 0)
      newErrors.subjectIds = "Please select at least one subject";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleSubjectToggle = (subjectId: number) => {
    setFormData((prev) => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subjectId)
        ? prev.subjectIds.filter((id) => id !== subjectId)
        : [...prev.subjectIds, subjectId],
    }));
  };

  const handleDepartmentChange = (departmentId: number) => {
    // Reset subject selection when department changes
    setFormData({
      ...formData,
      departmentId,
      subjectIds: [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* User dropdown */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          User (Teacher) *
        </label>
        <select
          value={formData.userId}
          onChange={(e) => setFormData({ ...formData, userId: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={!!initialData}
        >
          <option value={0}>Select a user</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName} ({user.email})
            </option>
          ))}
        </select>
        {errors.userId && <p className="text-destructive text-sm mt-1">{errors.userId}</p>}
      </div>

      {/* Department dropdown */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Department *</label>
        <select
          value={formData.departmentId}
          onChange={(e) => handleDepartmentChange(Number(e.target.value))}
          className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value={0}>Select a department</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        {errors.departmentId && (
          <p className="text-destructive text-sm mt-1">{errors.departmentId}</p>
        )}
      </div>

      {/* Subjects Multi-select */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Subjects (Specializations) *
        </label>
        
        {isSubjectsLoading ? (
          <div className="w-full px-3 py-2 border border-input bg-background rounded-md text-muted-foreground">
            Loading subjects...
          </div>
        ) : !formData.departmentId ? (
          <div className="w-full px-3 py-2 border border-input bg-muted rounded-md text-muted-foreground">
            Please select a department first
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="w-full px-3 py-2 border border-input bg-muted rounded-md text-muted-foreground">
            No subjects available for this department
          </div>
        ) : (
          <div className="w-full border border-input bg-background rounded-md p-3 max-h-48 overflow-y-auto">
            <div className="space-y-2">
              {filteredSubjects.map((subject) => (
                <label
                  key={subject.id}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={formData.subjectIds.includes(subject.id!)}
                    onChange={() => handleSubjectToggle(subject.id!)}
                    className="h-4 w-4 text-primary border-border rounded focus:ring-primary focus:ring-2 cursor-pointer"
                  />
                  <span className="text-sm text-foreground">
                    {subject.name} ({subject.code})
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
        
        {formData.subjectIds.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            Selected: {formData.subjectIds.length} subject(s)
          </p>
        )}
        
        {errors.subjectIds && (
          <p className="text-destructive text-sm mt-1">{errors.subjectIds}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isLoading ? "Saving..." : initialData ? "Update" : "Create"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default TeacherProfileForm;