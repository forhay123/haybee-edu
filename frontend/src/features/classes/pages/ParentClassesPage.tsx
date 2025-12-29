import React from "react";
import { useClasses } from "../hooks/useClasses";
import ClassList from "../components/ClassList";

const ParentClassesPage: React.FC = () => {
  const { classes, isLoading } = useClasses();
  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Your Child’s Classes</h1>
      <ClassList classes={classes} />
    </div>
  );
};

export default ParentClassesPage;
