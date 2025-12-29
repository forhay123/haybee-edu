// src/features/sessions/pages/AdminSessionsPage.tsx

import React, { useState } from "react";
import { SessionDto, SessionResponseDto, useCreateSession, useUpdateSession } from "../api/sessionsApi";
import { SessionForm, SessionList } from "../index";

/**
 * 🧭 AdminSessionsPage
 * Admin interface for managing academic sessions.
 * Features:
 *  - Create new session
 *  - Edit existing session
 *  - Delete session
 *  - Auto-refresh via React Query
 */
const AdminSessionsPage: React.FC = () => {
  const [editingSession, setEditingSession] = useState<SessionResponseDto | null>(null);

  const { mutate: createSession, isPending: isCreating } = useCreateSession();
  const { mutate: updateSession, isPending: isUpdating } = useUpdateSession();

  const handleCreate = (data: SessionDto) => {
    createSession(data, {
      onSuccess: () => {
        alert("✅ Session created successfully!");
      },
      onError: () => {
        alert("❌ Failed to create session.");
      },
    });
  };

  const handleUpdate = (data: SessionDto) => {
    if (!editingSession) return;

    updateSession(
      { id: editingSession.id, data },
      {
        onSuccess: () => {
          alert("✅ Session updated successfully!");
          setEditingSession(null);
        },
        onError: () => {
          alert("❌ Failed to update session.");
        },
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 text-foreground">🎓 Manage Academic Sessions</h1>

      <div className="bg-card rounded-lg shadow-sm p-4 border border-border mb-6">
        <h2 className="text-lg font-semibold mb-3 text-foreground">
          {editingSession ? "✏️ Edit Session" : "➕ Create New Session"}
        </h2>

        <SessionForm
          initialData={editingSession || undefined}
          onSubmit={editingSession ? handleUpdate : handleCreate}
          onCancel={() => setEditingSession(null)}
          isSubmitting={isCreating || isUpdating}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 text-foreground">📋 Existing Sessions</h2>
        <SessionList
          onEdit={(session) => setEditingSession(session)}
          showActions
        />
      </div>
    </div>
  );
};

export default AdminSessionsPage;
