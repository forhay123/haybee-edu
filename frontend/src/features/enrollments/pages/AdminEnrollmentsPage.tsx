import React, { useState } from "react";
import { useEnrollments } from "../hooks/useEnrollments";
import EnrollmentList from "../components/EnrollmentList";
import EnrollmentForm from "../components/EnrollmentForm";
import { EnrollmentDto } from "../api/enrollmentsApi";

const AdminEnrollmentsPage: React.FC = () => {
  const { 
    allEnrollmentsQuery, 
    createEnrollment, 
    deactivateEnrollment, 
    deleteEnrollment,
    isAdmin 
  } = useEnrollments();

  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ✅ Check if user is authorized
  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Access Denied</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  const handleDeactivate = async (id: number) => {
    setDeactivatingId(id);
    try {
      await deactivateEnrollment.mutateAsync(id);
    } finally {
      setDeactivatingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteEnrollment.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (data: Partial<EnrollmentDto>) => {
    await createEnrollment.mutateAsync(data);
  };

  const isCreating = createEnrollment.isPending;

  if (allEnrollmentsQuery.isLoading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading enrollments...</p>
        </div>
      </div>
    );
  }

  if (allEnrollmentsQuery.isError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">Error loading enrollments</p>
          <p className="text-red-500 dark:text-red-500 text-sm mt-1">
            {allEnrollmentsQuery.error?.message || "Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Enrollments</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total Enrollments: {allEnrollmentsQuery.data?.length || 0}
        </div>
      </div>

      {/* Create New Enrollment */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Create New Enrollment</h2>
        <EnrollmentForm onSubmit={handleCreate} isSubmitting={isCreating} />
      </div>

      {/* Existing Enrollments */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">All Enrollments</h2>
        <EnrollmentList
          enrollments={allEnrollmentsQuery.data || []}
          onDeactivate={handleDeactivate}
          onDelete={handleDelete}
          deactivatingId={deactivatingId || undefined}
          deletingId={deletingId || undefined}
        />
      </div>
    </div>
  );
};

export default AdminEnrollmentsPage;