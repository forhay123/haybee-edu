import React, { useState } from "react";
import { useEnrollments } from "../hooks/useEnrollments";
import EnrollmentList from "../components/EnrollmentList";

const TeacherEnrollmentsPage: React.FC = () => {
  const { myEnrollmentsQuery } = useEnrollments();
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);

  if (myEnrollmentsQuery.isLoading) return <p>Loading enrollments...</p>;
  if (myEnrollmentsQuery.isError) return <p>Error loading enrollments</p>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Teacher Enrollments</h1>
      <EnrollmentList
        enrollments={myEnrollmentsQuery.data || []}
        deactivatingId={deactivatingId || undefined}
      />
    </div>
  );
};

export default TeacherEnrollmentsPage;
