import React, { useState, useEffect } from "react";
import { TermDto } from "../api/termsApi";

interface TermFormProps {
  initialData?: TermDto;
  onSubmit: (data: TermDto) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const TermForm: React.FC<TermFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [name, setName] = useState(initialData?.name || "");
  const [startDate, setStartDate] = useState(initialData?.startDate || "");
  const [endDate, setEndDate] = useState(initialData?.endDate || "");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setStartDate(initialData.startDate);
      setEndDate(initialData.endDate);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("⚠️ Term name is required");
      return;
    }

    if (!startDate || !endDate) {
      alert("⚠️ Start and End dates are required");
      return;
    }

    onSubmit({ name: name.trim(), startDate, endDate });

    if (!initialData) {
      setName("");
      setStartDate("");
      setEndDate("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 text-foreground">
          Term Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., First Term"
          required
          className="w-full border border-border rounded-lg p-2 bg-background"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1 text-foreground">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full border border-border rounded-lg p-2 bg-background"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-1 text-foreground">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            className="w-full border border-border rounded-lg p-2 bg-background"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : initialData ? "Update Term" : "Create Term"}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default TermForm;
