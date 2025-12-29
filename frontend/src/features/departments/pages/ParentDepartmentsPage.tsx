import React from "react";
import DepartmentList from "../components/DepartmentList";

const ParentDepartmentsPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Departments</h2>
      <DepartmentList role="PARENT" />
    </div>
  );
};

export default ParentDepartmentsPage;
