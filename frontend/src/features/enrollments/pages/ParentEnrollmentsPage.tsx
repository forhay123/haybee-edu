import React from "react";
import { useEnrollments } from "../hooks/useEnrollments";
import EnrollmentList from "../components/EnrollmentList";

const ParentEnrollmentsPage: React.FC = () => {
  const { myEnrollmentsQuery } = useEnrollments();

  if (myEnrollmentsQuery.isLoading) return <p>Loading children enrollments...</p>;
  if (myEnrollmentsQuery.isError) return <p>Error loading children enrollments</p>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Children Enrollments</h1>
      <EnrollmentList enrollments={myEnrollmentsQuery.data || []} />
    </div>
  );
};

export default ParentEnrollmentsPage;
