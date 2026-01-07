// src/features/users/components/UserList.tsx
import React, { useState } from "react";
import UserCard from "./UserCard";
import { UserDto, RoleDto } from "../api/usersApi";

interface UserListProps {
  users: UserDto[];
  roles?: RoleDto[];
  onDelete?: (id: number) => void;
  onAssignRole?: (userId: number, role: string) => void;
  onRemoveRole?: (userId: number, role: string) => void;
  deletingId?: number;
}

const UserList: React.FC<UserListProps> = ({
  users,
  roles,
  onDelete,
  onAssignRole,
  onRemoveRole,
  deletingId
}) => {
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);

  // Helper to display roles cleanly in the table
  const renderRoles = (user: UserDto) => {
    return user.roles.slice(0, 3).map(role => (
      <span key={role} className="inline-block bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full mr-1">
        {role}
      </span>
    ));
  };

  return (
    <div>
      {/* Table View */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-card rounded-xl overflow-hidden shadow-lg border border-border">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider hidden sm:table-cell">Email</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider hidden md:table-cell">Roles</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider hidden lg:table-cell">Type</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider hidden xl:table-cell">Class/Dept</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-accent/50 transition-colors"
              >
                <td className="px-6 py-4 text-sm font-medium text-foreground">{user.fullName}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">{user.email}</td>
                <td className="px-6 py-4 text-sm hidden md:table-cell">
                  {renderRoles(user)}
                  {user.roles.length > 3 && (
                    <span className="text-xs text-muted-foreground ml-1">...</span>
                  )}
                </td>
                {/* ✅ NEW: Student Type Column */}
                <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">
                  {user.studentType ? (
                    <span className="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded">
                      {user.studentType}
                    </span>
                  ) : (
                    <span className="text-xs italic text-gray-400">—</span>
                  )}
                </td>
                {/* ✅ NEW: Class/Department Column */}
                <td className="px-6 py-4 text-sm text-muted-foreground hidden xl:table-cell">
                  {user.preferredClass || user.preferredDepartment ? (
                    <div className="space-y-0.5">
                      {user.preferredClass && (
                        <div className="text-xs font-medium">{user.preferredClass}</div>
                      )}
                      {user.preferredDepartment && (
                        <div className="text-xs text-muted-foreground/80">{user.preferredDepartment}</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs italic text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${user.enabled ? 'bg-green-500/20 text-green-700 dark:bg-green-500/30' : 'bg-red-500/20 text-red-700 dark:bg-red-500/30'}`}>
                    {user.enabled ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                  <button
                    className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
                    onClick={() => setSelectedUser(user)}
                  >
                    Details
                  </button>
                  {onDelete && (
                    <button
                      className="px-3 py-1 text-xs bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition disabled:opacity-50"
                      onClick={() => onDelete(user.id)}
                      disabled={deletingId === user.id}
                    >
                      {deletingId === user.id ? "…" : "Delete"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card View Modal (for details/role management) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 transition-opacity">
          <div className="bg-card rounded-xl shadow-2xl p-6 w-full max-w-lg relative transform transition-all">
            <h3 className="text-lg font-bold text-foreground mb-4">User Details & Role Management</h3>
            <button
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xl transition"
              onClick={() => setSelectedUser(null)}
            >
              ✖
            </button>

            <UserCard
              user={selectedUser}
              roles={roles}
              onDelete={onDelete}
              onAssignRole={onAssignRole}
              onRemoveRole={onRemoveRole}
              isDeleting={deletingId === selectedUser.id}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;