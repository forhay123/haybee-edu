import React from "react";
import SubjectList from "../components/SubjectList";
import SubjectForm from "../components/SubjectForm";

const AdminSubjectsPage = () => {
  return (
    <div className="p-6 md:p-10 min-h-screen bg-background">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground flex items-center">
          📚 Subject Administration
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          As an admin, you can create, update, or remove subjects available across the school.
        </p>
      </header>
      
      {/* Main Content Area */}
      <div className="space-y-8"> {/* Use vertical spacing instead of grid layout */}
        
        {/* 1. Subject creation form (Placed ABOVE the list) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4 text-foreground border-b pb-2">
                Create New Subject
              </h2>
              <SubjectForm />
            </div>
          </div>
        </div>

        {/* 2. Subject list (Placed BELOW the form) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-3"> {/* Span full width for list visibility */}
                <div className="bg-card rounded-2xl shadow-xl p-6">
                    <h2 className="text-xl font-bold mb-4 text-foreground border-b pb-2">
                        All Subjects Overview
                    </h2>
                    <SubjectList role="ADMIN" />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSubjectsPage;