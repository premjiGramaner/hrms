import React from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../app/hooks";

interface Props {
  children: React.ReactNode;
  /** If supplied, only these roles may access the route. Others are redirected. */
  roles?: string[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { token, user } = useAppSelector((state) => state.auth);

  if (!token) return <Navigate to="/login" replace />;

  if (roles && user && !roles.includes(user.role)) {
    // Employees are redirected to their own info page
    return <Navigate to="/my-info" replace />;
  }

  return <>{children}</>;
}
