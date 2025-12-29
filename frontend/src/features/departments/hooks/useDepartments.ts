import { useGetDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from "../api/departmentsApi";

export const useDepartments = () => {
  // ✅ Actually CALL the hook to get the data
  const departmentsQuery = useGetDepartments();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  return {
    // Return the query result with data
    departments: departmentsQuery.data || [],
    isLoading: departmentsQuery.isLoading,
    error: departmentsQuery.error,
    
    // Return mutations
    createDepartment: createDepartment.mutateAsync,
    updateDepartment: updateDepartment.mutateAsync,
    deleteDepartment: deleteDepartment.mutateAsync,
    
    // Return loading states for mutations
    isCreating: createDepartment.isPending,
    isUpdating: updateDepartment.isPending,
    isDeleting: deleteDepartment.isPending,
  };
};