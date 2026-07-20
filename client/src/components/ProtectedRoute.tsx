import React from "react";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { PAGE_PATHS } from "../config/roles";

interface Props {
  children: React.ReactNode;
  roles?: readonly string[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { token, user } = useAppSelector((state) => state.auth);

  if (!token) return <Navigate to={PAGE_PATHS.login} replace />;

  const isStaticAdmin = user?.id === 0 || user?.username === "admin";

  if (roles && user && !roles.includes(user.role) && !isStaticAdmin) {
    return <Navigate to={PAGE_PATHS.myInfo} replace />;
  }

  return <>{children}</>;
}
