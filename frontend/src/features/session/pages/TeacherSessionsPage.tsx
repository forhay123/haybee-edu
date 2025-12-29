import React from "react";
import { SessionList } from "../index";

const TeacherSessionsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6 text-foreground">📚 Sessions (Teacher)</h1>

      <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
        <p className="text-sm text-muted-foreground mb-4">
          View academic sessions available to your classes. Teachers can view but not modify sessions here.
        </p>

        <SessionList showActions={false} />
      </div>
    </div>
  );
};

export default TeacherSessionsPage;
