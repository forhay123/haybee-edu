import React, { useState, useEffect } from "react";
import { SessionDto } from "../api/sessionsApi";

interface SessionFormProps {
  initialData?: SessionDto;
  onSubmit: (data: SessionDto) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const SessionForm: React.FC<SessionFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [name, setName] = useState(initialData?.name || "");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert("⚠️ Session name is required");
      return;
    }

    onSubmit({ name: name.trim() });
    
    // Reset form if creating new session
    if (!initialData) {
      setName("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1 text-foreground">
          Session Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., 2024/2025"
          required
          className="w-full border border-border rounded-lg p-2 bg-background"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Format: YYYY/YYYY (e.g., 2024/2025)
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : initialData ? "Update Session" : "Create Session"}
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

export default SessionForm;