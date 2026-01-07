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
  const [studentTypeFilter, setStudentTypeFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const handleCreate = (data: CreateUserDto) => createUser.mutate(data);
  const handleDelete = (id: number) => deleteUser.mutate(id);
  const handleAssignRole = (userId: number, role: string) =>
    assignRole.mutate({ userId, role });
  const handleRemoveRole = (userId: number, role: string) =>
    removeRole.mutate({ userId, role });

  // Extract unique values for filters
  const { uniqueStudentTypes, uniqueClasses, uniqueDepartments } = useMemo(() => {
    const types = new Set<string>();
    const classes = new Set<string>();
    const departments = new Set<string>();

    usersQuery.data?.forEach((user) => {
      if (user.studentType) types.add(user.studentType);
      if (user.preferredClass) classes.add(user.preferredClass);
      if (user.preferredDepartment) departments.add(user.preferredDepartment);
    });

    return {
      uniqueStudentTypes: Array.from(types).sort(),
      uniqueClasses: Array.from(classes).sort(),
      uniqueDepartments: Array.from(departments).sort(),
    };
  }, [usersQuery.data]);

  const filteredUsers: UserDto[] = useMemo(() => {
    return usersQuery.data?.filter((user) => {
      const matchesSearch =
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter ? user.roles.includes(roleFilter) : true;
      const matchesStudentType = studentTypeFilter ? user.studentType === studentTypeFilter : true;
      const matchesClass = classFilter ? user.preferredClass === classFilter : true;
      const matchesDepartment = departmentFilter ? user.preferredDepartment === departmentFilter : true;
      
      return matchesSearch && matchesRole && matchesStudentType && matchesClass && matchesDepartment;
    }) || [];
  }, [usersQuery.data, searchQuery, roleFilter, studentTypeFilter, classFilter, departmentFilter]);

  const hasActiveFilters = searchQuery || roleFilter || studentTypeFilter || classFilter || departmentFilter;

  const resetFilters = () => {
    setSearchQuery("");
    setRoleFilter("");
    setStudentTypeFilter("");
    setClassFilter("");
    setDepartmentFilter("");
  };

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
      {usersQuery.isLoading && (
        <p className="text-center text-lg text-primary">
          Loading users... <span className="animate-spin">🌀</span>
        </p>
      )}
      {usersQuery.error && (
        <p className="text-center text-lg text-destructive">
          ❌ Error loading users
        </p>
      )}

      {/* Search & Filter Section */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-md">
        <div className="space-y-3">
          {/* First Row: Search and Role */}
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
              <option value="">All Roles</option>
              {rolesQuery.data?.map((role: RoleDto) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Second Row: Student-specific filters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <select
              value={studentTypeFilter}
              onChange={(e) => setStudentTypeFilter(e.target.value)}
              className={filterInputClass + " flex-1"}
            >
              <option value="">All Student Types</option>
              {uniqueStudentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className={filterInputClass + " flex-1"}
            >
              <option value="">All Classes</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className={filterInputClass + " flex-1"}
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="bg-muted text-foreground px-4 py-2.5 rounded-lg hover:bg-muted-foreground/10 transition-colors text-sm font-medium whitespace-nowrap"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {usersQuery.data?.length || 0} users
          </div>
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