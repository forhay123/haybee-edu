import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, UserDto, CreateUserDto, UpdateUserDto, RoleDto } from "../api/usersApi";

export const useUsers = () => {
  const queryClient = useQueryClient();

  const usersQuery = useQuery<UserDto[], Error>({
    queryKey: ["users"],
    queryFn: usersApi.getAll,
  });

  const rolesQuery = useQuery<RoleDto[], Error>({
    queryKey: ["roles"],
    queryFn: usersApi.getAllRoles,
  });

  const createUser = useMutation<UserDto, Error, CreateUserDto>({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const updateUser = useMutation<UserDto, Error, { id: number; data: UpdateUserDto }>({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const deleteUser = useMutation<void, Error, number>({
    mutationFn: (id) => usersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const assignRole = useMutation<void, Error, { userId: number; role: string }>({
    mutationFn: ({ userId, role }) => usersApi.assignRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const removeRole = useMutation<void, Error, { userId: number; role: string }>({
  mutationFn: ({ userId, role }) => usersApi.removeRole(userId, role),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });


  return { usersQuery, rolesQuery, createUser, updateUser, deleteUser, assignRole, removeRole };
};
