import React from "react";
import { TermResponseDto } from "../api/termsApi";

interface TermCardProps {
  term: TermResponseDto;
  onEdit?: (term: TermResponseDto) => void;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

const TermCard: React.FC<TermCardProps> = ({
  term,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  return (
    <div className="bg-card rounded-lg shadow p-4 border border-border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{term.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {term.startDate} → {term.endDate}
          </p>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(term)}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(term.id)}
                disabled={isDeleting}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {isDeleting ? "..." : "Delete"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TermCard;
