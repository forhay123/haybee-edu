import React, { useState, useEffect } from "react";
import {
  DepartmentDto,
  useCreateDepartment,
  useUpdateDepartment,
} from "../api/departmentsApi";

interface DepartmentFormProps {
  existing?: DepartmentDto | null;
  onSuccess?: () => void;
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({ existing, onSuccess }) => {
  const [form, setForm] = useState<DepartmentDto>({
    name: "",
    code: "",
    description: "",
  });

  useEffect(() => {
    if (existing) setForm(existing);
  }, [existing]);

  const { mutate: createDepartment, isPending: isCreating } = useCreateDepartment();
  const { mutate: updateDepartment, isPending: isUpdating } = useUpdateDepartment();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (existing && existing.id) {
      updateDepartment({ id: existing.id, data: form }, { onSuccess });
    } else {
      createDepartment(form, { onSuccess });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-card p-4 rounded-2xl shadow">
      <h2 className="text-xl font-semibold">
        {existing ? "Edit Department" : "Add Department"}
      </h2>

      <div>
        <label className="block text-sm mb-1 font-medium">Name</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full border border-border rounded-lg p-2"
        />
      </div>

      <div>
        <label className="block text-sm mb-1 font-medium">Code</label>
        <input
          name="code"
          value={form.code}
          onChange={handleChange}
          className="w-full border border-border rounded-lg p-2"
        />
      </div>

      <div>
        <label className="block text-sm mb-1 font-medium">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="w-full border border-border rounded-lg p-2"
        />
      </div>

      <button
        type="submit"
        disabled={isCreating || isUpdating}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition"
      >
        {isCreating || isUpdating
          ? "Saving..."
          : existing
          ? "Update Department"
          : "Create Department"}
      </button>
    </form>
  );
};

export default DepartmentForm;
