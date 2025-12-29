import { useGetClasses, useCreateClass, useDeleteClass, useUpdateClass } from "../api/classesApi";

export const useClasses = () => {
  const { data: classes = [], isLoading, error } = useGetClasses();
  const createClass = useCreateClass();
  const deleteClass = useDeleteClass();
  const updateClass = useUpdateClass();

  return {
    classes,
    isLoading,
    error,
    createClass,
    deleteClass,
    updateClass,
  };
};
