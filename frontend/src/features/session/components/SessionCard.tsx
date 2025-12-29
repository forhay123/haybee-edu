import React from "react";
import { SessionResponseDto } from "../api/sessionsApi";

interface SessionCardProps {
  session: SessionResponseDto;
  onEdit?: (session: SessionResponseDto) => void;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  return (
    <div className="bg-card rounded-lg shadow p-4 hover:shadow-md transition-shadow border border-border">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            📅 {session.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Session ID: {session.id}
          </p>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(session)}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Edit
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={() => onDelete(session.id)}
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

export default SessionCard;