import React, { useState } from "react";
import ClassForm from "../components/ClassForm";
import ClassList from "../components/ClassList";
import ClassCard from "../components/ClassCard";
import { useClasses } from "../hooks/useClasses";
import { ClassResponseDto } from "../api/classesApi";

const AdminClassesPage: React.FC = () => {
  const { classes, isLoading, createClass, updateClass, deleteClass } = useClasses();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassResponseDto | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassResponseDto | null>(null);

  // Handles create or update
  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (editingClass) {
        await updateClass.mutateAsync({ id: editingClass.id, data });
      } else {
        await createClass.mutateAsync(data);
      }
      setEditingClass(null);
    } catch (error) {
      console.error("Error saving class:", error);
      alert("Failed to save class. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (classItem: ClassResponseDto) => {
    setEditingClass(classItem);
    // Scroll to form or focus form if needed
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this class?")) {
      try {
        await deleteClass.mutateAsync(id);
      } catch (error) {
        console.error("Failed to delete class:", error);
      }
    }
  };

  const handleView = (classItem: ClassResponseDto) => {
    setSelectedClass(classItem);
  };

  const handleCloseModal = () => {
    setSelectedClass(null);
  };

  if (isLoading) return <p>Loading classes...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Manage Classes</h1>

      {/* Form for Create / Edit */}
      <ClassForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        initialData={editingClass || undefined}
      />

      {/* Class List Table */}
      <ClassList
        classes={classes}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDelete}
        isDeleting={deleteClass.isPending}
      />

      {/* Modal for Viewing Class */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-lg relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              ✕
            </button>
            <ClassCard classItem={selectedClass} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClassesPage;
