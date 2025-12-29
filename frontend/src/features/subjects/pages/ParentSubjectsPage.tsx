import React from "react";
import SubjectCard from "../components/SubjectCard";

const ParentSubjectsPage = () => {
  const childSubjects = [
    { id: 1, name: "Mathematics", teacher: "Mr. Johnson" },
    { id: 2, name: "Science", teacher: "Ms. Bello" },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-foreground">Your Child’s Subjects</h1>
      <p className="text-muted-foreground mb-6">
        View the subjects your child is currently enrolled in and their assigned teachers.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {childSubjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>
    </div>
  );
};

export default ParentSubjectsPage;
