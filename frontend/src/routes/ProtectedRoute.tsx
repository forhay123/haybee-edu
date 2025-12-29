// src/routes/ProtectedRoute.tsx
import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";

interface ProtectedRouteProps {
  roles: string[]; // allowed roles
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles, children }) => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (!user) {
    // Not logged in
    return <Navigate to="/login" replace />;
  }

  // Normalize roles to uppercase for safe comparison
  const allowedRoles = roles.map((r) => r.toUpperCase());
  const userRoles = user.roles.map((r) => r.toUpperCase());

  // Check if user has at least one allowed role
  const isAuthorized = userRoles.some((role) => allowedRoles.includes(role));

  if (!isAuthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
