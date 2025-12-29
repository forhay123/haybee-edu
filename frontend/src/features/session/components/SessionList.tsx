import React from "react";
import SessionCard from "./SessionCard";
import { useGetSessions, useDeleteSession, SessionResponseDto } from "../api/sessionsApi";

interface SessionListProps {
  onEdit?: (session: SessionResponseDto) => void;
  showActions?: boolean;
}

const SessionList: React.FC<SessionListProps> = ({ 
  onEdit, 
  showActions = false 
}) => {
  const { data: sessions, isLoading, isError } = useGetSessions();
  const { mutate: deleteSession, isPending: isDeleting } = useDeleteSession();

  const handleDelete = (id: number) => {
    if (window.confirm("🗑️ Are you sure you want to delete this session? This action cannot be undone.")) {
      deleteSession(id, {
        onSuccess: () => alert("✅ Session deleted successfully!"),
        onError: () => alert("❌ Failed to delete session. It may be in use."),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-muted-foreground mt-2">Loading sessions...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600 font-medium">Failed to load sessions.</p>
        <p className="text-red-500 text-sm mt-1">Please try again later.</p>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-600 font-medium">No sessions found.</p>
        <p className="text-blue-500 text-sm mt-1">
          Create your first academic session to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          onEdit={showActions ? onEdit : undefined}
          onDelete={showActions ? handleDelete : undefined}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
};

export default SessionList;