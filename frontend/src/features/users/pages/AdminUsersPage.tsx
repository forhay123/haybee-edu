import React, { useState, useMemo } from "react";
import { useUsers } from "../hooks/useUsers";
import UserList from "../components/UserList";
import UserForm from "../components/UserForm";
import { CreateUserDto, UserDto, RoleDto } from "../api/usersApi";

const AdminUsersPage: React.FC = () => {
  const { usersQuery, rolesQuery, createUser, deleteUser, assignRole, removeRole } = useUsers();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const handleCreate = (data: CreateUserDto) => createUser.mutate(data);
  const handleDelete = (id: number) => deleteUser.mutate(id);
  const handleAssignRole = (userId: number, role: string) =>
    assignRole.mutate({ userId, role });
  const handleRemoveRole = (userId: number, role: string) =>
    removeRole.mutate({ userId, role });

  const filteredUsers: UserDto[] = useMemo(() => {
    return usersQuery.data?.filter((user) => {
      const matchesSearch =
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter ? user.roles.includes(roleFilter) : true;
      return matchesSearch && matchesRole;
    }) || [];
  }, [usersQuery.data, searchQuery, roleFilter]);

  const filterInputClass = "border border-input rounded-lg p-2.5 bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary transition shadow-sm";

  return (
    <div className="p-6 md:p-10 space-y-8 bg-background">
      <header className="mb-4">
        <h1 className="text-3xl font-extrabold text-foreground flex items-center">
          👥 User Accounts Management
        </h1>
        <p className="text-base text-muted-foreground mt-1">
          Manage user creation, deletion, and role assignments.
        </p>
      </header>

      {/* Add User Section */}
      <div className="bg-card rounded-xl border border-border shadow-lg p-6">
        <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {showForm ? "Create New User" : "User Creation"}
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm font-medium"
          >
            {showForm ? "Hide Form" : "➕ Add New User"}
          </button>
        </div>
        
        {showForm && (
          <UserForm<CreateUserDto>
            onSubmit={handleCreate}
            isSubmitting={createUser.isPending}
          />
        )}
      </div>

      {/* Loading/Error States */}
      {usersQuery.isLoading && <p className="text-center text-lg text-primary">Loading users... <span className="animate-spin">🌀</span></p>}
      {usersQuery.error && <p className="text-center text-lg text-destructive">❌ Error loading users</p>}

      {/* Search & Filter Section */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-md">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="text"
            placeholder="🔍 Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={filterInputClass + " flex-1 min-w-[200px]"}
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={filterInputClass + " md:w-48 appearance-none"}
          >
            <option value="">Filter by Role</option>
            {rolesQuery.data?.map((role: RoleDto) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>

          {(searchQuery || roleFilter) && (
            <button
              onClick={() => { setSearchQuery(""); setRoleFilter(""); }}
              className="bg-muted text-foreground px-4 py-2.5 rounded-lg hover:bg-muted-foreground/10 transition-colors text-sm font-medium"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Users List */}
      <div className="p-0">
        <UserList
          users={filteredUsers}
          onDelete={handleDelete}
          onAssignRole={handleAssignRole}
          onRemoveRole={handleRemoveRole}
          deletingId={deleteUser.variables}
          roles={rolesQuery.data}
        />
      </div>
    </div>
  );
};

export default AdminUsersPage;