import React, { useState } from "react";
import { UserDto, RoleDto } from "../api/usersApi";

interface UserCardProps {
  user: UserDto;
  roles?: RoleDto[];
  onDelete?: (id: number) => void;
  onAssignRole?: (userId: number, role: string) => void;
  onRemoveRole?: (userId: number, role: string) => void;
  isDeleting?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({
  user, roles, onDelete, onAssignRole, onRemoveRole, isDeleting
}) => {
  const [selectedRole, setSelectedRole] = useState("");

  const userRoles = user.roles || [];
  const availableRoles = roles?.filter(
    (role) => !userRoles.includes(role.name)
  ) || [];

  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'TEACHER':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'STUDENT':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center space-x-4 border-b border-border pb-4">
        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xl">
          {user.fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">{user.fullName}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Status */}
      <div className="flex justify-between items-center text-sm">
        <strong className="text-foreground">Status:</strong>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.enabled ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200'}`}>
          {user.enabled ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Roles Display */}
      <div>
        <strong className="text-foreground block mb-2">Assigned Roles:</strong>
        <div className="flex flex-wrap gap-2">
          {userRoles.length > 0 ? (
            userRoles.map((role) => (
              <div
                key={role}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(role)}`}
              >
                <span>{role}</span>
                {onRemoveRole && (
                  <button
                    onClick={() => onRemoveRole(user.id, role)}
                    title={`Remove ${role}`}
                    className="ml-1 text-inherit hover:opacity-70 transition"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          ) : (
            <span className="text-muted-foreground italic">No roles assigned.</span>
          )}
        </div>
      </div>

      {/* Role Assignment */}
      {onAssignRole && availableRoles.length > 0 && (
        <div className="mt-4 border-t border-border pt-4 flex gap-2 items-center">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="flex-1 border border-input rounded-lg p-2 bg-background text-sm focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
          >
            <option value="">Assign a New Role...</option>
            {availableRoles.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              if (selectedRole) {
                onAssignRole(user.id, selectedRole);
                setSelectedRole("");
              }
            }}
            disabled={!selectedRole}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Assign
          </button>
        </div>
      )}

      {/* Delete Button */}
      {onDelete && (
        <div className="mt-4 pt-4 border-t border-border">
          <button
            onClick={() => onDelete(user.id)}
            disabled={isDeleting}
            className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isDeleting ? (
              <>
                <span className="animate-spin mr-2">⚙️</span> Deleting...
              </>
            ) : (
              "🗑️ Delete User"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserCard;