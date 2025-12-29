import React from "react";
import { TermList } from "../index";

const TeacherTermsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6 text-foreground">📅 Terms (Teacher)</h1>

      <div className="bg-card rounded-lg shadow-sm p-4 border border-border">
        <p className="text-sm text-muted-foreground mb-4">
          Browse school terms and their dates. Teachers can consult terms here; changes must be made by an admin.
        </p>

        <TermList showActions={false} />
      </div>
    </div>
  );
};

export default TeacherTermsPage;
