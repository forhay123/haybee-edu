import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../../store/store";
import { useStudentProfiles } from "../hooks/useStudentProfiles";
import StudentProfileList from "../components/StudentProfileList";
import { StudentProfileDto } from "../api/studentProfilesApi";

const ParentStudentProfilesPage: React.FC = () => {
  // Make sure childrenUserIds exists and is an array of numbers
  const childrenUserIds: number[] =
    (useSelector((state: RootState) => (state.auth.user as any)?.childrenIds) || []).map(Number);

  const { studentProfilesQuery } = useStudentProfiles();

  if (studentProfilesQuery.isLoading) return <p>Loading children profiles...</p>;
  if (studentProfilesQuery.isError) return <p>Error loading children profiles.</p>;

  const childrenProfiles: StudentProfileDto[] = (studentProfilesQuery.data || []).filter(
    (p) => childrenUserIds.includes(p.userId)
  );

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">My Children</h1>
      <StudentProfileList profiles={childrenProfiles} />
    </div>
  );
};

export default ParentStudentProfilesPage;
